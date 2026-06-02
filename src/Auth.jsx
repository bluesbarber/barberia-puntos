import { useState } from 'react'
import { supabase } from './supabase'
import { estilos, theme } from './theme'

const CODIGO_BARBERO = 'blues2026'
const DOMINIOS_VALIDOS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com']

function validarEmail(email) {
  const dominio = email.toLowerCase().trim().split('@')[1]
  return DOMINIOS_VALIDOS.includes(dominio)
}

export default function Auth({ onLogin }) {
  const [pantalla, setPantalla] = useState('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [emailRepetido, setEmailRepetido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepetido, setPasswordRepetido] = useState('')
  const [codigoBarbero, setCodigoBarbero] = useState('')
  const [esBarbero, setEsBarbero] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [recordarme, setRecordarme] = useState(false)
  const [verPassword, setVerPassword] = useState(false)

  async function login() {
    if (!email || !password) { setMensaje('Completá todos los campos'); return }
    setCargando(true)
    const { data } = await supabase
      .from('cliente')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('password_hash', password)
      .single()
    setCargando(false)
    if (!data) { setMensaje('Email o contraseña incorrectos. Si no tenés cuenta, registrate.'); return }
    if (recordarme) localStorage.setItem('bluesbarber_usuario', JSON.stringify(data))
    onLogin(data)
  }

  async function registrar() {
    setMensaje('')
    if (!nombre || !email || !emailRepetido || !telefono || !password || !passwordRepetido) {
      setMensaje('Completá todos los campos'); return
    }
    if (!validarEmail(email)) {
      setMensaje('El email debe ser de Gmail, Outlook, Hotmail o Yahoo'); return
    }
    if (email.toLowerCase().trim() !== emailRepetido.toLowerCase().trim()) {
      setMensaje('Los emails no coinciden'); return
    }
    if (password !== passwordRepetido) {
      setMensaje('Las contraseñas no coinciden'); return
    }
    if (/\d/.test(nombre)) {
      setMensaje('El nombre no puede contener números'); return
    }
    if (telefono.replace(/\D/g, '').length < 8) {
      setMensaje('El teléfono debe tener al menos 8 números'); return
    }
    if (password.length < 6) {
      setMensaje('La contraseña debe tener al menos 6 caracteres'); return
    }
    if (esBarbero && codigoBarbero !== CODIGO_BARBERO) {
      setMensaje('Código de barbero incorrecto'); return
    }
    setCargando(true)
    const { data: emailExiste } = await supabase
      .from('cliente').select('id').eq('email', email.toLowerCase().trim()).single()
    if (emailExiste) { setMensaje('Ese email ya está registrado'); setCargando(false); return }
    const { data: telExiste } = await supabase
      .from('cliente').select('id').eq('telefono', telefono.trim()).single()
    if (telExiste) { setMensaje('Ese teléfono ya está registrado'); setCargando(false); return }
    const { data, error } = await supabase.from('cliente').insert({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      telefono: telefono.trim(),
      password_hash: password,
      rol: esBarbero ? 'barbero' : 'cliente',
      puntos_actuales: 0
    }).select().single()
    setCargando(false)
    if (error) { setMensaje('Error al registrarse, intentá de nuevo'); return }
    if (recordarme) localStorage.setItem('bluesbarber_usuario', JSON.stringify(data))
    onLogin(data)
  }

  return (
    <div style={{ ...estilos.pantalla, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>

        <div style={{ textAlign: 'center', fontSize: 28, color: theme.dorado, letterSpacing: 8, marginBottom: 8 }}>
          ♪ ♩ ♫
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="Blues Barber" style={{ width: 140, height: 140, objectFit: 'contain', marginBottom: 8 }} />
          <div style={{ fontSize: 13, color: theme.dorado, letterSpacing: 4 }}>SISTEMA DE PUNTOS</div>
        </div>

        <div style={estilos.tarjeta}>
          {pantalla === 'login' ? (
            <div>
              <h2 style={{ color: theme.dorado, fontSize: 20, marginBottom: 20, textAlign: 'center' }}>Iniciar sesión</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={estilos.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <div style={{ position: 'relative' }}>
                  <input style={{ ...estilos.input, paddingRight: 44 }} placeholder="Contraseña" type={verPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
                  <button type="button" onClick={() => setVerPassword(!verPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.grisMedio, cursor: 'pointer', fontSize: 18 }}>
                    {verPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.grisMedio, fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={recordarme} onChange={e => setRecordarme(e.target.checked)} />
                  Recordarme
                </label>
                {mensaje && <p style={{ color: theme.error, fontSize: 13, margin: 0 }}>{mensaje}</p>}
                <button style={estilos.botonDorado} onClick={login} disabled={cargando}>
                  {cargando ? 'Ingresando...' : 'Entrar'}
                </button>
                <button style={estilos.botonOscuro} onClick={() => { setPantalla('registro'); setMensaje('') }}>
                  ¿No tenés cuenta? Registrate
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ color: theme.dorado, fontSize: 20, marginBottom: 20, textAlign: 'center' }}>Crear cuenta</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input style={estilos.input} placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} />
                <input style={estilos.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                <input style={estilos.input} placeholder="Repetir email" value={emailRepetido} onChange={e => setEmailRepetido(e.target.value)} />
                <input style={estilos.input} placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
                <div style={{ position: 'relative' }}>
                  <input style={{ ...estilos.input, paddingRight: 44 }} placeholder="Contraseña (mínimo 6 caracteres)" type={verPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setVerPassword(!verPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.grisMedio, cursor: 'pointer', fontSize: 18 }}>
                    {verPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...estilos.input, paddingRight: 44 }} placeholder="Repetir contraseña" type={verPassword ? 'text' : 'password'} value={passwordRepetido} onChange={e => setPasswordRepetido(e.target.value)} />
                  <button type="button" onClick={() => setVerPassword(!verPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: theme.grisMedio, cursor: 'pointer', fontSize: 18 }}>
                    {verPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.grisMedio, fontSize: 14, cursor: 'pointer' }}>
                  <input type="checkbox" checked={esBarbero} onChange={e => setEsBarbero(e.target.checked)} />
                  Soy barbero
                </label>
                {esBarbero && (
                  <input style={estilos.input} placeholder="Código de barbero" type="password" value={codigoBarbero} onChange={e => setCodigoBarbero(e.target.value)} />
                )}
                {mensaje && (
                  <p style={{ color: theme.error, fontSize: 13, margin: 0 }}>{mensaje}</p>
                )}
                <button style={estilos.botonDorado} onClick={registrar} disabled={cargando}>
                  {cargando ? 'Registrando...' : 'Crear cuenta'}
                </button>
                <button style={estilos.botonOscuro} onClick={() => { setPantalla('login'); setMensaje('') }}>
                  ¿Ya tenés cuenta? Iniciá sesión
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', color: theme.doradoOscuro, fontSize: 20, letterSpacing: 12, marginTop: 8 }}>
          ♬ ♪ ♩
        </div>
      </div>
    </div>
  )
}