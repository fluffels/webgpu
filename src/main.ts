const defaultShader = require("./default.wgsl");
// import defaultShader from "default.wgsl";

window.onload = async () => {
    console.log(defaultShader);

    const canvas = document.querySelector("canvas");
    if (!canvas) {
        console.error("No canvas");
        return;
    }
    
    const context = canvas.getContext("webgpu");
    if (!context) {
        console.error("No webgpu context");
        return;
    }

    const adapter = await window.navigator.gpu.requestAdapter();
    if (!adapter) {
        console.error("Could not get WebGPU adapter");
        return;
    }

    console.log(adapter);
    console.log([...adapter.features]);

    const gpu = await adapter.requestDevice();
    if (!gpu) {
        console.error("Could not get GPU");
        return;
    }

    // TODO(jan): According to the spec, rgba8unorm-srgb should be supported by all devices.
    // But apparently it is not.
    const configuration: GPUCanvasConfiguration = {
        device: gpu,
        format: "bgra8unorm"
    };
    context.configure(configuration);

    const queue = gpu.queue;
    console.log(queue);

    // TODO(jan): Determine from Vertex data size.
    const vertexBufferSize = 1024;

    let stagingBuffer: GPUBuffer;
    {
        const descriptor: GPUBufferDescriptor = {
            size: vertexBufferSize,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
        };
        stagingBuffer = gpu.createBuffer(descriptor);

        // NOTE(jan): This will reject if it fails, so no need to check.
        await stagingBuffer.mapAsync(GPUMapMode.WRITE);

        const memory = stagingBuffer.getMappedRange();
        console.log("memory: ", memory);
        const vertices = new Float32Array(memory);
        console.log("vertices: ", vertices);

        let i = 0;
        vertices[i++] = 0;
        vertices[i++] = 1;
        vertices[i++] = 0;
        vertices[i++] = 1;

        vertices[i++] = 1;
        vertices[i++] = -1;
        vertices[i++] = 0;
        vertices[i++] = 1;

        vertices[i++] = -1;
        vertices[i++] = -1;
        vertices[i++] = 0;
        vertices[i++] = 1;

        stagingBuffer.unmap();
    }

    let vertexBuffer: GPUBuffer;
    {
        const descriptor: GPUBufferDescriptor = {
            size: vertexBufferSize,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        };
        vertexBuffer = gpu.createBuffer(descriptor);
    }

    {
        let encoder = gpu.createCommandEncoder();
        encoder.copyBufferToBuffer(stagingBuffer, 0, vertexBuffer, 0, vertexBufferSize);
        let cmds = encoder.finish();
        queue.submit([cmds]);
    }

    let module: GPUShaderModule;
    {
        const descriptor: GPUShaderModuleDescriptor = {
            code: defaultShader,
        };
        module = gpu.createShaderModule(descriptor);
        const info = await module.compilationInfo();
        for (const message of info.messages) {
            if (message.type == "error") return;
        }
    }

    let pipeline: GPURenderPipeline;
    {
        const attribute: GPUVertexAttribute = {
            format: "float32x4",
            offset: 0,
            // TODO(jan): How to determine this?
            shaderLocation: 0
        };
        const attributes = [ attribute ];
        const vertexLayout: GPUVertexBufferLayout = {
            // TODO(jan): Compute this?
            arrayStride: 4 * 4,
            attributes: attributes
        };
        const vertex: GPUVertexState = {
            buffers: [ vertexLayout ],
            module: module,
            entryPoint: "vsMain",
        };
        const target: GPUColorTargetState = {
            format: "bgra8unorm",
        }
        const fragment: GPUFragmentState = {
            entryPoint: "fsMain",
            module,
            targets: [target],
        };
        const descriptor: GPURenderPipelineDescriptor = {
            vertex,
            fragment
        };
        pipeline = gpu.createRenderPipeline(descriptor);
    }

    {
        let encoder = gpu.createCommandEncoder();

        const clearColor: GPUColor = {r: 0, g: 1, b: 1, a: 1};
        const framebufferView: GPUTextureView = context.getCurrentTexture().createView();
        const colorAttachment: GPURenderPassColorAttachment = {
            view: framebufferView,
            loadValue: clearColor,
            storeOp: "store"
        }
        const descriptor: GPURenderPassDescriptor = {
            colorAttachments: [colorAttachment]
        };
        let pass = encoder.beginRenderPass(descriptor);

        pass.setPipeline(pipeline);
        pass.setVertexBuffer(0, vertexBuffer, 0, vertexBufferSize);
        pass.draw(3, 1, 0, 0);

        pass.endPass();
        let cmds = encoder.finish();

        queue.submit([cmds]);
    }
};
