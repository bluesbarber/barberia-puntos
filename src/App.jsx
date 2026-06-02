import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import ClientePanel from './ClientePanel'
import BarberoPanel from './BarberoPanel'

export default function App() {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const guardado = localStorage.getItem('bluesbarber_usuario')
    if (!guardado) return
    const local = JSON.parse(guardado)
    supabase.from('cliente').select('*').eq('id', local.id).single().then(({ data }) => {
      if (data) {
        localStorage.setItem('bluesbarber_usuario', JSON.stringify(data))
        setUsuario(data)
      } else {
        setUsuario(local)
      }
    })
  }, [])

  function handleLogin(data) {
    setUsuario(data)
  }

  function handleLogout() {
    localStorage.removeItem('bluesbarber_usuario')
    setUsuario(null)
  }

  if (!usuario) return <Auth onLogin={handleLogin} />
  if (usuario.rol === 'barbero') return <BarberoPanel barbero={usuario} onLogout={handleLogout} />
  return <ClientePanel cliente={usuario} onLogout={handleLogout} />
}