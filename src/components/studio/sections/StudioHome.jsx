// Creator Studio — Studio Home (dashibodi)
import useStudioData from '../../../studio/useStudioData.js'
import { FEATURES, PLANS, getCurrentPlan, STATUS } from '../../../studio/studioModel.js'
import { draftTypeLabel, loadStudioBase, mediaOf, postStats, KIND_LABEL } from '../../../studio/studioData.js'
import { plainText } from '../../../utils/postContent.js'
import { Empty, ErrorBox, LoadingBox, Panel, PlannedSection, StatusChip } from './StudioShared.jsx'

const QUICK = [
  { id: 'post', label: 'Unda chapisho', status: 'available', run: (a) => a.onOpenPostStudio({ type: 'text' }) },
  { id: 'story', label: 'Unda Story', status: 'available', run: (a) => a.onOpenStatus() },
  { id: 'image', label: 'Hariri picha', status: 'partial', hint: 'Poster ya picha. Hakuna mhariri wa canvas bado.', run: (a) => a.onOpenPostStudio({ type: 'poster' }) },
  { id: 'video', label: 'Unda video', status: 'partial', hint: 'Upload ya video inahitaji backend ya live.', run: (a) => a.onOpenPostStudio({ type: 'video' }) },
  { id: 'ad', label: 'Unda tangazo', status: 'planned', hint: 'Mfumo wa matangazo bado haujaunganishwa.', run: (a) => a.onNavigate('ads') },
  { id: 'project', label: 'Anza mradi', status: 'planned', hint: 'Miradi bado haijaunganishwa.', run: (a) => a.onNavigate('projects') },
]

const TIPS = [
  'Hifadhi rasimu ukiwa bado unafikiri — inabaki kwenye kifaa hiki hadi uichapishe.',
  'Templates zinabadilisha mwonekano tu; maudhui yako hayabadiliki.',
  'Chapisho lililochapishwa linabaki kama lilivyo, hata ukibadilisha template baadaye.',
]

