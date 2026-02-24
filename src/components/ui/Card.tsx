import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLMotionProps<'div'> {
    variant?: 'white' | 'outline' | 'muted'
    children?: ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'white', children, ...props }, ref) => {
        const variants = {
            white: 'bg-white border border-slate-200 shadow-sm hover:shadow-md',
            outline: 'bg-transparent border border-slate-200 hover:border-slate-400',
            muted: 'bg-slate-50 border border-slate-100',
        }

        return (
            <motion.div
                ref={ref as any}
                className={cn('rounded-sm p-8 transition-shadow duration-300', variants[variant], className)}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)

Card.displayName = 'Card'

export { Card }
