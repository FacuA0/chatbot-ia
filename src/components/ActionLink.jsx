function ActionLink({action, children}) {
    function click(evt) {
        evt.preventDefault();
        action();
    }

    return (
        <a className="action-link" href="#" onClick={click}>
            {children}
        </a>
    );
}

export default ActionLink;