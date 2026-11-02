import CalculateNumbersTool from "./tools/calculate_numbers";
import WebRequestTool from "./tools/web_request";
import WebSearchTool from "./tools/web_search";
import McpTool from "./tools/mcp";
import { getStreamedEvents } from "./utils";

const defaultTools = [new CalculateNumbersTool(), new WebRequestTool(), new WebSearchTool()];

export function getTool(config, name, mcpRef) {
    let toolList = config ? getAvailableTools(config, mcpRef) : getAllTools(mcpRef);
    return toolList.find(tool => tool.name == name);
}

export function getAvailableTools(config, mcpRef) {
    let availableTools = defaultTools.filter(tool => config.tools[tool.name].enabled);
    return [...availableTools, ...getMcpTools(mcpRef)];
}

export function getAllTools(mcpRef) {
    return [...defaultTools, ...getMcpTools(mcpRef)];
}

function getMcpTools(mcpRef = {}) {
    if (!mcpRef.current) return [];

    return mcpRef.current.servers.map(s => s.getTools()).flat();
}

export function parseToolsForDisplay(calls, mcpRef) {
    return calls.map(tool => {
        let args, argsStr, result;
        result = tool.result ? tool.result : "";
        try {
            args = JSON.parse(tool.function.arguments);
            let toolObj = getTool(null, tool.function.name, mcpRef);
            if (toolObj) {
                argsStr = toolObj.getCallSummary(args);
            }
            else {
                argsStr = Object.entries(args).map(e => e.join(": ")).join(", ");
            }
        }
        catch (err) {
            console.assert(err.message.startsWith("JSON.parse"), err);
            let calling = !tool.result ? "Llamando" : "Cargando";
            argsStr = calling + "... (" + tool?.function?.arguments + ")";
        }

        return {
            name: tool.function.name,
            args: argsStr,
            result
        }
    });
}

export async function processToolCalls(config, mcpRef, calls, extra) {
    let promises = [];

    for (let call of calls) {
        if (call.type != "function") continue;

        let toolPromise = processToolCall(config, mcpRef, call, extra);

        promises.push({
            id: call.id,
            prom: toolPromise
        });
    }

    let toolResults = [];
    for (let promise of promises) {
        toolResults.push({
            id: promise.id,
            msg: await promise.prom
        });
    }

    return toolResults;
}

async function processToolCall(config, mcpRef, call, extra) {
    try {
        let args = parseToolCallArgs(call.function.arguments);
        let tool = getTool(config, call.function.name, mcpRef);
        if (tool == null)
            throw new Error("Invalid tool name: " + call.function.name);

        return await tool.execute(args, config, extra);
    }
    catch (err) {
        return "Tool error: " + err.message;
    }
}

function parseToolCallArgs(args) {
    try {
        return JSON.parse(args);
    }
    catch (err) {
        throw new Error("Malformed JSON parameters object.");
    }
}

export function initializeMcp(config) {
    return {
        servers: config.mcp.map(url => new McpServer(config, url))
    };
}

export function cleanMcp(config, mcpRef) {
    mcpRef.current.servers.forEach(server => server.close(config));
    mcpRef.current = null;
}

export function addMcpServer(config, mcpRef, url) {
    mcpRef.current.servers.push(new McpServer(config, url));
}

export function removeMcpServer(config, mcpRef, i) {
    mcpRef.current.servers.splice(i, 1)[0].close(config);
}

async function parseMcpResponse(res) {
    let contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.startsWith("application/json")) {
        return await res.json();
    }
    else if (contentType.startsWith("text/event-stream")) {
        for await (let event of getStreamedEvents(res.body)) {
            let json = JSON.parse(event.content);
            if (!json.id)
                continue;
            
            return json;
        }
        throw new McpRequestError(res.status, "Stream closed without response");
    }
    else {
        throw new McpRequestError(res.status, "Invalid content type: " + contentType);
    }
}

class McpServer {
    static UNSUPPORTED_VERSION_ERROR = -32022;
    static MISSING_CAPABILITY_ERROR = -32021;
    static HEADER_MISMATCH_ERROR = -32020;

    url = "";
    idCount = 1;
    tools = [];
    name = "";
    legacy = null;
    active = true;
    abortInit = null;

    constructor(config, url) {
        this.url = url;
        this.init(config);
    }

    async init(config) {
        this.abortInit = new AbortController();
        try {
            let res = await this.request(config, "server/discover", {}, this.abortInit.signal);
            console.log(res);

            this.name = res._meta?.["io.modelcontextprotocol/serverInfo"]?.name;

            let toolRes = await this.request(config, "tools/list", {}, this.abortInit.signal);
            this.tools = toolRes.tools.map(t => new McpTool(this, t));
        }
        catch (error) {
            console.error(error);
            if (error instanceof McpRequestError) {
                if (this.isLegacy(error)) {
                    this.legacy = new LegacyMcpServer(this.url);
                    try {
                        let data = await this.legacy.init(config, this.abortInit.signal);
                        this.name = data.name;
                        this.tools = data.tools.map(t => new McpTool(this, t));
                        this.abortInit = null;
                        return;
                    }
                    catch (e) {
                        console.error(e);
                        error = e;
                    }
                }
            }

            this.active = false;
        }
        this.abortInit = null;
    }

    getTools() {
        return this.active ? this.tools : [];
    }

    close(config) {
        if (this.abortInit)
            this.abortInit.abort();

        if (this.legacy)
            this.legacy.close(config);
    }

