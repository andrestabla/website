import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-slate-900 text-white hover:bg-slate-800',
            secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
            outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
            ghost: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
        }

        const sizes = {
            sm: 'px-4 py-2 text-sm',
            md: 'px-6 py-3 text-base font-medium',
            lg: 'px-10 py-5 text-lg font-semibold tracking-tight',
        }

        return (
            <motion.button
                whileTap={{ scale: 0.98 }}
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-slate-900/10 disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...(props as any)}
            />
        )
    }
)

Button.displayName = 'Button'

export { Button }
