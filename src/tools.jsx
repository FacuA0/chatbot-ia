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

export function addMcpServer(config, mcpRef, url) {
    mcpRef.current.servers.push(new McpServer(config, url));
}

export function removeMcpServer(mcpRef, i) {
    mcpRef.current.servers.splice(i, 1);
}

class McpServer {
    url = "";
    idCount = 1;
    tools = [];
    name = "";
    mcpVersion = "2026-07-28";
    active = true;

    constructor(config, url) {
        this.url = url;

        let server = this;
        (async () => {
            try {
                let res = await server.request(config, "server/discover", {});
                let json = await res.json();
                console.log(res);

                if (json.error) {
                    throw new Error(json.error.message ?? JSON.stringify(json.error));
                }

                let toolRes = await server.request(config, "tools/list", {});
                let toolJson = await toolRes.json();
                server.tools = toolJson.tools.map(t => new McpTool(server, t));
            }
            catch (e) {
                console.error(e);
                server.active = false;
            }
        })();
    }

    getTools() {
        return this.tools;
    }

    async request(config, method, params, signal = undefined) {
        try {
            let mcpName = params.name ?? params.uri;
            console.log("signal", signal);
            let res = await fetch(config.proxy + this.url, {
                method: "POST",
                headers: {
                    "Accept": "application/json; text/event-stream",
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

            if (!res.ok) {
                let err = await res.text(), json;
                try {
                    json = JSON.parse(err);
                    console.error(json.error?.data);
                }
                catch (e) {
                    throw new Error(err);
                }
                throw new Error(json.error.message);
            }

            this.idCount++;
                    
            if (res.headers.get("Content-Type").startsWith("application/json")) {
                let json = await res.json();
                console.log(json);
                if (!json.result) {
                    if (json.error) {
                        console.error("Err data", json.error.data);
                        throw new Error(json.error.message ?? JSON.stringify(json.error));
                    }
                    throw new Error("No 'result' JSON key.");
                }

                return json.result;
            }
            else {
                for await (let event of getStreamedEvents(res.body)) {
                    console.log(event);
                    if (!event.id) 
                        continue;
                    
                    if (!event.result) {
                        if (event.error) {
                            console.error("Err data", event.error.data);
                            throw new Error(event.error.message ?? JSON.stringify(event.error));
                        }
                        throw new Error("No 'result' JSON key.");
                    }

                    return event.result;
                }
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
    
    async legacyRequest(config, method, params, signal = undefined) {
        try {
            let mcpName = params.name ?? params.uri;
            console.log("signal", signal);
            let res = await fetch(config.proxy + this.url, {
                method: "POST",
                headers: {
                    "Accept": "application/json; text/event-stream",
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

            if (!res.ok) {
                let err = await res.text(), json;
                try {
                    json = JSON.parse(err);
                    console.error(json.error?.data);
                }
                catch (e) {
                    throw new Error(err);
                }
                throw new Error(json.error.message);
            }

            this.idCount++;
                    
            if (res.headers.get("Content-Type").startsWith("application/json")) {
                let json = await res.json();
                console.log(json);
                if (!json.result) {
                    if (json.error) {
                        console.error("Err data", json.error.data);
                        throw new Error(json.error.message ?? JSON.stringify(json.error));
                    }
                    throw new Error("No 'result' JSON key.");
                }

                return json.result;
            }
            else {
                for await (let event of getStreamedEvents(res.body)) {
                    console.log(event);
                    if (!event.id) 
                        continue;
                    
                    if (!event.result) {
                        if (event.error) {
                            console.error("Err data", event.error.data);
                            throw new Error(event.error.message ?? JSON.stringify(event.error));
                        }
                        throw new Error("No 'result' JSON key.");
                    }

                    return event.result;
                }
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    }
}