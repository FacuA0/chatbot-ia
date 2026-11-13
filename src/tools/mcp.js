import { Tool } from "./dummy_tool";

export default class McpTool extends Tool {
    constructor(server, tool) {
        super();

        let serverName = server.name.replace(/[^A-Za-z0-9_-]/g, "-")
            .slice(0, 64 - ("-" + tool.name).length);

        this.name = serverName + "-" + tool.name;
        this.toolName = tool.name;
        this.description = tool.description;
        this.parameters = tool.inputSchema;
        this.server = server;
    }

    async execute(args, config, extra) {
        let name = this.toolName;
        let res = await this.server.request(config, "tools/call", {
            name: name,
            arguments: {
                ...args
            }
        }, extra.abort.signal);

        return res.content.map(part => {
            if (part.type == "text")
                return part.text;
            else
                return "<Content type not supported: " + part.type + ">"
        }).join("\n\n");
    }

    getCallSummary(args) {
        let argLine = Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
        return `[${argLine}]`;
    }
}
