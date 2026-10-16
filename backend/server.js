const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;

// Variables de entorno con valores de respaldo
const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxGc-tZz6l8O1y1KVUNQG_wcLPN-6gQH39VLfQrcueH6hhJZzOukZ5f4OI-r_LQIPHU1Q/exec";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  "AIzaSyDlS_MzoNNmYfOHMBVN0APVTff4l4wjQwc";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

console.log(
  "Clave cargada correctamente:",
  GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 6) + "..." : "NO CONFIGURADA"
);

// Función auxiliar para Google Apps Script
async function enviarAScript(action, payload) {
  const response = await axios.post(
    GOOGLE_SCRIPT_URL,
    JSON.stringify({ action, payload }),
    {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      maxRedirects: 10,
    }
  );

  const data = response.data;
  if (!data || typeof data !== "object" || data.status !== "success") {
    throw new Error(
      "Respuesta inesperada de Apps Script: " +
        (typeof data === "string" ? data.slice(0, 200) : JSON.stringify(data))
    );
  }
  return data;
}

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API Control de Productos funcionando");
});

// 1. OBTENER PRODUCTOS (GET)
app.get("/api/productos", async (req, res) => {
  try {
    const response = await axios.get(GOOGLE_SCRIPT_URL, { maxRedirects: 10 });
    const productos =
      response.data && Array.isArray(response.data.productos)
        ? response.data.productos
        : [];
    return res.json(productos);
  } catch (error) {
    console.error("Error en GET:", error.message);
    return res.json([]);
  }
});

// 2. CREAR PRODUCTO (POST)
app.post("/api/productos", async (req, res) => {
  const { nombre, precio, categoria, stock } = req.body;
  try {
    await enviarAScript("CREATE", {
      nombre,
      precio: Number(precio),
      categoria,
      stock: Number(stock),
    });
    return res.status(201).json({ status: "success" });
  } catch (error) {
    console.error("Error en POST:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. ACTUALIZAR PRODUCTO (PUT)
app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria, stock } = req.body;
  try {
    await enviarAScript("UPDATE", {
      id,
      nombre,
      precio: Number(precio),
      categoria,
      stock: Number(stock),
    });
    return res.json({ status: "success" });
  } catch (error) {
    console.error("Error en PUT:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 4. ELIMINAR PRODUCTO (DELETE)
app.delete("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await enviarAScript("DELETE", { id });
    return res.json({ status: "success", id });
  } catch (error) {
    console.error("Error en DELETE:", error.message);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// 5. ASISTENTE ANALÍTICO (POST CON GEMINI API REST)
app.post("/api/asistente", async (req, res) => {
  const pregunta = String((req.body && req.body.pregunta) || "").trim();

  if (!pregunta) {
    return res.status(400).json({ dictamen: "Escribe una pregunta." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      dictamen: "El servidor no tiene configurada la clave de la IA.",
    });
  }

  try {
    const responseSheets = await axios.get(GOOGLE_SCRIPT_URL, {
      maxRedirects: 10,
    });
    const productos =
      responseSheets.data && Array.isArray(responseSheets.data.productos)
        ? responseSheets.data.productos
        : [];

    const prompt = `
Eres un asistente analítico experto en inventarios.
A continuación tienes los datos actualizados del inventario en formato JSON:
${JSON.stringify(productos, null, 2)}

Responde en español, de forma concisa, ejecutiva y profesional, usando solo estos datos.
Si la respuesta no está en los datos, dilo con honestidad.

Consulta del usuario:
"${pregunta}"
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const responseGemini = await axios.post(
      geminiUrl,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const respuestaTexto =
      responseGemini.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No se obtuvo respuesta del modelo.";

    return res.json({ dictamen: respuestaTexto });
  } catch (error) {
    console.error(
      "Error en Asistente Gemini:",
      error.response ? JSON.stringify(error.response.data) : error.message
    );
    return res.status(500).json({
      dictamen: "Error al procesar la consulta con Inteligencia Artificial.",
    });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});