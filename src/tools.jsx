import CalculateNumbersTool from "./tools/calculate_numbers";
import WebRequestTool from "./tools/web_request";

const tools = [new CalculateNumbersTool(), new WebRequestTool()];

export function getTool(name) {
    return tools.find(tool => tool.name == name);
}

export function getAvailableTools() {
    return tools;
}

export async function processToolCall(call) {
    try {
        let args = JSON.parse(call.function.arguments);
        let tool = getTool(call.function.name);
        if (tool == null) {
            throw new Error("Invalid tool name: " + call.function.name);
        }

        return await tool.execute(args);
    }
    catch (err) {
        let errMsg = err.message;
        if (errMsg.includes("JSON.parse")) {
            errMsg = "Malformed JSON parameters object.";
        }

        return "Tool error: " + errMsg;
    }
}