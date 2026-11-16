'use client'
import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex gap-1 rounded-lg bg-fondo p-1', className)} {...props} />
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'min-h-11 flex-1 rounded-md px-3 text-sm font-semibold text-texto-suave data-[state=active]:bg-superficie data-[state=active]:text-primario data-[state=active]:shadow-suave',
        className,
      )}
      {...props}
    />
  )
}

export const TabsContent = TabsPrimitive.Content
