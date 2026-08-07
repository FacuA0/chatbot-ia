import IconButton from '@mui/material/IconButton';
import Tooltip from "@mui/material/Tooltip";

function SmallIconButton({title, onClick, disabled, icon}) {
    const Icon = icon;

    return !disabled ? (
        <Tooltip title={title}>
            <IconButton
                onClick={onClick}
                size="small">
                <Icon fontSize="inherit"/>
            </IconButton>
        </Tooltip>
    ) : (
        <Tooltip title={title}>
            <span>
                <IconButton
                    onClick={onClick}
                    disabled={true}
                    size="small">
                    <Icon fontSize="inherit"/>
                </IconButton>
            </span>
        </Tooltip>
    );
}

export default SmallIconButton;