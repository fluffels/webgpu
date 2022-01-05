module.exports = {
    devtool: "source-map",
    entry: {
        main: __dirname + "/src/main.ts",
    },
    output: {
        path: __dirname + "/www",
        filename: "[name]-bundle.min.js"
    },
    module: {
        rules: [
            { test: /\.(js|ts)$/, loader: "ts-loader" },
            { test: /\.wgsl$/, type: "asset/source" }
        ]
    },
    resolve: {
        extensions: [".js", ".ts"]
    },
};
