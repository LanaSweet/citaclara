import * as React from 'react'
import { cn } from '@/lib/utils'

/** Select nativo: accesible por defecto y con objetivo táctil ≥ 44 px. */
export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn('min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-base text-texto', className)}
      {...props}
    />
  )
}
