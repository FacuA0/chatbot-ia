import { useState, useEffect } from 'react';
import Tooltip from "@mui/material/Tooltip";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/MoreVert';
import { getModels } from "../utils";

function TopMenu({config, setConfig, setError, exportChat}) {
    const [anchorMenu, setAnchorMenu] = useState(null);
    const [anchorModel, setAnchorModel] = useState(null);
    const [models, setModels] = useState([]);

    function openMenu(evt) {
        setAnchorMenu(evt.currentTarget);
    }

    function openModel(evt) {
        setAnchorModel(evt.currentTarget);
    }

    function closeMenu() {
        setAnchorMenu(null);
    }

    function closeModel() {
        setAnchorModel(null);
        closeMenu();
    }

    function changeModel(e) {
        setConfig({...config, model: e});
        closeModel();
    }

    function exportChat2(i) {
        exportChat();
        closeMenu();
    }

    let modelList = models.map((e, i) => (
        <MenuItem key={i} onClick={() => changeModel(e)}>{e.name}</MenuItem>
    ));

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
                <MenuItem onClick={exportChat2}>Exportar chat</MenuItem>
            </Menu>
            <Menu
                anchorEl={anchorModel}
                open={anchorModel}
                onClose={closeModel}>
                {modelList}
            </Menu>
        </div>
    );
}

export default TopMenu;