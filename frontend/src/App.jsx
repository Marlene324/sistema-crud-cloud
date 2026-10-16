import React, { useState } from "react";
import axios from "axios";

const API_URL = "https://sistema-crud-cloud-1.onrender.com";

// Convierte **texto** en negritas y respeta los saltos de línea
function TextoFormateado({ texto }) {
  return texto.split("\n").map((linea, i) => (
    <p key={i} style={{ margin: "4px 0" }}>
      {linea.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
        parte.startsWith("**") && parte.endsWith("**") ? (
          <strong key={j}>{parte.slice(2, -2)}</strong>
        ) : (
          <span key={j}>{parte}</span>
        )
      )}
    </p>
  ));
}

export default function Asistente() {
  const [pregunta, setPregunta] = useState("");
  const [dictamen, setDictamen] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const consultarAsistente = async () => {
    if (!pregunta.trim() || cargando) return;
    setCargando(true);
    setDictamen("");
    setError("");

    try {
      const res = await axios.post(`${API_URL}/api/asistente`, { pregunta });
      console.log("Respuesta del backend:", res.data);

      const texto = res.data?.dictamen;
      if (texto) {
        setDictamen(texto);
      } else {
        setError("El servidor respondió, pero sin dictamen.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          "Error al conectar con el backend. Si es la primera consulta, espera unos segundos e intenta de nuevo."
      );
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
          onKeyDown={(e) => e.key === "Enter" && consultarAsistente()}
          placeholder="¿Cuál es el producto con menor stock?"
        />
        <button onClick={consultarAsistente} disabled={cargando}>
          {cargando ? "Procesando..." : "Consultar"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: "15px", padding: "12px", background: "#fdecea", color: "#b3261e", borderRadius: "6px", textAlign: "left" }}>
          {error}
        </div>
      )}

      {dictamen && (
        <div style={{ marginTop: "15px", padding: "12px", background: "#eef2f7", borderRadius: "6px", textAlign: "left" }}>
          <strong>Respuesta:</strong>
          <TextoFormateado texto={dictamen} />
        </div>
      )}
    </div>
  );
}