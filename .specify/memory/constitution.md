# Constitución de CitaClara

CitaClara es un gestor de citas para clínicas y consultas pequeñas (fisioterapia, nutrición,
podología). Esta constitución fija principios de negocio y calidad. No fija decisiones técnicas:
el stack, los formatos y las estructuras se deciden en el plan de cada feature.

## Core Principles

### I. Spec First
Todo comportamiento observable MUST nacer de una spec aprobada en `specs/`. Todo cambio de
comportamiento MUST empezar corrigiendo o creando su spec, nunca por el código. La propiedad de
cada spec vive en `specs/MAPA.md` y cada spec MUST tener un único propietario.

Razón: con varias features y varios agentes en paralelo, la spec es el único contrato común y
un propietario único evita ediciones contradictorias.

### II. Importes y Fechas Exactos
Todos los importes MUST cuadrar al céntimo, siempre: ningún cálculo puede perder ni inventar
céntimos, y la suma de las partes MUST igualar el total. Toda fecha u hora mostrada MUST ser
inequívoca para una clínica española (formato día/mes/año, hora local de España y 24 horas,
sin dejar lugar a confusión por zona horaria o cambio de hora).

Razón: un error en dinero o en una hora de cita es un error de negocio visible para el paciente.

### III. El Solape Es el Fallo Capital (NON-NEGOTIABLE)
Un profesional MUST NOT tener dos citas a la vez, jamás, ni siquiera si dos reservas del mismo
hueco llegan en el mismo instante. Toda feature que escriba en la agenda MUST incluir pruebas
que intenten provocar un solape, incluidas reservas simultáneas del mismo hueco.

Razón: una doble reserva rompe la confianza de clínica y paciente y no se puede arreglar a
posteriori sin perjuicio.

### IV. Simplicidad y Cero Alcance Fantasma
Ante dos soluciones válidas, MUST elegirse la más simple. Nada se construye ni se añade
(funcionalidad o dependencia) sin estar justificado en una spec. Lo que no está en una spec
aprobada MUST NOT existir en el producto.

Razón: cada añadido sin justificar es coste de mantenimiento y superficie de error.

### V. Demostrable con Datos Reproducibles
El producto MUST mantener datos de demostración deterministas: misma semilla, misma historia.
Specs, ejemplos y analítica MUST citar números que cualquiera pueda reproducir con esos datos.

Razón: los números citados que no se pueden reproducir no sirven como evidencia.

### VI. Los Tests Acompañan a la Spec
Cada regla de negocio y cada criterio de aceptación relevante MUST tener al menos un test que
lo referencie explícitamente. La suite en verde MUST ser condición de merge.

Razón: la trazabilidad spec ↔ test permite verificar sin ambigüedad que lo especificado se
cumple.

### VII. Interfaz Clara y Moderna
Recepción MUST poder usar la interfaz sin formación y sin manual. La pantalla MUST NOT mostrar
jerga técnica. Contraste y tamaños MUST ser accesibles. La interfaz MUST funcionar tanto en el
portátil de recepción como en el móvil de un paciente. Esto es un requisito de calidad; la
tecnología de la interfaz se decide en el plan.

Razón: el usuario real es personal de clínica y pacientes, no técnicos.

### VIII. Español de España en Todo
Todo texto del producto y de sus artefactos (specs, planes, tareas, mensajes en pantalla,
documentación) MUST estar en español de España.

Razón: un único idioma y variante evita inconsistencias y se ajusta al público.

## Calidad y Alcance

- Estos principios se aplican a toda feature, sea cual sea la tecnología elegida en su plan.
- Una decisión técnica MUST registrarse en el plan de la feature, no en esta constitución.
- Una dependencia nueva MUST justificarse en una spec (principio IV) antes de añadirse.

## Flujo de Trabajo con Varios Agentes

- Cada spec tiene un único propietario en `specs/MAPA.md`; solo el propietario modifica su spec.
  Cualquier otro agente que detecte un cambio necesario MUST proponerlo al propietario.
- Las features en paralelo MUST declarar en su spec qué agenda, datos o specs comparten con otras.
- Un merge MUST cumplir: spec aprobada, tests que la referencian (principio VI), suite en verde
  y pruebas de solape si la feature escribe en la agenda (principio III).

## Governance

Esta constitución prevalece sobre cualquier otra práctica del proyecto. Las enmiendas MUST
documentarse, justificarse y aprobarse, e incluir un plan de migración para las specs y
features afectadas.

Versionado semántico: MAJOR para eliminar o redefinir un principio de forma incompatible;
MINOR para añadir un principio o sección, o ampliar materialmente su guía; PATCH para
aclaraciones y correcciones de redacción.

Revisión de cumplimiento: toda revisión de spec, plan y merge MUST verificar el cumplimiento
de estos principios. Cualquier excepción MUST justificarse por escrito en la spec o el plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
