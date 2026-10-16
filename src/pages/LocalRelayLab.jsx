import { useEffect, useState } from 'react'
import { createLocalRelayLab } from '../utils/distribution/localRelayLab.js'
import { distributionService } from '../services/distributionService.js'

let labSingleton

function getLab() {
  if (!labSingleton) labSingleton = createLocalRelayLab()
  return labSingleton
}

export default function LocalRelayLab() {
  const [snap, setSnap] = useState(() => getLab().snapshot())
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [native, setNative] = useState({ transport: 'none', peers: [], reason: 'not-queried' })
  const [caps, setCaps] = useState(null)

  useEffect(() => {
    distributionService.nearbyPeers().then(setNative)
    distributionService.capabilities().then(setCaps)
  }, [])

  async function run(name) {
    setBusy(true)
    setResult(null)
    try {
      const r = await getLab().runScenario(name)
      setResult(r)
      setSnap(getLab().snapshot())
    } catch (e) {
      setResult({ ok: false, error: e.message, simulated: true, physicalDevice: false })
    } finally {
      setBusy(false)
    }
  }

  const plugin = !!caps?.plugin
  const status = plugin
    ? caps.discovering
      ? 'running'
      : 'plugin_idle'
    : 'unavailable_no_android_plugin'

  return (
    <div className="psh-panelstack" style={{ padding: '16px 16px 88px' }}>
      <p>
        <a href="#/home">← Home</a>
      </p>
      <h1 className="psh-panelstack__h">Local Relay Lab</h1>
      <p className="psh-note">
        Hali ya majaribio. Vifaa SIM-A / SIM-B ni <strong>simulated</strong>. Si NSD, si Bluetooth, si
        simu mbili. Hash hutoka kwenye engine halisi.
      </p>

      <h2 className="psh-panelstack__h">Hali</h2>
      <ul>
        <li>Lab: {snap.mode}</li>
        <li>Native plugin: {plugin ? 'ipo' : 'haipo (WebView/dev)'}</li>
        <li>Status: {status}</li>
        <li>backgroundGuaranteed: {String(caps?.backgroundGuaranteed ?? false)}</li>
      </ul>

      <h2 className="psh-panelstack__h">Vifaa vya karibu (NSD halisi)</h2>
      <p>
        Transport: {native.transport} · {native.reason || '—'}
      </p>
      {native.peers?.length ? (
        <ul>
          {native.peers.map((p) => (
            <li key={p.host + p.port}>
              {p.deviceId} {p.host}:{p.port} ({p.transport})
            </li>
          ))}
        </ul>
      ) : (
        <p>Hakuna peer halisi. Orodha tupu si orodha ya uwongo.</p>
      )}

      <h2 className="psh-panelstack__h">Simulated devices</h2>
      <ul>
        {snap.devices.map((d) => (
          <li key={d.id}>
            {d.id} — {d.role} — <em>{d.kind}</em>
          </li>
        ))}
      </ul>

      <h2 className="psh-panelstack__h">Majaribio (engine + meshProtocol)</h2>
      <p>
        <button type="button" disabled={busy} onClick={() => run('public-transfer')}>
          Transfer ya umma + SHA-256
        </button>{' '}
        <button type="button" disabled={busy} onClick={() => run('interrupt-resume')}>
          Kata + resume
        </button>{' '}
        <button type="button" disabled={busy} onClick={() => run('duplicate')}>
          Duplicate
        </button>{' '}
        <button type="button" disabled={busy} onClick={() => run('private-deny')}>
          Private deny
        </button>
      </p>

      {result ? (
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}

      <h2 className="psh-panelstack__h">Log</h2>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, maxHeight: 240, overflow: 'auto' }}>
        {snap.logs.map((l) => `${l.at} ${l.msg} ${l.contentId || l.reason || ''}`).join('\n') || '—'}
      </pre>

      <p className="psh-panelstack__foot">
        Internet Relay, BLE, Wi-Fi Direct, na simu mbili: hazijathibitishwa hapa. Delivered katika
        lab hii ni integrity ya receiver baada ya hash, si delivery ya mtumiaji mwingine mtandaoni.
      </p>
    </div>
  )
}
