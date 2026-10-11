// Creator Studio — My Content (machapisho + rasimu) na Media Library
import { useMemo, useState } from 'react'
import useStudioData from '../../../studio/useStudioData.js'
import { draftTypeLabel, KIND_LABEL, loadStudioBase, mediaOf, postStats } from '../../../studio/studioData.js'
import { plainText } from '../../../utils/postContent.js'
import { getDraft, removeDraft, saveDraft } from '../../../utils/studioDrafts.js'
import { Empty, ErrorBox, LoadingBox, Panel, StatusChip } from './StudioShared.jsx'

const TABS = [
  { id: 'all', label: 'Zote' },
  { id: 'drafts', label: 'Rasimu' },
  { id: 'published', label: 'Zilizochapishwa' },
  { id: 'scheduled', label: 'Zilizopangwa' },
  { id: 'failed', label: 'Zilizoshindwa' },
  { id: 'archived', label: 'Zilizohifadhiwa' },
]

/** Tabs ambazo data yake bado haipo: zinaonyesha hali halisi, si orodha bandia. */
const TAB_NOTE = {
  scheduled: { status: 'planned', text: 'Kupanga machapisho kunahitaji backend ya kupanga. Haijaunganishwa, kwa hiyo hakuna machapisho yaliyopangwa.' },
  failed: { status: 'partial', text: 'Orodha ya machapisho yaliyoshindwa haijaunganishwa bado kwenye Studio hii. Hakuna orodha ya kushindwa inayoonyeshwa hapa.' },
  archived: { status: 'planned', text: 'Kuhifadhi machapisho kwenye kumbukumbu bado hakujaunganishwa.' },
}

function rowsFrom(data) {
  const drafts = data.drafts.map((d) => ({
    key: `draft:${d.id}`,
    id: d.id,
    type: 'draft',
    kindLabel: draftTypeLabel(d.content?.type),
    title: plainText(d.content?.body) || d.content?.heading || '(rasimu tupu)',
    when: d.updatedAt,
    statusLabel: 'Rasimu ya kifaa',
    record: d,
  }))
  const posts = data.posts.map((p) => ({
    key: `post:${p.id}`,
    id: p.id,
    type: 'post',
    kindLabel: KIND_LABEL[p.kind] ?? p.kind,
    title: plainText(p.text) || '(bila maandishi)',
    when: p.createdAt ?? null,
    stats: postStats(p),
    statusLabel: 'Imechapishwa',
  }))
  return { drafts, posts }
}

export default function StudioContent({ onOpenPostStudio }) {
  const base = useStudioData(loadStudioBase, [])
  if (base.status === 'loading') return <LoadingBox label="Inapakia machapisho yako…" />
  if (base.status === 'error') return <ErrorBox error={base.error} onRetry={base.retry} />
  return <ContentBody data={base.data} onOpenPostStudio={onOpenPostStudio} onChanged={base.retry} refreshing={base.refreshing} />
}

