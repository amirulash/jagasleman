export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-xl border border-transparent bg-[#D95F5F] px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg shadow-[#D95F5F]/20 transition duration-200 ease-in-out hover:bg-[#B84F4F] focus:outline-none focus:ring-4 focus:ring-[#D95F5F]/20 active:scale-[0.98] ${
                    disabled && 'opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
