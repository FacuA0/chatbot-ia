import { useState, useEffect } from 'react';
import Tooltip from "@mui/material/Tooltip";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/MoreVert';
import { getModels } from "../utils";
import { getAllTools } from "../tools";
import SmallIconButton from './SmallIconButton';

const toolConfigStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '0px',
  borderRadius: "12px",
  boxShadow: 24,
  p: 3,
};

function TopMenu({config, setConfig, setError, exportChat}) {
    const [anchorMenu, setAnchorMenu] = useState(null);
    const [anchorModel, setAnchorModel] = useState(null);
    const [anchorTool, setAnchorTool] = useState(null);
    const [models, setModels] = useState([]);
    const [configDialog, setConfigDialog] = useState(null);

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

    function changeToolConfig(configKey, newValue) {
        let copy = structuredClone(config);
        copy.tools[configDialog.name][configKey] = newValue;
        setConfig(copy);
    }

    function closeToolConfig() {
        setConfigDialog(null);
    }

    function exportChat2(i) {
        exportChat();
        closeMenu();
    }

    let modelList = models.map((m, i) => (
        <MenuItem key={i} onClick={() => changeModel(m)}>{m.name}</MenuItem>
    ));

    let toolList = getAllTools().map((t, i) => (
        <MenuItem key={i} 
            role='menuitemcheckbox'
            selected={config.tools[t.name].enabled}
            onClick={(e) => toggleTool(e, t)}>
            {t.name}
            {t.config ? (
                <SmallIconButton
                    key={i}
                    title="Opciones"
                    icon={SettingsIcon}
                    onClick={() => openToolConfig(t)}/>
            ) : (<></>)}
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
        getModels()
        .then(newModels => {
            setModels(newModels);
        })
        .catch(err => {
            err.noRetry = true;
            setError(err);
        });
    }, []);

    return (
        <div id="menu">
            <Tooltip title="Opciones">
                <span>
                    <IconButton 
                        onClick={openMenu}
                        disabled={models.length == 0}>
                        <MenuIcon/>
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={anchorMenu}
                open={anchorMenu}
                onClose={closeMenu}>
                <MenuItem onClick={openModel}>Modelo: {config.model.name}</MenuItem>
                <MenuItem onClick={openTool}>Herramientas</MenuItem>
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
            <Modal
                open={configDialog != null}
                onClose={closeToolConfig}
                aria-labelledby="tool-config-title">
                <Box sx={toolConfigStyle}>
                    <h4 id="tool-config-title" style={{marginTop: "4px"}}>
                        Opciones de {configDialog?.name ?? "<cerrado>"}
                    </h4>
                    {configOptions}
                </Box>
            </Modal>
        </div>
    );
}

export default TopMenu;