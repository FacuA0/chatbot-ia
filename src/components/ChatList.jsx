import ChatMessage from "./ChatMessage";
import Divider from '@mui/material/Divider'

function ChatList({msgList, currentMsg, error}) {
    let chatList = msgList.map(msg => (
        <ChatMessage key={msg.idx * 2} message={msg}/>
    ));

    for (let i = 1; i < chatList.length; i += 2) {
        chatList.splice(i, 0, <Divider key={i}/>);
    }

    //console.log("Updated list", currentMsg);

    const curMsg = currentMsg != null ? (
        <ChatMessage key={currentMsg.idx} message={currentMsg}/>
    ) : "";

    const errorMsg = error != null ? (
        <div id="msg-error">{error}</div>
    ) : "";

    return (
        <div id="chat-list">
            {chatList}
            {curMsg}
            {errorMsg}
        </div>
    );
}

export default ChatList;