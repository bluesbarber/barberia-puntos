import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import { estilos, theme } from './theme'

const MAPS_URL = 'https://www.google.com/maps/place/Barberia+Peluqueria/@-34.5668916,-58.4575156,19z/data=!4m6!3m5!1s0x95bcb5d12c283da7:0xa6d591f23e1b33d0!8m2!3d-34.5663271!4d-58.4569298!16s%2Fg%2F11wg9hbs7q'
const WHATSAPP_URL = 'https://wa.me/541130896068'
const INSTAGRAM_URL = 'https://instagram.com/blues.barber_'

export default function ClientePanel({ cliente: clienteInicial, onLogout }) {
  const [cliente, setCliente] = useState(clienteInicial)
  const [premios, setPremios] = useState([])
  const [cargandoPremios, setCargandoPremios] = useState(false)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [visitas, setVisitas] = useState(0)
  const [proximoPremio, setProximoPremio] = useState(null)
  const [vista, setVista] = useState('inicio')
  const [mensaje, setMensaje] = useState('')
  const [puntosAnimados, setPuntosAnimados] = useState(0)
  const [promptInstalacion, setPromptInstalacion] = useState(null)
  const animRef = useRef(null)

  useEffect(() => {
    const handler = e => { e.preventDefault(); setPromptInstalacion(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    cargarVisitasYPremio()
    animarPuntos(cliente.puntos_actuales)

    const canal = supabase
      .channel('cliente-' + clienteInicial.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'cliente',
        filter: 'id=eq.' + clienteInicial.id
      }, payload => {
        const nuevo = payload.new
        setCliente(nuevo)
        animarPuntos(nuevo.puntos_actuales)
        cargarVisitasYPremio()
        if (historial.length > 0) cargarHistorial()
      })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  function animarPuntos(total) {
    const duracion = 1000
    const inicio = Date.now()
    const tick = () => {
      const progreso = Math.min((Date.now() - inicio) / duracion, 1)
      const eased = 1 - Math.pow(1 - progreso, 3)
      setPuntosAnimados(Math.floor(eased * total))
      if (progreso < 1) animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  async function cargarVisitasYPremio() {
    const { data: txs } = await supabase
      .from('transaccion')
      .select('producto_id, producto:producto_id(categoria)')
      .eq('cliente_id', clienteInicial.id)
    const v = (txs || []).filter(t => t.producto?.categoria === 'corte').length
    setVisitas(v)

    const { data: prem } = await supabase
      .from('premio')
      .select('*')
      .eq('activo', true)
      .gt('costo_puntos', clienteInicial.puntos_actuales)
      .order('costo_puntos')
      .limit(1)
    if (prem && prem.length > 0) setProximoPremio(prem[0])
  }

  async function cargarPremios() {
    setCargandoPremios(true)
    const { data } = await supabase.from('premio').select('*').eq('activo', true).order('costo_puntos')
    setPremios(data || [])
    setCargandoPremios(false)
  }

  async function cargarHistorial() {
    setCargandoHistorial(true)
    const { data } = await supabase
      .from('transaccion')
      .select('id, puntos_ganados, created_at, producto:producto_id(nombre)')
      .eq('cliente_id', clienteInicial.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setHistorial(data || [])
    setCargandoHistorial(false)
  }

  async function refrescarCliente() {
    const { data } = await supabase.from('cliente').select('*').eq('id', cliente.id).single()
    if (data) {
      setCliente(data)
      animarPuntos(data.puntos_actuales)
      cargarVisitasYPremio()
    }
  }

  async function canjearPremio(premio) {
    setMensaje('')
    if (cliente.puntos_actuales < premio.costo_puntos) {
      setMensaje('No tenés suficientes puntos para este premio')
      return
    }
    if (premio.nombre.toLowerCase().includes('google')) {
      const { data: yaCanjo } = await supabase
        .from('canje')
        .select('id')
        .eq('cliente_id', cliente.id)
        .eq('premio_id', premio.id)
        .limit(1)
      if (yaCanjo && yaCanjo.length > 0) {
        setMensaje('Ya canjeaste este premio anteriormente. Solo se permite una vez.')
        return
      }
    }
    const { error } = await supabase.from('canje').insert({
      cliente_id: cliente.id,
      premio_id: premio.id,
      puntos_usados: premio.costo_puntos
    })
    if (error) { setMensaje('Error al canjear, intentá de nuevo'); return }
    setMensaje('Canjeaste: ' + premio.nombre + '! Mostráselo al barbero.')
    refrescarCliente()
  }

  function formatFecha(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const ptaFaltan = proximoPremio ? proximoPremio.costo_puntos - cliente.puntos_actuales : null

  const barraNav = (
    <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid ' + theme.dorado, background: '#111', padding: '12px 0', position: 'sticky', bottom: 0 }}>
      {[
        { id: 'inicio', icono: '★', label: 'Inicio' },
        { id: 'historial', icono: '♜', label: 'Historial' },
        { id: 'premios', icono: '♛', label: 'Premios' },
        { id: 'ubicacion', icono: '♪', label: 'Contacto' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => {
            setVista(item.id)
            setMensaje('')
            if (item.id === 'premios') cargarPremios()
            if (item.id === 'historial') cargarHistorial()
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 4,
            color: vista === item.id ? theme.dorado : theme.grisMedio,
            fontSize: 11, fontWeight: vista === item.id ? 700 : 400
          }}
        >
          <span style={{ fontSize: 22 }}>{item.icono}</span>
          {item.label}
        </button>
      ))}
    </div>
  )

  return (
    <div style={{ ...estilos.pantalla, display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', padding: 0, minHeight: '100vh' }}>
      <div style={{ flex: 1, padding: '28px 20px 20px', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt="Blues Barber" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3 }}>BLUES Barber</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Hola, {cliente.nombre.split(' ')[0]}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + theme.doradoOscuro, color: theme.grisMedio, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
            Salir
          </button>
        </div>

        {vista === 'inicio' && (
          <div>
            <div style={{ ...estilos.tarjeta, textAlign: 'center', background: 'linear-gradient(160deg, #1a1a1a, #2a2000)', borderColor: theme.dorado, padding: '32px 20px', marginBottom: ptaFaltan ? 16 : 28 }}>
              <div style={{ fontSize: 13, color: theme.dorado, letterSpacing: 4, marginBottom: 12 }}>TUS PUNTOS</div>
              <div style={{ fontSize: 72, fontWeight: 700, color: theme.dorado, lineHeight: 1 }}>{puntosAnimados}</div>
              <div style={{ fontSize: 14, color: theme.grisMedio, marginTop: 10 }}>puntos acumulados</div>
              {visitas > 0 && (
                <div style={{ marginTop: 14, fontSize: 13, color: theme.grisMedio }}>
                  ✂ <span style={{ color: theme.doradoClaro, fontWeight: 600 }}>{visitas}</span> {visitas === 1 ? 'visita' : 'visitas'} a la barbería
                </div>
              )}
            </div>

            {proximoPremio && ptaFaltan <= 30 && (
              <div style={{ background: '#1a1500', border: '1px solid ' + theme.dorado, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>♛</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.dorado }}>¡Casi llegás a {proximoPremio.nombre}!</div>
                  <div style={{ fontSize: 12, color: theme.grisMedio, marginTop: 2 }}>Te faltan solo <span style={{ color: theme.doradoClaro, fontWeight: 700 }}>{ptaFaltan} pts</span></div>
                </div>
              </div>
            )}

            {proximoPremio && ptaFaltan > 30 && (
              <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>♛</span>
                <div>
                  <div style={{ fontSize: 12, color: theme.grisMedio }}>Próximo premio: <span style={{ color: theme.blanco, fontWeight: 600 }}>{proximoPremio.nombre}</span></div>
                  <div style={{ fontSize: 12, color: theme.grisMedio, marginTop: 2 }}>Te faltan <span style={{ color: theme.doradoClaro, fontWeight: 600 }}>{ptaFaltan} pts</span></div>
                </div>
              </div>
            )}

            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 14 }}>CÓMO GANAR PUNTOS</div>
            <div style={{ ...estilos.tarjeta, padding: '4px 20px', marginBottom: 28 }}>
              {[
                { label: 'PROMO 2 cortes x 30k * Seba', pts: '+40 pts' },
                { label: 'Corte + barba', pts: '+30 pts' },
                { label: 'Corte de pelo', pts: '+25 pts' },
                { label: 'Comprar Monster', pts: '+10 pts' },
                { label: 'Insumos', pts: '+10 pts' },
                { label: 'Opinión en Google', pts: '+5 pts' },
              ].map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                  <span style={{ fontSize: 15, color: theme.blanco }}>{item.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: theme.dorado }}>{item.pts}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 14 }}>ACLARACIONES</div>
            <div style={{ ...estilos.tarjeta, background: '#1a1500', borderColor: theme.doradoOscuro, padding: '18px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.dorado, marginBottom: 8 }}>Opinión en Google</div>
              <div style={{ fontSize: 13, color: theme.grisMedio, lineHeight: 1.7 }}>
                Dejá tu reseña en Google Maps y mostrásela al barbero para que te acredite los 5 pts.
              </div>
            </div>
          </div>
        )}

        {vista === 'historial' && (
          <div>
            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 16 }}>TU HISTORIAL</div>
            {cargandoHistorial ? (
              <div style={{ textAlign: 'center', color: theme.grisMedio, padding: 40 }}>Cargando...</div>
            ) : historial.length === 0 ? (
              <div style={{ ...estilos.tarjeta, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✂</div>
                <div style={{ color: theme.grisMedio, fontSize: 14 }}>Todavía no tenés transacciones registradas</div>
              </div>
            ) : (
              <div style={{ ...estilos.tarjeta, padding: '4px 20px' }}>
                {historial.map((t, i) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < historial.length - 1 ? '1px solid #2a2a2a' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 14, color: theme.blanco, fontWeight: 600 }}>{t.producto?.nombre || 'Servicio'}</div>
                      <div style={{ fontSize: 12, color: theme.grisMedio, marginTop: 2 }}>{formatFecha(t.created_at)}</div>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: theme.dorado }}>+{t.puntos_ganados} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vista === 'premios' && (
          <div>
            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 16 }}>CANJEAR PREMIOS</div>

            <div style={{ ...estilos.tarjeta, background: 'linear-gradient(160deg, #1a1a1a, #2a2000)', textAlign: 'center', padding: '20px', marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 4 }}>Tus puntos disponibles</div>
              <div style={{ fontSize: 44, fontWeight: 700, color: theme.dorado }}>{cliente.puntos_actuales}</div>
            </div>

            {mensaje && (
              <div style={{ background: '#1a1500', border: '1px solid ' + theme.dorado, borderRadius: 10, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: theme.doradoClaro, lineHeight: 1.6 }}>
                {mensaje}
              </div>
            )}

            {cargandoPremios ? (
              <div style={{ textAlign: 'center', color: theme.grisMedio, padding: 40 }}>Cargando premios...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {premios.map(p => {
                  const puedeC = cliente.puntos_actuales >= p.costo_puntos
                  return (
                    <div key={p.id} style={{ ...estilos.tarjeta, marginBottom: 0, opacity: puedeC ? 1 : 0.5, padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: theme.blanco }}>{p.nombre}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: theme.error }}>-{p.costo_puntos} pts</div>
                      </div>
                      {p.descripcion && (
                        <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 16, lineHeight: 1.5 }}>{p.descripcion}</div>
                      )}
                      <button
                        onClick={() => canjearPremio(p)}
                        disabled={!puedeC}
                        style={{ ...estilos.botonDorado, padding: '12px', fontSize: 14, opacity: puedeC ? 1 : 0.4 }}
                      >
                        {puedeC ? 'Canjear' : 'Te faltan ' + (p.costo_puntos - cliente.puntos_actuales) + ' pts'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {vista === 'ubicacion' && (
          <div>
            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 16 }}>CONTACTO</div>

            <div style={{ ...estilos.tarjeta, textAlign: 'center', padding: '36px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>♪</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Blues Barber</div>
              <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 28, lineHeight: 1.7 }}>
                Encontranos en Google Maps y dejá tu reseña para sumar 5 puntos. Mostrásela al barbero para que te los acredite.
              </div>
              {promptInstalacion && (
                <button
                  onClick={() => { promptInstalacion.prompt(); setPromptInstalacion(null) }}
                  style={{ display: 'block', width: '100%', textDecoration: 'none', textAlign: 'center', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #1a1a1a, #2a2000)', color: theme.dorado, border: '1px solid ' + theme.dorado, cursor: 'pointer', marginBottom: 12 }}
                >Instalar app en tu celular</button>
              )}
              {!promptInstalacion && (
                <div style={{ background: '#1a1500', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 12, color: theme.grisMedio, lineHeight: 1.7, textAlign: 'left' }}>
                  <span style={{ color: theme.dorado, fontWeight: 600 }}>Instalá la app:</span> en iPhone abrí Safari → tocá compartir → "Agregar a inicio". En Android aparece un aviso automático del navegador.
                </div>
              )}
              <a href={MAPS_URL} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, background: theme.dorado, color: theme.negro, marginBottom: 12 }}>Ver en Google Maps</a>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, background: '#25D366', color: '#fff', marginBottom: 12 }}>WhatsApp</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, background: 'linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)', color: '#fff' }}>Instagram</a>
            </div>
          </div>
        )}

      </div>
      {barraNav}
    </div>
  )
}
