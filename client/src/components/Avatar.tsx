const PALETTE = [
  '#ef6c6c','#f5a623','#27ae60','#2980b9',
  '#8e44ad','#e74c3c','#16a085','#d35400',
  '#2ecc71','#3498db','#9b59b6','#e67e22',
]

const initials = (name: string) =>
  name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('')

const colorFor = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i)
  return PALETTE[Math.abs(h) % PALETTE.length]
}

interface Props {
  name: string
  avatar?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isOnline?: boolean
  className?: string
}

export default function Avatar({ name, avatar, size = 'md', isOnline, className = '' }: Props) {
  const base  = import.meta.env.VITE_SOCKET_URL || ''
  const src   = avatar ? (avatar.startsWith('http') ? avatar : `${base}${avatar}`) : null
  const color = colorFor(name || '?')

  return (
    <div className={`avatar ${size} ${className}`}>
      {src
        ? <img
            src={src}
            alt={name}
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        : <div
            className="avatar-ph"
            style={{ background: color + '30', color }}
            title={name}
          >
            {initials(name || '?')}
          </div>
      }
      {isOnline && <span className="online-dot" title="Online" />}
    </div>
  )
}
