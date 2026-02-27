import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabaseUrl = 'https://tvzrqvtgcgmyficytpud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2enJxdnRnY2dteWZpY3l0cHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyNzIsImV4cCI6MjA4NzcyOTI3Mn0.-8eJzWPrYovAOWS_KVyE2ercGyaibofZtzq_W_TSoyc';

const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [columnas, setColumnas] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [nuevaTarjeta, setNuevaTarjeta] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarDatos();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarDatos();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function cargarDatos() {
    const { data: cols } = await supabase.from('columnas').select('*').order('orden');
    const { data: tars } = await supabase.from('tarjetas').select('*').order('orden');
    setColumnas(cols || []);
    setTarjetas(tars || []);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function agregarTarjeta(columnaId) {
    const titulo = nuevaTarjeta[columnaId]?.trim();
    if (!titulo) return;

    await supabase.from('tarjetas').insert({
      columna_id: columnaId,
      titulo,
      orden: tarjetas.filter(t => t.columna_id === columnaId).length
    });

    setNuevaTarjeta({ ...nuevaTarjeta, [columnaId]: '' });
    cargarDatos();
  }

  async function moverTarjeta(tarjetaId, nuevaColumnaId) {
    await supabase.from('tarjetas').update({ columna_id: nuevaColumnaId }).eq('id', tarjetaId);
    cargarDatos();
  }

  async function eliminarTarjeta(tarjetaId) {
    await supabase.from('tarjetas').delete().eq('id', tarjetaId);
    cargarDatos();
  }

  if (loading) return <div className="loading">Cargando...</div>;

  if (!session) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🔐 Wall-E Board</h1>
          <p>Inicia sesión para continuar</p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit">Iniciar sesión</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📋 Wall-E Board</h1>
        <div className="header-right">
          <span className="user-email">{session.user.email}</span>
          <button onClick={handleLogout} className="logout-btn">Cerrar sesión</button>
        </div>
      </header>

      <div className="board">
        {columnas.map(col => (
          <div key={col.id} className="column">
            <h3 className="column-title">{col.nombre}</h3>
            
            <div className="cards">
              {tarjetas.filter(t => t.columna_id === col.id).map(tarjeta => (
                <div key={tarjeta.id} className="card">
                  <span className="card-title">{tarjeta.titulo}</span>
                  {tarjeta.asignee && <span className="card-asignee">@{tarjeta.asignee}</span>}
                  <div className="card-actions">
                    <select 
                      onChange={(e) => moverTarjeta(tarjeta.id, e.target.value)}
                      value={tarjeta.columna_id}
                    >
                      {columnas.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                    <button onClick={() => eliminarTarjeta(tarjeta.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="add-card">
              <input
                type="text"
                placeholder="+ Añadir tarjeta"
                value={nuevaTarjeta[col.id] || ''}
                onChange={(e) => setNuevaTarjeta({ ...nuevaTarjeta, [col.id]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && agregarTarjeta(col.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
