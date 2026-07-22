import { useState } from 'react'
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'

function InputBar({sendMsg, resetChat, generating}) {
    const [promptText, setPromptText] = useState("");

    function sendMessage() {
        if (promptText != "") {
            sendMsg(promptText);
            setPromptText("");
        }
    }

    function reset() {
        resetChat()
        setPromptText("");
    }

    return (
        <div id='input-bar'>
            <TextField
                variant='outlined'
                size='small'
                label="Prompt"
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                disabled={generating}
                multiline/>
            <Button 
                variant='contained' 
                onClick={sendMessage}
                loading={generating}>Enviar</Button>
            <IconButton 
                title="Reiniciar chat"
                onClick={resetChat}
                disabled={generating}>
                <DeleteIcon/>
            </IconButton>
        </div>
    );
}

export default InputBar;