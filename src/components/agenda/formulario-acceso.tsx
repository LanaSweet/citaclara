'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { acceder } from '@/app/(publico)/acceso/acciones'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FormularioAcceso() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const clave = String(new FormData(evento.currentTarget).get('clave') ?? '')
    setError(null)
    empezar(async () => {
      const r = await acceder({ clave })
      if (r.ok) router.push('/agenda')
      else setError(r.mensaje)
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="clave">Clave de la clínica</Label>
        <Input id="clave" name="clave" type="password" autoComplete="current-password" required />
      </div>
      {error && <Alert tono="error">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={pendiente}>
        {pendiente && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {pendiente ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
