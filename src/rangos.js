export const RANGOS = [
  { nombre: 'Cliente',  icono: '🥉', minCortes: 0,  bonus: 0   },
  { nombre: 'Regular',  icono: '🥈', minCortes: 3,  bonus: 0.05 },
  { nombre: 'Fiel',     icono: '🥇', minCortes: 5,  bonus: 0.10 },
  { nombre: 'VIP',      icono: '💎', minCortes: 7,  bonus: 0.15 },
]

export function getRango(cortes) {
  return [...RANGOS].reverse().find(r => cortes >= r.minCortes) || RANGOS[0]
}

export function calcularPuntos(ptsBase, cortes) {
  const rango = getRango(cortes)
  return Math.round(ptsBase * (1 + rango.bonus))
}
