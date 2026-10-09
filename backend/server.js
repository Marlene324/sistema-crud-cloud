const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Configuración de autenticación de Google Sheets con las variables de entorno
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// Base de datos temporal
let productosDB = [
  { id: "1", nombre: "Laptop", precio: 15000, categoria: "Computadoras", stock: 10 },
  { id: "2", nombre: "Mouse", precio: 350, categoria: "Accesorios", stock: 25 }
];

// 🟢 READ - Obtener todos los productos
app.get("/api/productos", (req, res) => {
  res.json(productosDB);
});

// 🟢 CREATE - Crear un nuevo producto y guardarlo en Google Sheets
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

  // Guardar en Google Sheets si la variable SPREADSHEET_ID existe
  try {
    if (process.env.SPREADSHEET_ID) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: "Hoja 1!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[nuevoProducto.id, nuevoProducto.nombre, nuevoProducto.precio, nuevoProducto.categoria, nuevoProducto.stock]],
        },
      });
      console.log(" Guardado exitosamente en Google Sheets");
    }
  } catch (error) {
    console.error(" Error al guardar en Google Sheets:", error.message);
  }

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