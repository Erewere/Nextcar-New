# Agente "Nextcar Marketing y Leads" (Fase 1: solo borradores)

Archivos de esta carpeta:

| Archivo | Para qué sirve |
|---|---|
| `agent.md` | El agente: modelo, conexión al CRM, permisos y prompt con la voz de Luis |
| `environment.yaml` | El contenedor donde corre (nube, red limitada, solo servidores MCP) |
| `vault.yaml` | La bóveda (contenedor vacío) donde va la credencial del CRM |
| `session.ts` | Abre una sesión y chatea con el agente desde la terminal |

Todos los comandos se corren desde esta carpeta.

## 1. Instalar `ant` y entrar

Necesitas `ant` 1.34.0 o más nuevo (`ant --version`).

```bash
brew install anthropics/tap/ant
ant auth login
```

En Linux, baja el binario de https://github.com/anthropics/anthropic-cli/releases.

Si tienes `ANTHROPIC_API_KEY` exportada, quítala (`unset ANTHROPIC_API_KEY`). Pasa por encima del login.

## 2. Crear agente, entorno y bóveda

Primero el plan, sin cambiar nada:

```bash
ant apply --dry-run -v agent.md environment.yaml vault.yaml
```

Revisa la organización y el workspace que imprime la cabecera. Si todo está bien:

```bash
ant apply agent.md environment.yaml vault.yaml
```

Esto crea `claude-lock.json` con los IDs. Guárdalo en git: sin ese archivo, el siguiente `ant apply` crea duplicados.

## 3. Credencial del CRM (la corres tú, en tu terminal)

No pegues el token en el chat ni lo guardes en un archivo. Pégalo en el prompt silencioso:

```bash
VAULT_ID=$(jq -r '.resources["./vault.yaml"].id' claude-lock.json)
read -rs CMA_CRM_TOKEN && export CMA_CRM_TOKEN
```

```bash
jq -n -f /dev/stdin <<'JQ' | ant beta:vaults:credentials create --vault-id "$VAULT_ID"
{
  display_name: "CRM Nextcar",
  auth: {
    type: "static_bearer",
    mcp_server_url: "https://crm.erewere.com/mcp",
    token: (env.CMA_CRM_TOKEN // error("CMA_CRM_TOKEN is not set"))
  }
}
JQ
unset CMA_CRM_TOKEN
```

Este paso asume que el CRM acepta un token fijo (bearer). Si solo funciona con inicio de sesión OAuth, la credencial tiene otra forma (`mcp_oauth`): avísale a Claude para ajustarla.

Comprueba que quedó:

```bash
ant beta:vaults:credentials list --vault-id "$VAULT_ID"
```

## 4. Sesión de prueba

```bash
npm install
export AGENT_ID=$(jq -r '.resources["./agent.md"].id' claude-lock.json)
export ENV_ID=$(jq -r '.resources["./environment.yaml"].id' claude-lock.json)
export VAULT_ID=$(jq -r '.resources["./vault.yaml"].id' claude-lock.json)
npm run session
```

El script hace primero una prueba de conexión al CRM (`pendientes_de_hoy`). Después puedes pedirle, por ejemplo:

- "Revisa los leads de los últimos 3 días sin respuesta y redáctame los seguimientos."
- "Dame 5 ideas de video con los autos que llevan más tiempo en inventario."

Los borradores se descargan a `borradores/` (ignorada por git, tiene datos de clientes). Cualquier llamada que modifique el CRM te pide aprobación en la terminal.

## Revisión diaria de leads (`deployment-leads-diarios.md`)

Cada día, de lunes a sábado a las 6:40 (hora de Ciudad de México), el agente revisa el CRM y deja un archivo `seguimientos-AAAA-MM-DD.md` con los seguimientos pendientes (máximo 10 por corrida). Solo borradores: no envía nada y no modifica el CRM. Tope de 3 dólares por corrida.

Crear la tarea programada:

```bash
grep -c vlt_011Cghy7q1SX3LExkTjuMRNw claude-lock.json
```
Debe imprimir `1`. Si imprime `0`, el ID de la bóveda del archivo no coincide con el tuyo: cámbialo en `deployment-leads-diarios.md`.

```bash
ant apply --dry-run -v deployment-leads-diarios.md
```
```bash
ant apply deployment-leads-diarios.md
```

Probarla ahora, sin esperar al horario:

```bash
export DEPLOYMENT_ID=$(jq -r '.resources["./deployment-leads-diarios.md"].id' claude-lock.json)
```
```bash
npm run ejecutar-ahora
```

Cuando termine (unos minutos), bajar el resultado a `borradores/`:

```bash
npm run borradores
```

Para pausarla: `client.beta.deployments.pause(id)`. Para cambiar el horario, edita `schedule.expression` y corre `ant apply deployment-leads-diarios.md`.

Nota: si el agente intentara escribir en el CRM, la llamada queda esperando aprobación y la corrida no termina. El mensaje de arranque le dice que no escriba nada.

## Reporte semanal a propietarios (`deployment-propietarios-semanal.md`)

Cada lunes a las 7:10 (hora de Ciudad de México) deja `propietarios-AAAA-MM-DD.md`: por cada persona que vende su auto con Nextcar, un borrador con los contactos de la semana y, a partir de las 2 semanas sin venderse, una revisión de precio (con un bloque solo para Luis). Solo borradores. Tope de 2 dólares por corrida.

```bash
ant apply --dry-run -v agent.md deployment-propietarios-semanal.md
```
```bash
ant apply agent.md deployment-propietarios-semanal.md
```
```bash
export DEPLOYMENT_ID=$(jq -r '.resources["./deployment-propietarios-semanal.md"].id' claude-lock.json)
```
```bash
npm run ejecutar-ahora
```
```bash
npm run borradores
```

`DEPLOYMENT_ID` decide cuál tarea se prueba y se baja: usa el `jq` de `deployment-leads-diarios.md` para volver a la revisión diaria.

## Fase 2 (pendiente)

- Generar video e imagen: faltan las URLs MCP de ElevenLabs y Canva.
- Publicar: decidir Postiz o Meta directo.
- Enviar mensajes: WhatsApp Cloud API y Messenger/Instagram, con plantillas aprobadas para los seguimientos.
