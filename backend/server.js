const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// URL desplegada de Google Apps Script (Versión 2)
const GOOGLE_SCRIPT_URL =
  process.env.GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzxMlicgW7qBCiHnC8WY6ogD8p2eND_hGRznS4K6T_C0IOAw6l2UnLPqGyiy3HOgFJquQ/exec";

// Middleware para validar que exista la URL de Apps Script
const checkScriptUrl = (req, res, next) => {
  if (!GOOGLE_SCRIPT_URL) {
    return res.status(500).json({
      error: "La variable GOOGLE_SCRIPT_URL no está configurada en el servidor."
    });
  }
  next();
};

// 🟢 1. READ (GET) - Obtener productos desde Google Sheets
app.get("/api/productos", checkScriptUrl, async (req, res) => {
  try {
    const response = await axios.get(GOOGLE_SCRIPT_URL, { maxRedirects: 5 });

    if (response.data && response.data.status === "success") {
      return res.json(response.data.productos);
    } else {
      return res
        .status(500)
        .json({ error: "Error de Apps Script", detalle: response.data });
    }
  } catch (error) {
    console.error("Error al obtener productos:", error.message);
    return res
      .status(500)
      .json({ error: "No se pudieron obtener los productos de Google Sheets" });
  }
});

// 🟢 2. CREATE (POST) - Registrar producto en Google Sheets
app.post("/api/productos", checkScriptUrl, async (req, res) => {
  const { nombre, precio, categoria, stock } = req.body;

  if (!nombre || precio === undefined || !categoria || stock === undefined) {
    return res.status(400).json({
      error: "Todos los campos (nombre, precio, categoria, stock) son obligatorios."
    });
  }

  try {
    const payload = {
      action: "CREATE",
      payload: {
        nombre,
        precio: Number(precio),
        categoria,
        stock: Number(stock)
      }
    };

    const response = await axios.post(GOOGLE_SCRIPT_URL, payload, {
      maxRedirects: 5
    });

    if (response.data && response.data.status === "success") {
      return res
        .status(201)
        .json({ mensaje: "Producto creado", producto: response.data.producto });
    } else {
      return res
        .status(500)
        .json({ error: "No se pudo crear en Google Sheets", detalle: response.data });
    }
  } catch (error) {
    console.error("Error al crear producto:", error.message);
    return res
      .status(500)
      .json({ error: "Error en el servidor al registrar el producto" });
  }
});

// 🟡 3. UPDATE (PUT) - Actualizar producto en Google Sheets
app.put("/api/productos/:id", checkScriptUrl, async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria, stock } = req.body;

  if (!nombre || precio === undefined || !categoria || stock === undefined) {
    return res
      .status(400)
      .json({ error: "Faltan datos requeridos para actualizar." });
  }

  try {
    const payload = {
      action: "UPDATE",
      payload: {
        id,
        nombre,
        precio: Number(precio),
        categoria,
        stock: Number(stock)
      }
    };

    const response = await axios.post(GOOGLE_SCRIPT_URL, payload, {
      maxRedirects: 5
    });

    if (response.data && response.data.status === "success") {
      return res.json({
        mensaje: "Producto actualizado",
        producto: response.data.producto
      });
    } else {
      return res
        .status(404)
        .json({ error: "No se pudo actualizar el producto", detalle: response.data });
    }
  } catch (error) {
    console.error("Error al actualizar producto:", error.message);
    return res
      .status(500)
      .json({ error: "Error en el servidor al actualizar el producto" });
  }
});

// 🔴 4. DELETE (DELETE) - Eliminar producto en Google Sheets
app.delete("/api/productos/:id", checkScriptUrl, async (req, res) => {
  const { id } = req.params;

  try {
    const payload = {
      action: "DELETE",
      payload: { id }
    };

    const response = await axios.post(GOOGLE_SCRIPT_URL, payload, {
      maxRedirects: 5
    });

    if (response.data && response.data.status === "success") {
      return res.json({ mensaje: "Producto eliminado correctamente", id });
    } else {
      return res
        .status(404)
        .json({ error: "No se pudo eliminar el producto", detalle: response.data });
    }
  } catch (error) {
    console.error("Error al eliminar producto:", error.message);
    return res
      .status(500)
      .json({ error: "Error en el servidor al eliminar el producto" });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en el puerto " + PORT);
});