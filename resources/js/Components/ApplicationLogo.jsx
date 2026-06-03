export default function ApplicationLogo(props) {
    return (
        <div {...props} className={`flex items-center justify-center ${props.className || ''}`.trim()}>
            <img
                src="/images/logo_jagasleman.png"
                alt="Logo JagaSleman"
                className="h-14 w-14 object-contain drop-shadow-md"
            />
        </div>
    );
}
