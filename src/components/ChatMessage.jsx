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
        console.log(message.message, "-", html);
    }, [message]);

    const isUser = message.role == "user";

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

    return (
        <div className={`msg-div ${isUser ? "user-msg" : "ai-msg"}`}>
            <div className="inner-msg-div">
                <p><b>{isUser ? "User" : "AI"}</b></p>
                {thinkingAccordion}
                <p ref={messageRef}></p>
            </div>
        </div>
    );
}

export default ChatMessage;