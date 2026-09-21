export class Tool {
    name = "dummy_tool";
    description = "Dummy tool";
    parameters = {
        type: "object",
        properties: {},
        required: []
    };
    config = null;
    defaultEnabled = true;

    async execute(_args, _config) {
        return "Dummy tool";
    }

    getCallSummary(_args) {
        return "Dummy tool";
    }
}