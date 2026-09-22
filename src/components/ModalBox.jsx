import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';

const boxStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 420,
    maxWidth: 'calc(100% - 24px)',
    boxSizing: 'border-box',
    bgcolor: 'background.paper',
    border: '0px',
    borderRadius: "12px",
    boxShadow: 24,
    p: 3,
};

function ModalBox({open, onClose, id, title, children}) {
    return <Modal
        open={open}
        onClose={onClose}
        aria-labelledby={id + "-title"}>
        <Box sx={boxStyle}>
            <h4 id={id + "-title"} style={{marginTop: "4px"}}>
                {title}
            </h4>
            {children}
        </Box>
    </Modal>;
}

export default ModalBox;