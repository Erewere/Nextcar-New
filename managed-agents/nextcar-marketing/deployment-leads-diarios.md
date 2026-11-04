---
name: Revisión diaria de leads
agent: ./agent.md
environment_id: ./environment.yaml
vault_ids:
  - vlt_011Cghy7q1SX3LExkTjuMRNw
schedule:
  type: cron
  expression: "40 6 * * 1-6"
  timezone: America/Mexico_City
# Tope por corrida: 3 dólares (el monto va en centavos). Si se alcanza, la sesión se pausa.
budget:
  type: limit
  max_list_cost: {amount: "300", currency: USD}
initial_events:
  - type: user.define_outcome
    description: >-
      Revisión diaria de leads. Fase de solo borradores: no envíes nada y no modifiques
      el CRM (ni notas, ni contactos, ni tratos, ni tareas). Usa pendientes_de_hoy, buscar,
      historial_del_cliente, ver_notas, ver_tratos y get_inventory para encontrar los leads
      que toca retomar: los que no han respondido 2, 5 o 10 días después del último mensaje
      de Luis. Toma máximo 10 por corrida, los más urgentes primero (los vencidos más viejos
      y los que tienen auto o trato más caliente). Para cada uno redacta el seguimiento en la
      voz de Luis, siguiendo tus instrucciones. Deja todo en un solo archivo
      seguimientos-AAAA-MM-DD.md dentro de /mnt/session/outputs/, con la fecha de hoy
      (obtenla con `date`). Si algo requeriría escribir en el CRM, no lo hagas: anótalo
      en el archivo.
    rubric:
      type: text
      content: |
        # Rúbrica inicial - ajustar con el uso
        - Hay un solo archivo `seguimientos-AAAA-MM-DD.md` en /mnt/session/outputs/ con la fecha de hoy.
        - Empieza con un resumen de máximo 3 líneas: cuántos leads se revisaron, cuántos tienen borrador y cuántos requieren decisión de Luis.
        - Como máximo 10 leads, ordenados por prioridad. Cada uno trae: nombre, auto o interés, fecha del último contacto, número de seguimientos previos (sacado de las notas del CRM) y el número del seguimiento que toca (1, 2 o 3).
        - Cada lead tiene un borrador en la voz de Luis: tuteo, directo, sin emojis, una sola idea y un solo siguiente paso. Cada seguimiento aporta algo distinto al anterior.
        - Si pasaron más de 24 horas desde el último mensaje del lead, el borrador trae también una versión de plantilla de WhatsApp, corta y con las partes variables marcadas como {{1}}, {{2}}.
        - Ningún borrador da precio final, condiciones de financiamiento ni disponibilidad que no estén confirmados en el CRM. Lo que falta va marcado como `[CONFIRMAR CON LUIS: ...]`.
        - Los leads con 3 seguimientos previos van en una sección "Fríos", sin seguimiento nuevo: solo una frase sugerida de cierre, opcional.
        - Hay una sección final "Para revisar en el CRM" con inconsistencias detectadas (duplicados, precios que parecen error, cotizaciones en el contacto equivocado). Si no hay, lo dice.
        - No se modificó nada en el CRM y no se envió ningún mensaje.
    max_iterations: 2
---
