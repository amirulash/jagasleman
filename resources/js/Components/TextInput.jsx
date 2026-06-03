import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    { type = 'text', className = '', isFocused = false, ...props },
    ref,
) {
    const localRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-xl border-slate-200 bg-white/90 text-foreground shadow-sm transition placeholder:text-slate-400 focus:border-[#0B6E78] focus:ring-4 focus:ring-[#F47B52]/15 ' +
                className
            }
            ref={localRef}
        />
    );
});
