export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-xl border border-transparent bg-[#27527A] px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-lg shadow-[#27527A]/20 transition duration-200 ease-in-out hover:bg-[#1A3348] focus:outline-none focus:ring-4 focus:ring-[#27527A]/20 active:scale-[0.98] ${
                    disabled && 'opacity-50'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
