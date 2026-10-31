import { useEffect, useRef, useMemo, memo, useState } from "react";
import markdownit from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";
import highlight from "highlight.js/lib/common";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReplayIcon from '@mui/icons-material/Replay';
import EditIcon from '@mui/icons-material/Edit';
import CopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import SmallIconButton from "./SmallIconButton";
import { parseToolsForDisplay } from "../tools";
import ActionLink from "./ActionLink";
import ModalBox from "./ModalBox";

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
    let [detailsOpen, setDetailsOpen] = useState(false);
    let [copied, setCopied] = useState(false);
    let messageRef = useRef();
    let thinkingRef = useRef();
    let msgDivRef = useRef();
    let htmlMsg = useMemo(() => markdown.render(message.message ?? ""), [message.message]);
    let htmlThink = useMemo(() => markdown.render(message.thinking ?? ""), [message.thinking]);

    const isUser = message.role == "user";
    const title = ({
        user: "Usuario",
        assistant: "IA"
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
        
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
        }, 1200);
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

    const tools = message.extra?.tool_calls ? parseToolsForDisplay(message.extra.tool_calls) : [];

    //console.log("Message", Object.assign({}, message), tools.slice());

    const toolAccordions = tools.map((tool, tId) => (
        <Accordion key={tId}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${message.idx}-${tId}-panel2-content`}
                id={`${message.idx}-${tId}-panel2-header`}>
                Herramienta {tool.name}: {tool.args}
            </AccordionSummary>
            <AccordionDetails>
                {tool.result}
            </AccordionDetails>
        </Accordion>
    ));
    
    // The streamed message doesn't receive an actions object
    const msgActions = actions && (message.role == "assistant" ? (<>
        <SmallIconButton
            title="Copiar"
            onClick={copyMessage}
            icon={!copied ? CopyIcon : CheckIcon} />
        <SmallIconButton
            title="Regenerar"
            onClick={() => actions.regenerateSince(message.idx)}
            disabled={generating}
            icon={ReplayIcon} />
    </>) : message.role == "user" ? (<>
        <SmallIconButton
            title="Copiar"
            onClick={copyMessage}
            icon={!copied ? CopyIcon : CheckIcon} />
        <SmallIconButton
            title="Editar"
            onClick={() => actions.editMessage(message.idx)}
            disabled={generating}
            icon={EditIcon} />
    </>) : (<></>));

    const getModelDetail = (title, detail) => detail ? <li><b>{title}</b>{detail}</li> : null;
    const modelDetails = actions && message.role == "assistant" ? <>
        &middot; <ActionLink action={() => setDetailsOpen(true)}>
            <small>{message.details.model ?? "Más detalles"}</small>
        </ActionLink>
        <ModalBox
            open={detailsOpen}
            onClose={() => setDetailsOpen(false)}
            id="message-details"
            title="Detalles del mensaje">
            <ul>
                {getModelDetail("Modelo usado: ", message.details.model)}
                {getModelDetail("Tokens totales: ", message.details.totalTokens)}
                {getModelDetail("Tokens del prompt: ", message.details.promptTokens)}
                {getModelDetail("Tokens de respuesta: ", message.details.answerTokens)}
            </ul>
        </ModalBox>
    </> : null;

    const highlighted = highlight === message.idx;

    useEffect(() => {
        messageRef.current.innerHTML = htmlMsg;
        if (message.thinking) {
            thinkingRef.current.innerHTML = htmlThink;
        }
    }, [htmlMsg, htmlThink]);

    useEffect(() => {
        if (highlighted) {
            msgDivRef.current.scrollIntoView();
        }
    }, [highlight]);

    return (
        <div className={`msg-div ${isUser ? "user-msg" : "ai-msg"}${highlighted ? " highlighted" : ""}`} ref={msgDivRef}>
            <div className="msg-inner-div">
                <p><b>{title}</b></p>
                {thinkingAccordion}
                <div className="message-div" ref={messageRef}></div>
                {toolAccordions}
                <div>
                    {msgActions}
                    {modelDetails}
                </div>
            </div>
        </div>
    );
}

export default memo(ChatMessage);