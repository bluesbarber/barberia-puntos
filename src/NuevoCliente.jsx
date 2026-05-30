import { useState } from 'react'
import { supabase } from './supabase'

function NuevoCliente({ onVolver }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [exito, setExito] = useState(false)

  async function registrar() {
    if (!nombre || !telefono) {
      setMensaje('Nombre y teléfono son obligatorios')
      return
    }
    const { error } = await supabase.from('cliente').insert({
      nombre,
      telefono,
      email: email || null
    })
    if (error) {
      if (error.code === '23505') setMensaje('Ese teléfono ya está registrado')
      else setMensaje('Error al registrar el cliente')
      return
    }
    setExito(true)
    setMensaje(`${nombre} fue registrado con éxito!`)
    setNombre('')
    setTelefono('')
    setEmail('')
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif', padding: '0 16px' }}>
      <button
        onClick={onVolver}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#666', marginBottom: 24, padding: 0 }}
      >← Volver</button>

      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Nuevo cliente</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="Nombre completo"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          style={{ padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={telefono}
          onChange={e => setTelefono(e.target.value)}
          style={{ padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />
        <input
          type="email"
          placeholder="Email (opcional)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1px solid #ccc' }}
        />

        {mensaje && (
          <p style={{ color: exito ? 'green' : 'red', margin: 0 }}>{mensaje}</p>
        )}

        <button
          onClick={registrar}
          style={{ padding: '12px', fontSize: 16, borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >Registrar cliente</button>
      </div>
    </div>
  )
}

export default NuevoCliente