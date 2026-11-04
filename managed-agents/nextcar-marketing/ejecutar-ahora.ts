// Dispara la revisión diaria ahora mismo (sin esperar al horario) y dice dónde verla.
//   DEPLOYMENT_ID=depl_... npm run ejecutar-ahora

import Anthropic from "@anthropic-ai/sdk";

const { DEPLOYMENT_ID } = process.env;
if (!DEPLOYMENT_ID) throw new Error("Falta DEPLOYMENT_ID (empieza con depl_).");

const client = new Anthropic();
const run = await client.beta.deployments.run(DEPLOYMENT_ID);
console.log(`Corrida ${run.id} iniciada.`);
if (run.session_id) {
  console.log(`Verla en vivo: https://platform.claude.com/workspaces/default/sessions/${run.session_id}`);
}
console.log("Cuando termine (unos minutos), baja el resultado con: npm run borradores");
