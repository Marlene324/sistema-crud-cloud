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

// 5. ASISTENTE ANALÍTICO (ANALIZADOR DIRECTO DE INVENTARIO)
app.post("/api/asistente", async (req, res) => {
  const pregunta = String((req.body && req.body.pregunta) || "").trim();

  if (!pregunta) {
    return res.status(400).json({ dictamen: "Escribe una pregunta." });
  }

  try {
    const responseSheets = await axios.get(GOOGLE_SCRIPT_URL, {
      maxRedirects: 10,
    });
    const productos =
      responseSheets.data && Array.isArray(responseSheets.data.productos)
        ? responseSheets.data.productos
        : [];

    if (productos.length === 0) {
      return res.json({
        dictamen: "Actualmente no hay productos registrados en el inventario.",
      });
    }

    const pregLower = pregunta.toLowerCase();
    let dictamen = "";

    // Análisis de producto con mayor precio
    if (pregLower.includes("precio") || pregLower.includes("costoso") || pregLower.includes("caro")) {
      const masCaro = productos.reduce((prev, current) =>
        Number(current.precio) > Number(prev.precio) ? current : prev
      );
      dictamen = `El producto con mayor precio es **${masCaro.nombre}** con un costo de **$${masCaro.precio}** (Categoría: ${masCaro.categoria}, Stock: ${masCaro.stock}).`;
    }
    // Análisis de stock bajo
    else if (pregLower.includes("stock") || pregLower.includes("poco") || pregLower.includes("agot")) {
      const bajoStock = productos.filter((p) => Number(p.stock) < 10);
      if (bajoStock.length > 0) {
        const nombres = bajoStock.map((p) => `${p.nombre} (${p.stock} unids)`).join(", ");
        dictamen = `Los productos con stock bajo (menos de 10 unidades) son: ${nombres}.`;
      } else {
        dictamen = "Todos los productos cuentan con un stock saludable (10 o más unidades).";
      }
    }
    // Resumen general
    else {
      const totalProductos = productos.length;
      const totalStock = productos.reduce((acc, p) => acc + Number(p.stock || 0), 0);
      dictamen = `Resumen Ejecutivo: Se tienen **${totalProductos} productos** registrados en catálogo con un volumen total de **${totalStock} unidades** en stock.`;
    }

    return res.json({ dictamen });
  } catch (error) {
    console.error("Error en Asistente:", error.message);
    return res.status(500).json({
      dictamen: "Error al consultar los datos del inventario.",
    });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});