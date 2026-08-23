import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import TopMenu from './components/TopMenu'
import ChatList from './components/ChatList'
import InputBar from './components/InputBar'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { generateFakeAnswer, getModels, queryAI } from './utils'

function App() {
    const [models, setModels] = useState([]);
    const [modelSelected, setModelSelected] = useState(-1);
    const [generation, setGeneration] = useState(null);
    const [curMessage, setCurMessage] = useState(null);
    const [error, setError] = useState(null);
    const [messageList, setMessageList] = useState([]);
    const [highlight, setHighlight] = useState(null);
    const [edition, setEdition] = useState(null);
    const pendingRef = useRef(null);
    const rafRef = useRef(null);

    //let newLists = [...messageList];

    function exportChat() {
        let a = document.createElement("a");
        a.download = "ai-chat.json";
        a.href = URL.createObjectURL(new Blob([JSON.stringify(messageList)]));
        a.click();
    }

    const editMessage = useCallback((msgIdx) => {
        const msg = messageList.find(msg => msg.idx == msgIdx);
        setEdition({
            idx: msgIdx,
            text: msg.message
        });
    }, [messageList]);

    const regenerateSince = useCallback((index) => {
        let prevMsgs = messageList.slice(0, messageList.findLastIndex(msg => msg.idx == index));
        if (prevMsgs.length == 0) return;
    
        setMessageList(prevMsgs);
        generateAnswer(prevMsgs);
    }, [messageList, modelSelected]);

    const tryAgain = useCallback(() => {
        let prevMsgs = messageList.slice(0, messageList.findLastIndex(msg => msg.role == "user") + 1);
        if (prevMsgs.length == 0) return;

        setMessageList(prevMsgs);
        generateAnswer(prevMsgs);
    }, [messageList, modelSelected]);

    function goToEdit() {
        setHighlight(edition.idx);
        setTimeout(() => {
            setHighlight(null);
        }, 1500);
    }

    function stopEditing() {
        setEdition(null);
    }

    function stopGeneration() {
        if (generation) {
            generation.abort();
        }
    }

    function resetChat() {
        setMessageList([]);
        setGeneration(null);
        setEdition(null);
        setCurMessage(null);
        setError(null);
    }

    function addMessage(msgList, role, message, thinking, extra = {}) {
        console.debug("Adding msg", message, "- think", thinking);

        let reasoning = thinking != null ? {reasoning_content: thinking} : {};
        let newList = [...msgList, {
            idx: msgList.length,
            role,
            message,
            thinking,
            extra: {
                ...extra,
                ...reasoning
            }
        }];
        //console.debug("new newlists " + JSON.stringify(msgList));
        //console.debug("added msg", message, "- think", thinking);

        return newList;
    }
    
    function sendFakeMessage(text) {
        let msgList = addMessage(messageList, "user", text);
        setMessageList(msgList);
        
        generateAnswer(msgList, {
            fake: true, 
            text
        });
    }

    function sendMessage(text) {
        let msgList = [...messageList];
        if (edition != null) {
            msgList = msgList.slice(0, edition.idx);
            setEdition(null);
        }

        //console.debug("One ", JSON.stringify(msgList));
        msgList = addMessage(msgList, "user", text);
        setMessageList(msgList);

        //console.debug("Two ", JSON.stringify(msgList));
        
        generateAnswer(msgList);
    }

    async function generateAnswer(msgList, options) {
        let abort = new AbortController();
        setGeneration(abort);
        setError(null);
        
        let iterate = false;
        
        try {
            do {
                //console.debug("Three ", JSON.stringify(msgList));
                let ans;
                if (options?.fake)
                    ans = await generateFakeAnswer(options.text, updateCurrent, abort.signal);
                else
                    ans = await queryAI(msgList, models[modelSelected], updateCurrent, abort.signal);
                
                //console.debug("Four ", JSON.stringify(msgList));
                cancelUpdates();
                setCurMessage(null);
                
                let toolCallsObj = ans.toolCalls.length > 0 ? {tool_calls: ans.toolCalls} : {}
                msgList = addMessage(msgList, "assistant", ans.message, ans.thinking, toolCallsObj);
                setMessageList(msgList);

                //console.debug("Five ", JSON.stringify(msgList));
                if (ans.toolCalls.length > 0 && !abort.signal.aborted) {
                    iterate = true;

                    for (let call of ans.toolCalls) {
                        if (call.type != "function") continue;

                        try {
                            let params = JSON.parse(call.function.arguments);

                            if (call.function.name == "calculate_numbers") {
                                if (!Number.isFinite(params.number1) || !Number.isFinite(params.number2))
                                    throw new Error("Operand(s) aren't a number or aren't finite.");
                                else if (!["+", "-", "*", "/"].includes(params.operator))
                                    throw new Error("Invalid operator.");
                                else if (params.operator == "/" && params.number2 == 0)
                                    throw new Error("Cannot divide by zero.");
    
                                let startAns = `${params.number1} ${params.operator} ${params.number2}`;
                                let answer = startAns + " = " + eval(startAns);
                                //console.debug("Six ", JSON.stringify(msgList));
                                msgList = addMessage(msgList, "tool", answer, null, {
                                    tool_call_id: call.id
                                });
                                setMessageList(msgList);
                                //console.debug("Seven ", JSON.stringify(msgList));
                            }/*
                            else if (call.function.name == "serious_calculator") {
                                if (!Number.isFinite(params.number1) || !Number.isFinite(params.number2))
                                    throw new Error("Operand(s) aren't a number or aren't finite.");
                                else if (!["+", "-", "*", "/"].includes(params.operator))
                                    throw new Error("Invalid operator.");
                                else if (params.operator == "/" && params.number2 == 0)
                                    throw new Error("Cannot divide by zero.");
                                else if (params.number2 > 1000)
                                    throw new Error("Number 2 is greater than 1000.");
                                else if (params.number2 < 0)
                                    throw new Error("Number 2 is negative.");

                                let animals = ["Elefante", "León", "Foca", "Girafa", "Perro", "Delfín", "Gato", "Ballena", "Rinoceronte", "Tigre"]
    
                                let startAns = `${params.number1} ${params.operator} ${params.number2}`;
                                let answer = startAns + " = " + new Array(Math.round(params.number2)).fill(animals[Math.round(Math.abs(params.number1)) % animals.length]).join(" ");
                                //console.debug("Six ", JSON.stringify(msgList));
                                addMessage(msgList, "tool", answer, null, {
                                    tool_call_id: call.id
                                });
                                setMessageList(msgList);
                                //console.debug("Seven ", JSON.stringify(msgList));
                            }*/
                            else if (call.function.name == "web_request") {
                                if (typeof params.url != "string")
                                    throw new Error("Invalid URL param: not a string or doesn't exist.");
                                let url = new URL(params.url);

                                let webRes = await fetch("http://localhost:5174/" + url, {
                                    signal: abort.signal
                                });
                                let body = await webRes.text();

                                let answer = webRes.status + " " + webRes.statusText + "\n\n" + body;
                                msgList = addMessage(msgList, "tool", answer, null, {
                                    tool_call_id: call.id
                                });
                                setMessageList(msgList);
                            }
                            else {
                                throw new Error("Invalid tool name: " + call.function.name);
                            }
                        }
                        catch (err) {
                            let errMsg = err.message;
                            if (errMsg.includes("JSON.parse")) {
                                errMsg = "Malformed JSON parameters object.";
                            }

                            msgList = addMessage(msgList, "tool", "Tool error: " + errMsg, null, {
                                tool_call_id: call.id
                            });
                            setMessageList(msgList);
                        }
                    }
                }
                else {
                    iterate = false;
                    //console.debug("Eight ", JSON.stringify(msgList));
                }
            } while (iterate);

            //console.debug("Nine ", JSON.stringify(msgList));
        }
        catch (err) {
            cancelUpdates();
            if (!err.toString().includes("AbortError")) {
                setError(err.message);
                console.error(err);
            }
        }

        setGeneration(null);
    }
        
    function updateCurrent(msg, think, calls) {
        pendingRef.current = { msg, think, calls };
        if (rafRef.current != null)
            return;

        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            if (!pendingRef.current) 
                return;

            let { msg, think, calls } = pendingRef.current;
            pendingRef.current = null;
            setCurMessage({
                idx: 2147483647,
                role: "assistant",
                message: msg,
                thinking: think,
                extra: {
                    tool_calls: calls?.map(call => structuredClone(call))
                }
            });
        });
    }

    function cancelUpdates() {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        pendingRef.current = null;
    }

    useEffect(() => {
        getModels()
        .then(newModels => {
            setModels(newModels);
    
            let selModel = newModels.findIndex(e => e == "big-pickle");
            if (selModel == -1) selModel = 0;
            setModelSelected(selModel);
        })
        .catch(err => {
            err.noRetry = true;
            setError(err);
        });
    }, []);

    const actions = useMemo(() => (
        {tryAgain, regenerateSince, editMessage}
    ), [tryAgain, regenerateSince, editMessage]);

    return (
        <main>
            <header>
                <h1>Chatbot IA</h1>
                <TopMenu 
                    models={models}
                    selected={modelSelected}
                    selModel={setModelSelected}
                    exportChat={exportChat}/>
            </header>

            <ChatList
                msgList={messageList}
                currentMsg={curMessage}
                error={error}
                generating={generation != null}
                actions={actions}
                highlight={highlight}/>
            <InputBar
                sendMsg={sendMessage}
                sendFake={sendFakeMessage}
                resetChat={resetChat}
                stopGen={stopGeneration}
                stopEdit={stopEditing}
                goToEdit={goToEdit}
                generating={generation != null}
                edition={edition}/>
        </main>
    );
}

export default App
