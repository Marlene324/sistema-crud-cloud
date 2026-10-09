const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyedZ6iM4DKb07wigil-LvIoci1xUyO6MFyqquAAXKT_2ybbxUveV-flq-S85kythBgjw/exec";

// Base de datos temporal
let productosDB = [
  { id: "1", nombre: "Laptop", precio: 15000, categoria: "Computadoras", stock: 10 },
  { id: "2", nombre: "Mouse", precio: 350, categoria: "Accesorios", stock: 25 }
];

// 🟢 READ
app.get("/api/productos", (req, res) => {
  res.json(productosDB);
});

// 🟢 CREATE - Guarda en memoria y en Google Sheets
app.post("/api/productos", async (req, res) => {
  const { nombre, precio, categoria, stock } = req.body;

  const maxId = productosDB.reduce((max, item) => Math.max(max, parseInt(item.id) || 0), 0);
  const nextId = (maxId + 1).toString();

  const nuevoProducto = {
    id: nextId,
    nombre,
    precio: Number(precio),
    categoria,
    stock: Number(stock)
  };

  productosDB.push(nuevoProducto);

  // Enviar a Google Sheets a través de Apps Script
  try {
    if (GOOGLE_SCRIPT_URL) {
      await axios.post(GOOGLE_SCRIPT_URL, nuevoProducto);
      console.log("Guardado exitosamente en Google Sheets");
    }
  } catch (error) {
    console.error("Error al guardar en Google Sheets:", error.message);
  }

  res.status(201).json({ mensaje: "Producto creado", producto: nuevoProducto });
});

// 🟡 UPDATE
app.put("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria, stock } = req.body;
  const index = productosDB.findIndex((p) => p.id === id);

  if (index !== -1) {
    productosDB[index] = { id, nombre, precio: Number(precio), categoria, stock: Number(stock) };
    res.json({ mensaje: "Producto actualizado", producto: productosDB[index] });
  } else {
    res.status(404).json({ mensaje: "Producto no encontrado" });
  }
});

// 🔴 DELETE
app.delete("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  productosDB = productosDB.filter((p) => p.id !== id);
  res.json({ mensaje: "Producto eliminado correctamente" });
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en el puerto " + PORT);
});