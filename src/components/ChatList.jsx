import { memo } from "react";
import ChatMessage from "./ChatMessage";
import ActionLink from "./ActionLink";
import Divider from '@mui/material/Divider'

function ChatList({msgList, currentMsg, error, generating, actions, highlight}) {
    /*let newMsgList = [];
    for (let i = 0; i < msgList.length - 1; i++) {
        if (msgList[i].toolCalls && msgList[i + 1].tool)
    }*/

    let tryAgain = () => actions.tryAgain();

    let newMsgList = [], aiMsg = null;
    for (let msg of msgList) {
        if (msg.role == "assistant") {
            aiMsg = msg;
            newMsgList.push(msg);
        }
        else if (msg.role == "tool" && aiMsg) {
            let call = aiMsg.extra?.tool_calls?.find?.(c => c.id === msg.extra?.tool_call_id);
            call.result = msg.message;
        }
        else {
            aiMsg = null;
            newMsgList.push(msg);
        }
    }

    msgList = newMsgList;

    let chatList = msgList.map(msg => (
        <ChatMessage 
            key={msg.idx * 2}
            message={msg}
            generating={generating}
            actions={actions}
            highlight={highlight}/>
    ));

    for (let i = 1; i < chatList.length; i += 2) {
        chatList.splice(i, 0, <Divider key={i}/>);
    }

    //console.log("Updated list", currentMsg);

    const curMsg = currentMsg != null ? <>
        <Divider/>
        <ChatMessage message={currentMsg}/>
    </> : "";

    const errorMsg = error != null ? (
        <div id="msg-error">
            Hubo un error realizando la solicitud.&#x20;
            {(!error.noRetry ? (<ActionLink action={tryAgain}>Vuelva a intentarlo.</ActionLink>) : (<></>))}
            &#x20;{error + ""}
        </div>
    ) : "";

    return (
        <div id="chat-list">
            {chatList}
            {curMsg}
            {errorMsg}
        </div>
    );
}

export default memo(ChatList);