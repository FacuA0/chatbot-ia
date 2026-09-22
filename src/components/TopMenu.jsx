import { useState, useEffect } from 'react';
import Tooltip from "@mui/material/Tooltip";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckIcon from '@mui/icons-material/Check';
import MenuIcon from '@mui/icons-material/MoreVert';
import { getModels } from "../utils";
import { getAllTools } from "../tools";
import SmallIconButton from './SmallIconButton';
import ModalBox from './ModalBox';

function TopMenu({config, setConfig, setError, exportChat}) {
    const [anchorMenu, setAnchorMenu] = useState(null);
    const [anchorModel, setAnchorModel] = useState(null);
    const [anchorTool, setAnchorTool] = useState(null);
    const [models, setModels] = useState([]);
    const [configDialog, setConfigDialog] = useState(null);
    const [proxyDialog, setProxyDialog] = useState(false);

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

    function closeToolConfig() {
        setConfigDialog(null);
    }

    function closeProxyConfig() {
        setProxyDialog(false);
    }

    function exportChat2(i) {
        exportChat();
        closeMenu();
    }

    let modelList = models.map((m, i) => (
        <MenuItem key={i} 
            selected={config.model.id == m.id}
            onClick={() => changeModel(m)}>{m.name}</MenuItem>
    ));

    let toolList = getAllTools().map((t, i) => (
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
            <p id={`field-config-${conf[0]}`}>
                <i>Opción {conf[0]} de tipo {conf[1].type} no soportado</i>
            </p>
        )
    )) : [];

    useEffect(() => {
        if (models.length > 0)
            return;

        getModels(config)
        .then(newModels => {
            setModels(newModels);
        })
        .catch(err => {
            err.noRetry = true;
            setError(err);
        });
    }, [config]);

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
                onClose={closeMenu}>
                <MenuItem disabled={models.length == 0}
                    onClick={openModel}>Modelo: {config.model.name}</MenuItem>
                <MenuItem onClick={openTool}>Herramientas</MenuItem>
                <MenuItem onClick={openProxyConfig}>Proxy CORS</MenuItem>
                <MenuItem onClick={exportChat2}>Exportar chat</MenuItem>
            </Menu>
            <Menu
                anchorEl={anchorModel}
                open={anchorModel}
                onClose={closeModel}>
                {modelList}
            </Menu>
            <Menu
                anchorEl={anchorTool}
                open={anchorTool}
                onClose={closeTool}>
                {toolList}
            </Menu>
            <ModalBox
                open={configDialog != null}
                onClose={closeToolConfig}
                id="tool-config"
                title={"Opciones de " + configDialog?.name ?? "<cerrado>"}>
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
        </div>
    );
}

export default TopMenu;