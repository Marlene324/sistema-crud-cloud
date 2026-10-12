const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxGc-tZz6l8O1y1KVUNQG_wcLPN-6gQH39VLfQrcueH6hhJZzOukZ5f4OI-r_LQIPHU1Q/exec";

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

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});