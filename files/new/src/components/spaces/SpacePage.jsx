// ══════════════════════════════════════════════════════════════
// PASIHAI — SPACE PAGE (Hub · Jumuiya — familia MOJA)
//
// Muundo (§6/§16): Header → Tabs → [Muhtasari · Shughuli · Watu ·
//   Matukio · Rasilimali · Kuhusu]
//
// Hii ni SEHEMU ya ukurasa wa Spaces (si route mpya — nav inabaki 5).
// Kila tab inatumia mifumo iliyopo:
//   · Shughuli  → FeedList (mkondo ule ule, spaceId pekee)
//   · Watu      → identity (roles: Owner · Admin · Editor · Moderator)
//   · Matukio   → content ya kind 'event'
//   · Rasilimali→ Save Offline ileile
//   · Vikundi   → Chat iliyopo (conversation, si engine ya pili)
// ══════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react'

import FeedList from '../feed/FeedList.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { spacesService } from '../../services/spacesService.js'
import { gunduaService } from '../../services/gunduaService.js'
import {
  EventRow,
  GroupLinkRow,
  MembersBlock,
  MiniRow,
  ResourceRow,
  SpaceEmpty,
  SpaceHeader,
  SpaceTabs,
  StatGrid,
} from './SpacesBits.jsx'
import { IconPlus, IconShield } from '../icons.jsx'

