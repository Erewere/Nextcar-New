// Baja a la carpeta borradores/ los archivos de la corrida más reciente de la revisión diaria.
//   DEPLOYMENT_ID=depl_... npm run borradores

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";

const { DEPLOYMENT_ID } = process.env;
if (!DEPLOYMENT_ID) throw new Error("Falta DEPLOYMENT_ID (empieza con depl_).");

const client = new Anthropic();

const runs = [];
for await (const run of client.beta.deploymentRuns.list({ deployment_id: DEPLOYMENT_ID })) {
  runs.push(run);
}
runs.sort((a, b) => b.created_at.localeCompare(a.created_at));

const latest = runs[0];
if (!latest) {
  console.log("Todavía no hay corridas. La primera es en el próximo horario, o usa: npm run ejecutar-ahora");
  process.exit(0);
}
if (!latest.session_id) {
  console.log(`La última corrida (${latest.created_at}) falló: ${latest.error?.type} - ${latest.error?.message}`);
  process.exit(1);
}

const session = await client.beta.sessions.retrieve(latest.session_id);
console.log(`Corrida del ${latest.created_at}, sesión ${latest.session_id}, estado: ${session.status}`);
console.log(`Verla: https://platform.claude.com/workspaces/default/sessions/${latest.session_id}`);
if (session.status === "running") {
  console.log("Todavía está trabajando. Vuelve a correr este comando en unos minutos.");
}

// Hay un retraso de ~1-3 s entre terminar y que los archivos aparezcan.
let files = await client.beta.files.list({ scope_id: latest.session_id, betas: ["managed-agents-2026-04-01"] });
for (let i = 0; i < 2 && files.data.length === 0; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  files = await client.beta.files.list({ scope_id: latest.session_id, betas: ["managed-agents-2026-04-01"] });
}
if (files.data.length === 0) {
  console.log("Todavía no hay archivos en esa sesión.");
  process.exit(0);
}

fs.mkdirSync("borradores", { recursive: true });
for (const f of files.data) {
  const resp = await client.beta.files.download(f.id);
  const dest = path.join("borradores", path.basename(f.filename));
  fs.writeFileSync(dest, Buffer.from(await resp.arrayBuffer()));
  console.log(`Borrador guardado: ${dest}`);
}
