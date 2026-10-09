const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Base de datos temporal
let productosDB = [
  { id: "1", nombre: "Laptop", precio: 15000, categoria: "Computadoras", stock: 10 },
  { id: "2", nombre: "Mouse", precio: 350, categoria: "Accesorios", stock: 25 }
];

// 🟢 READ - Obtener todos los productos
app.get("/api/productos", (req, res) => {
  res.json(productosDB);
});

// 🟢 CREATE - Crear un nuevo producto con ID secuencial
app.post("/api/productos", (req, res) => {
  const { nombre, precio, categoria, stock } = req.body;

  // Calcula el ID secuencial basándose en el valor máximo actual
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
  res.status(201).json({ mensaje: "Producto creado", producto: nuevoProducto });
});

// 🟡 UPDATE - Actualizar un producto existente
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

// 🔴 DELETE - Eliminar un producto
app.delete("/api/productos/:id", (req, res) => {
  const { id } = req.params;
  productosDB = productosDB.filter((p) => p.id !== id);
  res.json({ mensaje: "Producto eliminado correctamente" });
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en el puerto " + PORT);
});