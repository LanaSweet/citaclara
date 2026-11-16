import type { Reloj } from '@/dominio/cita'

export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date()
  }
}

/** Reloj controlable para pruebas de «inicio en el pasado» y de cierres. */
export class RelojFijo implements Reloj {
  constructor(private instante: Date) {}

  ahora(): Date {
    return new Date(this.instante)
  }

  fijar(instante: Date): void {
    this.instante = instante
  }
}
