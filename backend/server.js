const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXGc-tZz6I8O1y1KVUNQG_wcLPN-6gQH39VLfQrcueH6hhJZzOukZ5f4OI-r_LQIPHU1Q/exec";

// Función para enviar datos a Google Apps Script siguiendo redirecciones
async function postToGoogle(data) {
  try {
    const response = await axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(data), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      maxRedirects: 10
    });
    return response.data;
  } catch (error) {
    console.error("Error conectando con Google Apps Script:", error.message);
    return { status: "error", message: error.message };
  }
}

// 1. OBTENER PRODUCTOS (GET)
app.get("/api/productos", async (req, res) => {
  try {
    const response = await axios.get(GOOGLE_SCRIPT_URL, { maxRedirects: 10 });
    const productos = response.data && response.data.productos ? response.data.productos : [];
    return res.json(productos);
  } catch (error) {
    console.error("Error en GET:", error.message);
    return res.json([]);
  }
});

// 2. CREAR PRODUCTO (POST)
app.post("/api/productos", async (req, res) => {
  const { nombre, precio, categoria, stock } = req.body;
  const payload = {
    action: "CREATE",
    payload: { nombre, precio: Number(precio), categoria, stock: Number(stock) }
  };
  
  const result = await postToGoogle(payload);
  return res.status(200).json(result);
});

// 3. ACTUALIZAR PRODUCTO (PUT)
app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria, stock } = req.body;
  const payload = {
    action: "UPDATE",
    payload: { id, nombre, precio: Number(precio), categoria, stock: Number(stock) }
  };

  const result = await postToGoogle(payload);
  return res.status(200).json(result);
});

// 4. ELIMINAR PRODUCTO (DELETE)
app.delete("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const payload = {
    action: "DELETE",
    payload: { id }
  };

  const result = await postToGoogle(payload);
  return res.status(200).json(result);
});

app.listen(PORT, () => {
  console.log("Servidor corriendo en el puerto " + PORT);
});