import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Gemini
  app.post("/api/gemini", async (req, res) => {
    try {
      const { brand, model, year } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Actúa como un experto en autos. Tengo un auto marca "${brand}", modelo "${model}", año ${year}.
Por favor, devuélveme un objeto JSON con los siguientes datos sobre este auto (si no tienes el dato exacto, da la opción más común para ese modelo y año en México):
- "bodyType": tipo de carrocería (ej. Sedán, SUV, Hatchback, Pick-up, Coupé).
- "transmission": tipo de transmisión principal (ej. Automática, Manual o CVT).
- "engineType": tipo de motor (ej. 4 cilindros 2.0L o V6 3.5L).
- "horsepower": caballos de fuerza aproximados (ej. 150 hp).
- "fuelConsumption": consumo de gasolina promedio combinado (ej. 15 km/l).
- "highlights": 4 características breves o puntos fuertes del auto que enamoren al comprador (string separado por comas).
- "features": 6-8 elementos de equipamiento destacados (string separado por comas, ej: Apple CarPlay, Cámara de reversa, Quemacocos).
- "description": un párrafo persuasivo de descripción del vehículo, resaltando sus características, si es ideal para la familia, qué situaciones o necesidades resuelve y qué lo hace especial.
No incluyas markdown, solo un JSON object.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bodyType: { type: Type.STRING },
              transmission: { type: Type.STRING },
              engineType: { type: Type.STRING },
              horsepower: { type: Type.STRING },
              fuelConsumption: { type: Type.STRING },
              highlights: { type: Type.STRING },
              features: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["bodyType", "transmission", "engineType", "horsepower", "fuelConsumption", "highlights", "features", "description"]
          }
        }
      });
      res.json(JSON.parse(response.text || '{}'));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
