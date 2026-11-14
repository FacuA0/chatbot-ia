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
        this.mcpHeaders = this.processXMcpHeaders(tool.inputSchema);
    }

    async execute(args, config, extra) {
        let name = this.toolName;
        let resultType, inputResponses = {}, requestState = {};
        let res;

        do {
            res = await this.server.request(config, "tools/call", {
                name,
                arguments: args,
                ...inputResponses,
                ...requestState
            }, this.getXMcpHeadersForCall(args), extra.abort.signal);

            resultType = res.resultType;
            if (resultType == "input_required") {
                let name = this.server.name;
                let url = this.server.url;

                let requests = {};
                inputResponses = null;

                if (!res.inputRequests && res.requestState == null)
                    throw new Error("Invalid MCP input_required: no inputRequests nor requestState present");

                if (res.inputRequests) {
                    for (let [formKey, req] of Object.entries(res.inputRequests)) {
                        if (req.method != "elicitation/create") continue;
                        if (req.params.mode == "url") continue;

                        requests[formKey] = {
                            mode: req.params.mode,
                            message: req.params.message,
                            schema: req.params.requestedSchema,
                        };
                    }
    
                    let resp = await extra.createElicitationForm(name, url, requests);
    
                    inputResponses = {};
                    for (let formKey of Object.keys(requests)) {
                        let content = resp.action == "accept" ? {content: resp.content[formKey]} : {};
                        inputResponses[formKey] = {
                            action: resp.action,
                            ...content
                        }
                    }
                }
                
                inputResponses = inputResponses ? {inputResponses} : {};
                requestState = res.requestState ? {requestState: res.requestState} : {};
            }
        }
        while (resultType == "input_required");

        let content = this.getMcpContent(res.content);

        if (res.isError)
            throw new Error(content);

        return content;
    }

    getCallSummary(args) {
        let argLine = Object.entries(args).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
        return `[${argLine}]`;
    }

    getMcpContent(content) {
        return content.map(part => {
            if (part.type == "text")
                return part.text;
            if (part.type == "resource_link")
                return "Resource link: " + JSON.stringify(part);
            if (part.type == "resource") {
                let res = structuredClone(part.resource);
                if (res.text && res.text.length > 32768)
                    res.text = res.text.slice(0, 32678) + "...\n\nText truncated to 32768 chars.";
                if (res.blob && res.blob.length > 1024)
                    res.blob = res.blob.slice(0, 1024) + "... Blob truncated to 1024 chars.";

                return "Resource: " + JSON.stringify(res);
            }
            
            return "<MCP content type not supported: " + part.type + ">";
        }).join("\n\n");
    }

    processXMcpHeaders(toolParams) {
        let props = toolParams.properties ?? {};
        let mcpHeaders = {};

        for (let [prop, def] of Object.entries(props)) {
            if (!def["x-mcp-header"]) continue;

            mcpHeaders[prop] = def["x-mcp-header"];
        }

        return mcpHeaders;
    }

    getXMcpHeadersForCall(args) {
        let headers = this.mcpHeaders;
        let httpHeaders = {};
        for (let key in headers) {
            if (args[key] == null) continue;
            httpHeaders["Mcp-Param-" + headers[key]] = this.server.base64Encode(args[key] + "");
        }

        return httpHeaders;
    }
}
