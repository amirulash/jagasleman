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
                `inline-flex items-center justify-center rounded-xl border border-[#BDE7E1] bg-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-[#07324A] shadow-sm backdrop-blur transition duration-200 ease-in-out hover:border-[#0B6E78] hover:bg-[#F2FAF6] hover:text-[#07324A] focus:outline-none focus:ring-4 focus:ring-[#0B6E78]/20 disabled:opacity-50 ${
                    disabled && 'opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
