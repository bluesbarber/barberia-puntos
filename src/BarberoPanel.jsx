import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './supabase'
import { estilos, theme } from './theme'
import { getRango, calcularPuntos } from './rangos'

const SITIO_URL = 'https://bluesbarber.vercel.app'
const MESES_VENCIMIENTO = 6

export default function BarberoPanel({ barbero, onLogout }) {
  const [telefono, setTelefono] = useState('')
  const [cliente, setCliente] = useState(null)
  const [productos, setProductos] = useState([])
  const [premios, setPremios] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [vista, setVista] = useState('compras')
  const [pantalla, setPantalla] = useState('panel')
  const [ajuste, setAjuste] = useState('')
  const [motivoAjuste, setMotivoAjuste] = useState('')
  const [todosLosClientes, setTodosLosClientes] = useState([])
  const [clientesFiltrados, setClientesFiltrados] = useState([])
  const [buscarPor, setBuscarPor] = useState('nombre')
  const [confirmando, setConfirmando] = useState(null)
  const [historialHoy, setHistorialHoy] = useState([])
  const [cargandoHoy, setCargandoHoy] = useState(false)
  const [cortesCliente, setCortesCliente] = useState(0)

  useEffect(() => {
    async function cargarDatos() {
      const { data: prods } = await supabase.from('producto').select('*').eq('activo', true).order('puntos_otorga', { ascending: false })
      const { data: prem } = await supabase.from('premio').select('*').eq('activo', true).order('costo_puntos', { ascending: false })
      const { data: clientes } = await supabase.from('cliente').select('*').order('id')
      setProductos(prods || [])
      setPremios(prem || [])
      setTodosLosClientes(clientes || [])
      setClientesFiltrados(clientes || [])
    }
    cargarDatos()
  }, [])

  function filtrarClientes(texto) {
    if (!texto) { setClientesFiltrados(todosLosClientes); return }
    const filtro = texto.toLowerCase()
    setClientesFiltrados(todosLosClientes.filter(c =>
      buscarPor === 'nombre'
        ? c.nombre.toLowerCase().includes(filtro)
        : c.telefono.includes(filtro)
    ))
  }

  async function registrarCompra(producto) {
    const ptsFinales = calcularPuntos(producto.puntos_otorga, cortesCliente)
    const { error } = await supabase.from('transaccion').insert({
      cliente_id: cliente.id,
      producto_id: producto.id,
      puntos_ganados: ptsFinales
    })
    setConfirmando(null)
    if (error) { setMensaje('Error al registrar'); return }
    setMensaje('+' + ptsFinales + ' pts por ' + producto.nombre)
    const { data } = await supabase.from('cliente').select('*').eq('id', cliente.id).single()
    setCliente(data)
    if (producto.categoria === 'corte') setCortesCliente(n => n + 1)
  }

  async function canjearPremio(premio) {
    if (cliente.puntos_actuales < premio.costo_puntos) {
      setMensaje('No tiene suficientes puntos'); return
    }
    const { error } = await supabase.from('canje').insert({
      cliente_id: cliente.id,
      premio_id: premio.id,
      puntos_usados: premio.costo_puntos
    })
    if (error) { setMensaje('Error al canjear'); return }
    setMensaje('Canjeó: ' + premio.nombre + ' (-' + premio.costo_puntos + ' pts)')
    const { data } = await supabase.from('cliente').select('*').eq('id', cliente.id).single()
    setCliente(data)
  }

  async function aplicarAjuste(sumar) {
    const pts = parseInt(ajuste)
    if (!pts || pts <= 0) { setMensaje('Ingresá una cantidad válida'); return }
    const nuevos = sumar
      ? cliente.puntos_actuales + pts
      : Math.max(0, cliente.puntos_actuales - pts)
    await supabase.from('cliente').update({ puntos_actuales: nuevos }).eq('id', cliente.id)
    setMensaje((sumar ? '+' : '-') + pts + ' pts aplicados. Motivo: ' + (motivoAjuste || 'sin motivo'))
    setAjuste('')
    setMotivoAjuste('')
    const { data } = await supabase.from('cliente').select('*').eq('id', cliente.id).single()
    setCliente(data)
  }

  async function eliminarCliente(id) {
    if (!window.confirm('¿Seguro que querés eliminar esta cuenta?')) return
    await supabase.from('canje').delete().eq('cliente_id', id)
    await supabase.from('transaccion').delete().eq('cliente_id', id)
    await supabase.from('cliente').delete().eq('id', id)
    setCliente(null)
    const { data: clientes } = await supabase.from('cliente').select('*').order('id')
    setTodosLosClientes(clientes || [])
    setClientesFiltrados(clientes || [])
    setMensaje('Cuenta eliminada')
  }

  async function cargarHistorialHoy() {
    setCargandoHoy(true)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const [{ data: txs }, { data: cnjs }] = await Promise.all([
      supabase.from('transaccion').select('id, puntos_ganados, fecha, cliente:cliente_id(nombre), producto:producto_id(nombre)').gte('fecha', hoy.toISOString()),
      supabase.from('canje').select('id, puntos_usados, fecha, cliente:cliente_id(nombre), premio:premio_id(nombre)').gte('fecha', hoy.toISOString())
    ])
    const todos = [
      ...(txs || []).map(t => ({ ...t, tipo: 'suma' })),
      ...(cnjs || []).map(c => ({ ...c, tipo: 'canje' }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    setHistorialHoy(todos)
    setCargandoHoy(false)
  }

  function alertaVencimiento(c) {
    if (!c) return null
    const { data: txs } = { data: null }
    return null
  }

  function vencimientoInfo(ultimaFecha) {
    if (!ultimaFecha) return null
    const ultima = new Date(ultimaFecha)
    const vence = new Date(ultima)
    vence.setMonth(vence.getMonth() + MESES_VENCIMIENTO)
    const hoy = new Date()
    const diasRestantes = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24))
    if (diasRestantes > 30) return null
    if (diasRestantes <= 0) return { vencido: true, dias: 0 }
    return { vencido: false, dias: diasRestantes }
  }

  function formatFecha(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  function formatFechaHora(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  const btnTab = (tab, label) => (
    <button
      onClick={() => { setVista(tab); setMensaje(''); if (tab === 'hoy') cargarHistorialHoy() }}
      style={{
        flex: 1, padding: '9px 4px', fontSize: 11, borderRadius: 8, cursor: 'pointer',
        background: vista === tab ? theme.dorado : 'transparent',
        color: vista === tab ? theme.negro : theme.dorado,
        border: '1px solid ' + theme.dorado, fontWeight: 600
      }}
    >{label}</button>
  )

  const barraNav = (
    <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid ' + theme.dorado, background: '#111', padding: '10px 0', position: 'sticky', bottom: 0 }}>
      {[
        { id: 'panel', icono: '✂', label: 'Panel' },
        { id: 'hoy', icono: '♙', label: 'Hoy' },
        { id: 'nuevo', icono: '♟', label: 'Nuevo cliente' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => { setPantalla(item.id); setMensaje(''); if (item.id === 'hoy') cargarHistorialHoy() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 3,
            color: pantalla === item.id ? theme.dorado : theme.grisMedio,
            fontSize: 11, fontWeight: pantalla === item.id ? 700 : 400
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icono}</span>
          {item.label}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ ...estilos.pantalla, display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', padding: 0 }}>

      {/* Modal confirmación */}
      {confirmando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid ' + theme.dorado, borderRadius: 16, padding: '28px 24px', maxWidth: 340, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 8 }}>Confirmá la operación</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.blanco, marginBottom: 4 }}>{cliente?.nombre}</div>
            <div style={{ fontSize: 12, color: theme.dorado, marginBottom: 6 }}>{getRango(cortesCliente).icono} {getRango(cortesCliente).nombre}</div>
            <div style={{ fontSize: 15, color: theme.grisMedio, marginBottom: 4 }}>{confirmando.nombre}</div>
            {getRango(cortesCliente).bonus > 0 ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: theme.grisMedio, textDecoration: 'line-through' }}>{confirmando.puntos_otorga} pts base</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: theme.dorado }}>+{calcularPuntos(confirmando.puntos_otorga, cortesCliente)} pts</div>
                <div style={{ fontSize: 12, color: theme.doradoClaro }}>+{getRango(cortesCliente).bonus * 100}% por rango {getRango(cortesCliente).nombre}</div>
              </div>
            ) : (
              <div style={{ fontSize: 28, fontWeight: 700, color: theme.dorado, marginBottom: 20 }}>+{confirmando.puntos_otorga} pts</div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmando(null)} style={{ ...estilos.botonOscuro, flex: 1 }}>Cancelar</button>
              <button onClick={() => registrarCompra(confirmando)} style={{ ...estilos.botonDorado, flex: 1 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, padding: '24px 16px 16px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/logo.png" alt="Blues Barber" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3 }}>BLUES Barber</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Panel del barbero</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + theme.doradoOscuro, color: theme.grisMedio, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
            Salir
          </button>
        </div>

        {pantalla === 'panel' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  style={{ ...estilos.input, flex: 1 }}
                  placeholder={buscarPor === 'telefono' ? 'Buscar por teléfono...' : 'Buscar por nombre...'}
                  value={telefono}
                  onChange={e => { setTelefono(e.target.value); filtrarClientes(e.target.value) }}
                />
                <button
                  onClick={() => { setTelefono(''); setClientesFiltrados(todosLosClientes) }}
                  style={{ ...estilos.botonOscuro, width: 'auto', padding: '0 12px', borderRadius: 10, fontSize: 13 }}
                >Limpiar</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setBuscarPor('nombre')}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: buscarPor === 'nombre' ? theme.dorado : 'transparent',
                    color: buscarPor === 'nombre' ? theme.negro : theme.dorado,
                    border: '1px solid ' + theme.dorado }}
                >Por nombre</button>
                <button
                  onClick={() => setBuscarPor('telefono')}
                  style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: buscarPor === 'telefono' ? theme.dorado : 'transparent',
                    color: buscarPor === 'telefono' ? theme.negro : theme.dorado,
                    border: '1px solid ' + theme.dorado }}
                >Por teléfono</button>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(() => {
                  const soloClientes = todosLosClientes.filter(c => c.rol === 'cliente')
                  const posicion = Object.fromEntries(soloClientes.map((c, i) => [c.id, i + 1]))
                  return clientesFiltrados.filter(c => c.rol === 'cliente').map(c => (
                    <div
                      key={c.id}
                      style={{ display: 'flex', alignItems: 'center', borderRadius: 10, border: '1px solid #2a2a2a', background: cliente && cliente.id === c.id ? '#2a2000' : '#1a1a1a', overflow: 'hidden' }}
                    >
                      <button
                        onClick={async () => {
                        setCliente(c); setTelefono(''); setMensaje('')
                        const { data: txs } = await supabase.from('transaccion').select('producto_id, producto:producto_id(categoria)').eq('cliente_id', c.id)
                        setCortesCliente((txs || []).filter(t => t.producto?.categoria === 'corte').length)
                      }}
                        style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: theme.blanco, fontSize: 14 }}
                      >
                        <span style={{ fontWeight: 600 }}>{c.nombre}</span>
                        <span style={{ color: theme.grisMedio, fontSize: 13 }}>#{posicion[c.id]} · {c.telefono}</span>
                      </button>
                      <button
                        onClick={() => eliminarCliente(c.id)}
                        style={{ background: 'none', border: 'none', borderLeft: '1px solid #2a2a2a', color: theme.error, cursor: 'pointer', padding: '10px 14px', fontSize: 16 }}
                      >✕</button>
                    </div>
                  ))
                })()}
                {clientesFiltrados.filter(c => c.rol === 'cliente').length === 0 && (
                  <div style={{ textAlign: 'center', color: theme.grisMedio, padding: 16, fontSize: 13 }}>No se encontraron clientes</div>
                )}
              </div>
            </div>

            {mensaje && (
              <div style={{ background: '#1a1500', border: '1px solid ' + theme.dorado, borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: theme.doradoClaro }}>
                {mensaje}
              </div>
            )}

            {cliente && (
              <div>
                <div style={{ ...estilos.tarjeta, background: 'linear-gradient(160deg, #1a1a1a, #2a2000)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{cliente.nombre}</div>
                    <div style={{ fontSize: 13, background: '#2a2000', border: '1px solid ' + theme.doradoOscuro, borderRadius: 20, padding: '2px 12px', color: theme.dorado, fontWeight: 700 }}>
                      {getRango(cortesCliente).icono} {getRango(cortesCliente).nombre}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: theme.grisMedio }}>{cliente.telefono}</div>
                  <div style={{ fontSize: 40, fontWeight: 700, color: theme.dorado, marginTop: 8 }}>{cliente.puntos_actuales} <span style={{ fontSize: 16 }}>pts</span></div>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {btnTab('compras', 'Sumar pts')}
                  {btnTab('canjes', 'Canjear')}
                  {btnTab('ajuste', 'Ajuste')}
                </div>

                {vista === 'compras' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {productos.map(p => (
                      <button key={p.id} onClick={() => setConfirmando(p)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, border: '1px solid #2a2a2a', background: '#1a1a1a', cursor: 'pointer', color: theme.blanco, fontSize: 15 }}>
                        <span>{p.nombre}</span>
                        <span style={{ fontWeight: 700, color: theme.dorado }}>+{p.puntos_otorga} pts</span>
                      </button>
                    ))}
                  </div>
                )}

                {vista === 'canjes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {premios.map(p => {
                      const puede = cliente.puntos_actuales >= p.costo_puntos
                      return (
                        <div key={p.id} style={{ borderRadius: 12, border: '1px solid #2a2a2a', background: '#1a1a1a', padding: '20px', opacity: puede ? 1 : 0.5 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: theme.blanco }}>{p.nombre}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: theme.error }}>-{p.costo_puntos} pts</div>
                          </div>
                          {p.descripcion && (
                            <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 14, lineHeight: 1.5 }}>{p.descripcion}</div>
                          )}
                          <button
                            onClick={() => canjearPremio(p)}
                            disabled={!puede}
                            style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: puede ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14,
                              background: puede ? theme.dorado : '#2a2a2a',
                              color: puede ? theme.negro : theme.grisMedio }}
                          >
                            {puede ? 'Canjear' : 'Le faltan ' + (p.costo_puntos - cliente.puntos_actuales) + ' pts'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {vista === 'ajuste' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 4 }}>Sumá o restá puntos manualmente por cualquier motivo.</div>
                    <input style={estilos.input} placeholder="Cantidad de puntos" type="number" value={ajuste} onChange={e => setAjuste(e.target.value)} />
                    <input style={estilos.input} placeholder="Motivo (opcional)" value={motivoAjuste} onChange={e => setMotivoAjuste(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => aplicarAjuste(true)} style={{ ...estilos.botonDorado, flex: 1 }}>+ Sumar</button>
                      <button onClick={() => aplicarAjuste(false)} style={{ ...estilos.botonOscuro, flex: 1 }}>- Restar</button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {pantalla === 'hoy' && (
          <div>
            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 16 }}>TRANSACCIONES DE HOY</div>
            {cargandoHoy ? (
              <div style={{ textAlign: 'center', color: theme.grisMedio, padding: 40 }}>Cargando...</div>
            ) : historialHoy.length === 0 ? (
              <div style={{ textAlign: 'center', color: theme.grisMedio, padding: 40, fontSize: 13 }}>No hay transacciones registradas hoy</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historialHoy.map(t => (
                  <div key={t.tipo + t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, border: '1px solid #2a2a2a', background: '#1a1a1a' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.blanco }}>{t.cliente?.nombre}</div>
                      <div style={{ fontSize: 12, color: theme.grisMedio, marginTop: 2 }}>
                        {t.tipo === 'canje' ? '♛ ' + (t.premio?.nombre || 'Premio') : t.producto?.nombre} · {formatFechaHora(t.fecha)}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: t.tipo === 'canje' ? theme.error : theme.dorado, fontSize: 15 }}>
                      {t.tipo === 'canje' ? '-' + t.puntos_usados : '+' + t.puntos_ganados} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {pantalla === 'nuevo' && (
          <NuevoClienteForm onVolver={() => setPantalla('panel')} />
        )}
      </div>
      {barraNav}
    </div>
  )
}

function NuevoClienteForm({ onVolver }) {
  return (
    <div>
      <button onClick={onVolver} style={{ background: 'none', border: 'none', color: theme.dorado, cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>← Volver</button>
      <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 16 }}>NUEVO CLIENTE</div>

      <div style={{ ...estilos.tarjeta, textAlign: 'center', padding: '28px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: theme.dorado, letterSpacing: 2, marginBottom: 16 }}>ESCANEÁ PARA REGISTRARTE</div>
        <div style={{ display: 'inline-block', background: '#fff', padding: 16, borderRadius: 12 }}>
          <QRCodeSVG value={SITIO_URL} size={220} fgColor="#0a0a0a" bgColor="#ffffff" />
        </div>
        <div style={{ fontSize: 12, color: theme.grisMedio, marginTop: 14, lineHeight: 1.6 }}>
          Apuntá la cámara al código y creá tu cuenta para empezar a acumular puntos
        </div>
      </div>
    </div>
  )
}
