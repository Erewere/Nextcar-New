// Runtime: abre una sesión del agente "Nextcar Marketing y Leads" y chatea con él.
// El agente y el entorno ya existen (los crea `ant apply`, ver README.md). Aquí solo se usan sus IDs.
//
//   AGENT_ID=agent_...  ENV_ID=env_...  VAULT_ID=vlt_...  npm run session
//   (opcional) PROMPT="..." para mandar el primer mensaje sin escribirlo

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const { AGENT_ID, ENV_ID, VAULT_ID, PROMPT } = process.env;
if (!AGENT_ID || !ENV_ID || !VAULT_ID) {
  throw new Error("Faltan AGENT_ID, ENV_ID o VAULT_ID (están en claude-lock.json).");
}

const client = new Anthropic();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const session = await client.beta.sessions.create({
  agent: AGENT_ID,
  environment_id: ENV_ID,
  vault_ids: [VAULT_ID],
  title: "Marketing y leads",
});
console.log(`Sesión ${session.id}`);
console.log(`Verla en vivo: https://platform.claude.com/workspaces/default/sessions/${session.id}\n`);

// Abre el stream ANTES de mandar el primer mensaje.
const stream = await client.beta.sessions.events.stream(session.id);

async function send(text: string) {
  await client.beta.sessions.events.send(session.id, {
    events: [{ type: "user.message", content: [{ type: "text", text }] }],
  });
}

// Prueba corta cuando hay dependencias externas: confirma que el CRM responde antes del trabajo real.
await send(
  "Prueba de conexión: usa pendientes_de_hoy y dime en una línea si el CRM respondió. No hagas nada más.",
);

let probed = false;
for await (const event of stream) {
  if (event.type === "agent.message") {
    for (const block of event.content) {
      if (block.type === "text") process.stdout.write(block.text);
    }
  } else if (
    (event.type === "agent.tool_use" || event.type === "agent.mcp_tool_use") &&
    event.evaluated_permission === "ask"
  ) {
    // Llamada pausada: se queda esperando hasta que contestes.
    console.log(`\n\n[Aprobación] ${event.name} ${JSON.stringify(event.input)}`);
    const answer = (await rl.question("¿Permitir? (s/n) ")).trim().toLowerCase();
    await client.beta.sessions.events.send(session.id, {
      events: [
        {
          type: "user.tool_confirmation",
          tool_use_id: event.id,
          result: answer === "s" ? "allow" : "deny",
        },
      ],
    });
  } else if (event.type === "session.status_idle") {
    // requires_action = espera tu respuesta a una aprobación; cualquier otro motivo = turno terminado.
    if (event.stop_reason.type === "requires_action") continue;

    const next = !probed && PROMPT ? PROMPT : (await rl.question("\n\nTú (vacío para salir): ")).trim();
    probed = true;
    if (!next) break;
    await send(next);
  } else if (event.type === "session.status_terminated") {
    console.log("\n--- Sesión terminada ---");
    break;
  }
}
rl.close();

// Descarga los borradores que el agente dejó en /mnt/session/outputs/.
// Hay un retraso de ~1-3 s entre el idle y la aparición de los archivos.
let files = await client.beta.files.list({ scope_id: session.id, betas: ["managed-agents-2026-04-01"] });
for (let i = 0; i < 2 && files.data.length === 0; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  files = await client.beta.files.list({ scope_id: session.id, betas: ["managed-agents-2026-04-01"] });
}
fs.mkdirSync("borradores", { recursive: true });
for (const f of files.data) {
  const resp = await client.beta.files.download(f.id);
  const dest = path.join("borradores", path.basename(f.filename));
  fs.writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
  console.log(`Borrador guardado: ${dest}`);
}