export default function StudioHome(actions) {
  const base = useStudioData(loadStudioBase, [])

  if (base.status === 'loading') return <LoadingBox label="Inapakia dashibodi yako…" />
  if (base.status === 'error') return <ErrorBox error={base.error} onRetry={base.retry} />

  const { me, posts, drafts, unread } = base.data
  const name = me?.name || 'Mbunifu'
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
  const firstTime = posts.length === 0 && drafts.length === 0
  const recentMedia = posts.filter((p) => mediaOf(p)).slice(0, 6)
  const premium = Object.entries(FEATURES).filter(([, f]) => f.tier !== 'free')

  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__welcome">
        <div>
          <h1 className="psh-cs__h1">Karibu, {name}</h1>
          <p className="psh-cs__muted">{me?.handle ?? ''} · Mpango: {PLANS[getCurrentPlan()].label}</p>
        </div>
      </header>

      {firstTime ? (
        <Panel title="Anza hapa">
          <ol className="psh-cs__steps">
            <li>Unda chapisho lako la kwanza na uchapishe moja kwa moja.</li>
            <li>Hifadhi rasimu ukitaka kuendelea baadaye.</li>
            <li>Tazama machapisho yako kwenye My Content.</li>
          </ol>
        </Panel>
      ) : null}

      <Panel title="Vitendo vya haraka">
        <ul className="psh-cs__quick">
          {QUICK.map((q) => (
            <li key={q.id}>
              <button type="button" className="psh-cs__quickBtn" onClick={() => q.run(actions)} aria-describedby={q.hint ? `hint-${q.id}` : undefined}>
                <span>{q.label}</span>
                <StatusChip status={q.status} />
              </button>
              {q.hint ? <small id={`hint-${q.id}`} className="psh-cs__muted">{q.hint}</small> : null}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="psh-cs__grid2">
        <Panel
          title={`Rasimu zinazosubiri (${drafts.length})`}
          action={<button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => actions.onNavigate('content')}>Zote</button>}
        >
          {drafts.length === 0 ? (
            <Empty title="Hakuna rasimu" text="Hifadhi rasimu kutoka Post Studio ili uiendelee baadaye." />
          ) : (
            <ul className="psh-cs__list2">
              {drafts.slice(0, 3).map((d) => (
                <li key={d.id}>
                  <span>{draftTypeLabel(d.content?.type)} · toleo {d.revision}</span>
                  <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => actions.onOpenPostStudio({ draft: d })}>Endelea</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Machapisho ya hivi karibuni">
          {posts.length === 0 ? (
            <Empty title="Bado hakuna machapisho" text="Machapisho yako yaliyochapishwa yataonekana hapa." />
          ) : (
            <ul className="psh-cs__list2">
              {posts.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <span className="psh-cs__clip">{KIND_LABEL[p.kind] ?? p.kind} · {plainText(p.text) || '(bila maandishi)'}</span>
                  <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => actions.onOpenPostStudio({ text: plainText(p.text) })}>Nakili</button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="psh-cs__grid2">
        <Panel title="Muhtasari wa utendaji">
          <dl className="psh-cs__stats">
            <div><dt>Machapisho</dt><dd>{posts.length}</dd></div>
            <div><dt>Rasimu</dt><dd>{drafts.length}</dd></div>
            <div><dt>Reactions</dt><dd>{totals.reactions}</dd></div>
            <div><dt>Maoni</dt><dd>{totals.comments}</dd></div>
            <div><dt>Shares</dt><dd>{totals.shares}</dd></div>
          </dl>
          <p className="psh-cs__muted">Hesabu hizi ni za machapisho yako halisi. Mwenendo wa muda haujaunganishwa bado.</p>
        </Panel>

        <Panel title="Arifa na hali ya kuchapisha">
          <p className="psh-cs__body">Arifa ambazo hazijasomwa: <strong>{unread}</strong></p>
          <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => actions.onOpenPanel({ type: 'notifications' })}>Fungua arifa</button>
          <p className="psh-cs__muted">
            {actions.online === false
              ? 'Uko nje ya mtandao: machapisho utakayotuma yatasubiri kusawazishwa.'
              : 'Uko mtandaoni.'}
          </p>
        </Panel>
      </div>

      <div className="psh-cs__grid2">
        <Panel title="Media za hivi karibuni">
          {recentMedia.length === 0 ? (
            <Empty title="Hakuna media bado" text="Picha au video za machapisho yako zitaonekana hapa." />
          ) : (
            <ul className="psh-cs__thumbs">
              {recentMedia.map((p) => (
                <li key={p.id} className="psh-cs__thumb">{KIND_LABEL[mediaOf(p).kind] ?? 'Media'}</li>
              ))}
            </ul>
          )}
        </Panel>

        <PlannedSection
          title="Hadhira"
          status="planned"
          summary="Takwimu za wafuasi na hadhira zitaonekana hapa baada ya uchambuzi wa hadhira kuunganishwa."
        />
      </div>

      <PlannedSection
        title="Kupanga machapisho"
        status="planned"
        summary="Kupanga kuchapisha baadaye kunahitaji backend ya kupanga. Haijaunganishwa."
        alternatives={[{ label: 'Chapisha sasa', onClick: () => actions.onOpenPostStudio({ type: 'text' }) }]}
      />

      <div className="psh-cs__grid2">
        <Panel title="Hifadhi na mpango">
          <p className="psh-cs__body">Mpango wako: <strong>{PLANS[getCurrentPlan()].label}</strong></p>
          <p className="psh-cs__muted">Hesabu ya hifadhi ya media haipimwi bado. Malipo hayajaunganishwa.</p>
        </Panel>
        <Panel title="Premium (inakuja)">
          <ul className="psh-cs__list2">
            {premium.map(([id, f]) => (
              <li key={id}><span>{f.label}</span><StatusChip status={f.status} /></li>
            ))}
          </ul>
          <p className="psh-cs__muted">{STATUS.not_connected.label}: malipo na upgrade bado havijaunganishwa.</p>
        </Panel>
      </div>

      <Panel title="Vidokezo">
        <ul className="psh-cs__list">
          {TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </Panel>
    </div>
  )
}