    isLegacy(error) {
        let status = error.status;
        let code = error.err?.code;
        return status == 400 && code != McpServer.UNSUPPORTED_VERSION_ERROR &&
            code != McpServer.MISSING_CAPABILITY_ERROR && code != McpServer.HEADER_MISMATCH_ERROR;
    }

    async request(config, method, params, signal = undefined) {
        if (this.legacy) {
            return (await this.legacy.request(config, method, params, signal)).res;
        }

        try {
            let mcpName = params.name ?? params.uri;
            let res = await fetch(config.proxy + this.url, {
                method: "POST",
                headers: {
                    "Accept": "application/json, text/event-stream",
                    "Content-Type": "application/json",
                    "MCP-Protocol-Version": "2026-07-28",
                    "Mcp-Method": method,
                    ...(mcpName ? {"Mcp-Name": mcpName} : {})
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: this.idCount,
                    method,
                    params: {
                        ...params,
                        _meta: {
                            "io.modelcontextprotocol/protocolVersion": "2026-07-28",
                            "io.modelcontextprotocol/clientInfo": {
                                name: "chatbot-ia",
                                version: "0.1"
                            },
                            "io.modelcontextprotocol/clientCapabilities": {}
                        }
                    }
                }),
                signal
            });

            this.idCount++;

            if (!res.ok) {
                let err = await res.text(), json;
                try {
                    json = JSON.parse(err);
                }
                catch (e) {
                    throw new McpRequestError(res.status, err);
                }
                throw new McpRequestError(res.status, json);
            }

            let json = await parseMcpResponse(res);
            if (!json.result) {
                throw new McpRequestError(res.status, json);
            }

            return json.result;
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
}

class LegacyMcpServer {
    url = "";
    idCount = 1;
    mcpVersion = "2025-11-25";
    sessionId = null;
    
    constructor(url) {
        this.url = url;
    }

    async init(config, signal) {
        let res = await this.request(config, "initialize", {
            protocolVersion: "2025-11-25",
            clientInfo: {
                name: "chatbot-ia",
                version: "0.1"
            },
            capabilities: {}
        }, signal);
        console.log(res);

        // TODO: support a few more versions
        if (res.res.protocolVersion != "2025-11-25")
            throw new Error("Incompatible version");

        let name = res.res.serverInfo?.name;

        if (res.headers.has("MCP-Session-Id")) {
            this.sessionId = res.headers.get("MCP-Session-Id");
        }

        await this.notify(config, "notifications/initialized", null, signal);

        let toolRes = (await this.request(config, "tools/list", null, signal)).res;
        return {
            name,
            tools: toolRes.tools
        };
    }
    
    async request(config, method, params, signal = undefined) {
        try {
            let sessionHead = this.sessionId ? {"MCP-Session-Id": this.sessionId} : {};
            let res = await fetch(config.proxy + this.url, {
                method: "POST",
                headers: {
                    "Accept": "application/json, text/event-stream",
                    "Content-Type": "application/json",
                    "MCP-Protocol-Version": this.mcpVersion,
                    ...sessionHead
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: this.idCount,
                    method,
                    ...(params != null ? {params} : {})
                }),
                signal
            });

            this.idCount++;

            if (!res.ok) {
                let err = await res.text(), json;
                try {
                    json = JSON.parse(err);
                }
                catch (e) {
                    throw new McpRequestError(res.status, err);
                }
                throw new McpRequestError(res.status, json);
            }

            let json = await parseMcpResponse(res);
            if (!json.result) {
                throw new McpRequestError(res.status, json);
            }

            return {
                headers: res.headers,
                res: json.result
            };
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    
    async notify(config, method, params, signal = undefined) {
        try {
            let sessionHead = this.sessionId ? {"MCP-Session-Id": this.sessionId} : {};
            let res = await fetch(config.proxy + this.url, {
                method: "POST",
                headers: {
                    "Accept": "application/json, text/event-stream",
                    "Content-Type": "application/json",
                    "MCP-Protocol-Version": this.mcpVersion,
                    ...sessionHead
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method,
                    ...(params != null ? {params} : {})
                }),
                signal
            });

            if (!res.ok) {
                let err = await res.text(), json;
                try {
                    json = JSON.parse(err);
                }
                catch (e) {
                    throw new McpRequestError(res.status, err);
                }
                throw new McpRequestError(res.status, json);
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    
    async deleteSession(config) {
        try {
            let sessionHead = this.sessionId ? {"MCP-Session-Id": this.sessionId} : {};
            await fetch(config.proxy + this.url, {
                method: "DELETE",
                headers: {
                    "Accept": "application/json; text/event-stream",
                    "MCP-Protocol-Version": this.mcpVersion,
                    ...sessionHead
                },
            });
        }
        catch (e) {
            console.error(e);
        }
    }

    close(config) {
        if (this.sessionId)
            this.deleteSession(config);
    }
}

class McpRequestError extends Error {
    constructor(status, body) {
        super(McpRequestError.getMessage(body));
        this.status = status;

        if (typeof body == "object") {
            if (body.error)
                this.err = body.error;
            else 
                this.body = JSON.stringify(body);
        }
        else if (typeof body == "string")
            this.body = body;
    }

    static getMessage(body) {
        if (typeof body == "object")
            return body.error?.message ?? JSON.stringify(body);
        else
            return body;
    }
}