export default function SpacePage({
  type,
  id,
  onBack,
  onToast,
  onOpenPanel,
  onOpenProfile,
  onOpenChat,
  onRefreshFeed,
  feedVersion = 0,
}) {
  const [tab, setTab] = useState('muhtasari')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const space = useAsyncData(() => spacesService.getSpace(type, id), [type, id, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  const act = async (fn) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  /* ── Vitendo halisi (hali ya kikao) ──────────────────────── */
  const join = () =>
    act(async () => {
      const res = await spacesService.join(type, id)
      onToast?.(res?.note || 'Umejiunga')
      reload()
    })

  const leave = () =>
    act(async () => {
      const res = await spacesService.leave(type, id)
      onToast?.(res?.note || 'Umetoka')
      reload()
    })

  const attend = (e) =>
    act(async () => {
      const res = await spacesService.attendEvent(e.id, !e.attending)
      onToast?.(res.note)
      reload()
    })

  const saveResource = (r) =>
    act(async () => {
      await spacesService.saveResource(r.id)
      onToast?.(`${r.label} — imehifadhiwa kwa matumizi bila mtandao`)
      reload()
    })

  /* Kikundi → Chat iliyopo: kujiunga kinaunda conversation ileile (§43) */
  const openGroup = (g) =>
    act(async () => {
      if (g.joined) {
        onToast?.(`Kikundi “${g.name}” kipo kwenye Chat`)
        return onOpenChat?.()
      }
      /* Kikundi = conversation ya Chat iliyopo (hakuna engine ya pili) */
      const res = await gunduaService.join('group', g.id)
      onToast?.(res?.chatNote || res?.note || `Kikundi “${g.name}” kimeongezwa kwenye Chat`)
      reload()
      onOpenChat?.()
    })

  if (!space) {
    return (
      <div className="psh-sp">
        <p className="psh-sp__loading" aria-busy="true">
          Inapakia nafasi…
        </p>
      </div>
    )
  }

  const compose = () =>
    onOpenPanel?.({ type: 'compose', payload: { kind: 'text', spaceId: id, spaceName: space.name } })

  return (
    <div className="psh-sp" data-space={id} data-type={type}>
      <SpaceHeader s={space} onBack={onBack} onJoin={join} onLeave={leave} busy={busy} />

      <SpaceTabs tabs={space.tabs} active={tab} onChange={setTab} label={`Sehemu za ${space.name}`} />

      {/* ── Muhtasari ─────────────────────────────────────── */}
      {tab === 'muhtasari' ? (
        <div className="psh-sp__pane">
          <section className="psh-sp__card" aria-label="Kusudi la nafasi">
            <h2 className="psh-sp__h">Kusudi</h2>
            <p className="psh-sp__text">{space.purpose}</p>
            {space.rules?.length ? (
              <ul className="psh-sp__rules">
                {space.overview.rulesPreview.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <StatGrid stats={space.stats} />

          {space.overview.nextEvent ? (
            <MiniRow
              icon="event"
              title={space.overview.nextEvent.media?.caption || 'Tukio lijalo'}
              text={space.overview.nextEvent.text}
              actionLabel="Matukio"
              onAction={() => setTab('matukio')}
            />
          ) : null}

          {space.overview.featuredResource ? (
            <MiniRow
              icon="file"
              title={space.overview.featuredResource.label}
              text={space.overview.featuredResource.meta}
              actionLabel="Rasilimali"
              onAction={() => setTab('rasilimali')}
            />
          ) : null}

          {space.relatedGroups?.length ? (
            <section className="psh-sp__card" aria-label="Vikundi vinavyohusiana">
              <h2 className="psh-sp__h">Vikundi vinavyohusiana</h2>
              <p className="psh-sp__hint">
                Vikundi ni vya Chat — hukutana kwenye mazungumzo, si hapa. Hii ni kiungo pekee.
              </p>
              {space.relatedGroups.map((g) => (
                <GroupLinkRow key={g.id} g={g} onOpen={openGroup} busy={busy} />
              ))}
            </section>
          ) : null}

          {space.relatedChannels?.length ? (
            <p className="psh-sp__note">
              Channels zinazohusiana: {space.relatedChannels.join(' · ')} — zinaonekana kwenye tab ya
              Channels.
            </p>
          ) : null}

          <section className="psh-sp__card" aria-label="Shughuli za hivi karibuni">
            <h2 className="psh-sp__h">Shughuli za hivi karibuni</h2>
            <p className="psh-sp__text">
              Machapisho {space.activityCount} · Matukio {space.eventCount} · Rasilimali{' '}
              {space.resources.length}
            </p>
            <button type="button" className="psh-btn psh-btn--sm psh-btn--ghost" onClick={() => setTab('shughuli')}>
              Fungua Shughuli
            </button>
          </section>
        </div>
      ) : null}

      {/* ── Shughuli: mkondo ule ule (spaceId pekee) ───────── */}
      {tab === 'shughuli' ? (
        <div className="psh-sp__pane">
          {space.membership.joined || space.visibility === 'public' ? (
            <>
              <div className="psh-sp__bar">
                <p className="psh-sp__barlabel">
                  Shughuli za {space.name} — machapisho {space.activityCount}
                </p>
                <button type="button" className="psh-btn psh-btn--sm psh-btn--primary" onClick={compose}>
                  <IconPlus size={15} />
                  Chapisha hapa
                </button>
              </div>
              <FeedList
                spaceId={id}
                spaceLabel={space.name}
                filter="all"
                onOpenProfile={onOpenProfile}
                onToast={onToast}
                onOpenPanel={onOpenPanel}
                onRefreshFeed={() => {
                  reload()
                  onRefreshFeed?.()
                }}
                onOpenChat={onOpenChat}
                feedVersion={feedVersion + version}
              />
            </>
          ) : (
            <SpaceEmpty
              title="Shughuli zinaonekana kwa wanachama"
              text={
                space.visibility === 'listed'
                  ? 'Nafasi hii ni ya kibinafsi — ombi lako likikubaliwa, shughuli zitafunguka.'
                  : 'Jiunge na nafasi hii ili kuona na kuchapisha.'
              }
              onAction={space.membership.requested ? undefined : join}
              actionLabel={space.joinLabel}
            />
          )}
        </div>
      ) : null}

      {/* ── Watu ──────────────────────────────────────────── */}
      {tab === 'watu' ? (
        <div className="psh-sp__pane">
          <div className="psh-sp__bar">
            <p className="psh-sp__barlabel">
              Watu {space.peopleCount} — timu {space.team.length}
            </p>
          </div>
          <MembersBlock
            team={space.team}
            members={space.members}
            lead={space.lead}
            onOpenProfile={onOpenProfile}
            title={`Watu wa ${space.name}`}
          />
          <p className="psh-sp__note">
            <IconShield size={14} /> Roles ni kazi ndani ya nafasi (Owner · Admin · Editor · Moderator) —
            si uhusiano wangu na mtu.
          </p>
        </div>
      ) : null}

      {/* ── Matukio (content ya kind 'event') ─────────────── */}
      {tab === 'matukio' ? (
        <div className="psh-sp__pane">
          <div className="psh-sp__bar">
            <p className="psh-sp__barlabel">Matukio {space.eventCount}</p>
          </div>
          {space.events.length ? (
            space.events.map((e) => (
              <EventRow
                key={e.id}
                e={e}
                busy={busy}
                onAttend={attend}
                onOpen={(it) => onOpenPanel?.({ type: 'comments', payload: it })}
              />
            ))
          ) : (
            <SpaceEmpty title="Hakuna tukio bado" text="Matukio yanachapishwa kama content ya nafasi hii." />
          )}
        </div>
      ) : null}

      {/* ── Rasilimali (Save Offline ileile) ──────────────── */}
      {tab === 'rasilimali' ? (
        <div className="psh-sp__pane">
          <div className="psh-sp__bar">
            <p className="psh-sp__barlabel">Rasilimali {space.resources.length}</p>
            <button
              type="button"
              className="psh-btn psh-btn--sm psh-btn--ghost"
              onClick={() => onOpenPanel?.({ type: 'saveoffline' })}
            >
              Save Offline
            </button>
          </div>
          {space.resources.length ? (
            space.resources.map((r) => <ResourceRow key={r.id} r={r} onSave={saveResource} busy={busy} />)
          ) : (
            <SpaceEmpty
              title="Hakuna rasilimali bado"
              text="Rasilimali ni hati, video au sauti ambazo zinaweza kuhifadhiwa bila mtandao."
            />
          )}
          <p className="psh-sp__note">
            Kuhifadhi huhifadhi kwenye kifaa chako — hakuongezi Data Saved hadi utumie bila internet.
          </p>
        </div>
      ) : null}

      {/* ── Kuhusu ────────────────────────────────────────── */}
      {tab === 'kuhusu' ? (
        <div className="psh-sp__pane">
          <section className="psh-sp__card" aria-label="Kuhusu nafasi">
            <h2 className="psh-sp__h">Kuhusu</h2>
            <dl className="psh-sp__dl">
              <div>
                <dt>Aina</dt>
                <dd>{space.family === 'channel' ? 'Channel' : space.type === 'community' ? 'Jumuiya' : 'Hub'}</dd>
              </div>
              <div>
                <dt>Kuanzishwa</dt>
                <dd>{space.founded}</dd>
              </div>
              <div>
                <dt>Kategoria</dt>
                <dd>{space.category || '—'}</dd>
              </div>
              <div>
                <dt>Eneo</dt>
                <dd>{space.place?.mji ? `${space.place.mji}, ${space.place.nchi}` : 'Mtandaoni'}</dd>
              </div>
              <div>
                <dt>Ufikivu</dt>
                <dd>{space.visibilityLabel}</dd>
              </div>
              <div>
                <dt>Uhusiano wangu</dt>
                <dd>{space.membership.relation}</dd>
              </div>
            </dl>
            <p className="psh-sp__note">
              Eneo linatumika kwa umuhimu pekee — si ruhusa. Ufikivu ni hali: Wazi · Binafsi-Iliyoorodheshwa
              · Binafsi-Fichwa.
            </p>
          </section>

          <section className="psh-sp__card" aria-label="Kanuni">
            <h2 className="psh-sp__h">Kanuni</h2>
            <ul className="psh-sp__rules">
              {(space.rules || []).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>

          <MembersBlock
            team={space.team}
            members={space.members.slice(0, 4)}
            lead={space.lead}
            onOpenProfile={onOpenProfile}
            title="Wasimamizi"
          />
        </div>
      ) : null}
    </div>
  )
}
