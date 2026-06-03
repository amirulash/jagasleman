export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center rounded-xl border border-[#D8E4ED] bg-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-[#0F1F2E] shadow-sm backdrop-blur transition duration-200 ease-in-out hover:border-[#27527A] hover:bg-[#EFF4F8] hover:text-[#0F1F2E] focus:outline-none focus:ring-4 focus:ring-[#27527A]/20 disabled:opacity-50 ${
                    disabled && 'opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
