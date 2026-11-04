// Pausa la revisión diaria de la API para que deje de correr y de cobrar.
// No borra nada: se puede reanudar después (client.beta.deployments.unpause).
//   DEPLOYMENT_ID=depl_... npm run pausar

import Anthropic from "@anthropic-ai/sdk";

const { DEPLOYMENT_ID } = process.env;
if (!DEPLOYMENT_ID) throw new Error("Falta DEPLOYMENT_ID (empieza con depl_).");

const client = new Anthropic();
const d = await client.beta.deployments.pause(DEPLOYMENT_ID);
console.log(`Tarea ${d.id}: estado ${d.status}.`);
