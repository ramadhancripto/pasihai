// Creator Studio — Analytics (takwimu halisi za machapisho yako) na Audience
import useStudioData from '../../../studio/useStudioData.js'
import { interactionTotal, KIND_LABEL, loadStudioBase, postStats } from '../../../studio/studioData.js'
import { plainText } from '../../../utils/postContent.js'
import { Empty, ErrorBox, LoadingBox, Panel, PlannedSection, StatusChip } from './StudioShared.jsx'

export default function StudioAnalytics({ onOpenPostStudio }) {
  const base = useStudioData(loadStudioBase, [])
  if (base.status === 'loading') return <LoadingBox label="Inapakia takwimu zako…" />
  if (base.status === 'error') return <ErrorBox error={base.error} onRetry={base.retry} />

  const { posts } = base.data
  const totals = posts.reduce(
    (acc, p) => {
      const s = postStats(p)
      acc.reactions += s.reactions
      acc.comments += s.comments
      acc.shares += s.shares
      return acc
    },
    { reactions: 0, comments: 0, shares: 0 },
  )
  const total = totals.reactions + totals.comments + totals.shares
  const avg = posts.length ? (total / posts.length).toFixed(1) : '0'
  const top = [...posts]
    .filter((p) => interactionTotal(p) > 0)
    .sort((a, b) => interactionTotal(b) - interactionTotal(a))
    .slice(0, 5)

  const byKind = posts.reduce((acc, p) => {
    const k = KIND_LABEL[p.kind] ?? p.kind ?? 'Nyingine'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Analytics</h1>
          <p className="psh-cs__muted">Takwimu halisi za machapisho yako. Hakuna takwimu za mfano hapa.</p>
        </div>
        <div className="psh-cs__row">
          <label>
            <span className="u-sr">Kipindi</span>
            <select className="psh-cs__input" disabled title="Vichujio vya kipindi bado havijaunganishwa">
              <option>Yote</option>
            </select>
          </label>
          <StatusChip status="planned" />
        </div>
      </header>

      <dl className="psh-cs__kpis">
        <div><dt>Machapisho</dt><dd>{posts.length}</dd></div>
        <div><dt>Reactions</dt><dd>{totals.reactions}</dd></div>
        <div><dt>Maoni</dt><dd>{totals.comments}</dd></div>
        <div><dt>Shares</dt><dd>{totals.shares}</dd></div>
        <div><dt>Wastani kwa chapisho</dt><dd>{avg}</dd></div>
      </dl>

      <div className="psh-cs__grid2">
        <Panel title="Machapisho bora">
          {top.length === 0 ? (
            <Empty title="Bado hakuna mwingiliano" text="Mara machapisho yako yakipata reactions, maoni au shares, yataonekana hapa." />
          ) : (
            <ol className="psh-cs__list2 psh-cs__ranked">
              {top.map((p) => (
                <li key={p.id}>
                  <span className="psh-cs__clip">{plainText(p.text) || '(bila maandishi)'}</span>
                  <span className="psh-cs__muted">{interactionTotal(p)} mwingiliano</span>
                  <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => onOpenPostStudio({ text: plainText(p.text) })}>Nakili</button>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Machapisho kwa aina">
          {posts.length === 0 ? (
            <Empty title="Hakuna machapisho" text="Chapisha ili uone mgawanyo kwa aina." />
          ) : (
            <ul className="psh-cs__list2">
              {Object.entries(byKind).map(([k, n]) => (
                <li key={k}><span>{k}</span><strong>{n}</strong></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <PlannedSection
        title="Mwenendo wa muda"
        status="planned"
        summary="Grafu ya mwenendo kwa siku itaonekana wakati takwimu za mwenendo zitakapohifadhiwa na backend. Hadi hapo, hakuna grafu inayobuniwa."
        needs={['Jedwali la matukio ya takwimu (events) lenye ruhusa za RLS', 'Kazi ya kukusanya takwimu kila siku']}
      />

      <PlannedSection
        title="Ripoti za kampeni"
        status="planned"
        summary="Ripoti za matangazo na kampeni zinategemea mfumo wa matangazo, ambao haujaunganishwa."
      />
    </div>
  )
}

export function StudioAudience({ onNavigate }) {
  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Audience</h1>
          <p className="psh-cs__muted">Wafuasi, wanaokufuatilia na jamii yako.</p>
        </div>
      </header>
      <PlannedSection
        title="Wafuasi na jamii"
        status="planned"
        summary="Takwimu za wafuasi na zana za usimamizi wa hadhira bado hazijaunganishwa. Hakuna idadi ya wafuasi inayoonyeshwa hapa kwa sababu hakuna chanzo halisi cha hesabu hiyo kwenye Studio."
        needs={['Hesabu ya wafuasi kutoka backend (follow graph)', 'Uchujaji wa maoni na ripoti kwa Studio']}
        alternatives={[{ label: 'Angalia maoni kwenye Home', onClick: () => onNavigate('home') }]}
      />
      <Panel title="Faragha">
        <p className="psh-cs__body">Hakuna takwimu za watumiaji binafsi zinazoonyeshwa hapa. Ufuatiliaji (follow) si urafiki.</p>
      </Panel>
    </div>
  )
}
