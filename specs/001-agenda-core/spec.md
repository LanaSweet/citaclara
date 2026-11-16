# Especificación de la feature: Núcleo de agenda

**Rama de la feature**: `001-agenda-core`

**Creada**: 2026-11-16

**Estado**: Borrador

**Entrada**: Núcleo de agenda de CitaClara para clínicas pequeñas (2-5 profesionales). La recepción gestiona la agenda; los pacientes, de momento, solo existen como fichas.

## Clarificaciones

### Sesión 2026-11-16

- Q: ¿Qué pasa con una cita «reservada» cuyo inicio ya ha pasado y nadie ha cerrado? → A: Se queda «reservada», sigue ocupando hueco y se muestra destacada como pendiente de cerrar hasta que recepción la cierre; nunca cambia de estado sola.
- Q: ¿Qué estado tienen en la semilla las citas de la historia que no son canceladas ni no asistidas? → A: Todas «completadas»; la historia queda sin citas pendientes de cerrar y las futuras quedan «reservadas».
- Q: ¿Puede recepción dar de alta un paciente nuevo desde la reserva? → A: No; el alta de pacientes queda fuera del alcance de esta feature. Solo se eligen pacientes ya cargados.
- Q: ¿Qué ve recepción si el hueco que intenta reservar acaba de ser ocupado? → A: Solo un mensaje claro de «hueco ocupado» y la agenda actualizada; sin propuesta de huecos alternativos.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia 1 - Reservar una cita sin solapes (Prioridad: P1)

Una persona de recepción elige un profesional, un servicio, un paciente y un inicio, y registra la cita. El sistema calcula el fin (inicio + duración del servicio) y solo acepta la cita si el profesional está libre durante todo ese tramo y el inicio es posterior al momento actual.

**Por qué esta prioridad**: es el corazón del producto y su fallo capital (constitución, principio III). Sin reserva fiable no hay agenda.

**Prueba independiente**: con los datos de demostración, crear una cita en un hueco libre del futuro (se acepta) y otra que invada ese tramo para el mismo profesional (se rechaza con un mensaje claro). Se puede probar sin la interfaz de agenda del día.

**Escenarios de aceptación**:

