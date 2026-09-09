import { useEffect, useRef, useState } from 'react';
import ActionLink from './ActionLink';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import StopIcon from '@mui/icons-material/Stop';
import SmallIconButton from './SmallIconButton';

function InputBar({sendMsg, resetChat, stopGen, stopEdit, goToEdit, generating, edition}) {
    const [promptText, setPromptText] = useState("");
    const input = useRef();

    function sendMessage() {
        if (promptText != "") {
            sendMsg(promptText);
            setPromptText("");
        }
    }

    function sendFakeMessage() {
        sendMsg(promptText, {
            fake: true,
            text: promptText
        });
        setPromptText("");
    }

    function handleKeyDown(evt) {
        if (!evt.shiftKey && evt.key == "Enter") {
            if (!evt.ctrlKey) {
                sendMessage();
            }
            else {
                sendFakeMessage();
            }
        }
    }

    const iconBtn = generating ? (
        <Tooltip title="Detener">
            <IconButton onClick={stopGen}>
                <StopIcon/>
            </IconButton>
        </Tooltip>
    ) : (
        <Tooltip title="Borrar chat">
            <IconButton onClick={resetChat}>
                <DeleteIcon/>
            </IconButton>
        </Tooltip>
    )

    const editingBar = edition != null ? (
        <div id='editing-bar'>
            <p><ActionLink action={goToEdit}>Editando mensaje</ActionLink></p>
            <SmallIconButton
                title="Dejar de editar"
                onClick={stopEdit}
                icon={CloseIcon}/>
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
                    onKeyDown={handleKeyDown}
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