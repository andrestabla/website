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
            primary: 'bg-brand-primary text-white hover:bg-slate-900 shadow-md',
            secondary: 'bg-brand-secondary text-white hover:opacity-90',
            outline: 'border-2 border-slate-200 text-slate-700 hover:border-brand-primary hover:text-brand-primary',
            ghost: 'text-slate-500 hover:text-brand-primary hover:bg-brand-primary/5',
        }

        const sizes = {
            sm: 'px-4 py-2 text-xs font-bold uppercase tracking-wider',
            md: 'px-7 py-3.5 text-sm font-bold uppercase tracking-widest',
            lg: 'px-12 py-5 text-base font-bold uppercase tracking-[0.2em]',
        }

        return (
            <motion.button
                whileTap={{ scale: 0.97 }}
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-none transition-all duration-200 outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50 disabled:pointer-events-none',
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
