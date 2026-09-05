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
            There was an error making the request.&#x20;
            {(!error.noRetry ? (<ActionLink action={tryAgain}>Try again.</ActionLink>) : (<></>))}
            &#x20;Error: {error}
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