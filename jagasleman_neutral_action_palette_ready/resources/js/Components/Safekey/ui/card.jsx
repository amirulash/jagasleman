import * as React from 'react';

import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('rounded-2xl border border-slate-200/80 bg-white/86 text-card-foreground shadow-lg shadow-slate-900/5 backdrop-blur-xl transition-shadow duration-200 hover:shadow-xl hover:shadow-slate-900/8', className)}
        {...props}
    />
));
Card.displayName = 'Card';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export { Card, CardContent };
