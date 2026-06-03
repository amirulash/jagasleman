export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded-md border-slate-300 text-[#F47B52] shadow-sm focus:ring-4 focus:ring-[#F47B52]/20 ' +
                className
            }
        />
    );
}
