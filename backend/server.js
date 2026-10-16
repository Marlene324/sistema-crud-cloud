const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;

// Credenciales configuradas correctamente
const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxGc-tZz6l8O1y1KVUNQG_wcLPN-6gQH39VLfQrcueH6hhJZzOukZ5f4OI-r_LQIPHU1Q/exec";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  "AIzaSyDlS_MzoNNmYfOHMBVN0APVTff4l4wjQwc";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Verificación en consola
console.log(
  "Clave cargada correctamente:",
  GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 6) + "..." : "NO CONFIGURADA"
);

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Envía una acción al Apps Script y valida que realmente respondió "success".
// Apps Script responde con un redirect 302 tras el POST; axios lo sigue solo.
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

// Ruta de prueba rápida
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

// 5. ASISTENTE ANALÍTICO (POST CON GEMINI)
app.post("/api/asistente", async (req, res) => {
  const pregunta = String((req.body && req.body.pregunta) || "").trim();

  if (!pregunta) {
    return res.status(400).json({ respuesta: "Escribe una pregunta." });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      respuesta: "El servidor no tiene configurada la clave de la IA.",
    });
  }

  try {
    // Obtenemos los productos actuales de Google Sheets
    const responseSheets = await axios.get(GOOGLE_SCRIPT_URL, {
      maxRedirects: 10,
    });
    const productos =
      responseSheets.data && Array.isArray(responseSheets.data.productos)
        ? responseSheets.data.productos
        : [];

    // Preparamos la instrucción con los datos formateados
    const prompt = `
Eres un asistente analítico experto en inventarios.
A continuación tienes los datos actualizados del inventario en formato JSON:
${JSON.stringify(productos, null, 2)}

Responde en español, de forma concisa, ejecutiva y profesional, usando solo estos datos.
Si la respuesta no está en los datos, dilo con honestidad.

Consulta del usuario:
"${pregunta}"
    `;

    // Procesamos la consulta con Gemini
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    return res.json({ respuesta: result.text });
  } catch (error) {
    console.error(
      "Error en Asistente Gemini:",
      error.status || "",
      error.message
    );
    return res.status(500).json({
      respuesta: "Error al procesar la consulta con Inteligencia Artificial.",
    });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});