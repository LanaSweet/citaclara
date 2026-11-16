import { z } from 'zod'

/** Teléfono español: 9 dígitos que empiezan por 6, 7, 8 o 9, con prefijo +34 opcional. */
const TELEFONO = /^(\+34)?[6-9]\d{8}$/

export const esquemaPaciente = z.object({
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío.'),
  telefono: z
    .string()
    .transform((t) => t.replace(/[\s.-]/g, ''))
    .refine((t) => TELEFONO.test(t), 'El teléfono no tiene un formato válido.'),
  email: z.string().trim().min(1, 'El correo no puede estar vacío.').pipe(z.email('El correo no tiene un formato válido.')),
})

export type DatosPaciente = z.infer<typeof esquemaPaciente>
