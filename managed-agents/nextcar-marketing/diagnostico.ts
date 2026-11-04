// Muestra qué pasó en la corrida más reciente de la revisión diaria: los últimos eventos,
// las herramientas que usó y, si quedó esperando aprobación, cuál llamada la detuvo.
//   DEPLOYMENT_ID=depl_... npm run diagnostico

import Anthropic from "@anthropic-ai/sdk";

const { DEPLOYMENT_ID } = process.env;
if (!DEPLOYMENT_ID) throw new Error("Falta DEPLOYMENT_ID (empieza con depl_).");

const client = new Anthropic();

const runs = [];
for await (const run of client.beta.deploymentRuns.list({ deployment_id: DEPLOYMENT_ID })) {
  runs.push(run);
}
runs.sort((a, b) => b.created_at.localeCompare(a.created_at));
const latest = runs[0];
if (!latest) throw new Error("No hay corridas todavía.");
if (!latest.session_id) {
  throw new Error(`La corrida falló al crear la sesión: ${latest.error?.type} - ${latest.error?.message}`);
}

const session = await client.beta.sessions.retrieve(latest.session_id);
console.log(`Sesión ${latest.session_id}, estado: ${session.status}`);
console.log(`https://platform.claude.com/workspaces/default/sessions/${latest.session_id}\n`);

const events: Record<string, unknown>[] = [];
for await (const e of client.beta.sessions.events.list(latest.session_id)) {
  events.push(e as unknown as Record<string, unknown>);
}
console.log(`${events.length} eventos en total. Últimos 30:\n`);

for (const e of events.slice(-30)) {
  const type = String(e.type);
  const bits: string[] = [];
  if (typeof e.name === "string") bits.push(`herramienta=${e.name}`);
  if (typeof e.evaluated_permission === "string") bits.push(`permiso=${e.evaluated_permission}`);
  if (e.stop_reason) bits.push(`stop_reason=${JSON.stringify(e.stop_reason)}`);
  if (e.error) bits.push(`error=${JSON.stringify(e.error).slice(0, 300)}`);
  if (type.startsWith("outcome") || type.includes("outcome")) bits.push(JSON.stringify(e).slice(0, 300));
  console.log(`${String(e.processed_at ?? "").slice(11, 19)}  ${type}  ${bits.join("  ")}`);
}
