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

## Fase 2 (pendiente)

- Generar video e imagen: faltan las URLs MCP de ElevenLabs y Canva.
- Publicar: decidir Postiz o Meta directo.
- Enviar mensajes: WhatsApp Cloud API y Messenger/Instagram, con plantillas aprobadas para los seguimientos.
- Tarea programada para la revisión diaria de leads sin respuesta.
