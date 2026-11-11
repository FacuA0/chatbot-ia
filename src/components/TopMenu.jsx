import { useState, useEffect } from 'react';
import Tooltip from "@mui/material/Tooltip";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckIcon from '@mui/icons-material/Check';
import McpIcon from '@mui/icons-material/Cable';
import MenuIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { getModels } from "../utils";
import { getDefaultTools } from "../tools";
import SmallIconButton from './SmallIconButton';
import ModalBox from './ModalBox';

function TopMenu({config, proxyError, mcpRef, setConfig, setError, exportChat}) {
    const [anchorMenu, setAnchorMenu] = useState(null);
    const [anchorModel, setAnchorModel] = useState(null);
    const [anchorTool, setAnchorTool] = useState(null);
    const [models, setModels] = useState([]);
    const [configDialog, setConfigDialog] = useState(null);
    const [proxyDialog, setProxyDialog] = useState(false);
    const [mcpDialog, setMcpDialog] = useState(false);
    const [addMcpDialog, setAddMcpDialog] = useState(null);
    const [mcpServers, setMcpServers] = useState([]);

    function openMenu(evt) {
        setAnchorMenu(evt.currentTarget);
    }

    function openModel(evt) {
        setAnchorModel(evt.currentTarget);
    }

    function openTool(evt) {
        setAnchorTool(evt.currentTarget);
    }

    function closeMenu() {
        setAnchorMenu(null);
    }

    function closeModel() {
        setAnchorModel(null);
    }

    function closeTool() {
        setAnchorTool(null);
    }

    function changeModel(m) {
        setConfig({...config, model: m});
        closeModel();
    }

    function toggleTool(e, t) {
        if (!e.target.matches("li.MuiMenuItem-root"))
            return;

        let copy = structuredClone(config);
        copy.tools[t.name].enabled = !copy.tools[t.name].enabled;
        setConfig(copy);
    }

    function openToolConfig(t) {
        setConfigDialog(t);
    }

    function openProxyConfig() {
        setProxyDialog(true);
    }

    function openMcpConfig() {
        setMcpDialog(true);
    }

    function openAddMcpConfig() {
        setAddMcpDialog("");
    }

    function changeToolConfig(configKey, newValue) {
        let copy = structuredClone(config);
        copy.tools[configDialog.name][configKey] = newValue;
        setConfig(copy);
    }

    function changeProxyConfig(newURL) {
        let copy = structuredClone(config);
        copy.proxy = newURL;
        setConfig(copy);
    }

    function removeMcp(index) {
        let copy = structuredClone(config);
        copy.mcp = copy.mcp.filter((_, i) => i != index);
        setConfig(copy);
        mcpRef.current.removeMcpServer(config, index);
    }

    function closeToolConfig() {
        setConfigDialog(null);
    }

    function closeProxyConfig() {
        setProxyDialog(false);
        let newURL = !config.proxy.endsWith("/") ? config.proxy + "/" : config.proxy;
        changeProxyConfig(newURL);
    }

    function closeMcpConfig() {
        setMcpDialog(false);    
    }

    function closeAddMcpConfig() {
        setAddMcpDialog(null);
        if (!addMcpDialog || config.mcp.includes(addMcpDialog))
            return;

        let copy = structuredClone(config);
        copy.mcp = [...copy.mcp, addMcpDialog];
        setConfig(copy);
        mcpRef.current.addMcpServer(config, addMcpDialog);
        updateMcpServers();
    }

    function exportChat2() {
        exportChat();
        closeMenu();
    }

    let modelList = models.map((m, i) => (
        <MenuItem key={i} 
            selected={config.model.id == m.id}
            onClick={() => changeModel(m)}>{m.name}</MenuItem>
    ));

    let toolList = getDefaultTools().map((t, i) => (
        <MenuItem key={i} 
            role='menuitemcheckbox'
            selected={config.tools[t.name].enabled}
            onClick={(e) => toggleTool(e, t)}>
            <ListItemIcon>
                {config.tools[t.name].enabled ? <CheckIcon fontSize="small" /> : null}
            </ListItemIcon>
            {t.name}
            {t.config ? (
                <SmallIconButton
                    key={i}
                    title="Opciones"
                    icon={SettingsIcon}
                    onClick={() => openToolConfig(t)}/>
            ) : null}
        </MenuItem>
    ));

    let mcpList = mcpServers.map((server, i) => {
        let mcpTools = server.tools.map((tool, j) => 
            <ListItem key={i + "-" + j}>
                <ListItemText primary={tool.toolName}/>
            </ListItem>
        );

        let active = <div style={{
            display: "inline-block",
            width: 8,
            height: 8,
            marginRight: 8,
            borderRadius: 4,
            backgroundColor: server.active ? "#0F0" : "#666"
        }}></div>;

        let mcpTitle = `${server.name || "Desconocido"} (${server.url})`;

        let remove = 
            <SmallIconButton
                title="Quitar servidor"
                icon={CloseIcon}
                onClick={() => removeMcp(i)}/>;

        return <li key={i}>
            <ul>
                <ListSubheader>{active}{mcpTitle}{remove}</ListSubheader>
                {mcpTools}
            </ul>
        </li>;
    });

    let configOptions = configDialog != null ? Object.entries(configDialog.config).map(conf => (
        conf[1].type == "string" ? (
            <TextField
                key={`field-config-${conf[0]}`}
                id={`field-config-${conf[0]}`}
                variant='outlined'
                fullWidth
                label={conf[1].label}
                onChange={e => changeToolConfig(conf[0], e.target.value)}
                value={config.tools[configDialog.name][conf[0]]}/>
        ) : (
            <p key={`field-config-${conf[0]}`}
                id={`field-config-${conf[0]}`}>
                <i>Opción {conf[0]} de tipo {conf[1].type} no soportado</i>
            </p>
        )
    )) : [];

    function updateMcpServers() {
        let mcpServers = mcpRef.current.getMcpServersInfo();
        setMcpServers(mcpServers);
    }

    useEffect(() => {
        updateMcpServers();
        mcpRef.current.addListener(updateMcpServers);

        return () => {
            mcpRef.current.removeListener(updateMcpServers);
            setMcpServers([]);
        };
    }, [config]);

    useEffect(() => {
        if (models.length > 0 || proxyError)
            return;

        getModels(config)
        .then(newModels => {
            setModels(newModels);
        })
        .catch(err => {
            err.noRetry = true;
            setError(err);
        });
    }, [config, proxyError]);

    return (
        <div id="menu">
            <Tooltip title="Opciones">
                <IconButton 
                    onClick={openMenu}>
                    <MenuIcon/>
                </IconButton>
            </Tooltip>
            <Menu
                anchorEl={anchorMenu}
                open={anchorMenu}
                onClose={closeMenu}
                disableScrollLock={true}>
                <MenuItem disabled={models.length == 0}
                    onClick={openModel}>Modelo: {config.model.name}</MenuItem>
                <MenuItem onClick={openTool}>Herramientas</MenuItem>
                <MenuItem onClick={openProxyConfig}>Proxy CORS</MenuItem>
                <MenuItem onClick={exportChat2}>Exportar chat</MenuItem>
            </Menu>
            <Menu
                anchorEl={anchorModel}
                open={anchorModel}
                onClose={closeModel}
                disableScrollLock={true}>
                {modelList}
            </Menu>
            <Menu
                anchorEl={anchorTool}
                open={anchorTool}
                onClose={closeTool}
                disableScrollLock={true}>
                {toolList}
                <Divider/>
                <MenuItem 
                    onClick={() => openMcpConfig()}>
                    <ListItemIcon>
                        <McpIcon fontSize="small" />
                    </ListItemIcon>
                    Gestionar MCP
                </MenuItem>
            </Menu>
            <ModalBox
                open={configDialog != null}
                onClose={closeToolConfig}
                id="tool-config"
                title={"Opciones de " + (configDialog?.name ?? "<cerrado>")}>
                {configOptions}
            </ModalBox>
            <ModalBox
                open={proxyDialog}
                onClose={closeProxyConfig}
                id="proxy-config"
                title="Proxy CORS">
                <p id="proxy-config-content" style={{marginBottom: "20px"}}>
                    Configurar proxy para que la página interactúe con sitios externos.
                </p>
                <TextField
                    id="field-url-proxy"
                    variant="outlined"
                    fullWidth
                    label="URL de proxy"
                    onChange={e => changeProxyConfig(e.target.value)}
                    value={config.proxy}/>
                
                <Button variant="text" 
                    onClick={() => changeProxyConfig("https://cors-anywhere.herokuapp.com/")}>
                    Usar proxy público
                </Button>
                {location.hostname == "localhost" ? <Button variant="text" 
                    onClick={() => changeProxyConfig("http://localhost:5174/")}>
                    Usar localhost
                </Button> : null}
            </ModalBox>
            <ModalBox
                open={mcpDialog}
                onClose={closeMcpConfig}
                id="mcp-config"
                title="Gestionar MCP">
                <List sx={{
                    position: "relative",
                    maxHeight: 300,
                    overflow: "auto",
                    "& ul": {padding: 0}}}
                    subheader={<li/>}
                    >
                    {mcpList}
                </List>
                
                <Button variant="text" 
                    onClick={openAddMcpConfig}>
                    Añadir servidor MCP
                </Button>
            </ModalBox>
            <ModalBox
                open={addMcpDialog != null}
                onClose={closeAddMcpConfig}
                id="add-mcp-config"
                title="Añadir MCP">
                <TextField
                    id="field-url-mcp"
                    variant="outlined"
                    fullWidth
                    label="URL de MCP"
                    onChange={e => setAddMcpDialog(e.target.value)}
                    value={addMcpDialog}/>
            </ModalBox>
        </div>
    );
}

export default TopMenu;