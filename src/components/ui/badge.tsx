import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const variantes = cva('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    tono: {
      neutro: 'border-borde bg-fondo text-texto',
      info: 'border-indigo-700 bg-indigo-50 text-indigo-900',
      ok: 'border-ok bg-ok-fondo text-ok',
      peligro: 'border-peligro bg-peligro-fondo text-peligro',
      aviso: 'border-aviso bg-aviso-fondo text-aviso',
    },
  },
  defaultVariants: { tono: 'neutro' },
})

export interface InsigniaProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof variantes> {}

export function Badge({ className, tono, ...props }: InsigniaProps) {
  return <span className={cn(variantes({ tono }), className)} {...props} />
}
