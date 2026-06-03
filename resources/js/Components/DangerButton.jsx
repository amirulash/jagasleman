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
                `inline-flex items-center justify-center rounded-xl border border-transparent bg-[#F47B52] px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg shadow-[#F47B52]/20 transition duration-200 ease-in-out hover:bg-[#B84F4F] focus:outline-none focus:ring-4 focus:ring-[#F47B52]/20 active:scale-[0.98] ${
                    disabled && 'opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
