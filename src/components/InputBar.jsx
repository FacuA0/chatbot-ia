import { useEffect, useRef, useState } from 'react'
import ActionLink from './ActionLink'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import StopIcon from '@mui/icons-material/Stop';

function InputBar({sendMsg, sendFake, resetChat, stopGen, stopEdit, goToEdit, generating, edition}) {
    const [promptText, setPromptText] = useState("");
    const input = useRef();

    function sendMessage() {
        if (promptText != "") {
            sendMsg(promptText);
            setPromptText("");
        }
    }

    function sendFakeMessage() {
        sendFake(promptText);
        setPromptText("");
    }

    function reset() {
        resetChat()
        setPromptText("");
    }

    const iconBtn = generating ? (
        <IconButton 
            title="Detener"
            onClick={stopGen}>
            <StopIcon/>
        </IconButton>
    ) : (
        <IconButton 
            title="Reiniciar chat"
            onClick={resetChat}>
            <DeleteIcon/>
        </IconButton>
    )

    const editingBar = edition != null ? (
        <div id='editing-bar'>
            <p><ActionLink action={goToEdit}>Editando mensaje</ActionLink></p>
            <IconButton 
                title="Dejar de editar"
                onClick={stopEdit}
                size='small'>
                <CloseIcon fontSize='inherit'/>
            </IconButton>
        </div>
    ) : (<></>);

    useEffect(() => {
        if (edition != null) {
            setPromptText(edition.text);
            input.current.focus();
        }
    }, [edition]);

    return (
        <div id='bottom-bar'>
            {editingBar}
            <div id='input-bar'>
                <TextField
                    variant='outlined'
                    size='small'
                    label="Prompt"
                    value={promptText}
                    inputRef={input}
                    onChange={e => setPromptText(e.target.value)}
                    disabled={generating}
                    multiline/>
                <Button 
                    variant='contained' 
                    onClick={sendMessage}
                    loading={generating}>Enviar</Button>
                <Button 
                    variant='outlined' 
                    onClick={sendFakeMessage}
                    loading={generating}>Test</Button>
                {iconBtn}
            </div>
        </div>
    );
}

export default InputBar;