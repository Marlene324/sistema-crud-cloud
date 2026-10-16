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

// ===================== ASISTENTE ANALÍTICO =====================

const STOCK_MINIMO = 10; // Debajo de esto se considera stock bajo

// Quita acentos y pasa a minúsculas para comparar sin errores
const normalizar = (texto) =>
  String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const contiene = (texto, ...palabras) => palabras.some((p) => texto.includes(p));

const dinero = (n) =>
  "$" + Number(n).toLocaleString("es-MX", { maximumFractionDigits: 2 });

const listaProductos = (lista, campo) =>
  lista
    .map((p) =>
      campo === "stock"
        ? `• **${p.nombre}**: ${p.stock} unidades`
        : `• **${p.nombre}**: ${dinero(p.precio)}`
    )
    .join("\n");

function agruparPorCategoria(productos) {
  const grupos = {};
  productos.forEach((p) => {
    const cat = p.categoria || "Sin categoría";
    if (!grupos[cat]) grupos[cat] = { cantidad: 0, unidades: 0, valor: 0 };
    grupos[cat].cantidad += 1;
    grupos[cat].unidades += p.stock;
    grupos[cat].valor += p.precio * p.stock;
  });
  return grupos;
}

function generarResumen(productos) {
  const totalUnidades = productos.reduce((a, p) => a + p.stock, 0);
  const valorTotal = productos.reduce((a, p) => a + p.precio * p.stock, 0);
  const promedio = productos.reduce((a, p) => a + p.precio, 0) / productos.length;
  const masCaro = productos.reduce((a, b) => (b.precio > a.precio ? b : a));
  const masBarato = productos.reduce((a, b) => (b.precio < a.precio ? b : a));
  const categorias = Object.keys(agruparPorCategoria(productos)).length;
  const bajos = productos.filter((p) => p.stock < STOCK_MINIMO).length;

  return [
    "**Resumen Ejecutivo del Inventario**",
    `• **${productos.length} productos** en **${categorias} categorías**, con **${totalUnidades} unidades** en total.`,
    `• Valor total del inventario: **${dinero(valorTotal)}**.`,
    `• Precio promedio: **${dinero(promedio)}**.`,
    `• Más caro: **${masCaro.nombre}** (${dinero(masCaro.precio)}). Más barato: **${masBarato.nombre}** (${dinero(masBarato.precio)}).`,
    bajos > 0
      ? `• ⚠️ **${bajos} producto(s)** con stock bajo (menos de ${STOCK_MINIMO} unidades).`
      : "• ✅ Todos los productos tienen stock suficiente.",
  ].join("\n");
}

function generarRecomendaciones(productos) {
  const recs = [];
  const bajos = productos.filter((p) => p.stock < STOCK_MINIMO);
  const promedioStock = productos.reduce((a, p) => a + p.stock, 0) / productos.length;
  const exceso = productos.filter((p) => p.stock >= promedioStock * 2 && p.stock >= STOCK_MINIMO);
  const grupos = agruparPorCategoria(productos);
  const cats = Object.entries(grupos).sort((a, b) => b[1].valor - a[1].valor);
  const valorTotal = productos.reduce((a, p) => a + p.precio * p.stock, 0);
  const masValioso = productos.reduce((a, b) => (b.precio * b.stock > a.precio * a.stock ? b : a));

  if (bajos.length > 0) {
    recs.push(
      `**Reabastecer pronto:** ${bajos.map((p) => `${p.nombre} (${p.stock} unids)`).join(", ")}. Quedarse sin existencias significa perder ventas.`
    );
  }

  if (exceso.length > 0) {
    recs.push(
      `**Impulsar productos con mucho stock:** ${exceso.map((p) => p.nombre).join(", ")}. Considera promociones o paquetes para darles salida.`
    );
  }

  if (cats.length > 0 && valorTotal > 0) {
    const [catTop, datos] = cats[0];
    const porcentaje = Math.round((datos.valor / valorTotal) * 100);
    if (porcentaje >= 50 && cats.length > 1) {
      recs.push(
        `**Diversificar el catálogo:** la categoría **${catTop}** concentra el **${porcentaje}%** del valor del inventario. Ampliar otras categorías reduce el riesgo.`
      );
    } else {
      recs.push(
        `**Aprovechar la categoría líder:** **${catTop}** es la de mayor valor (${dinero(datos.valor)}). Dale más visibilidad en tu tienda.`
      );
    }
  }

  recs.push(
    `**Destacar el producto estrella:** **${masValioso.nombre}** representa el mayor valor en inventario (${dinero(masValioso.precio * masValioso.stock)}). Úsalo como producto principal en promociones.`
  );

  return ["**Recomendaciones para mejorar las ventas**", ...recs.map((r, i) => `${i + 1}. ${r}`)].join("\n");
}

