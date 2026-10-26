import { memo, useMemo, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ActionLink from "./ActionLink";
import Alert from '@mui/material/Alert'
import AlertTitle from "@mui/material/AlertTitle";
import Divider from '@mui/material/Divider'

function MessageList({msgList, currentMsg, error, generating, actions, highlight}) {
    const listRef = useRef(null);
    const prevMaxScrollRef = useRef(null);
    /*let newMsgList = [];
    for (let i = 0; i < msgList.length - 1; i++) {
        if (msgList[i].toolCalls && msgList[i + 1].tool)
    }*/

    let tryAgain = () => actions.tryAgain();

    let newMsgList = useMemo(() => {
        let newMsgList = [], aiMsg = null;
        for (let msg of msgList) {
            if (msg.role == "assistant") {
                aiMsg = msg.extra?.tool_calls ? structuredClone(msg) : msg;
                newMsgList.push(aiMsg);
            }
            else if (msg.role == "tool" && aiMsg) {
                let call = aiMsg.extra?.tool_calls?.find?.(c => c.id === msg.extra?.tool_call_id);
                if (call) 
                    call.result = msg.message;
            }
            else {
                aiMsg = null;
                newMsgList.push(msg);
            }
        }
        return newMsgList;
    }, [msgList]);

    msgList = newMsgList;

    let messageList = msgList.map(msg => (
        <ChatMessage 
            key={msg.idx * 2}
            message={msg}
            generating={generating}
            actions={actions}
            highlight={highlight}/>
    ));

    for (let i = 1; i < messageList.length; i += 2) {
        messageList.splice(i, 0, <Divider key={i}/>);
    }

    //console.log("Updated list", currentMsg);

    const newChat = msgList.length == 0 ? (
        <div id="new-chat">
            <h2>Nuevo chat</h2>
            <p>Envía un mensaje para iniciar una nueva conversación.</p>
        </div>
    ) : <></>;

    const curMsg = currentMsg != null ? <>
        <Divider/>
        <ChatMessage message={currentMsg}/>
    </> : "";

    const errorMsg = error != null ? (
        <Alert severity="error">
            <AlertTitle>Hubo un error realizando la solicitud.&#x20;
            <ActionLink action={tryAgain} show={!error.noRetry}>Vuelva a intentarlo.</ActionLink></AlertTitle>
            {error + ""}
        </Alert>
    ) : <></>;

    useEffect(() => {
        if (generating) {
            let list = listRef.current;
            let maxScroll = list.scrollHeight - list.clientHeight;
            list.scroll({top: maxScroll, behavior: "instant"});
            prevMaxScrollRef.current = maxScroll;
        }
        else {
            prevMaxScrollRef.current = null;
        }
    }, [generating]);

    useEffect(() => {
        if (msgList && !generating) {
            let list = listRef.current;
            list.scroll({top: list.scrollHeight - list.clientHeight, behavior: "instant"});
        }
    }, [msgList]);

    useEffect(() => {
        if (currentMsg == null)
            return;

        let list = listRef.current;
        let maxScroll = list.scrollHeight - list.clientHeight;
        if (prevMaxScrollRef.current - list.scrollTop <= 1) {
            list.scrollTo({top: maxScroll, behavior: "instant"});
        }
        prevMaxScrollRef.current = maxScroll;
    }, [currentMsg]);

    return (
        <div id="message-list" ref={listRef}>
            {newChat}
            {messageList}
            {curMsg}
            {errorMsg}
        </div>
    );
}

export default memo(MessageList);
