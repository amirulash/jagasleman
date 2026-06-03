export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded-md border-slate-300 text-[#D95F5F] shadow-sm focus:ring-4 focus:ring-[#D95F5F]/20 ' +
                className
            }
        />
    );
}
