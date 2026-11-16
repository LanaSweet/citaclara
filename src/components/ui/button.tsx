import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variantes = cva(
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variante: {
        primario: 'bg-primario text-primario-texto hover:bg-primario-fuerte',
        secundario: 'border border-borde bg-superficie text-texto hover:bg-fondo',
        peligro: 'bg-peligro text-white hover:bg-red-800',
      },
    },
    defaultVariants: { variante: 'primario' },
  },
)

export interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variantes> {}

export function Button({ className, variante, ...props }: BotonProps) {
  return <button className={cn(variantes({ variante }), className)} {...props} />
}
