import ChatMessage from "./ChatMessage";
import Divider from '@mui/material/Divider'

function ChatList({msgList, error}) {
    let chatList = msgList.map(msg => (
        <ChatMessage key={msg.idx * 2} message={msg}/>
    ));

    for (let i = 1; i < chatList.length; i += 2) {
        chatList.splice(i, 0, <Divider key={i}/>);
    }

    const errorMsg = error != null ? (
        <div id="msg-error">{error}</div>
    ) : "";

    return (
        <div id="chat-list">
            {chatList}
            {errorMsg}
        </div>
    );
}

export default ChatList;