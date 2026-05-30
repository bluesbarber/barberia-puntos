import { useState } from 'react'
import { supabase } from './supabase'
import { estilos, theme } from './theme'

const MAPS_URL = 'https://www.google.com/maps/place/Barberia+Peluqueria/@-34.5668916,-58.4575156,19z/data=!4m6!3m5!1s0x95bcb5d12c283da7:0xa6d591f23e1b33d0!8m2!3d-34.5663271!4d-58.4569298!16s%2Fg%2F11wg9hbs7q'

export default function ClientePanel({ cliente: clienteInicial, onLogout }) {
  const [cliente, setCliente] = useState(clienteInicial)
  const [premios, setPremios] = useState([])
  const [cargandoPremios, setCargandoPremios] = useState(false)
  const [vista, setVista] = useState('inicio')
  const [mensaje, setMensaje] = useState('')

  async function cargarPremios() {
    setCargandoPremios(true)
    const { data } = await supabase.from('premio').select('*').eq('activo', true).order('costo_puntos')
    setPremios(data || [])
    setCargandoPremios(false)
  }

  async function refrescarCliente() {
    const { data } = await supabase.from('cliente').select('*').eq('id', cliente.id).single()
    if (data) setCliente(data)
  }

  async function canjearPremio(premio) {
    setMensaje('')
    if (premio.nombre === '2x1 en corte') {
      setMensaje('Para el 2x1 acercate al barbero. Se pueden combinar los puntos de ambas personas para llegar a los 700 pts. (Por ejemplo: cliente 1 pone 400 pts y cliente 2 pone 300 pts.) Ambos tienen que tener cuenta registrada, aunque el segundo cliente no aporte puntos.')
      return
    }
    if (cliente.puntos_actuales < premio.costo_puntos) {
      setMensaje('No tenés suficientes puntos para este premio')
      return
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

  const barraNav = (
    <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid ' + theme.dorado, background: '#111', padding: '10px 0', position: 'sticky', bottom: 0 }}>
      {[
        { id: 'inicio', icono: '★', label: 'Inicio' },
        { id: 'premios', icono: '♛', label: 'Premios' },
        { id: 'ubicacion', icono: '♪', label: 'Ubicación' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => { setVista(item.id); setMensaje(''); if (item.id === 'premios') cargarPremios() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 3,
            color: vista === item.id ? theme.dorado : theme.grisMedio,
            fontSize: 11, fontWeight: vista === item.id ? 700 : 400
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <img src="/logo.png" alt="Blues Barber" style={{ width: 36, height: 36, objectFit: 'contain' }} />
  <div>
    <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3 }}>BLUES Barber</div>
    <div style={{ fontSize: 18, fontWeight: 700 }}>Hola, {cliente.nombre.split(' ')[0]}</div>
  </div>
</div>
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: '1px solid ' + theme.doradoOscuro, color: theme.grisMedio, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>
            Salir
          </button>
        </div>

        {vista === 'inicio' && (
          <div>
            <div style={{ ...estilos.tarjeta, textAlign: 'center', background: 'linear-gradient(160deg, #1a1a1a, #2a2000)', borderColor: theme.dorado }}>
              <div style={{ fontSize: 13, color: theme.dorado, letterSpacing: 3, marginBottom: 8 }}>TUS PUNTOS</div>
              <div style={{ fontSize: 64, fontWeight: 700, color: theme.dorado, lineHeight: 1 }}>{cliente.puntos_actuales}</div>
              <div style={{ fontSize: 13, color: theme.grisMedio, marginTop: 8 }}>puntos acumulados</div>
            </div>

            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 12 }}>CÓMO GANAR PUNTOS</div>
            <div style={{ ...estilos.tarjeta, padding: '16px 20px' }}>
              {[
                { label: 'Corte de pelo', pts: '+100 pts' },
                { label: 'Compra de insumo', pts: '+50 pts' },
                { label: 'Opinión en Google', pts: '+25 pts' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #2a2a2a' : 'none' }}>
                  <span style={{ fontSize: 15, color: theme.blanco }}>{item.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: theme.dorado }}>{item.pts}</span>
                </div>
              ))}
            </div>

            <div style={{ ...estilos.tarjeta, background: '#1a1500', borderColor: theme.doradoOscuro, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, color: theme.dorado, marginBottom: 6, fontWeight: 600 }}>ACLARACIÓN 2x1</div>
              <div style={{ fontSize: 13, color: theme.grisMedio, lineHeight: 1.6 }}>
                Para el 2x1 Se pueden combinar los puntos de ambas personas para llegar a los 700 pts. (Por ejemplo: cliente 1 pone 400 pts y cliente 2 pone 300 pts.) Ambos tienen que tener cuenta registrada, aunque el segundo cliente no aporte puntos.
              </div>
            </div>
          </div>
        )}

        {vista === 'premios' && (
          <div>
            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 12 }}>CANJEAR PREMIOS</div>
            {mensaje && (
              <div style={{ background: '#1a1500', border: '1px solid ' + theme.dorado, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: theme.doradoClaro, lineHeight: 1.5 }}>
                {mensaje}
              </div>
            )}
            {cargandoPremios ? (
              <div style={{ textAlign: 'center', color: theme.grisMedio, padding: 40 }}>Cargando premios...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {premios.map(p => {
                  const puedeC = cliente.puntos_actuales >= p.costo_puntos || p.nombre === '2x1 en corte'
                  return (
                    <div key={p.id} style={{ ...estilos.tarjeta, marginBottom: 0, opacity: puedeC ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: theme.blanco }}>{p.nombre}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: theme.error }}>-{p.costo_puntos} pts</div>
                      </div>
                      <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 12 }}>{p.descripcion}</div>
                      {p.nombre === '2x1 en corte' && (
                        <div style={{ fontSize: 12, color: theme.doradoOscuro, marginBottom: 10, fontStyle: 'italic' }}>
                        </div>
                      )}
                      <button
                        onClick={() => canjearPremio(p)}
                        style={{ ...estilos.botonDorado, padding: '10px', fontSize: 14 }}
                      >
                        {p.nombre === '2x1 en corte' ? 'Ver instrucciones' : puedeC ? 'Canjear' : 'Te faltan ' + (p.costo_puntos - cliente.puntos_actuales) + ' pts'}
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
            <div style={{ fontSize: 11, color: theme.dorado, letterSpacing: 3, marginBottom: 12 }}>ENCONTRANOS</div>
            <div style={{ ...estilos.tarjeta, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>♪</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Blues Barber</div>
              <div style={{ fontSize: 13, color: theme.grisMedio, marginBottom: 20, lineHeight: 1.6 }}>
                Dejá tu opinión en Google y sumás 25 puntos. Mostráselo al barbero para que te los acredite.
              </div>
              
                <a href={MAPS_URL} target="_blank" rel="noreferrer"
  style={{ ...estilos.botonDorado, display: 'block', textDecoration: 'none', textAlign: 'center', padding: '13px', borderRadius: 10, fontWeight: 700 }}>
  Ver en Google Maps
</a>
            </div>

            <div style={{ ...estilos.tarjeta, background: '#1a1500', borderColor: theme.doradoOscuro, padding: '14px 16px', marginTop: 8 }}>
              <div style={{ fontSize: 12, color: theme.dorado, marginBottom: 6, fontWeight: 600 }}>ACLARACIÓN 2x1</div>
              <div style={{ fontSize: 13, color: theme.grisMedio, lineHeight: 1.6 }}>
                Para el 2x1 Se pueden combinar los puntos de ambas personas para llegar a los 700 pts. (Por ejemplo: cliente 1 pone 400 pts y cliente 2 pone 300 pts.) Ambos tienen que tener cuenta registrada, aunque el segundo cliente no aporte puntos.
              </div>
            </div>
          </div>
        )}

      </div>
      {barraNav}
    </div>
  )
}