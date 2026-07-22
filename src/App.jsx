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
    const [error, setError] = useState(null);

    function addMessage(role, message) {
        setMessageList(list => [...list, {
            idx: list.length,
            role,
            message
        }]);
    }

    function resetChat() {
        setMessageList([]);
        setGenerating(false);
        setError(null);
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
            ]
        };

        fetch("http://localhost:5174", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(opts)
        })
        .then(res => res.json())
        .then(json => {
            let text = json?.choices?.[0]?.message?.content;
            if (text) {
                addMessage("assistant", text);
            }
            else {
                setError("There was an error getting the message. Try again");
                console.log(json);
            }
            setGenerating(false);
        })
        .catch(err => {
            setError("There was an error making the request. Try again. Error: " + err.message);
            console.error(err);
            setGenerating(false);
        });
    }

    return (
        <main>
            <h1>Chatbot IA</h1>

            <ChatList msgList={messageList} error={error}/>
            <InputBar sendMsg={sendMessage} resetChat={resetChat} generating={generating}/>
        </main>
    );
}

export default App
