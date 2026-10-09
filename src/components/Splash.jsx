// PASIHAI — Splash: logo kamili yenye "Stay Connected" kwa sekunde chache
// app inapofunguliwa, kisha inatoweka kwa fade. Inaheshimu reduced-motion.
import { useEffect, useState } from 'react'
import fullSrc from '../assets/logo/pasihai-full.png'

const SHOW_MS = 1500
const FADE_MS = 400

export default function Splash({ children }) {
  const [phase, setPhase] = useState('show') // show → fade → done

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const t1 = setTimeout(() => setPhase('fade'), reduce ? 0 : SHOW_MS)
    const t2 = setTimeout(() => setPhase('done'), (reduce ? 0 : SHOW_MS) + FADE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <>
      {phase !== 'done' ? (
        <div className={`psh-splash ${phase === 'fade' ? 'is-fading' : ''}`} aria-hidden="true">
          <img className="psh-splash__logo" src={fullSrc} alt="" draggable="false" />
        </div>
      ) : null}
      {children}
    </>
  )
}
