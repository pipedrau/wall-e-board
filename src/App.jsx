import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ClipboardList, RefreshCw, CheckCircle, Edit, X, Plus, LogOut, User, Bot, BarChart2, XCircle, Users, History, Trash2 } from 'lucide-react';
import './App.css';

const supabaseUrl = 'https://tvzrqvtgcgmyficytpud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2enJxdnRnY2dteWZpY3l0cHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTMyNzIsImV4cCI6MjA4NzcyOTI3Mn0.-8eJzWPrYovAOWS_KVyE2ercGyaibofZtzq_W_TSoyc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Función para registrar actividad en el historial
async function registrarHistorial(tipo, descripcion, tarjetaId = null) {
  try {
    await supabase.from('historial').insert({
      tipo,
      descripcion,
      tarjeta_id: tarjetaId,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.log('Historial no disponible:', err.message);
  }
}

const AGENTES = [
  { id: 'Wall-E', nombre: 'Wall-E', rol: 'Asistente', emoji: '🤖' },
  { id: 'Agente 1', nombre: 'Agente 1', rol: 'Por asignar', emoji: '👤' },
  { id: 'Agente 2', nombre: 'Agente 2', rol: 'Por asignar', emoji: '👤' },
  { id: 'Agente 3', nombre: 'Agente 3', rol: 'Por asignar', emoji: '👤' }
];
const ICONOS_COLUMNAS = {
  '7edf4d44-3b09-4e2c-b942-b01b94851da6': ClipboardList, // Por hacer
  '228b53c8-97d8-4a71-8145-b76c8079010c': RefreshCw, // En progreso
  'b7ab27b9-de83-4d6c-9ee7-95b8a4ba4dc5': CheckCircle  // Hecho
};

const PLANTILLAS = [
  { id: 'daily', nombre: 'Daily Standup', descripcion: 'Reunión diaria del equipo', icono: '☀️' },
  { id: 'sprint', nombre: 'Sprint Planning', descripcion: 'Planificación del sprint', icono: '🏃' },
  { id: 'review', nombre: 'Code Review', descripcion: 'Revisión de código', icono: '👀' },
  { id: 'retro', nombre: 'Sprint Retro', descripcion: 'Retrospectiva del sprint', icono: '🔄' },
  { id: 'bug', nombre: 'Reportar Bug', descripcion: 'Documentar un bug encontrado', icono: '🐛' },
  { id: 'feature', nombre: 'Nueva Feature', descripcion: 'Implementar nueva funcionalidad', icono: '✨' }
];

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es');
}

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
      <div className="card card-edit">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className="edit-input" />
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción..." className="edit-textarea" />
        <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="edit-select">
          <option value="">Sin responsable</option>
          {AGENTES.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
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
        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); setEditando(true); }}><Edit size={14} /></button>
      </div>
      {tarjeta.descripcion && <p className="card-desc">{tarjeta.descripcion}</p>}
      {tarjeta.asignee && <span className="card-asignee">@{tarjeta.asignee}</span>}
      <span className="card-date">{formatRelativeTime(tarjeta.created_at)}</span>
      <div className="card-footer">
        <select 
          onChange={(e) => { e.stopPropagation(); onMove(tarjeta.id, e.target.value); }}
          onPointerDown={(e) => e.stopPropagation()}
          value={tarjeta.columna_id}
          className="card-select"
        >
          {columnas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button className="btn-delete" onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar esta tarea?')) onDelete(tarjeta.id); }}><Trash2 size={16} /></button>
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

  const Icono = ICONOS_COLUMNAS[columna.id];

  return (
    <div className="column" ref={setNodeRef} data-column-id={columna.id}>
      <div className="column-header">
        <h3 className="column-title"><span className="column-icon">{Icono && <Icono size={16} />}</span> {columna.nombre}</h3>
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
        {nueva.trim() && (
          <button className="add-card-btn" onClick={handleAdd}>
            <Plus size={16} />
          </button>
        )}
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
  const [showStats, setShowStats] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPlantillas, setShowPlantillas] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);

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

    // Suscripción a Supabase Realtime para notificaciones
    const canal = supabase
      .channel('tablero-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarjetas' }, (payload) => {
        console.log('Cambio en tarjetas:', payload);
        let mensaje = '';
        if (payload.eventType === 'INSERT') {
          mensaje = `Nueva tarea: ${payload.new.titulo}`;
        } else if (payload.eventType === 'UPDATE') {
          mensaje = `Tarea actualizada: ${payload.new.titulo}`;
        } else if (payload.eventType === 'DELETE') {
          mensaje = `Tarea eliminada`;
        }
        if (mensaje) {
          setNotificaciones(prev => [...prev, { id: Date.now(), mensaje, tipo: payload.eventType }]);
          setTimeout(() => {
            setNotificaciones(prev => prev.slice(1));
          }, 5000);
        }
        cargarDatos();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(canal);
    };
  }, []);

  async function cargarDatos() {
    setError('');
    try {
      const { data: cols, error: errCols } = await supabase.from('columnas').select('*').order('orden');
      if (errCols) throw errCols;
      
      const { data: tars, error: errTars } = await supabase.from('tarjetas').select('*').order('orden');
      if (errTars) throw errTars;
      
      setColumnas(cols || []);
      setTarjetas(tars || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar datos. Por favor verifica tu conexión e intenta de nuevo.');
    }
  }

  async function cargarHistorial() {
    const { data } = await supabase.from('historial').select('*').order('created_at', { ascending: false }).limit(50);
    setHistorial(data || []);
  }

  function handleShowHistory() {
    setShowHistory(true);
    cargarHistorial();
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

  async function agregarTarjeta(columnaId, titulo, descripcion = '') {
    const columna = columnas.find(c => c.id === columnaId);
    await supabase.from('tarjetas').insert({
      columna_id: columnaId,
      titulo,
      descripcion,
      orden: tarjetas.filter(t => t.columna_id === columnaId).length
    });
    await registrarHistorial('crear', `Tarea "${titulo}" creada en ${columna?.nombre || 'unknown'}`, null);
    cargarDatos();
  }

  function crearDesdePlantilla(plantilla) {
    const columnaPorHacer = columnas.find(c => c.nombre === 'Por hacer');
    if (columnaPorHacer) {
      agregarTarjeta(columnaPorHacer.id, plantilla.nombre, plantilla.descripcion);
      setShowPlantillas(false);
    }
  }

  async function moverTarjeta(tarjetaId, nuevaColumnaId) {
    const tarjeta = tarjetas.find(t => t.id === tarjetaId);
    const columnaAnterior = columnas.find(c => c.id === tarjeta.columna_id);
    const columnaNueva = columnas.find(c => c.id === nuevaColumnaId);
    await supabase.from('tarjetas').update({ columna_id: nuevaColumnaId }).eq('id', tarjetaId);
    await registrarHistorial('mover', `Tarea "${tarjeta?.titulo}" movida de ${columnaAnterior?.nombre} a ${columnaNueva?.nombre}`, tarjetaId);
    cargarDatos();
  }

  async function eliminarTarjeta(tarjetaId) {
    const tarjeta = tarjetas.find(t => t.id === tarjetaId);
    const confirmar = window.confirm(`¿Estás seguro de eliminar la tarea "${tarjeta?.titulo}"?`);
    if (!confirmar) return;
    await supabase.from('tarjetas').delete().eq('id', tarjetaId);
    await registrarHistorial('eliminar', `Tarea "${tarjeta?.titulo}" eliminada`, tarjetaId);
    cargarDatos();
  }

  async function editarTarjeta(tarjetaId, datos) {
    await supabase.from('tarjetas').update(datos).eq('id', tarjetaId);
    cargarDatos();
  }

  const activeTarjeta = activeId ? tarjetas.find(t => t.id === activeId) : null;

  // Calcular estadísticas
  const calcularEstadisticas = () => {
    const totalTareas = tarjetas.length;
    const tareasPorColumna = {};
    columnas.forEach(col => {
      tareasPorColumna[col.nombre] = tarjetas.filter(t => t.columna_id === col.id).length;
    });
    
    // Tareas completadas esta semana
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
    const columnaHechoId = columnas.find(c => c.nombre === 'Hecho')?.id;
    const tareasEstaSemana = tarjetas.filter(t => 
      t.columna_id === columnaHechoId && 
      new Date(t.created_at) >= haceUnaSemana
    ).length;

    // Promedio de tiempo por tarea (cuando está en "Hecho")
    let tiempoTotal = 0;
    let count = 0;
    tarjetas.filter(t => t.columna_id === columnaHechoId).forEach(t => {
      const fechaCreacion = new Date(t.created_at);
      // Usamos la fecha de creación como proxy (en una versión real tendríamos updated_at)
      const dias = Math.floor((new Date() - fechaCreacion) / 86400000);
      if (dias >= 0) {
        tiempoTotal += dias;
        count++;
      }
    });
    const promedioDias = count > 0 ? (tiempoTotal / count).toFixed(1) : 0;

    return { totalTareas, tareasPorColumna, tareasEstaSemana, promedioDias };
  };

  const stats = calcularEstadisticas();

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-bg"></div>
        <div className="login-center">
          <div className="login-hero">
            <div className="login-logo">
              <Bot size={80} />
            </div>
            <h1>Wall-E Operator</h1>
            <p>Tu asistente de gestión de tareas</p>
          </div>
          <div className="login-box">
            <h2>Iniciar sesión</h2>
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
          <h1><ClipboardList size={24} /> Wall-E Board</h1>
          <p className="header-subtitle">Gestión de tareas automatizada</p>
        </div>
        <div className="header-right">
          <button onClick={() => setShowPlantillas(true)} className="stats-btn"><Plus size={16} /> Plantillas</button>
          <button onClick={() => setShowStats(true)} className="stats-btn"><BarChart2 size={16} /> Estadísticas</button>
          <button onClick={handleShowHistory} className="stats-btn"><History size={16} /> Historial</button>
          <span className="user-badge"><User size={14} /> {session.user.email}</span>
          <button onClick={() => setShowTeam(!showTeam)} className="team-btn"><Users size={14} /> Equipo</button>
          <button onClick={handleLogout} className="logout-btn"><LogOut size={14} /> Cerrar</button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      <div className="notificaciones">
        {notificaciones.map(n => (
          <div key={n.id} className={`notificacion notificacion-${n.tipo.toLowerCase()}`}>
            {n.mensaje}
          </div>
        ))}
      </div>

      {showTeam && (
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Equipo</h3>
            <button onClick={() => setShowTeam(false)} className="sidebar-close"><XCircle size={18} /></button>
          </div>
          <div className="team-list">
            {AGENTES.map(agente => {
              const tareasCount = tarjetas.filter(t => t.asignee === agente.id && t.columna_id !== 'b7ab27b9-de83-4d6c-9ee7-95b8a4ba4dc5').length;
              return (
                <div key={agente.id} className={`team-member ${agente.id === 'Wall-E' ? 'active' : ''}`}>
                  <div className="member-avatar">{agente.emoji}</div>
                  <div className="member-info">
                    <span className="member-name">{agente.nombre}</span>
                    <span className="member-rol">{agente.rol}</span>
                  </div>
                  {tareasCount > 0 && <span className="member-tasks">{tareasCount}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board" style={{ marginLeft: showTeam ? '300px' : '0', transition: 'margin-left 0.2s ease' }}>
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

      {/* Modal de Estadísticas */}
      {showStats && (
        <div className="modal-overlay" onClick={() => setShowStats(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><BarChart2 size={20} /> Estadísticas del Board</h2>
              <button className="modal-close" onClick={() => setShowStats(false)}><XCircle size={20} /></button>
            </div>
            <div className="modal-content">
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{stats.totalTareas}</span>
                  <span className="stat-label">Total de Tareas</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats.tareasEstaSemana}</span>
                  <span className="stat-label">Completadas Esta Semana</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{stats.promedioDias}d</span>
                  <span className="stat-label">Promedio por Tarea</span>
                </div>
              </div>
              <h3>Tareas por Columna</h3>
              <div className="stats-columns">
                {Object.entries(stats.tareasPorColumna).map(([nombre, count]) => (
                  <div key={nombre} className="stat-column">
                    <span className="stat-col-name">{nombre}</span>
                    <span className="stat-col-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Plantillas */}
      {showPlantillas && (
        <div className="modal-overlay" onClick={() => setShowPlantillas(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Plus size={20} /> Plantillas de Tareas</h2>
              <button className="modal-close" onClick={() => setShowPlantillas(false)}><XCircle size={20} /></button>
            </div>
            <div className="modal-content">
              <div className="plantillas-grid">
                {PLANTILLAS.map(plantilla => (
                  <div key={plantilla.id} className="plantilla-card" onClick={() => crearDesdePlantilla(plantilla)}>
                    <span className="plantilla-icono">{plantilla.icono}</span>
                    <span className="plantilla-nombre">{plantilla.nombre}</span>
                    <span className="plantilla-desc">{plantilla.descripcion}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Historial */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><History size={20} /> Historial de Actividad</h2>
              <button className="modal-close" onClick={() => setShowHistory(false)}><XCircle size={20} /></button>
            </div>
            <div className="modal-content">
              {historial.length === 0 ? (
                <p className="no-history">No hay actividad registrada aún.</p>
              ) : (
                <div className="history-list">
                  {historial.map(item => (
                    <div key={item.id} className={`history-item history-${item.tipo}`}>
                      <span className="history-type">{item.tipo}</span>
                      <span className="history-desc">{item.descripcion}</span>
                      <span className="history-date">{formatRelativeTime(item.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
