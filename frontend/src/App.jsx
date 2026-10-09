import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:3000/api/productos";

function App() {
  const [user, setUser] = useState(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ id: "", nombre: "", precio: "", categoria: "", stock: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
        setProductos(data);
        setCargando(false);
      })
      .catch((err) => {
        console.error(err);
        setCargando(false);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
        fetchProductos();
      });
  };

  const handleEdit = (prod) => {
    setForm(prod);
    setIsEditing(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Deseas eliminar este registro?")) {
      fetch(`${API_URL}/${id}`, { method: "DELETE" })
        .then((res) => res.json())
        .then(() => fetchProductos());
    }
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="login-box">
        <h2>SISTEMA CLOUD LOGIN</h2>
        <form onSubmit={handleLogin}>
          <div style={{ textAlign: "left" }}>
            <label>Usuario:</label>
            <input 
              type="text" 
              className="input-field" 
              value={usernameInput} 
              onChange={(e) => setUsernameInput(e.target.value)} 
              placeholder="Ej: admin"
              required 
            />
          </div>
          <div style={{ textAlign: "left" }}>
            <label>Contraseña:</label>
            <input 
              type="password" 
              className="input-field" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              placeholder="Ej: 12345"
              required 
            />
          </div>
          {loginError && <p style={{ color: "#ef4444", fontSize: "14px", marginBottom: "10px" }}>{loginError}</p>}
          <button type="submit" className="btn-login">INICIAR SESIÓN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header-panel">
        <h1>📦 Control de Productos (CRUD Cloud)</h1>
        <button onClick={() => setUser(null)} className="btn-logout">Cerrar Sesión</button>
      </div>

      <div className="stats-card">
        📊 <b>Total de registros:</b> {productos.length}
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <input type="text" className="input-field" placeholder="Nombre producto" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        <input type="number" className="input-field" placeholder="Precio ($)" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
        <input type="text" className="input-field" placeholder="Categoría" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
        <input type="number" className="input-field" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
        <button type="submit" className="btn-submit">
          {isEditing ? "ACTUALIZAR REGISTRO" : "AGREGAR REGISTRO"}
        </button>
      </form>

      <input 
        type="text" 
        className="input-field" 
        placeholder="🔍 Buscar por nombre o categoría..." 
        value={searchTerm} 
        onChange={(e) => setSearchTerm(e.target.value)} 
      />

      {cargando ? <p>Cargando información...</p> : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.nombre}</td>
                  <td>${item.precio}</td>
                  <td>{item.categoria}</td>
                  <td>{item.stock}</td>
                  <td>
                    <button onClick={() => handleEdit(item)} className="btn-edit">Editar</button>
                    <button onClick={() => handleDelete(item.id)} className="btn-delete">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;