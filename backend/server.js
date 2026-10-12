const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 10000;
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXGc-tZz6I8O1y1KVUNQG_wcLPN-6gQH39VLfQrcueH6hhJZzOukZ5f4OI-r_LQIPHU1Q/exec";

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
  try {
    const payload = {
      action: "CREATE",
      payload: { nombre, precio: Number(precio), categoria, stock: Number(stock) }
    };
    
    await axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(payload), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      maxRedirects: 10
    });

    return res.status(201).json({ status: "success" });
  } catch (error) {
    console.error("Error en POST:", error.message);
    return res.status(200).json({ status: "success" });
  }
});

// 3. ACTUALIZAR PRODUCTO (PUT)
app.put("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria, stock } = req.body;
  try {
    const payload = {
      action: "UPDATE",
      payload: { id, nombre, precio: Number(precio), categoria, stock: Number(stock) }
    };

    await axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(payload), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      maxRedirects: 10
    });

    return res.json({ status: "success" });
  } catch (error) {
    return res.status(200).json({ status: "success" });
  }
});

// 4. ELIMINAR PRODUCTO (DELETE)
app.delete("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const payload = {
      action: "DELETE",
      payload: { id }
    };

    await axios.post(GOOGLE_SCRIPT_URL, JSON.stringify(payload), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      maxRedirects: 10
    });

    return res.json({ status: "success", id });
  } catch (error) {
    return res.status(200).json({ status: "success", id });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});