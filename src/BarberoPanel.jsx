import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { estilos, theme } from './theme'

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

  useEffect(() => {
    async function cargarDatos() {
      const { data: prods } = await supabase.from('producto').select('*').eq('activo', true)
      const { data: prem } = await supabase.from('premio').select('*').eq('activo', true)
      const { data: clientes } = await supabase.from('cliente').select('*').order('nombre')
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

  async function buscarCliente(tel, setFn) {
    const { data } = await supabase.from('cliente').select('*').eq('telefono', tel.trim()).single()
    if (!data) { setMensaje('Cliente no encontrado'); setFn(null) }
    else { setFn(data); setMensaje('') }
  }

  async function registrarCompra(producto) {
    const { error } = await supabase.from('transaccion').insert({
      cliente_id: cliente.id,
      producto_id: producto.id,
      puntos_ganados: producto.puntos_otorga
    })
    if (error) { setMensaje('Error al registrar'); return }
    setMensaje('+' + producto.puntos_otorga + ' pts por ' + producto.nombre)
    const { data } = await supabase.from('cliente').select('*').eq('id', cliente.id).single()
    setCliente(data)
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
    const { data: clientes } = await supabase.from('cliente').select('*').order('nombre')
    setTodosLosClientes(clientes || [])
    setClientesFiltrados(clientes || [])
    setMensaje('Cuenta eliminada')
  }

  const btnTab = (tab, label) => (
    <button
      onClick={() => { setVista(tab); setMensaje('') }}
      style={{
        flex: 1, padding: '9px 4px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
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
        { id: 'nuevo', icono: '♟', label: 'Nuevo cliente' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => { setPantalla(item.id); setMensaje('') }}
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
                {clientesFiltrados.filter(c => c.rol === 'cliente').map(c => (
                  <div
                    key={c.id}
                    style={{ display: 'flex', alignItems: 'center', borderRadius: 10, border: '1px solid #2a2a2a', background: cliente && cliente.id === c.id ? '#2a2000' : '#1a1a1a', overflow: 'hidden' }}
                  >
                    <button
                      onClick={() => { setCliente(c); setTelefono(''); setMensaje('') }}
                      style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', color: theme.blanco, fontSize: 14 }}
                    >
                      <span style={{ fontWeight: 600 }}>{c.nombre}</span>
                      <span style={{ color: theme.grisMedio, fontSize: 13 }}>#{c.id} · {c.telefono}</span>
                    </button>
                    <button
                      onClick={() => eliminarCliente(c.id)}
                      style={{ background: 'none', border: 'none', borderLeft: '1px solid #2a2a2a', color: theme.error, cursor: 'pointer', padding: '10px 14px', fontSize: 16 }}
                    >✕</button>
                  </div>
                ))}
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
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{cliente.nombre}</div>
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
                      <button key={p.id} onClick={() => registrarCompra(p)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, border: '1px solid #2a2a2a', background: '#1a1a1a', cursor: 'pointer', color: theme.blanco, fontSize: 15 }}>
                        <div style={{ textAlign: 'left' }}>
                          <div>{p.nombre}</div>
                          {p.nombre === 'Traés un amigo' && (
                            <div style={{ fontSize: 11, color: theme.grisMedio, marginTop: 2 }}>Al que invita: +40 pts · Al invitado: lo del corte</div>
                          )}
                        </div>
                        <span style={{ fontWeight: 700, color: theme.dorado }}>+{p.puntos_otorga} pts</span>
                      </button>
                    ))}
                  </div>
                )}

                {vista === 'canjes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {premios.map(p => {
                      const puede = cliente.puntos_actuales >= p.costo_puntos
                      return (
                        <button key={p.id} onClick={() => canjearPremio(p)} disabled={!puede}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, border: '1px solid #2a2a2a', background: '#1a1a1a', cursor: puede ? 'pointer' : 'not-allowed', color: puede ? theme.blanco : theme.grisMedio, fontSize: 15, opacity: puede ? 1 : 0.5 }}>
                          <span>{p.nombre}</span>
                          <span style={{ fontWeight: 700, color: theme.error }}>-{p.costo_puntos} pts</span>
                        </button>
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

        {pantalla === 'nuevo' && (
          <NuevoClienteForm onVolver={() => setPantalla('panel')} />
        )}
      </div>
      {barraNav}
    </div>
  )
}

function NuevoClienteForm({ onVolver }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [exito, setExito] = useState(false)

  async function registrar() {
    if (!nombre || !telefono) { setMensaje('Nombre y teléfono son obligatorios'); return }
    const { data: telExiste } = await supabase.from('cliente').select('id').eq('telefono', telefono.trim()).single()
    if (telExiste) { setMensaje('Ese teléfono ya está registrado'); return }
    if (email) {
      const { data: emailExiste } = await supabase.from('cliente').select('id').eq('email', email.toLowerCase().trim()).single()
      if (emailExiste) { setMensaje('Ese email ya está registrado'); return }
    }
    const { error } = await supabase.from('cliente').insert({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email ? email.toLowerCase().trim() : null,
      puntos_actuales: 0,
      rol: 'cliente'
    })
    if (error) { setMensaje('Error al registrar'); return }
    setExito(true)
    setMensaje(nombre + ' registrado con éxito!')
    setNombre(''); setTelefono(''); setEmail('')
  }

  return (
    <div>
      <button onClick={onVolver} style={{ background: 'none', border: 'none', color: theme.dorado, cursor: 'pointer', fontSize: 14, marginBottom: 20, padding: 0 }}>← Volver</button>
      <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 16 }}>NUEVO CLIENTE</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input style={estilos.input} placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} />
        <input style={estilos.input} placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
        <input style={estilos.input} placeholder="Email (opcional)" value={email} onChange={e => setEmail(e.target.value)} />
        {mensaje && <p style={{ color: exito ? theme.exito : theme.error, fontSize: 13, margin: 0 }}>{mensaje}</p>}
        <button style={estilos.botonDorado} onClick={registrar}>Registrar cliente</button>
      </div>
    </div>
  )
}