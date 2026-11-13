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

        let content = res.content.map(part => {
            if (part.type == "text")
                return part.text;
            if (part.type == "resource_link")
                return "Resource link: " + JSON.stringify(part);
            if (part.type == "resource") {
                let res = part.resource;
                if (res.text && res.text.length > 32768)
                    res.text = res.text.slice(0, 32678) + "...\n\nText truncated to 32768 chars.";
                if (res.blob && res.blob.length > 1024)
                    res.blob = res.blob.slice(0, 1024) + "... Blob truncated to 1024 chars.";

                return "Resource: " + JSON.stringify(res);
            }
            
            return "<MCP content type not supported: " + part.type + ">";
        }).join("\n\n");

        if (res.isError)
            throw new Error(content);

        return content;
    }

    getCallSummary(args) {
        let argLine = Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
        return `[${argLine}]`;
    }
}
