import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ChatList from './components/ChatList'
import TopMenu from './components/TopMenu'
import MessageList from './components/MessageList'
import InputBar from './components/InputBar'
import AlertDialog from './components/AlertDialog'
import { Alert, Button } from '@mui/material'
import './App.css'
import { processToolCalls } from "./tools"
import { generateFakeAnswer, getConfig, saveConfig, queryAI,
    checkPublicProxy, setVariedInterval, newChat, closeDB,
    getChatMessages, storeNewMessage, deleteMessages} from './utils'

function App() {
    const [config, setConfig] = useState(getConfig);
    const [generation, setGeneration] = useState(null);
    const [curMessage, setCurMessage] = useState(null);
    const [error, setError] = useState(null);
    const [chat, setChat] = useState({});
    const [messageList, setMessageList] = useState([]);
    const [highlight, setHighlight] = useState(null);
    const [edition, setEdition] = useState(null);
    const [proxyAlert, setProxyAlert] = useState(false);
    const [proxyBanner, setProxyBanner] = useState(false);
    const proxyCheckRef = useRef(null);
    const pendingRef = useRef(null);
    const rafRef = useRef(null);
    const dbRef = useRef(null);
    const configRef = useRef(config);
    const chatRef = useRef(chat);
    const messageListRef = useRef(messageList);

    function setGlobalError(error) {
        if (error.message.includes("/corsdemo")) {
            setProxyBanner(true);
        }
        else {
            setError(error);
        }
    }

    function exportChat() {
        let a = document.createElement("a");
        a.download = "ai-chat.json";
        a.href = URL.createObjectURL(new Blob([JSON.stringify(messageList)]));
        a.click();
    }

    const editMessage = useCallback((msgIdx) => {
        const msg = messageListRef.current.find(msg => msg.idx == msgIdx);
        setEdition({
            idx: msgIdx,
            text: msg.message
        });
    }, []);

    const regenerateSince = useCallback(async (index) => {
        let curMsgList = messageListRef.current;
        let curChat = chatRef.current;

        let lastInd = curMsgList.findLastIndex(msg => msg.idx == index);
        let prevMsgs = curMsgList.slice(0, lastInd);
        if (prevMsgs.length == 0) return;
    
        setMessageList(prevMsgs);

        try {
            await deleteMessages(dbRef, curChat, curMsgList[lastInd].idx, curMsgList[curMsgList.length - 1].idx);
        }
        catch (err) {
            setError(err);
            closeDB(dbRef);
            return;
        }

        generateAnswer(curChat, prevMsgs);
    }, []);

    const tryAgain = useCallback(async () => {
        let curMsgList = messageListRef.current;
        let curChat = chatRef.current;

        let lastInd = curMsgList.findLastIndex(msg => msg.role != "assistant") + 1;
        let prevMsgs = curMsgList.slice(0, lastInd);
        if (prevMsgs.length == 0) return;

        setMessageList(prevMsgs);

        if (lastInd < curMsgList.length) {
            try {
                await deleteMessages(dbRef, curChat, curMsgList[lastInd].idx, curMsgList[curMsgList.length - 1].idx);
            }
            catch (err) {
                setError(err);
                closeDB(dbRef);
                return;
            }
        }

        generateAnswer(curChat, prevMsgs);
    }, []);

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

    function changeConfig(newConfig) {
        setConfig(newConfig);
        saveConfig(newConfig);
    }

    async function setCurrentChat(newChat) {
        if (newChat.id != null) {
            setMessageList(await getChatMessages(newChat));
        }
        else {
            setMessageList([]);
        }

        setChat(newChat);
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
    
    async function sendMessage(text, options = {}) {
        let msgList = [...messageList];

        if (edition != null) {
            msgList = msgList.slice(0, edition.idx);

            try {
                await deleteMessages(dbRef, chat, messageList[edition.idx].idx, messageList[messageList.length - 1].idx);
            }
            catch (err) {
                setError(err);
                closeDB(dbRef);
                return;
            }

            setEdition(null);
        }
        
        //console.debug("One ", JSON.stringify(msgList));
        msgList = addMessage(msgList, "user", text);
        setMessageList(msgList);
        
        let curChat = chat;
        if (chat.id == null) {
            curChat = newChat();
            setChat(curChat);
        }
        
        try {
            await storeNewMessage(dbRef, curChat, msgList[msgList.length - 1]);
        }
        catch (err) {
            setError(err);
            closeDB(dbRef);
            return;
        }

        //console.debug("Two ", JSON.stringify(msgList));
        
        generateAnswer(curChat, msgList, options);
    }

    async function generateAnswer(curChat, msgList, options) {
        const currentConfig = configRef.current;
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
                    ans = await queryAI(msgList, currentConfig, updateCurrent, abort.signal);
                
                //console.debug("Four ", JSON.stringify(msgList));
                cancelUpdates();
                setCurMessage(null);
                setProxyBanner(false);

                let toolCallsObj = ans.toolCalls.length > 0 ? {tool_calls: ans.toolCalls} : {}
                msgList = addMessage(msgList, "assistant", ans.message, ans.thinking, ans.details, toolCallsObj);
                setMessageList(msgList);
                await storeNewMessage(dbRef, curChat, msgList[msgList.length - 1]);

                //console.debug("Five ", JSON.stringify(msgList));
                if (ans.toolCalls.length > 0 && !abort.signal.aborted) {
                    iterate = true;

                    let toolResults = await processToolCalls(currentConfig, ans.toolCalls, {abort});
                    
                    for (let res of toolResults) {
                        msgList = addMessage(msgList, "tool", res.msg, null, null, {
                            tool_call_id: res.id
                        });
                        await storeNewMessage(dbRef, curChat, msgList[msgList.length - 1]);
                    }
                    setMessageList(msgList);
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
                setProxyBanner(true);
            }
            else if (!err.toString().includes("AbortError")) {
                setError(err);
                console.error(err);
            }
        }

        closeDB(dbRef);
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
            setProxyBanner(false);
            proxyCheckRef.current?.abort?.();
            proxyCheckRef.current = null;
        }
    }

    function goToEnableProxy() {
        open("https://cors-anywhere.herokuapp.com/corsdemo");
        if (proxyCheckRef.current)
            return;

        document.addEventListener("visibilitychange", change);
        function change() {
            if (document.visibilityState != 'visible')
                return;

            let abort = new AbortController();
            proxyCheckRef.current = abort;
            setVariedInterval(recheckProxy, abort.signal, 500, [3000, 12000], [8000, 60000], [20000, 10 * 60 * 1000]);
            document.removeEventListener("visibilitychange", change);
        }
    }
    
    const bannerDiv = proxyBanner ? <Alert 
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

    useEffect(() => (configRef.current = config, undefined), [config]);
    useEffect(() => (chatRef.current = chat, undefined), [chat]);
    useEffect(() => (messageListRef.current = messageList, undefined), [messageList]);

    useEffect(() => {
        if (location.hostname != "localhost") {
            checkPublicProxy().then(active => {
                if (!active) {
                    setProxyBanner(true);
                    setProxyAlert(true);
                }
            });
        }
    }, []);

    return (
        <main>
            <header>
                <ChatList
                    curChat={chat}
                    setCurChat={setCurrentChat}/>
                <h1>Chatbot IA</h1>
                <TopMenu 
                    config={config}
                    proxyError={proxyBanner}
                    setConfig={changeConfig}
                    setError={setGlobalError}
                    exportChat={exportChat}/>
            </header>
            {bannerDiv}

            <MessageList
                msgList={messageList}
                currentMsg={curMessage}
                error={error}
                generating={generation != null}
                actions={actions}
                highlight={highlight}/>
            <InputBar
                sendMsg={sendMessage}
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
