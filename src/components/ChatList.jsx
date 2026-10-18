import { useState, useEffect } from 'react';
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import IconButton from '@mui/material/IconButton';
import TextField from "@mui/material/TextField";
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import Box from "@mui/material/Box";
import ModalBox from "./ModalBox";
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import { getChats, deleteChat, renameChat } from '../utils';
import SmallIconButton from "./SmallIconButton";

function ChatList({curChat, setCurChat}) {
    const [openDrawer, setOpenDrawer] = useState(false);
    const [chats, setChats] = useState(getChats);
    const [chatRename, setChatRename] = useState("");
    const [renameModal, setRenameModal] = useState(null);

    const toggleDrawer = newOpen => () => {
        setOpenDrawer(newOpen);
    };

    const setNewChat = () => setCurChat({});
    const setPreviousChat = chat => () => setCurChat(chat);
    const eraseChat = chat => () => {
        if (curChat.id == chat.id) {
            setNewChat();
        }

        deleteChat(chat);
        setChats(getChats());
    };
    const renameChat2 = chat => () => {
        setRenameModal(chat);
        setChatRename(chat.title);
    };
    const closeRenameModal = () => {
        renameChat(curChat, chatRename);
        setChatRename("");
        setRenameModal(null);
        setChats(getChats());
    };
    
    const createChat = 
        <ListItem disablePadding>
            <ListItemButton 
                onClick={setNewChat}
                selected={curChat.id == null}>
                <ListItemIcon>
                    <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Nuevo chat"/>
            </ListItemButton>
        </ListItem>;

    const chatList = chats.map(chat => 
        <ListItem key={chat.id} disablePadding>
            <ListItemButton 
                onClick={setPreviousChat(chat)}
                selected={curChat.id == chat.id}>
                <ListItemText primary={chat.title}/>
            </ListItemButton>
            <ListItemSecondaryAction>
                <SmallIconButton
                    title="Renombrar chat"
                    onClick={renameChat2(chat)}
                    icon={EditIcon} />
                <SmallIconButton
                    title="Eliminar chat"
                    onClick={eraseChat(chat)}
                    icon={CloseIcon} />
            </ListItemSecondaryAction>
        </ListItem>
    );

    useEffect(() => {
        setChats(getChats);
    }, [curChat]);

    return (
        <div id="chat-menu">
            <Tooltip title="Historial de chats">
                <IconButton
                    onClick={toggleDrawer(true)}>
                    <MenuIcon/>
                </IconButton>
            </Tooltip>
            <Drawer open={openDrawer} onClose={toggleDrawer(false)}>
                <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
                    <h2 style={{marginLeft: "1rem"}}>Historial de chats</h2>
                    <List>
                        {createChat}
                    </List>
                    <Divider />
                    <List>
                        {chatList}
                    </List>
                </Box>
            </Drawer>
            <ModalBox
                open={renameModal}
                onClose={closeRenameModal}
                id="chat-rename"
                title="Renombrar chat">
                <TextField
                    id="field-chat-rename"
                    variant="outlined"
                    fullWidth
                    label="Nuevo nombre para el chat"
                    onChange={e => setChatRename(e.target.value)}
                    value={chatRename}/>
            </ModalBox>
        </div>
    );
}

export default ChatList;
