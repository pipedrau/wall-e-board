import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [columnas, setColumnas] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [nuevaTarjeta, setNuevaTarjeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: cols } = await supabase.from('columnas').select('*').order('orden');
    const { data: tars } = await supabase.from('tarjetas').select('*').order('orden');
    setColumnas(cols || []);
    setTarjetas(tars || []);
    setLoading(false);
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

  return (
    <div className="app">
      <header className="header">
        <h1>📋 Wall-E Board</h1>
        <span className="badge">Pipe + Wall-E</span>
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

        {columnas.length === 0 && (
          <div className="empty">
            <p>No hay columnas. Crealas en Supabase:</p>
            <pre>{`
INSERT INTO columnas (nombre, orden) VALUES 
  ('Por hacer', 1),
  ('En progreso', 2),
  ('Hecho', 3);
            `}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
