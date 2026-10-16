import React, { useState } from "react";
import axios from "axios";

export default function Asistente() {
  const [pregunta, setPregunta] = useState("");
  const [dictamen, setDictamen] = useState("");
  const [cargando, setCargando] = useState(false);

  const consultarAsistente = async () => {
    if (!pregunta.trim()) return;
    setCargando(true);
    setDictamen("");

    try {
      const res = await axios.post(
        "https://sistema-crud-cloud-1.onrender.com/api/asistente",
        { pregunta }
      );
      // Esto descongela el botón y muestra el resultado
      setDictamen(res.data.dictamen);
    } catch (error) {
      console.error(error);
      setDictamen("Error al consultar el inventario.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="panel-card">
      <h2>Asistente Analítico de Inventario</h2>
      <p>Consulte métricas y resúmenes del sistema mediante lenguaje natural.</p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="¿Cuál es el producto..."
        />
        <button onClick={consultarAsistente} disabled={cargando}>
          {cargando ? "Procesando..." : "Consultar"}
        </button>
      </div>

      {/* MUESTRA EL DICTAMEN EN PANTALLA */}
      {dictamen && (
        <div style={{ marginTop: "15px", padding: "12px", background: "#eef2f7", borderRadius: "6px", color: "#333" }}>
          <strong>Respuesta:</strong>
          <p style={{ margin: "5px 0 0 0" }}>{dictamen}</p>
        </div>
      )}
    </div>
  );
}