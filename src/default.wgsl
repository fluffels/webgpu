struct VertexIn {
    [[location(0)]] position: vec4<f32>;
};

struct VertexOut {
    [[builtin(position)]] position: vec4<f32>;
};

[[stage(vertex)]]
fn vsMain(input: VertexIn) -> VertexOut {
    var result: VertexOut;
    result.position = input.position;
    return result;
}

[[stage(fragment)]]
fn fsMain() -> [[location(0)]] vec4<f32> {
    return vec4<f32>(0.4, 0.4, 0.8, 1.0);
}