function ContentBody({ data, onOpenPostStudio, onChanged, refreshing }) {
  const userId = data.me?.id
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('new')
  const [selected, setSelected] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState(null)

  const { drafts, posts } = useMemo(() => rowsFrom(data), [data])

  let rows = []
  if (tab === 'all') rows = [...drafts, ...posts]
  else if (tab === 'drafts') rows = drafts
  else if (tab === 'published') rows = posts
  rows = rows.filter((r) => r.title.toLowerCase().includes(query.trim().toLowerCase()))
  rows = [...rows].sort((a, b) => {
    const ta = a.when ? Date.parse(a.when) : 0
    const tb = b.when ? Date.parse(b.when) : 0
    return sort === 'new' ? tb - ta : ta - tb
  })

  function toggle(row) {
    if (row.type !== 'draft') return
    setConfirming(false)
    setSelected((s) => (s.includes(row.id) ? s.filter((x) => x !== row.id) : [...s, row.id]))
  }

  function deleteSelected() {
    if (!userId) return
    let removed = 0
    try {
      for (const id of selected) if (removeDraft(userId, id)) removed += 1
      setMessage(`Rasimu ${removed} zimefutwa kutoka kwenye kifaa hiki.`)
    } catch (err) {
      setMessage(`Imeshindikana kufuta: ${err.message}`)
    }
    setSelected([])
    setConfirming(false)
    onChanged()
  }

  function duplicate(row) {
    if (!userId) return
    try {
      const original = getDraft(userId, row.id)
      if (!original) throw new Error('rasimu haipo tena')
      saveDraft(userId, { content: original.content })
      setMessage('Nakala ya rasimu imeundwa.')
      onChanged()
    } catch (err) {
      setMessage(`Imeshindikana kunakili: ${err.message}`)
    }
  }

  const note = TAB_NOTE[tab]
  const hasDraftSelection = selected.length > 0

  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">My Content</h1>
          <p className="psh-cs__muted">Machapisho yako halisi na rasimu za kifaa hiki.{refreshing ? ' Inasasishwa…' : ''}</p>
        </div>
      </header>

      <div className="psh-cs__tabs" role="tablist" aria-label="Aina ya maudhui">
        {TABS.map((t) => {
          const count = t.id === 'all' ? drafts.length + posts.length : t.id === 'drafts' ? drafts.length : t.id === 'published' ? posts.length : null
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`psh-cs__tab${tab === t.id ? ' is-on' : ''}`}
              onClick={() => { setTab(t.id); setConfirming(false) }}
            >
              {t.label}{count !== null ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {note ? (
        <Panel title={TABS.find((t) => t.id === tab).label} action={<StatusChip status={note.status} />}>
          <p className="psh-cs__body">{note.text}</p>
        </Panel>
      ) : (
        <>
          <div className="psh-cs__toolbar">
            <label className="psh-cs__search">
              <span className="u-sr">Tafuta maudhui</span>
              <input className="psh-cs__input" type="search" placeholder="Tafuta kwa maandishi" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label>
              <span className="u-sr">Panga</span>
              <select className="psh-cs__input" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="new">Mpya kwanza</option>
                <option value="old">Za zamani kwanza</option>
              </select>
            </label>
            {hasDraftSelection ? (
              confirming ? (
                <span className="psh-cs__row">
                  <button type="button" className="psh-btn psh-btn--danger psh-btn--sm" onClick={deleteSelected}>
                    Thibitisha kufuta ({selected.length})
                  </button>
                  <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => setConfirming(false)}>Ghairi</button>
                </span>
              ) : (
                <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => setConfirming(true)}>
                  Futa zilizochaguliwa ({selected.length})
                </button>
              )
            ) : null}
          </div>

          {message ? <p className="psh-cs__muted" role="status">{message}</p> : null}

          {rows.length === 0 ? (
            <Empty
              title={query ? 'Hakuna matokeo' : tab === 'drafts' ? 'Hakuna rasimu' : 'Bado hakuna maudhui'}
              text={query ? 'Jaribu neno lingine.' : 'Unda chapisho lako la kwanza kutoka Create.'}
            />
          ) : (
            <ul className="psh-cs__rows" aria-label="Orodha ya maudhui">
              {rows.map((row) => (
                <li key={row.key} className="psh-cs__row2">
                  {row.type === 'draft' ? (
                    <input
                      type="checkbox"
                      aria-label={`Chagua rasimu: ${row.title}`}
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row)}
                    />
                  ) : (
                    <span className="psh-cs__checkSpacer" aria-hidden="true" />
                  )}
                  <div className="psh-cs__rowMain">
                    <strong className="psh-cs__clip">{row.title}</strong>
                    <span className="psh-cs__muted">
                      {row.kindLabel} · {row.statusLabel}
                      {row.stats ? ` · ${row.stats.reactions} reactions · ${row.stats.comments} maoni · ${row.stats.shares} shares` : ''}
                    </span>
                  </div>
                  <div className="psh-cs__row">
                    {row.type === 'draft' ? (
                      <>
                        <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => onOpenPostStudio({ draft: row.record })}>Fungua</button>
                        <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => duplicate(row)}>Nakili</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => onOpenPostStudio({ text: row.title })}>Nakili kwenye Studio</button>
                        <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" disabled title="Uhariri wa machapisho yaliyochapishwa bado haujaunganishwa">Hariri</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export function StudioMedia({ onOpenPostStudio }) {
  const base = useStudioData(loadStudioBase, [])
  if (base.status === 'loading') return <LoadingBox label="Inapakia media yako…" />
  if (base.status === 'error') return <ErrorBox error={base.error} onRetry={base.retry} />

  const items = base.data.posts.map((p) => ({ post: p, media: mediaOf(p) })).filter((x) => x.media)
  return <MediaBody items={items} onOpenPostStudio={onOpenPostStudio} />
}

function MediaBody({ items, onOpenPostStudio }) {
  const [filter, setFilter] = useState('all')
  const shown = items.filter((x) => filter === 'all' || x.media.kind === filter)

  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Media Library</h1>
          <p className="psh-cs__muted">Picha na video za machapisho yako. Zinaonyeshwa kutoka kwenye machapisho halisi.</p>
        </div>
        <div className="psh-cs__row">
          <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" disabled title="Upload ya moja kwa moja kwenye maktaba bado haijaunganishwa">Pakia media</button>
          <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" disabled title="Folda bado hazijaunganishwa">Folda mpya</button>
          <StatusChip status="planned" />
        </div>
      </header>

      <div className="psh-cs__tabs" role="tablist" aria-label="Aina ya media">
        {[['all', 'Zote'], ['image', 'Picha'], ['video', 'Video']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={`psh-cs__tab${filter === id ? ' is-on' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Empty
          title="Hakuna media bado"
          text="Machapisho yenye picha au video yataonekana hapa."
          action={<button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => onOpenPostStudio({ type: 'poster' })}>Unda poster</button>}
        />
      ) : (
        <ul className="psh-cs__mediaGrid">
          {shown.map(({ post, media }) => (
            <li key={post.id} className="psh-cs__mediaCard">
              {media.kind === 'image' && media.url ? (
                <img src={media.url} alt="" loading="lazy" className="psh-cs__mediaImg" />
              ) : (
                <div className="psh-cs__mediaImg psh-cs__mediaImg--ph" aria-hidden="true">{KIND_LABEL[media.kind]}</div>
              )}
              <span className="psh-cs__clip">{plainText(post.text) || '(bila maandishi)'}</span>
              <span className="psh-cs__muted">{KIND_LABEL[media.kind]}{media.meta?.size ? ` · ${media.meta.size}` : ''}</span>
              <button
                type="button"
                className="psh-btn psh-btn--quiet psh-btn--sm"
                onClick={() => onOpenPostStudio({ type: media.kind === 'video' ? 'video' : 'poster' })}
              >
                Tumia kwenye chapisho jipya
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="psh-cs__muted">Matumizi ya hifadhi: haipimwi bado. Kutumia media tena kunahitaji upload mpya.</p>
    </div>
  )
}
