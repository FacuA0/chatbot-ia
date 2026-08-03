import { useEffect, useRef } from "react";
import markdownit from "markdown-it";
import highlight from "highlight.js";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { IconButton } from "@mui/material";
import ReplayIcon from '@mui/icons-material/Replay';

const markdown = markdownit({
    highlight: function (str, lang) {
        if (lang && highlight.getLanguage(lang)) {
            try {
                return highlight.highlight(str, { language: lang, ignoreIllegals: true }).value;
            } 
            catch (_) {}
        }

        return ''; // use external default escaping
    }
});

function ChatMessage({message, actions}) {
    let messageRef = useRef();
    let thinkingRef = useRef();

    useEffect(() => {
        let html = markdown.render(message.message);
        messageRef.current.innerHTML = html;
        if (message.thinking) {
            let thinkHtml = markdown.render(message.thinking);
            thinkingRef.current.outerHTML = thinkHtml;
        }
        //console.log(message.message, "-", html);
    });

    const isUser = message.role == "user";
    const title = ({
        user: "User",
        assistant: "AI",
        tool: "Tool"
    })[message.role];

    //console.log(message);

    const thinkingAccordion = message.thinking ? (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${message.idx}-panel1-content`}
                id={`${message.idx}-panel1-header`}>
                Razonamiento
            </AccordionSummary>
            <AccordionDetails>
                <p ref={thinkingRef}></p>
            </AccordionDetails>
        </Accordion>
    ) : [];

    const tools = message.extra?.tool_calls ? message.extra.tool_calls.map(tool => {
        let args, content, loading = false;
        try {
            args = JSON.parse(tool.function.arguments);
            if (tool.function.name == "calculate_numbers") {
                content = `${args.number1} ${args.operator} ${args.number2}`;
            }
            else {
                content = Object.entries(args).map(e => e.join(": ")).join(", ");
            }
        }
        catch (err) {
            console.assert(err.message.startsWith("JSON.parse"), err);
            loading = true;
            content = "Cargando...";
        }

        return {
            name: tool.function.name,
            args: content,
            loading
        }
    }) : [];

    //console.log(Object.assign({}, message), tools.slice());

    const toolAccordions = tools.map((tool, tId) => (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${message.idx}-${tId}-panel2-content`}
                id={`${message.idx}-${tId}-panel2-header`}>
                Herramienta {tool.name} {tool.loading ? "(cargando...)" : ""}
            </AccordionSummary>
            <AccordionDetails>
                {tool.args}
            </AccordionDetails>
        </Accordion>
    ));
    
    const msgActions = actions && message.role == "assistant" ? [
        <IconButton
            title="Rehacer respuesta"
            onClick={() => actions.regenerateSince(message.idx)}
            disabled={false}>
            <ReplayIcon/>
        </IconButton>
    ] : [];

    return (
        <div className={`msg-div ${isUser ? "user-msg" : "ai-msg"}`}>
            <div className="inner-msg-div">
                <p><b>{title}</b></p>
                {thinkingAccordion}
                <p ref={messageRef}></p>
                {toolAccordions}
                {msgActions}
            </div>
        </div>
    );
}

export default ChatMessage;