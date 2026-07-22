import { markdown } from "markdown";
import { useEffect, useRef } from "react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

function ChatMessage({message}) {
    let messageRef = useRef();

    useEffect(() => {
        messageRef.current.outerHTML = markdown.toHTML(message.message);
    }, []);

    const isUser = message.role == "user";

    console.log(message);

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