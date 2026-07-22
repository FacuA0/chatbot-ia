import { useState, useEffect } from 'react'
import ChatList from './components/ChatList'
import InputBar from './components/InputBar'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
    const [generating, setGenerating] = useState(false);
    const [messageList, setMessageList] = useState([]);
    const [curMessage, setCurMessage] = useState(null);
    const [error, setError] = useState(null);

    function addMessage(role, message, thinking) {
        setMessageList(list => [...list, {
            idx: list.length,
            role,
            message,
            thinking
        }]);
    }

    function resetChat() {
        setMessageList([]);
        setGenerating(false);
        setError(null);
    }
    
    function sendFakeMessage(text) {
        addMessage("user", text);
        setGenerating(true);
        setError(null);

        setTimeout(() => {
            addMessage("assistant", text, "The user said '" + text + "'. I should reply the same.");
            setGenerating(false);
        }, 1000);
    }

    function sendMessage(text) {
        addMessage("user", text);
        setGenerating(true);
        setError(null);

        let opts = {
            model: "big-pickle",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                },
                ...messageList.map(msg => ({
                    role: msg.role,
                    content: msg.message
                })),
                {
                    role: "user",
                    content: text
                }
            ],
            stream: true
        };

        fetch("http://localhost:5174", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(opts)
        })
        .then(async res => {
            if (!res.ok) {
                let body = await res.json();
                throw new Error(body?.error?.message ?? body ?? res.statusText);
            }

            let events = res.clone().body;
            let decoder = new TextDecoder();
            let textPart = "", acumThink = "", acumMsg = "";

            for await (const chunk of events) {
                textPart += decoder.decode(chunk.buffer);

                //console.log(1, textPart);

                while (textPart.indexOf("\n\n") > -1) {
                    let partLines = textPart.substring(0, textPart.indexOf("\n\n")).split("\n");
                    //console.log(2, partLines);
                    if (partLines[0].startsWith("data: ")) {
                        let content = partLines[0].substring(6);
                        for (let i = 1; i < partLines.length; i++) {
                            if (!partLines[i].startsWith("data: "))
                                break;
                            content += "\n" + partLines[i].substring(6);
                        }

                        //console.log(3, content);

                        // Terminar stream
                        if (content == "[DONE]") {
                            console.log(4, "[DONE]");
                            setCurMessage(null);
                            addMessage("assistant", acumMsg, acumThink);
                            setGenerating(false);
                        }
                        else {
                            let json = JSON.parse(content), choice;

                            console.log(4, json.choices, acumThink, acumMsg);

                            if ((choice = json.choices[0]) && choice.finish_reason == null) {
                                if (choice.delta.reasoning)
                                    acumThink += choice.delta.reasoning;
                                else if (choice.delta.content.length > 0)
                                    acumMsg += choice.delta.content;
                            }
                        }
                    }

                    textPart = textPart.substring(textPart.indexOf("\n\n") + 2);
                }

                // Actualizar mensaje reciente
                if (generating) {
                    setCurMessage({
                        idx: 2147483647,
                        role: "assistant",
                        message: acumMsg,
                        thinking: acumThink
                    });
                }
            }
            //return res.json();
        })/*
        .then(json => {
            let message = json?.choices?.[0]?.message;
            console.log(message);
            let text = message?.content;
            if (text) {
                addMessage("assistant", text, message?.reasoning);
            }
            else {
                setError("There was an error getting the message. Try again");
                console.log(json);
            }
            setGenerating(false);
        })*/
        .catch(err => {
            setError("There was an error making the request. Try again. Error: " + err.message);
            console.error(err);
            setGenerating(false);
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
