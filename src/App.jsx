import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './App.css';

const supabaseUrl = 'https://tvzrqvtgcgmyficytpud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2enJxdnRnY2dteWZpY3l0cHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyNzIsImV4cCI6MjA4NzcyOTI3Mn0.-8eJzWPrYovAOWS_KVyE2ercGyaibofZtzq_W_TSoyc';

const supabase = createClient(supabaseUrl, supabaseKey);

const AGENTES = ['Wall-E', 'Agente 1', 'Agente 2', 'Agente 3'];

function SortableCard({ tarjeta, columnas, onMove, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarjeta.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(tarjeta.titulo);
  const [descripcion, setDescripcion] = useState(tarjeta.descripcion || '');
  const [responsable, setResponsable] = useState(tarjeta.asignee || '');

  const guardar = () => {
    onEdit(tarjeta.id, { titulo, descripcion, asignee: responsable });
    setEditando(false);
  };

  if (editando) {
    return (
      <div className="card card-edit" ref={setNodeRef} style={style}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="edit-input" />
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción..." className="edit-textarea" />
        <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="edit-select">
          <option value="">Sin responsable</option>
          {AGENTES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="edit-actions">
          <button onClick={guardar} className="btn-save">Guardar</button>
          <button onClick={() => setEditando(false)} className="btn-cancel">Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="card-header">
        <span className="card-title">{tarjeta.titulo}</span>
        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); setEditando(true); }}>✎</button>
      </div>
      {tarjeta.descripcion && <p className="card-desc">{tarjeta.descripcion}</p>}
      {tarjeta.asignee && <span className="card-asignee">@{tarjeta.asignee}</span>}
      <div className="card-footer">
        <select 
          onChange={(e) => { e.stopPropagation(); onMove(tarjeta.id, e.target.value); }}
          onPointerDown={(e) => e.stopPropagation()}
          value={tarjeta.columna_id}
          className="card-select"
        >
          {columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button className="btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(tarjeta.id); }}>✕</button>
      </div>
    </div>
  );
}

function Columna({ columna, tarjetas, columnas, onMove, onDelete, onEdit, onAdd }) {
  const [nueva, setNueva] = useState('');

  const { setNodeRef } = useSortable({ id: columna.id });

  const handleAdd = () => {
    if (nueva.trim()) {
      onAdd(columna.id, nueva);
      setNueva('');
    }
  };

  return (
    <div className="column" ref={setNodeRef} data-column-id={columna.id}>
      <div className="column-header">
        <h3 className="column-title">{columna.nombre}</h3>
        <span className="column-count">{tarjetas.length}</span>
      </div>
      
      <SortableContext items={tarjetas.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="cards">
          {tarjetas.map(tarjeta => (
            <SortableCard 
              key={tarjeta.id} 
              tarjeta={tarjeta} 
              columnas={columnas}
              onMove={onMove}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>

      <div className="add-card">
        <input
          type="text"
          placeholder="+ Añadir tarjeta"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [columnas, setColumnas] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const tarjetaId = active.id;
    const tarjeta = tarjetas.find(t => t.id === tarjetaId);

    // Verificar si soltó sobre una columna
    const columnaId = over.id;
    const esColumna = columnas.find(c => c.id === columnaId);

    if (esColumna && tarjeta.columna_id !== columnaId) {
      await supabase.from('tarjetas').update({ columna_id: columnaId }).eq('id', tarjetaId);
      cargarDatos();
      return;
    }

    // Verificar si soltó sobre otra tarjeta
    const tarjetaOver = tarjetas.find(t => t.id === over.id);
    if (tarjetaOver && tarjeta.columna_id !== tarjetaOver.columna_id) {
      await supabase.from('tarjetas').update({ columna_id: tarjetaOver.columna_id }).eq('id', tarjetaId);
      cargarDatos();
    }
  }

  async function agregarTarjeta(columnaId, titulo) {
    await supabase.from('tarjetas').insert({
      columna_id: columnaId,
      titulo,
      orden: tarjetas.filter(t => t.columna_id === columnaId).length
    });
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

  async function editarTarjeta(tarjetaId, datos) {
    await supabase.from('tarjetas').update(datos).eq('id', tarjetaId);
    cargarDatos();
  }

  const activeTarjeta = activeId ? tarjetas.find(t => t.id === activeId) : null;

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-bg"></div>
        <div className="login-container">
          <div className="login-side">
            <h2>Gestiona tu trabajo con Wall-E</h2>
            <p>Un tablero Kanban colaborativo donde puedes asignar tareas a ti mismo o a tus agentes.</p>
          </div>
          <div className="login-box">
            <div className="login-icon">📋</div>
            <h1>Wall-E Board</h1>
            <p>Inicia sesión para continuar</p>
            <form onSubmit={handleLogin}>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {error && <p className="error">{error}</p>}
              <button type="submit">Entrar</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>📋 Wall-E Board</h1>
        </div>
        <div className="header-right">
          <span className="user-badge">👤 {session.user.email}</span>
          <button onClick={handleLogout} className="logout-btn">Cerrar</button>
        </div>
      </header>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {columnas.map(col => (
            <Columna 
              key={col.id} 
              columna={col} 
              tarjetas={tarjetas.filter(t => t.columna_id === col.id)}
              columnas={columnas}
              onMove={moverTarjeta}
              onDelete={eliminarTarjeta}
              onEdit={editarTarjeta}
              onAdd={agregarTarjeta}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTarjeta ? (
            <div className="card card-dragging">
              <span className="card-title">{activeTarjeta.titulo}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default App;
