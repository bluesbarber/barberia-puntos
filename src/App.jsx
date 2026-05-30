import { useState, useEffect } from 'react'
import Auth from './Auth'
import ClientePanel from './ClientePanel'
import BarberoPanel from './BarberoPanel'

export default function App() {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const guardado = localStorage.getItem('bluesbarber_usuario')
    if (guardado) setUsuario(JSON.parse(guardado))
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