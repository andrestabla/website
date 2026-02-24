import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLMotionProps<'div'> {
    variant?: 'glass' | 'outline' | 'gradient'
    children?: ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'glass', children, ...props }, ref) => {
        const variants = {
            glass: 'glass-card rounded-2xl p-6',
            outline: 'bg-transparent border border-slate-800 rounded-2xl p-6',
            gradient: 'gradient-border',
        }

        if (variant === 'gradient') {
            return (
                <motion.div
                    ref={ref as any}
                    className={cn('gradient-border', className)}
                    {...props}
                >
                    <div className="gradient-border-inner p-6 h-full">
                        {children}
                    </div>
                </motion.div>
            )
        }

        return (
            <motion.div
                ref={ref as any}
                className={cn(variants[variant], className)}
                {...props}
            >
                {children}
            </motion.div>
        )
    }
)

Card.displayName = 'Card'

export { Card }
