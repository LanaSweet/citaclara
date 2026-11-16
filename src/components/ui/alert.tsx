import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variantes = cva('rounded-lg border p-3 text-sm', {
  variants: {
    tono: {
      info: 'border-indigo-700 bg-indigo-50 text-indigo-900',
      error: 'border-peligro bg-peligro-fondo text-peligro',
      aviso: 'border-aviso bg-aviso-fondo text-aviso',
    },
  },
  defaultVariants: { tono: 'info' },
})

export interface AlertaProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof variantes> {}

export function Alert({ className, tono, ...props }: AlertaProps) {
  return <div role={tono === 'error' ? 'alert' : 'status'} className={cn(variantes({ tono }), className)} {...props} />
}
