import { useState } from "react";
import "./App.css";

const API_URL = "https://sistema-crud-cloud-1.onrender.com/api/productos";
const IA_URL = "https://sistema-crud-cloud-1.onrender.com/api/asistente";

function App() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState("admin");
  const [passwordInput, setPasswordInput] = useState("12345");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("inventario");
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ id: "", nombre: "", precio: "", categoria: "", stock: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [preguntaIA, setPreguntaIA] = useState("");
  const [respuestaIA, setRespuestaIA] = useState("");
  const [cargandoIA, setCargandoIA] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (usernameInput === "admin" && passwordInput === "12345") {
      setUser({ name: "Administrador" });
      setLoginError("");
      fetchProductos();
    } else {
      setLoginError("Usuario o contraseña incorrectos");
    }
  };

  const fetchProductos = () => {
    setCargando(true);
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setProductos(Array.isArray(data) ? data : []);
        setCargando(false);
      })
      .catch((err) => {
        console.error(err);
        setProductos([]);
        setCargando(false);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setCargando(true);
    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/${form.id}` : API_URL;

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
      .then((res) => res.json())
      .then(() => {
        setForm({ id: "", nombre: "", precio: "", categoria: "", stock: "" });
        setIsEditing(false);
        setTimeout(() => {
          fetchProductos();
        }, 1200);
      })
      .catch((err) => {
        console.error(err);
        setTimeout(() => {
          fetchProductos();
        }, 1200);
      });
  };

  const handleConsultarIA = (e) => {
    e.preventDefault();
    if (!preguntaIA.trim()) return;

    setCargandoIA(true);
    setRespuestaIA("");

    fetch(IA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pregunta: preguntaIA })
    })
      .then((res) => res.json())
      .then((data) => {
        setRespuestaIA(data.respuesta);
        setCargandoIA(false);
      })
      .catch(() => {
        setRespuestaIA("Error al conectar con el servicio de procesamiento de datos.");
        setCargandoIA(false);
      });
  };

  const handleEdit = (prod) => {
    setForm(prod);
    setIsEditing(true);
    setActiveTab("registro");
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Deseas eliminar este registro?")) {
      setCargando(true);
      fetch(`${API_URL}/${id}`, { method: "DELETE" })
        .then((res) => res.json())
        .then(() => {
          setTimeout(() => {
            fetchProductos();
          }, 1200);
        });
    }
  };

  const productosFiltrados = productos.filter((p) =>
    (p.nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.categoria || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="login-box">
        <div className="login-header">
          <h2>SISTEMA CLOUD LOGIN</h2>
          <p>Autenticación de Usuario</p>
        </div>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>USUARIO</label>
            <input 
              type="text" 
              className="input-field input-visible" 
              value={usernameInput} 
              onChange={(e) => setUsernameInput(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label>CONTRASEÑA</label>
            <input 
              type="password" 
              className="input-field input-visible" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              required 
            />
          </div>
          {loginError && <p className="error-badge">{loginError}</p>}
          <button type="submit" className="btn-login">INICIAR SESIÓN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === "inventario" ? "active" : ""}`}
            onClick={() => setActiveTab("inventario")}
          >
            Inventario Principal
          </button>
          <button 
            className={`menu-item ${activeTab === "registro" ? "active" : ""}`}
            onClick={() => setActiveTab("registro")}
          >
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </button>
          <button 
            className={`menu-item ${activeTab === "asistente" ? "active" : ""}`}
            onClick={() => setActiveTab("asistente")}
          >
            Asistente Analítico
          </button>
          <button onClick={() => setUser(null)} className="menu-item logout">
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <div className="content-body">
          {activeTab === "inventario" && (
            <div className="panel-card">
              <div className="panel-header">
                <h2>Inventario | Listado de Productos</h2>
              </div>
              
              <div className="action-bar">
                <button onClick={() => { setIsEditing(false); setForm({ id: "", nombre: "", precio: "", categoria: "", stock: "" }); setActiveTab("registro"); }} className="btn-green">
                  + Nuevo Producto
                </button>
                <button onClick={fetchProductos} className="btn-blue-outline">
                  Refrescar Datos
                </button>
              </div>

              <div className="filter-bar">
                <div className="filter-group">
                  <label>Buscar:</label>
                  <input 
                    type="text" 
                    className="input-field search-input" 
                    placeholder="Presiona enter para buscar..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
                <span className="count-tag">{productosFiltrados.length} Registros</span>
              </div>

              {cargando ? (
                <p className="loading-text">Cargando información del inventario...</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Acciones</th>
                        <th>ID</th>
                        <th>Nombre Producto</th>
                        <th>Categoría</th>
                        <th>Existencia</th>
                        <th>Precio Venta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.map((item) => (
                        <tr key={item.id}>
                          <td className="actions-cell">
                            <button onClick={() => handleEdit(item)} className="btn-table-edit">Editar</button>
                            <button onClick={() => handleDelete(item.id)} className="btn-table-delete">Eliminar</button>
                          </td>
                          <td>{item.id}</td>
                          <td className="font-semibold">{item.nombre}</td>
                          <td><span className="category-tag">{item.categoria}</span></td>
                          <td>{item.stock}</td>
                          <td>${item.precio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "registro" && (
            <div className="panel-card">
              <div className="panel-header">
                <h2>{isEditing ? "Editar Producto" : "Registro de Nuevo Producto"}</h2>
              </div>
              <form onSubmit={handleSubmit} className="form-vertical">
                <div className="input-group">
                  <label>Nombre del Producto</label>
                  <input type="text" className="input-field" placeholder="Ej. Audífonos Bluetooth" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>Precio ($)</label>
                    <input type="number" className="input-field" placeholder="0.00" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Categoría</label>
                    <input type="text" className="input-field" placeholder="Ej. Electrónica" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Stock / Existencias</label>
                    <input type="number" className="input-field" placeholder="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
                  </div>
                </div>
                <div className="form-buttons">
                  <button type="submit" className="btn-green">
                    {isEditing ? "Guardar Cambios" : "Guardar Producto"}
                  </button>
                  <button type="button" onClick={() => setActiveTab("inventario")} className="btn-cancel">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "asistente" && (
            <div className="panel-card">
              <div className="panel-header">
                <h2>Asistente Analítico de Inventario</h2>
              </div>
              <p className="card-desc">Consulte métricas y resúmenes del sistema mediante lenguaje natural.</p>
              <form onSubmit={handleConsultarIA} className="analysis-form">
                <input 
                  type="text" 
                  className="input-field search-input" 
                  placeholder="Ejemplo: ¿Cuál es el producto con mayor precio?" 
                  value={preguntaIA} 
                  onChange={(e) => setPreguntaIA(e.target.value)} 
                  required 
                />
                <button type="submit" className="btn-blue-solid">
                  {cargandoIA ? "Procesando..." : "Consultar"}
                </button>
              </form>

              {respuestaIA && (
                <div className="response-box">
                  <span className="response-title">Dictamen del Asistente:</span>
                  <p className="response-text">{respuestaIA}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;