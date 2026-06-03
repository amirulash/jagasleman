import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-[#0B6E78] text-white hover:bg-[#07324A]',
                secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
                destructive: 'border-transparent bg-[#F47B52] text-white hover:bg-[#B84F4F]',
                outline: 'text-foreground',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

function Badge({ className, variant, ...props }) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
