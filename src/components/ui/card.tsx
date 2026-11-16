import * as React from 'react'
import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-tarjeta border border-borde bg-superficie shadow-suave', className)} {...props} />
}
