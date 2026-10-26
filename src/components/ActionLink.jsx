function ActionLink({action, show, children}) {
    function click(evt) {
        evt.preventDefault();
        action();
    }

    if (show === false)
        return <></>;

    return (
        <a className="action-link" href="#" onClick={click}>
            {children}
        </a>
    );
}

export default ActionLink;