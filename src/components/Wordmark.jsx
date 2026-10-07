// PASIHAI — Wordmark
// Brand treatment: "Pasi" green, "hai" blue. Ukubwa ~20–22px, Semi Bold.
// HAITUMIKI kama wordmark kubwa inayochukua Home.

export default function Wordmark({ size = 22, className = '', as: Tag = 'span' }) {
  return (
    <Tag
      className={`psh-wordmark ${className}`}
      style={{ fontSize: size }}
      aria-label="Pasihai"
    >
      <span className="psh-wordmark__p">Pasi</span>
      <span className="psh-wordmark__h">hai</span>
    </Tag>
  )
}
