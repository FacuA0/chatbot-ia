import { useEffect, useRef, useMemo } from "react";
import markdownit from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";
import highlight from "highlight.js";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import CopyIcon from '@mui/icons-material/ContentCopy';
import SmallIconButton from "./SmallIconButton";

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
}).use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: {
        macros: {"\\RR": "\\mathbb{R}"} 
    }
});

function ChatMessage({message, generating, actions, highlight}) {
    let messageRef = useRef();
    let thinkingRef = useRef();
    let msgDivRef = useRef();
    let htmlMsg = useMemo(() => markdown.render(message.message ?? ""), [message.message]);
    let htmlThink = useMemo(() => markdown.render(message.thinking ?? ""), [message.thinking]);

    const isUser = message.role == "user";
    const title = ({
        user: "User",
        assistant: "AI",
        tool: "Tool"
    })[message.role];

    async function copyMessage() {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message.message);
        }
        else {
            let prevContentEditable = messageRef.current.contentEditable;
            messageRef.current.contentEditable = "true";
            messageRef.current.focus();
            document.execCommand("selectAll", false);
            document.execCommand("copy", false);
            messageRef.current.contentEditable = prevContentEditable;
        }
    }

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
            else if (tool.function.name == "web_request") {
                content = args.url;
            }/*
            else if (tool.function.name == "serious_calculator") {
                content = `${args.number1} ${args.operator} ${args.number2}`;
            }*/
            else {
                content = Object.entries(args).map(e => e.join(": ")).join(", ");
            }
        }
        catch (err) {
            console.assert(err.message.startsWith("JSON.parse"), err);
            loading = true;
            content = "Cargando... (" + tool?.function?.arguments + ")";
        }

        return {
            name: tool.function.name,
            args: content,
            loading
        }
    }) : [];

    //console.log("Message", Object.assign({}, message), tools.slice());

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
    
    const msgActions = actions && (message.role == "assistant" ? (<>
        <SmallIconButton
            title="Copiar"
            onClick={copyMessage}
            icon={CopyIcon} />
        <SmallIconButton
            title="Regenerar"
            onClick={() => actions.regenerateSince(message.idx)}
            disabled={generating}
            icon={ReplayIcon} />
    </>) : message.role == "user" ? (<>
        <SmallIconButton
            title="Copiar"
            onClick={copyMessage}
            icon={CopyIcon} />
        <SmallIconButton
            title="Editar"
            onClick={() => actions.editMessage(message.idx)}
            disabled={generating}
            icon={EditIcon} />
    </>) : (<></>));

    const highlighted = highlight === message.idx;

    useEffect(() => {
        //let html = markdown.render(message.message);
        //console.log("text", html);
        messageRef.current.innerHTML = htmlMsg;
        if (message.thinking) {
            //let thinkHtml = markdown.render(message.thinking);
            //console.log("think", thinkHtml);
            thinkingRef.current.innerHTML = htmlThink;
        }
        //console.log(message.message, "-", html);
    });

    useEffect(() => {
        if (highlighted) {
            msgDivRef.current.scrollIntoView();
        }
    }, [highlight]);

    return (
        <div className={`msg-div ${isUser ? "user-msg" : "ai-msg"}${highlighted ? " highlighted" : ""}`} ref={msgDivRef}>
            <p><b>{title}</b></p>
            {thinkingAccordion}
            <div className="inner-msg-div" ref={messageRef}>
                <p ref={messageRef}></p>
            </div>
            {toolAccordions}
            <div>
                {msgActions}
            </div>
        </div>
    );
}

export default ChatMessage;