function mensajeAyuda() {
  return [
    "No entendí del todo tu pregunta. Puedes intentar con algo como:",
    "• ¿Cuál es el producto más caro / más barato?",
    "• ¿Qué productos tienen stock bajo?",
    "• ¿Cuál es el valor total del inventario?",
    "• ¿Cuántos productos hay por categoría?",
    "• ¿Qué productos cuestan más de $5000?",
    "• Dame un resumen ejecutivo",
    "• ¿Qué recomendaciones me das para mejorar las ventas?",
  ].join("\n");
}

function analizarPregunta(pregunta, todos) {
  const q = normalizar(pregunta);

  // ¿Menciona una categoría? Entonces el análisis se limita a ella
  const categorias = [...new Set(todos.map((p) => p.categoria).filter(Boolean))];
  const catMencionada = categorias.find((c) => q.includes(normalizar(c)));
  const productos = catMencionada
    ? todos.filter((p) => normalizar(p.categoria) === normalizar(catMencionada))
    : todos;
  const ambito = catMencionada ? ` en la categoría **${catMencionada}**` : "";

  // ¿Menciona un producto específico?
  const prodMencionado = todos.find((p) => p.nombre && q.includes(normalizar(p.nombre)));

  const hablaDeStock = contiene(q, "stock", "unidad", "existencia", "pieza", "inventario de");

  // 1. Recomendaciones
  if (contiene(q, "recomend", "mejorar", "sugerencia", "sugier", "consejo", "optimizar", "estrategia", "aumentar las ventas", "vender mas")) {
    return generarRecomendaciones(todos);
  }

  // 2. Resumen
  if (contiene(q, "resumen", "general", "panorama", "reporte", "informe")) {
    return generarResumen(todos);
  }

  // 3. Valor total del inventario
  if (contiene(q, "valor", "cuanto vale", "dinero", "capital", "invertido")) {
    const valor = productos.reduce((a, p) => a + p.precio * p.stock, 0);
    return `El valor total del inventario${ambito} es de **${dinero(valor)}** (precio × stock de cada producto).`;
  }

  // 4. Precio promedio
  if (contiene(q, "promedio", "media")) {
    const prom = productos.reduce((a, p) => a + p.precio, 0) / productos.length;
    return `El precio promedio${ambito} es de **${dinero(prom)}**, calculado sobre ${productos.length} producto(s).`;
  }

  // 5. Productos por categoría
  if (!catMencionada && contiene(q, "categoria")) {
    const grupos = Object.entries(agruparPorCategoria(todos)).sort((a, b) => b[1].cantidad - a[1].cantidad);
    const detalle = grupos
      .map(([cat, d]) => `• **${cat}**: ${d.cantidad} producto(s), ${d.unidades} unidades, valor ${dinero(d.valor)}`)
      .join("\n");
    return `Hay **${grupos.length} categorías**. La que tiene más productos es **${grupos[0][0]}**.\n${detalle}`;
  }

  // 6. Filtros por cantidad: "más de $5000", "menos de 10 unidades"
  const mayorQue = q.match(/(?:mas|mayor(?:es)?|arriba|encima|superior(?:es)?)\s+(?:de|a|que)\s+\$?\s*([\d.,]+)/);
  const menorQue = q.match(/(?:menos|menor(?:es)?|debajo|bajo|inferior(?:es)?)\s+(?:de|a|que)\s+\$?\s*([\d.,]+)/);
  if (mayorQue || menorQue) {
    const campo = hablaDeStock ? "stock" : "precio";
    const limite = Number((mayorQue || menorQue)[1].replace(/,/g, ""));
    const resultado = productos.filter((p) => (mayorQue ? p[campo] > limite : p[campo] < limite));
    const condicion = `${mayorQue ? "más" : "menos"} de ${campo === "precio" ? dinero(limite) : limite + " unidades"}`;
    if (resultado.length === 0) return `No hay productos${ambito} con ${condicion}.`;
    return `Productos${ambito} con ${condicion} (${resultado.length}):\n${listaProductos(resultado, campo)}`;
  }

  // 7. Más barato
  if (contiene(q, "barato", "economico", "menor precio", "mas bajo de precio", "precio mas bajo", "menos cuesta")) {
    const p = productos.reduce((a, b) => (b.precio < a.precio ? b : a));
    return `El producto más barato${ambito} es **${p.nombre}** con un precio de **${dinero(p.precio)}** (Categoría: ${p.categoria}, Stock: ${p.stock}).`;
  }

  // 8. Más caro
  if (contiene(q, "caro", "costoso", "mayor precio", "precio mas alto", "mas cuesta")) {
    const p = productos.reduce((a, b) => (b.precio > a.precio ? b : a));
    return `El producto con mayor precio${ambito} es **${p.nombre}** con un costo de **${dinero(p.precio)}** (Categoría: ${p.categoria}, Stock: ${p.stock}).`;
  }

  // 9. Total de unidades
  if (hablaDeStock && contiene(q, "total", "cuantas", "suma")) {
    const total = productos.reduce((a, p) => a + p.stock, 0);
    return `Hay **${total} unidades** en total${ambito}, repartidas en ${productos.length} producto(s).`;
  }

  // 10. Menor / mayor existencia
  if (contiene(q, "menos existencia", "menor existencia", "menos stock", "menor stock", "menos unidades", "menos piezas")) {
    const p = productos.reduce((a, b) => (b.stock < a.stock ? b : a));
    return `El producto con menos existencias${ambito} es **${p.nombre}** con **${p.stock} unidades**.`;
  }
  if (contiene(q, "mas existencia", "mayor existencia", "mas stock", "mayor stock", "mas unidades", "mas piezas")) {
    const p = productos.reduce((a, b) => (b.stock > a.stock ? b : a));
    return `El producto con más existencias${ambito} es **${p.nombre}** con **${p.stock} unidades**.`;
  }

  // 11. Stock bajo / reabastecimiento
  if (contiene(q, "bajo", "poco", "agot", "reabastec", "resurtir", "falta", "stock", "existencia")) {
    const bajos = productos.filter((p) => p.stock < STOCK_MINIMO).sort((a, b) => a.stock - b.stock);
    if (bajos.length === 0) {
      return `✅ Todos los productos${ambito} tienen stock suficiente (${STOCK_MINIMO} o más unidades).`;
    }
    return `⚠️ Productos${ambito} con stock bajo (menos de ${STOCK_MINIMO} unidades), ordenados por urgencia:\n${listaProductos(bajos, "stock")}`;
  }

  // 12. Información de un producto específico
  if (prodMencionado) {
    const p = prodMencionado;
    return `**${p.nombre}**: precio ${dinero(p.precio)}, categoría ${p.categoria}, ${p.stock} unidades en stock (valor: ${dinero(p.precio * p.stock)}).`;
  }

  // 13. Listado / cantidad de productos
  if (contiene(q, "cuantos productos", "lista", "todos los productos", "que productos", "catalogo", "productos hay")) {
    return `Hay **${productos.length} productos**${ambito}:\n${productos
      .map((p) => `• **${p.nombre}**: ${dinero(p.precio)}, ${p.stock} unidades`)
      .join("\n")}`;
  }

  // 14. Pregunta genérica sobre precio
  if (contiene(q, "precio", "cuesta", "cuestan")) {
    const ordenados = [...productos].sort((a, b) => b.precio - a.precio);
    return `Precios${ambito}, de mayor a menor:\n${listaProductos(ordenados, "precio")}`;
  }

  return mensajeAyuda();
}

// ===================== INTELIGENCIA ARTIFICIAL (GEMINI) =====================
// La clave se guarda como variable de entorno en Render (GEMINI_API_KEY), nunca en el código.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await axios.post(
    url,
    { contents: [{ parts: [{ text: prompt }] }] },
    {
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      timeout: 25000,
    }
  );

  const texto = response.data?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();
  if (!texto) throw new Error("Gemini respondió sin texto");
  return texto;
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
    // 1) Leer los productos desde Google Sheets
    const responseSheets = await axios.get(GOOGLE_SCRIPT_URL, { maxRedirects: 10 });
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
    // 3) Si la IA falla (sin clave, límite de uso, etc.), se usa el análisis local de respaldo
    console.error("Error con Gemini, usando análisis local:", error.response?.data?.error?.message || error.message);
    const dictamen = analizarPregunta(pregunta, productos);
    return res.json({ dictamen, fuente: "local" });
  }
});

app.listen(PORT, () => {
  console.log("Servidor escuchando en puerto " + PORT);
});