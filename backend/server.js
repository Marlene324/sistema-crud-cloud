const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;

const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbxGc-tZz6l8O1y1KVUNQG_wcLPN-6gQH39VLfQrcueH6hhJZzOukZ5f4OI-r_LQIPHU1Q/exec";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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

// ===================== ANÁLISIS LOCAL (RESPALDO) =====================

const STOCK_MINIMO = 10;

const normalizar = (texto) =>
  String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const contiene = (texto, ...palabras) => palabras.some((p) => texto.includes(p));

const dinero = (n) =>
  "$" + Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

function analizarPregunta(pregunta, productos) {
  const q = normalizar(pregunta);
  const totalUnidades = productos.reduce((a, p) => a + p.stock, 0);
  const valorTotal = productos.reduce((a, p) => a + p.precio * p.stock, 0);

  if (contiene(q, "barato", "economico", "menor precio")) {
    const p = productos.reduce((a, b) => (b.precio < a.precio ? b : a));
    return `El producto más barato es **${p.nombre}** con un precio de **${dinero(p.precio)}**.`;
  }
  if (contiene(q, "caro", "costoso", "mayor precio")) {
    const p = productos.reduce((a, b) => (b.precio > a.precio ? b : a));
    return `El producto con mayor precio es **${p.nombre}** con un costo de **${dinero(p.precio)}**.`;
  }
  if (contiene(q, "stock", "existencia", "agot", "poco", "bajo")) {
    const bajos = productos.filter((p) => p.stock < STOCK_MINIMO);
    if (bajos.length === 0) return "Todos los productos tienen stock suficiente.";
    return `Productos con stock bajo: ${bajos.map((p) => `**${p.nombre}** (${p.stock})`).join(", ")}.`;
  }
  if (contiene(q, "valor", "cuanto vale")) {
    return `El valor total del inventario es de **${dinero(valorTotal)}**.`;
  }
  return `Hay **${productos.length} productos** registrados con **${totalUnidades} unidades** en total y un valor de **${dinero(valorTotal)}**.`;
}

// ===================== INTELIGENCIA ARTIFICIAL (GEMINI) =====================
// La clave se guarda como variable de entorno en Render (GEMINI_API_KEY), nunca en el código.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Modelos de respaldo opcionales, separados por comas (variable GEMINI_FALLBACK_MODELS en Render)
const GEMINI_MODELOS = [
  GEMINI_MODEL,
  ...String(process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
];

// Llama a un modelo de Gemini; si Google está saturado reintenta unas veces
async function llamarModelo(modelo, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
  const pausas = [0, 2000, 4000];
  let ultimoError;
  for (const pausa of pausas) {
    if (pausa) await esperar(pausa);
    try {
      const response = await axios.post(
        url,
        { contents: [{ parts: [{ text: prompt }] }] },
        {
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
          timeout: 20000,
        }
      );
      const texto = response.data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim();
      if (!texto) throw new Error("Gemini respondió sin texto");
      return texto;
    } catch (error) {
      ultimoError = error;
      const status = error.response?.status;
      if (!(status === 503 || status === 429 || error.code === "ECONNABORTED")) break;
      console.warn(`Gemini (${modelo}) saturado, reintentando...`);
    }
  }
  throw ultimoError;
}

async function preguntarAGemini(pregunta, productos) {
  if (!GEMINI_API_KEY) throw new Error("Falta la variable GEMINI_API_KEY");

  const datos = productos.map((p) => ({
    nombre: p.nombre,
    categoria: p.categoria,
    precio: p.precio,
    stock: p.stock,
  }));

  const prompt = [
    "Eres el asistente analítico de un sistema de inventario.",
    "Responde en español, de forma breve y clara (máximo 8 líneas).",
    "Usa SOLO los datos del inventario que te doy; no inventes productos ni cifras.",
    `Considera stock bajo cuando un producto tenga menos de ${STOCK_MINIMO} unidades.`,
    "Puedes resaltar nombres y cifras importantes con **negritas** y usar viñetas con •.",
    "Si la pregunta no tiene relación con el inventario, indícalo amablemente.",
    "",
    "INVENTARIO (JSON):",
    JSON.stringify(datos),
    "",
    "PREGUNTA DEL USUARIO:",
    pregunta,
  ].join("\n");

  let ultimoError;
  for (const modelo of GEMINI_MODELOS) {
    try {
      return await llamarModelo(modelo, prompt);
    } catch (error) {
      ultimoError = error;
      console.warn(`Falló el modelo ${modelo}:`, error.response?.data?.error?.message || error.message);
    }
  }
  throw ultimoError;
}

// 5. ASISTENTE ANALÍTICO (POST)
// Flujo: React -> API -> Google Sheets + Gemini -> respuesta -> React
app.post("/api/asistente", async (req, res) => {
  const pregunta = String((req.body && req.body.pregunta) || "").trim();

  if (!pregunta) {
    return res.status(400).json({ dictamen: "Escribe una pregunta." });
  }

  let productos = [];
  try {
    // 1) Leer los productos desde Google Sheets (con un reintento)
    let responseSheets;
    try {
      responseSheets = await axios.get(GOOGLE_SCRIPT_URL, { maxRedirects: 10 });
    } catch (e) {
      await esperar(1500);
      responseSheets = await axios.get(GOOGLE_SCRIPT_URL, { maxRedirects: 10 });
    }
    const crudos =
      responseSheets.data && Array.isArray(responseSheets.data.productos)
        ? responseSheets.data.productos
        : [];

    productos = crudos
      .filter((p) => p && p.nombre)
      .map((p) => ({
        ...p,
        nombre: String(p.nombre).trim(),
        categoria: String(p.categoria || "Sin categoría").trim(),
        precio: Number(p.precio) || 0,
        stock: Number(p.stock) || 0,
      }));
  } catch (error) {
    console.error("Error al leer Google Sheets:", error.message);
    return res.status(500).json({ dictamen: "Error al consultar los datos del inventario." });
  }

  if (productos.length === 0) {
    return res.json({ dictamen: "Actualmente no hay productos registrados en el inventario." });
  }

  // 2) Generar la respuesta con Gemini
  try {
    const dictamen = await preguntarAGemini(pregunta, productos);
    return res.json({ dictamen, fuente: "gemini" });
  } catch (error) {
    // 3) Si la IA falla, se usa el análisis local de respaldo
    console.error("Error con Gemini, usando análisis local:", error.response?.data?.error?.message || error.message);
    const dictamen = analizarPregunta(pregunta, productos);
    return res.json({ dictamen, fuente: "local" });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});