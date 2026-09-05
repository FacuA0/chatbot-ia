export class Tool {
    name = "dummy_tool";
    description = "Dummy tool";
    parameters = {
        type: "object",
        properties: {},
        required: []
    };

    async execute(_args) {
        return "Dummy tool";
    }

    getCallSummary(args) {
        return "Dummy tool";
    }
}