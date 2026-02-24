import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLMotionProps<'div'> {
    variant?: 'white' | 'glass' | 'technical'
    children?: ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'white', children, ...props }, ref) => {
        const variants = {
            white: 'bg-white border border-slate-200 executive-shadow hover:border-brand-secondary/30',
            glass: 'bg-white/80 backdrop-blur-md border border-white executive-shadow',
            technical: 'bg-slate-50 border border-slate-200 border-l-4 border-l-brand-primary',
        }

        return (
            <motion.div
                ref={ref as any}
                className={cn('rounded-none p-10 transition-all duration-500', variants[variant], className)}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)

Card.displayName = 'Card'

export { Card }