1. **Dado** que María está libre el jueves de 10:00 a 11:00, **cuando** recepción reserva una sesión de fisio (45') a las 10:00, **entonces** la cita queda reservada de 10:00 a 10:45.
2. **Dado** que María tiene una cita reservada de 10:00 a 10:45, **cuando** recepción intenta reservar a María una cita que empieza a las 10:30, **entonces** el sistema la rechaza e informa de que el hueco está ocupado.
3. **Dado** que María tiene una cita completada de 10:00 a 10:45, **cuando** se intenta reservar a María a las 10:15, **entonces** se rechaza.
4. **Dado** que María tiene una cita de 10:00 a 10:45, **cuando** se reserva otra a las 10:45 (justo al terminar la anterior), **entonces** se acepta: tramos contiguos no se solapan.
5. **Dado** un hueco libre de María, **cuando** dos reservas del mismo hueco llegan a la vez, **entonces** solo una queda registrada y la otra recibe el rechazo de hueco ocupado.
6. **Dado** un momento actual cualquiera, **cuando** se intenta reservar una cita cuyo inicio es anterior o igual al momento actual, **entonces** se rechaza indicando que no se pueden crear citas en el pasado.
7. **Dado** que Jorge y María son profesionales distintos, **cuando** se reserva a Jorge a la misma hora en que María tiene una cita, **entonces** se acepta: el solape se evalúa por profesional.

---

### Historia 2 - Consultar la agenda del día por profesional (Prioridad: P2)

Recepción abre la agenda de un día y ve, para cada profesional, una línea de tiempo con los tramos ocupados (con paciente, servicio y estado) y los tramos libres, de forma que localice un hueco de un vistazo.

**Por qué esta prioridad**: sin ver la agenda, recepción no puede decidir qué hueco ofrecer; es la pantalla de uso diario.

**Prueba independiente**: con los datos de demostración, abrir un día con historia y comprobar que cada profesional muestra sus citas en su orden y hora exactos, y que los espacios entre citas aparecen como libres.

**Escenarios de aceptación**:

1. **Dado** un día con citas de varios profesionales, **cuando** recepción abre la agenda de ese día, **entonces** ve a cada profesional por separado con sus citas ordenadas por hora y los huecos libres entre ellas.
2. **Dado** una cita cancelada o no asistida, **cuando** se muestra la agenda, **entonces** el tramo aparece como libre (o claramente distinguido como no ocupante) y se puede reservar de nuevo.
3. **Dado** una cita completada o reservada, **cuando** se muestra la agenda, **entonces** el tramo aparece como ocupado y se distingue visualmente su estado.
4. **Dado** un día sin citas, **cuando** se abre la agenda, **entonces** todo el horario del profesional aparece libre.
5. **Dado** un móvil o un portátil, **cuando** se abre la agenda, **entonces** se lee y se maneja sin desplazamiento horizontal de la página ni jerga técnica.
6. **Dado** cualquier hora mostrada, **entonces** está en formato 24 horas y hora local de España, y la fecha en día/mes/año.

---

### Historia 3 - Cerrar el ciclo de una cita: completada, cancelada o no asistida (Prioridad: P2)

Recepción marca el resultado de una cita reservada: completada (se atendió), cancelada (se anula) o no asistida (el paciente no se presentó).

**Por qué esta prioridad**: mantiene la agenda veraz y libera los huecos de las citas canceladas; los estados son la base de futuras analíticas.

**Prueba independiente**: tomar una cita reservada y aplicarle cada acción; comprobar el estado resultante y el efecto sobre el hueco.

**Escenarios de aceptación**:

1. **Dado** una cita reservada, **cuando** recepción la marca como completada, **entonces** pasa a completada y sigue ocupando el hueco.
2. **Dado** una cita reservada, **cuando** recepción la cancela, **entonces** pasa a cancelada y el hueco queda libre.
3. **Dado** una cita reservada cuyo inicio ya ha pasado, **cuando** recepción la marca como no asistida, **entonces** pasa a no asistida y el hueco queda libre.
4. **Dado** una cita ya completada, cancelada o no asistida, **cuando** se intenta cambiar su estado, **entonces** el sistema lo rechaza: los estados finales no se modifican.
5. **Dado** una cita reservada cuyo inicio ya ha pasado y que nadie ha cerrado, **cuando** se muestra la agenda, **entonces** sigue reservada, ocupa hueco y aparece destacada como pendiente de cerrar.
6. **Dado** una cita reservada cuyo inicio aún no ha llegado, **cuando** se intenta marcarla como no asistida o completada, **entonces** el sistema lo rechaza (solo se puede cancelar).

---

### Historia 4 - Acceso de recepción con clave de clínica (Prioridad: P3)

Recepción entra con la clave de panel de su clínica y solo ve los datos de esa clínica. Es una autenticación simplificada de la v1 y deuda consciente.

**Por qué esta prioridad**: protege los datos básicos pero no es el valor diferencial de la feature.

**Prueba independiente**: intentar acceder sin clave o con clave incorrecta (se deniega) y con la clave correcta (se accede).

**Escenarios de aceptación**:

1. **Dado** que no se ha introducido clave, **cuando** se intenta abrir la agenda, **entonces** se pide la clave y no se muestra ningún dato.
2. **Dado** una clave incorrecta, **cuando** se envía, **entonces** se rechaza con un mensaje claro y sin revelar datos.
3. **Dado** la clave correcta de Clínica Eleva, **cuando** se envía, **entonces** se accede a la agenda de Clínica Eleva.

---

### Historia 5 - Datos de demostración reproducibles (Prioridad: P3)

El producto puede cargarse con una semilla determinista: misma semilla, misma historia (constitución, principio V). Clínica Eleva incluye 3 profesionales, 4 servicios, unos 40 pacientes, 8 semanas de historia y 2 semanas futuras con reservas.

**Por qué esta prioridad**: sin datos de demostración no se pueden validar las demás historias ni citar números reproducibles en futuras specs.

**Prueba independiente**: cargar la semilla dos veces y comprobar que ambos resultados son idénticos en todos los recuentos citados.

**Escenarios de aceptación**:

1. **Dado** una instalación vacía, **cuando** se carga la semilla, **entonces** existe Clínica Eleva con María y Jorge (fisioterapia) y Lucía (nutrición).
2. **Dado** la semilla cargada, **cuando** se consultan los servicios, **entonces** son: sesión fisio (45', 40,00 €), primera visita fisio (60', 50,00 €), consulta nutrición (30', 35,00 €) y primera nutrición (45', 45,00 €).
3. **Dado** la semilla cargada, **cuando** se revisa la historia de 8 semanas, **entonces** aproximadamente el 10 % de las citas son no asistidas y el 8 % canceladas, sin solapes entre citas reservadas o completadas del mismo profesional.
4. **Dado** la semilla cargada, **cuando** se revisan las 2 semanas siguientes, **entonces** hay citas reservadas, todas futuras y sin solapes.
5. **Dado** dos cargas de la semilla en entornos distintos, **entonces** producen exactamente los mismos datos.

---

### Casos límite

- Dos reservas simultáneas del mismo hueco para el mismo profesional: solo una se registra (RN1).
- Dos reservas simultáneas del mismo hueco para profesionales distintos: ambas se aceptan.
- Cita que empieza justo cuando termina otra del mismo profesional: se acepta.
- Cita que empieza antes y termina dentro de otra, o que contiene por completo a otra: se rechaza.
- Cita cuyo inicio es exactamente el instante actual o anterior: se rechaza (RN2).
- Reserva en un hueco liberado por una cita cancelada o no asistida: se acepta.
- Cambio de hora (marzo y octubre): las horas y duraciones se mantienen inequívocas; una cita de 45' dura 45' reales y se muestra en hora local de España.
- Ficha de paciente con teléfono o email vacíos o mal formados: se rechaza al cargarla.
- Servicio con duración que se sale del horario del profesional: se rechaza.
- Clave de clínica incorrecta o ausente: no se muestra ningún dato.
- Importes en euros: siempre con dos decimales y sin pérdida de céntimos.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema MUST gestionar clínicas, cada una con una clave de panel que da acceso a su agenda.
- **FR-002**: El sistema MUST gestionar profesionales con nombre y especialidad, pertenecientes a una clínica.
- **FR-003**: El sistema MUST gestionar servicios con nombre, duración en minutos (entero positivo) e importe en euros (con céntimos exactos).
- **FR-004**: El sistema MUST gestionar fichas de paciente con nombre, teléfono y email, pertenecientes a una clínica.
- **FR-005**: Una cita MUST unir un profesional, un servicio y un paciente, con inicio y fin; el fin MUST ser igual al inicio más la duración del servicio.
- **FR-006**: Una cita MUST tener exactamente uno de estos estados: reservada, completada, cancelada o no_asistida. Toda cita nueva nace reservada.
- **FR-007**: Las transiciones permitidas MUST ser solo reservada → completada, reservada → cancelada y reservada → no_asistida; completada, cancelada y no_asistida son estados finales.
- **FR-008**: "No asistida" MUST aplicarse exclusivamente a una cita que seguía reservada cuando el paciente no se presentó.
- **FR-009 (RN1)**: El sistema MUST rechazar cualquier cita que solape, aunque sea parcialmente, con otra cita reservada o completada del mismo profesional. Las citas canceladas y no asistidas no ocupan hueco.
- **FR-010**: Dos citas contiguas (una termina exactamente cuando empieza la otra) MUST considerarse no solapadas.
- **FR-011**: Si varias reservas del mismo hueco del mismo profesional llegan a la vez, el sistema MUST registrar como máximo una y rechazar las demás con el mismo mensaje de hueco ocupado y mostrar la agenda actualizada, sin proponer huecos alternativos.
- **FR-012 (RN2)**: El sistema MUST rechazar la creación de citas cuyo inicio sea anterior o igual al momento actual.
- **FR-013**: Una cita MUST encajar completa en el horario de atención del profesional.
- **FR-014**: Recepción MUST poder consultar la agenda de un día, con cada profesional por separado, mostrando tramos ocupados (paciente, servicio, hora de inicio y fin, estado) y tramos libres.
- **FR-015**: Recepción MUST poder dar de alta una cita eligiendo profesional, servicio, un paciente ya existente y hora de inicio, y ver el fin calculado antes de confirmar.
- **FR-016**: Recepción MUST poder marcar una cita reservada como completada, cancelada o no asistida; marcar no asistida o completada MUST exigir que el inicio de la cita ya haya llegado, y cancelar MUST ser posible en cualquier momento mientras esté reservada.
- **FR-016b**: Una cita reservada cuyo inicio ya ha pasado MUST permanecer reservada, seguir ocupando hueco y mostrarse destacada como «pendiente de cerrar» en la agenda; el sistema MUST NOT cambiar su estado automáticamente.
- **FR-017**: Cuando una acción o una reserva se rechace, el sistema MUST mostrar un mensaje claro en español, sin jerga técnica, indicando el motivo (hueco ocupado, cita en el pasado, estado final, etc.).
- **FR-018**: El acceso a cualquier dato MUST exigir la clave de la clínica; sin clave válida el sistema MUST NOT mostrar ningún dato. Esta autenticación es una simplificación de la v1 (deuda consciente) y debe poder sustituirse sin cambiar las reglas de negocio.
- **FR-019**: Todas las fechas MUST mostrarse en formato día/mes/año y las horas en 24 horas, hora local de España.
- **FR-020**: Todos los importes MUST mostrarse en euros con dos decimales y la suma de las partes MUST igualar el total al céntimo.
- **FR-021**: La interfaz MUST ser usable sin formación ni manual, con contraste y tamaños accesibles, y adaptarse a portátil y móvil (constitución, principio VII).
- **FR-022**: El sistema MUST ofrecer una carga de datos de demostración determinista para Clínica Eleva con: 3 profesionales (María y Jorge, fisioterapia; Lucía, nutrición), 4 servicios (sesión fisio 45' 40 €, primera visita fisio 60' 50 €, consulta nutrición 30' 35 €, primera nutrición 45' 45 €), unos 40 pacientes, 8 semanas de historia con ~10 % de no asistencia y ~8 % de cancelaciones, y 2 semanas futuras con reservas. En la historia, las citas que no son canceladas ni no asistidas MUST estar completadas (ninguna pendiente de cerrar); las futuras MUST estar reservadas.
- **FR-023**: La carga de demostración MUST producir siempre los mismos datos y MUST NOT generar solapes.
- **FR-024**: Los datos de una clínica MUST NOT ser visibles ni modificables con la clave de otra.

### Entidades clave

- **Clínica**: centro que usa el producto. Tiene nombre, clave de panel, profesionales, servicios y pacientes.
- **Profesional**: persona que atiende. Tiene nombre y especialidad; es el sujeto de la regla de solape.
- **Servicio**: tipo de atención reservable. Tiene nombre, duración en minutos e importe en euros.
- **Paciente**: ficha con nombre, teléfono y email. Solo existe como ficha: no accede al sistema.
- **Cita**: une profesional, servicio y paciente; tiene inicio, fin y estado. Solo las reservadas y completadas ocupan hueco.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: En 100 % de los intentos, ninguna cita reservada o completada de un mismo profesional solapa con otra, incluso con reservas simultáneas del mismo hueco (en una prueba de varias reservas simultáneas sobre un mismo hueco, exactamente una se registra).
- **SC-002**: En 100 % de los intentos de reserva en el pasado, la cita se rechaza.
- **SC-003**: Una persona de recepción sin formación da de alta una cita en menos de 1 minuto desde que abre la agenda del día.
- **SC-004**: Recepción localiza un hueco libre de un profesional en un día en menos de 10 segundos.
- **SC-005**: La agenda del día de un profesional se muestra en menos de 2 segundos con la carga de demostración.
- **SC-006**: Cargar la semilla dos veces produce los mismos recuentos totales y por estado: mismas citas, mismos pacientes, mismos importes.
- **SC-007**: En la semilla, la proporción de citas no asistidas es del 10 % ± 2 puntos y la de canceladas del 8 % ± 2 puntos sobre el total de las 8 semanas de historia, y el resto de citas de la historia están completadas.
- **SC-008**: La interfaz es utilizable (sin desplazamiento horizontal de la página) en pantallas desde 360 px de ancho hasta portátil.
- **SC-009**: Todos los importes mostrados cuadran al céntimo en el 100 % de las pantallas.

## Supuestos

- Los usuarios son personal de recepción de clínicas pequeñas (2-5 profesionales). Los pacientes no acceden al sistema.
- Una clínica tiene una única clave de panel; no hay cuentas de usuario individuales en la v1.
- La zona horaria es siempre Europa/Madrid; el producto no gestiona clínicas en otras zonas.
- El horario de atención es de lunes a viernes de 09:00 a 20:00 para todos los profesionales de la demo. La gestión de horarios y ausencias propias queda para una spec posterior; en esta feature el horario es fijo.
- Una cita puede terminar exactamente a las 20:00 (el horario es el intervalo cerrado 09:00–20:00 para el fin). Un servicio cuya duración no cabe en el horario se rechaza en el momento de reservar (`FUERA_DE_HORARIO`), no al cargarlo.
- Las citas empiezan en cualquier minuto dentro del horario (no se fuerzan tramos de 15 o 30 minutos).
- Las altas y modificaciones de clínica, profesionales, servicios y pacientes se hacen mediante la carga de datos; esta feature no incluye pantallas ni flujos para darlos de alta o administrarlos, tampoco el alta de pacientes desde la reserva (queda para otra spec).
- No se contempla reprogramar una cita: se cancela y se reserva otra.
- Los estados finales (completada, cancelada, no asistida) no se pueden deshacer en esta versión.
- Fuera de alcance (van en specs propias): cualquier acceso del paciente, recordatorios, analítica y pagos online.
- Datos compartidos con otras specs: la agenda y las citas son la base de las futuras specs de recordatorios y analítica; esta spec es la propietaria de las entidades y reglas de agenda. El archivo `specs/MAPA.md` exigido por la constitución aún no existe y debe registrar esta propiedad.
