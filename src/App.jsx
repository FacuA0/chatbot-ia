import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import TopMenu from './components/TopMenu'
import ChatList from './components/ChatList'
import InputBar from './components/InputBar'
import AlertDialog from './components/AlertDialog'
import { Alert, Button } from '@mui/material'
import './App.css'
import { generateFakeAnswer, getDefaultConfig, queryAI, checkPublicProxy } from './utils'
import { processToolCall } from "./tools"

function App() {
    const [config, setConfig] = useState(getDefaultConfig);
    const [generation, setGeneration] = useState(null);
    const [curMessage, setCurMessage] = useState(null);
    const [error, setError] = useState(null);
    const [messageList, setMessageList] = useState([]);
    const [highlight, setHighlight] = useState(null);
    const [edition, setEdition] = useState(null);
    const [proxyAlert, setProxyAlert] = useState(false);
    const [bannerProxy, setBannerProxy] = useState(false);
    const proxyCheckRef = useRef(null);
    const pendingRef = useRef(null);
    const rafRef = useRef(null);

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
    }, [messageList, config]);

    const tryAgain = useCallback(() => {
        let prevMsgs = messageList.slice(0, messageList.findLastIndex(msg => msg.role != "assistant") + 1);
        if (prevMsgs.length == 0) return;

        setMessageList(prevMsgs);
        generateAnswer(prevMsgs);
    }, [messageList, config]);

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

    function addMessage(msgList, role, message, thinking, details, extra = {}) {
        console.debug("Adding msg", message, "- think", thinking);

        let reasoning = thinking != null ? {reasoning_content: thinking} : {};
        let newList = [...msgList, {
            idx: msgList.length,
            role,
            message,
            thinking,
            details,
            extra: {
                ...extra,
                ...reasoning
            }
        }];
        //console.debug("new newlists " + JSON.stringify(msgList));
        //console.debug("added msg", message, "- think", thinking);

        return newList;
    }
    
    function sendMessage(text, options = {}) {
        let msgList = [...messageList];
        if (edition != null) {
            msgList = msgList.slice(0, edition.idx);
            setEdition(null);
        }

        //console.debug("One ", JSON.stringify(msgList));
        msgList = addMessage(msgList, "user", text);
        setMessageList(msgList);

        //console.debug("Two ", JSON.stringify(msgList));
        
        generateAnswer(msgList, options);
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
                    ans = await queryAI(msgList, config, updateCurrent, abort.signal);
                
                //console.debug("Four ", JSON.stringify(msgList));
                cancelUpdates();
                setCurMessage(null);
                setBannerProxy(false);

                let toolCallsObj = ans.toolCalls.length > 0 ? {tool_calls: ans.toolCalls} : {}
                msgList = addMessage(msgList, "assistant", ans.message, ans.thinking, ans.details, toolCallsObj);
                setMessageList(msgList);

                //console.debug("Five ", JSON.stringify(msgList));
                if (ans.toolCalls.length > 0 && !abort.signal.aborted) {
                    iterate = true;

                    for (let call of ans.toolCalls) {
                        if (call.type != "function") continue;

                        let toolMsg = await processToolCall(config, call, {abort});

                        msgList = addMessage(msgList, "tool", toolMsg, null, null, {
                            tool_call_id: call.id
                        });
                        setMessageList(msgList);
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
            if (err.toString().includes("/corsdemo")) {
                setBannerProxy(true);
            }
            else if (!err.toString().includes("AbortError")) {
                setError(err);
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

    async function recheckProxy() {
        if (await checkPublicProxy()) {
            setBannerProxy(false);
            clearInterval(proxyCheckRef.current[0]);
            clearTimeout(proxyCheckRef.current[1]);
            proxyCheckRef.current = null;
        }
    }

    function goToEnableProxy() {
        open("https://cors-anywhere.herokuapp.com/corsdemo");

        setTimeout(() => {
            proxyCheckRef.current = [
                setInterval(recheckProxy, 5000),
                setTimeout(() => {
                    clearInterval(proxyCheckRef.current[0]);
                    proxyCheckRef.current = [
                        setInterval(recheckProxy, 20000),
                        setTimeout(() => {
                            clearInterval(proxyCheckRef.current[0]);
                            proxyCheckRef.current = null;
                        }, 10 * 60 * 1000)
                    ];
                }, 40000)
            ];
        }, 8000);
    }
    
    const bannerDiv = bannerProxy ? <Alert 
        severity='info' 
        action={
            <Button color="inherit" size="small" onClick={goToEnableProxy}>
                Ir al sitio
            </Button>
        }>
        El proxy público está deshabilitado. Vuelva a habilitar el acceso en su sitio.
    </Alert> : null;

    const actions = useMemo(() => (
        {tryAgain, regenerateSince, editMessage}
    ), [tryAgain, regenerateSince, editMessage]);

    useEffect(() => {
        if (location.hostname != "localhost") {
            checkPublicProxy().then(active => {
                if (!active) {
                    setBannerProxy(true);
                    setProxyAlert(true);
                }
            });
        }
    }, []);

    return (
        <main>
            <header>
                <h1>Chatbot IA</h1>
                <TopMenu 
                    config={config}
                    setConfig={setConfig}
                    setError={setError}
                    exportChat={exportChat}/>
            </header>
            {bannerDiv}

            <ChatList
                msgList={messageList}
                currentMsg={curMessage}
                error={error}
                generating={generation != null}
                actions={actions}
                highlight={highlight}/>
            <InputBar
                sendMsg={sendMessage}
                resetChat={resetChat}
                stopGen={stopGeneration}
                stopEdit={stopEditing}
                goToEdit={goToEdit}
                generating={generation != null}
                edition={edition}/>
            <AlertDialog 
                open={proxyAlert}
                setOpen={setProxyAlert}
                title="Es necesario habilitar el proxy público"
                content={<>
                    Este sitio utiliza un servidor intermediario (proxy) para poder usar servicios de IA y poder acceder a la mayoría de Internet.
                    Dado que es un servicio abierto y, con el fin de reducir abusos, este proxy requiere habilitar el acceso manualmente para este dispositivo.<br/><br/>
                    Para hacerlo, acceda al sitio y haga click en el botón "Request temporary access to the demo server"<br/><br/></>}
                okText="Hecho">
                <Button variant="contained" 
                    onClick={goToEnableProxy}>
                    Acceder al sitio
                </Button>
            </AlertDialog>
        </main>
    );
}

export default App
