'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function ErrorAgenda({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3 p-2">
      <Alert tono="error">No hemos podido cargar la agenda. Inténtalo de nuevo en unos instantes.</Alert>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  )
}
