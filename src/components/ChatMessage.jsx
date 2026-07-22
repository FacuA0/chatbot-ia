import { markdown } from "markdown";
import { useEffect, useRef } from "react";

function ChatMessage({role, message}) {
    let messageRef = useRef();

    useEffect(() => {
        messageRef.current.outerHTML = markdown.toHTML(message);
    }, []);

    const isUser = role == "user";

    return (
        <div className={`msg-div ${isUser ? "user-msg" : "ai-msg"}`}>
            <div className="inner-msg-div">
                <p><b>{isUser ? "User" : "AI"}</b></p>
                <p ref={messageRef}></p>
            </div>
        </div>
    );
}

export default ChatMessage;