import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import mysql from "mysql2/promise";

let pool: any;

function getPool() {
  if (!pool) {
    const config = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000 // Add a timeout
    };
    
    if (!config.host || !config.user || !config.database) {
      const missing = [];
      if (!config.host) missing.push("DB_HOST");
      if (!config.user) missing.push("DB_USER");
      if (!config.database) missing.push("DB_NAME");
      throw new Error(`Faltan variables de entorno para la base de datos: ${missing.join(", ")}. Por favor configúralas en el menú Settings.`);
    }
    
    pool = mysql.createPool(config);
  }
  return pool;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for listing autos from MySQL
  app.get("/api/list-autos", async (req, res) => {
    try {
      const db = getPool();
      const [rows]: any = await db.execute("SELECT * FROM autos WHERE activo = 1 ORDER BY id DESC");
      
      const cars = rows.map((row: any) => ({
        id: String(row.id),
        brand: row.marca || "",
        model: row.modelo || "",
        year: Number(row.año) || 2024,
        price: Number(row.precio) || 0,
        mileage: Number(row.kilometraje) || 0,
        bodyType: row.carroceria || "Sedán",
        transmission: row.transmision || "Automática",
        description: row.descripcion || "",
        images: row.imagen_principal ? [row.imagen_principal] : [],
        passengers: 5,
        features: [],
        highlights: [],
        status: row.activo ? 'available' : 'sold'
      }));

      res.json({ success: true, data: cars });
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/get-auto", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ success: false, message: "ID is required" });

      const db = getPool();
      const [rows]: any = await db.execute("SELECT * FROM autos WHERE id = ?", [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "Car not found" });
      }

      const row = rows[0];
      const car = {
        id: String(row.id),
        brand: row.marca || "",
        model: row.modelo || "",
        year: Number(row.año) || 2024,
        price: Number(row.precio) || 0,
        mileage: Number(row.kilometraje) || 0,
        bodyType: row.carroceria || "Sedán",
        transmission: row.transmision || "Automática",
        description: row.descripcion || "",
        images: row.imagen_principal ? [row.imagen_principal] : [],
        passengers: 5,
        features: [],
        highlights: [],
        status: row.activo ? 'available' : 'sold'
      };

      res.json({ success: true, data: car });
    } catch (error: any) {
      console.error("DB Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

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

  // Serve static files from public and dist
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use(express.static(path.join(process.cwd(), 'dist')));

  // Explicit route for autos.json to ensure it is served correctly
  app.get('/autos.json', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'autos.json'));
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
