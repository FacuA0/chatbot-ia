import { useEffect, useRef } from "react";
import markdownit from "markdown-it";
import highlight from "highlight.js";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

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

function ChatMessage({message}) {
    let messageRef = useRef();

    useEffect(() => {
        let html = markdown.render(message.message);
        messageRef.current.innerHTML = html;
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
                {message.thinking}
            </AccordionDetails>
        </Accordion>
    ) : [];

    const tools = message.extra?.tool_calls ? message.extra.tool_calls.map(tool => ({
        name: tool.function.name,
        args: JSON.parse(tool.function.arguments)
    })) : [];

    const toolAccordions = tools.map((tool, tId) => (
        <Accordion>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${message.idx}-${tId}-panel2-content`}
                id={`${message.idx}-${tId}-panel2-header`}>
                Herramienta {tool.name}
            </AccordionSummary>
            <AccordionDetails>
                {`${tool.args.number1} ${tool.args.operator} ${tool.args.number2}`}
            </AccordionDetails>
        </Accordion>
    ));

    return (
        <div className={`msg-div ${isUser ? "user-msg" : "ai-msg"}`}>
            <div className="inner-msg-div">
                <p><b>{title}</b></p>
                {thinkingAccordion}
                <p ref={messageRef}></p>
                {toolAccordions}
            </div>
        </div>
    );
}

export default ChatMessage;