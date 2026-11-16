# Mapa de specs

Registro de propiedad de entidades y reglas entre specs (principio I de la constitución).

| Spec | Entidades propias | Reglas propias |
|---|---|---|
| `001-agenda-core` | Clínica, Profesional, Servicio, Paciente, Cita | RN1 (sin solape de citas por profesional), RN2 (no se crean citas en el pasado) |

## Notas

- `001-agenda-core` es la **propietaria única** de las cinco entidades y de las reglas de agenda RN1 y RN2.
- Las futuras specs de recordatorios y de analítica **reutilizarán** esas entidades y reglas; no las redefinirán.
