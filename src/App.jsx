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

    function resetChat() {
        setMessageList([]);
        setGenerating(false);
        setCurMessage(null);
        setError(null);
    }
    
    async function sendFakeMessage(text) {
        let msgList = [...messageList];
        addMessage(msgList, "user", text);
        setMessageList(msgList);
        setGenerating(true);
        setError(null);

        let iterate = false;
        
        try {
            do {
                let ans = await generateFakeAnswer(text, updateCurrent);

                setCurMessage(null);
                let toolCallsObj = ans.toolCalls ? {tool_calls: ans.toolCalls} : {}
                addMessage(msgList, "assistant", ans.message, ans.thinking, toolCallsObj);
                setMessageList(msgList);
                if (ans.toolCalls) {
                    iterate = true;
                    
                    for (let call of ans.toolCalls) {
                        if (call.type != "function") continue;
                        if (call.function.name == "calculate_numbers") {
                            let params = JSON.parse(call.function.arguments);
                            let answer = eval(`${params.number1} ${params.operator} ${params.number2}`);
                            addMessage(msgList, "tool", answer + "", null, {
                                toolId: call.id
                            });
                            setMessageList(msgList);
                        }
                    }
                }
                else {
                    setGenerating(false);
                    iterate = false;
                }
            } while (iterate);
        }
        catch (err) {
            setError("There was an error making the request. Try again. Error: " + err.message);
            console.error(err);
            setGenerating(false);
        }

        /*
        let res = await generateFakeAnswer(text, updateCurrent);
        
        addMessage(msgList, "assistant", res.message, res.thinking);
        setMessageList(msgList);
        setCurMessage(null);
        setGenerating(false);*/
    }

    async function sendMessage(text) {
        let msgList = [...messageList];
        //console.debug("One ", JSON.stringify(msgList));
        addMessage(msgList, "user", text);
        setMessageList(msgList);
        console.debug("Two ", JSON.stringify(msgList));
        setGenerating(true);
        setError(null);
        
        let iterate = false;
        
        try {
            do {
                //console.debug("Three ", JSON.stringify(msgList));
                let ans = await queryAI(msgList, updateCurrent);
                
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
                    setGenerating(false);
                    iterate = false;
                    //console.debug("Eight ", JSON.stringify(msgList));
                }
            } while (iterate);
            console.debug("Nine ", JSON.stringify(msgList));
        }
        catch (err) {
            setError("There was an error making the request. Try again. Error: " + err.message);
            console.error(err);
            setGenerating(false);
        }
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

    return (
        <main>
            <h1>Chatbot IA</h1>

            <ChatList msgList={messageList} currentMsg={curMessage} error={error}/>
            <InputBar sendMsg={sendMessage} sendFake={sendFakeMessage} resetChat={resetChat} generating={generating}/>
        </main>
    );
}

export default App
