import ChatMessage from "./ChatMessage";
import Divider from '@mui/material/Divider'

function ChatList({msgList, currentMsg, error, actions}) {
    /*let newMsgList = [];
    for (let i = 0; i < msgList.length - 1; i++) {
        if (msgList[i].toolCalls && msgList[i + 1].tool)
    }*/

    let tryAgain = () => actions.tryAgain();

    let chatList = msgList.map(msg => (
        <ChatMessage key={msg.idx * 2} message={msg} actions={actions}/>
    ));

    for (let i = 1; i < chatList.length; i += 2) {
        chatList.splice(i, 0, <Divider key={i}/>);
    }

    //console.log("Updated list", currentMsg);

    const curMsg = currentMsg != null ? <>
        <Divider key={currentMsg.idx - 1}/>
        <ChatMessage key={currentMsg.idx} message={currentMsg}/>
    </> : "";

    const errorMsg = error != null ? (
        <div id="msg-error">
            There was an error making the request. <span onClick={tryAgain}>Try again.</span> Error: {error}
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

export default ChatList;