import { useState, useEffect } from 'react'
import ChatList from './components/ChatList'
import InputBar from './components/InputBar'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { generateFakeAnswer, queryAI } from './utils'

function App() {
    const [generating, setGenerating] = useState(false);
    const [curMessage, setCurMessage] = useState(null);
    const [error, setError] = useState(null);
    const [messageList, setMessageList] = useState([]);

    //let newLists = [...messageList];

    function addMessage(msgList, role, message, thinking, extra = {}) {
        console.debug("Adding msg", message, "- think", thinking);
        msgList.push({
            idx: msgList.length,
            role,
            message,
            thinking,
            extra
        });
        console.debug("new newlsts " + JSON.stringify(msgList));
        //console.debug("added msg", message, "- think", thinking);
    }

    function regenerateSince(index) {
        let prevMsgs = messageList.slice(0, messageList.findLastIndex(msg => msg.idx == index));
        if (prevMsgs.length == 0) return;
    
        setMessageList(prevMsgs);
        generateAnswer(prevMsgs);
    }

    function tryAgain() {
        let prevMsgs = messageList.slice(0, messageList.findLastIndex(msg => msg.role == "user") + 1);
        if (prevMsgs.length == 0) return;

        setMessageList(prevMsgs);
        generateAnswer(prevMsgs);
    }

    function resetChat() {
        setMessageList([]);
        setGenerating(false);
        setCurMessage(null);
        setError(null);
    }
    
    function sendFakeMessage(text) {
        let msgList = [...messageList];
        addMessage(msgList, "user", text);
        setMessageList(msgList);
        
        generateAnswer(msgList, {
            fake: true, 
            text
        });

        /*
        let res = await generateFakeAnswer(text, updateCurrent);
        
        addMessage(msgList, "assistant", res.message, res.thinking);
        setMessageList(msgList);
        setCurMessage(null);
        setGenerating(false);*/
    }

    function sendMessage(text) {
        let msgList = [...messageList];
        //console.debug("One ", JSON.stringify(msgList));
        addMessage(msgList, "user", text);
        setMessageList(msgList);
        console.debug("Two ", JSON.stringify(msgList));
        
        generateAnswer(msgList);
    }

    async function generateAnswer(msgList, options) {
        setGenerating(true);
        setError(null);
        
        let iterate = false;
        
        try {
            do {
                //console.debug("Three ", JSON.stringify(msgList));
                let ans;
                if (options?.fake)
                    ans = await generateFakeAnswer(options.text, updateCurrent);
                else
                    ans = await queryAI(msgList, updateCurrent);
                
                //console.debug("Four ", JSON.stringify(msgList));
                setCurMessage(null);
                let toolCallsObj = ans.toolCalls.length > 0 ? {tool_calls: ans.toolCalls} : {}
                addMessage(msgList, "assistant", ans.message, ans.thinking, toolCallsObj);
                setMessageList(msgList);
                //console.debug("Five ", JSON.stringify(msgList));
                if (ans.toolCalls.length > 0) {
                    iterate = true;

                    for (let call of ans.toolCalls) {
                        if (call.type != "function") continue;
                        if (call.function.name == "calculate_numbers") {
                            let params = JSON.parse(call.function.arguments);
                            let startAns = `${params.number1} ${params.operator} ${params.number2}`;
                            let answer = startAns + " = " + eval(startAns);
                            //console.debug("Six ", JSON.stringify(msgList));
                            addMessage(msgList, "tool", answer, null, {
                                tool_call_id: call.id
                            });
                            setMessageList(msgList);
                            //console.debug("Seven ", JSON.stringify(msgList));
                        }
                    }
                }
                else {
                    iterate = false;
                    //console.debug("Eight ", JSON.stringify(msgList));
                }
            } while (iterate);

            console.debug("Nine ", JSON.stringify(msgList));
        }
        catch (err) {
            setError(err.message);
            console.error(err);
        }

        setGenerating(false);
    }
        
    function updateCurrent(msg, think, calls) {
        setCurMessage({
            idx: 2147483647,
            role: "assistant",
            message: msg,
            thinking: think,
            extra: {
                tool_calls: calls
            }
        });
    }

    const actions = {tryAgain, regenerateSince};

    return (
        <main>
            <h1>Chatbot IA</h1>

            <ChatList msgList={messageList} currentMsg={curMessage} error={error} actions={actions}/>
            <InputBar sendMsg={sendMessage} sendFake={sendFakeMessage} resetChat={resetChat} generating={generating}/>
        </main>
    );
}

export default App
