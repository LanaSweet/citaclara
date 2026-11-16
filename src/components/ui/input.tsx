import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-base text-texto', className)}
      {...props}
    />
  )
}
