import { useState, useEffect } from 'react';
import Tooltip from "@mui/material/Tooltip";
import Drawer from "@mui/material/Drawer";
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import Box from "@mui/material/Box"
import { ListItemIcon, ListItemText } from '@mui/material';
import { getChats } from '../utils';

function ChatList({curChat, setCurChat}) {
    const [openDrawer, setOpenDrawer] = useState(false);
    const [chats, setChats] = useState(getChats);

    const toggleDrawer = newOpen => () => {
        setOpenDrawer(newOpen);
    };

    const setNewChat = () => setCurChat({});
    const setPreviousChat = chat => () => setCurChat(chat);
    
    const createChat = <ListItem>
        <ListItemButton onClick={setNewChat}>
            <ListItemIcon>
                <AddIcon />
            </ListItemIcon>
            <ListItemText primary="Nuevo chat"/>
        </ListItemButton>
    </ListItem>;

    const chatList = chats.map((chat, i) => <ListItem key={chat.id}>
        <ListItemButton 
            onClick={setPreviousChat(chat)}
            selected={curChat.id == chat.id}>
            <ListItemText primary={chat.title}/>
        </ListItemButton>
    </ListItem>);

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
                    <h2>Historial de chats</h2>
                    <List>
                        {createChat}
                    </List>
                    <Divider />
                    <List>
                        {chatList}
                    </List>
                </Box>
            </Drawer>
        </div>
    );
}

export default ChatList;
