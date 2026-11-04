---
name: Reporte semanal a propietarios
agent: ./agent.md
environment_id: ./environment.yaml
vault_ids:
  - vlt_011Cghy7q1SX3LExkTjuMRNw
schedule:
  type: cron
  expression: "10 7 * * 1"
  timezone: America/Mexico_City
# Tope por corrida: 2 dólares (el monto va en centavos).
budget:
  type: limit
  max_list_cost: {amount: "200", currency: USD}
initial_events:
  - type: user.define_outcome
    description: >-
      Reporte semanal a propietarios que venden su auto con Nextcar. Fase de solo
      borradores: no envíes nada y no modifiques el CRM. Sigue tus instrucciones de la
      sección "Propietarios que venden su auto con Nextcar": identifica a los propietarios,
      cuenta los contactos de los últimos 7 días por cada auto y redacta el mensaje semanal.
      Para los que lleven 2 semanas o más a la venta, agrega la revisión de precio. Deja todo
      en un solo archivo propietarios-AAAA-MM-DD.md dentro de /mnt/session/outputs/, con la
      fecha de hoy (obtenla con `date`).
    rubric:
      type: text
      content: |
        # Rúbrica inicial - ajustar con el uso
        - Hay un solo archivo `propietarios-AAAA-MM-DD.md` en /mnt/session/outputs/ con la fecha de hoy.
        - Empieza con un resumen de máximo 3 líneas: cuántos propietarios, cuántos con borrador listo y cuántos necesitan decisión de Luis.
        - Cada propietario trae: nombre, auto, precio de venta (de las notas), fecha de publicación y semanas a la venta, o `[CONFIRMAR CON LUIS: ...]` si no se encuentra.
        - Cada propietario trae el conteo de contactos de la semana con su fuente, y la marca `[CONFIRMAR CON LUIS: contactos esta semana...]`.
        - Cada borrador está en la voz de Luis (tuteo, directo, sin emojis, corto). Ningún borrador dice "0 personas" ni nombra o da teléfonos de los interesados.
        - Los propietarios con 2 semanas o más a la venta tienen un bloque "Revisión de precio" separado en "Solo para Luis" y "Borrador para el propietario".
        - Ningún borrador para un propietario contiene costos, utilidad ni precio de compra.
        - Un propietario sin fecha de publicación no tiene el bloque de 2 semanas, solo la marca de confirmar.
        - No se modificó nada en el CRM y no se envió ningún mensaje.
    max_iterations: 2
---
