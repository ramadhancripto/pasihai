// ══════════════════════════════════════════════════════════════
// PASIHAI — CHANNEL PAGE (tawi la KUCHAPISHA)
//
// Tofauti na Hub/Jumuiya: Channel ni creator → content → hadhira.
// Kwa hivyo muundo ni tofauti (§30/§31):
//   Header → Tabs → [Vilivyoteuliwa · Mapya · Media · Kuhusu]
//   + sehemu ya msimamizi (creator view) kwa channel zangu.
//
// Uwasilishaji wa content ni kwa AINA (video · makala · kura ·
// tangazo · sauti) — hutoka kwenye bodies.jsx ileile ya feed.
// Muonekano wa Channel: nembo · jalada · maelezo · kategoria ·
// kipengele PEKEE — hakuna fonts/themes/wallpaper (§35).
// ══════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react'

import FeedList from '../feed/FeedList.jsx'
import useAsyncData from '../../hooks/useAsyncData.js'
import { spacesService } from '../../services/spacesService.js'
import {
  MembersBlock,
  MiniRow,
  ResourceRow,
  SpaceEmpty,
  SpaceHeader,
  SpaceTabs,
  StatGrid,
} from './SpacesBits.jsx'
import { IconEye, IconInfo, IconPlus, IconVideo } from '../icons.jsx'

export default function ChannelPage({
  id,
  onBack,
  onToast,
  onOpenPanel,
  onOpenProfile,
  onOpenChat,
  onRefreshFeed,
  feedVersion = 0,
}) {
  const [tab, setTab] = useState('vilivyoteuliwa')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const channel = useAsyncData(() => spacesService.getChannel(id), [id, version])
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

  const follow = () =>
    act(async () => {
      const res = await spacesService.join('channel', id)
      onToast?.(res?.note || 'Umefuata channel')
      reload()
    })

  const unfollow = () =>
    act(async () => {
      const res = await spacesService.leave('channel', id)
      onToast?.(res?.note || 'Umekoma kufuata')
      reload()
    })

  const saveResource = (r) =>
    act(async () => {
      await spacesService.saveResource(r.id)
      onToast?.(`${r.label} — imehifadhiwa kwa matumizi bila mtandao`)
      reload()
    })

  if (!channel) {
    return (
      <div className="psh-sp">
        <p className="psh-sp__loading" aria-busy="true">
          Inapakia channel…
        </p>
      </div>
    )
  }

  const compose = () =>
    onOpenPanel?.({ type: 'compose', payload: { kind: 'text', spaceId: id, spaceName: channel.name } })

  const feedProps = {
    spaceId: id,
    spaceLabel: channel.name,
    onOpenProfile,
    onToast,
    onOpenPanel,
    onRefreshFeed: () => {
      reload()
      onRefreshFeed?.()
    },
    onOpenChat,
    feedVersion: feedVersion + version,
  }

  return (
    <div className="psh-sp psh-sp--channel" data-space={id} data-type="channel">
      <SpaceHeader s={channel} onBack={onBack} onJoin={follow} onLeave={unfollow} busy={busy} />

      <SpaceTabs tabs={channel.tabs} active={tab} onChange={setTab} label={`Sehemu za ${channel.name}`} />

      {/* ── Vilivyoteuliwa ────────────────────────────────── */}
      {tab === 'vilivyoteuliwa' ? (
        <div className="psh-sp__pane">
          <div className="psh-sp__bar">
            <p className="psh-sp__barlabel">Vilivyoteuliwa na msimamizi</p>
            <button type="button" className="psh-btn psh-btn--sm psh-btn--ghost" onClick={compose}>
              <IconPlus size={15} />
              Chapisha
            </button>
          </div>
          {channel.sections.featured.length ? (
            <FeedList {...feedProps} filter="all" />
          ) : (
            <SpaceEmpty
              title="Hakuna kilichoteuliwa bado"
              text="Kipengele ni chapisho moja linalowekwa juu kwa hadhira ya channel hii."
              onAction={channel.canManage ? compose : undefined}
              actionLabel="Chapisha"
            />
          )}
        </div>
      ) : null}

      {/* ── Mapya ─────────────────────────────────────────── */}
      {tab === 'mapya' ? (
        <div className="psh-sp__pane">
          <div className="psh-sp__bar">
            <p className="psh-sp__barlabel">
              Machapisho {channel.stats?.posts ?? 0} · hadhira {channel.membersLabel}
            </p>
          </div>
          <FeedList {...feedProps} filter="all" />
        </div>
      ) : null}

      {/* ── Media (uwasilishaji kwa aina) ─────────────────── */}
      {tab === 'media' ? (
        <div className="psh-sp__pane">
          <div className="psh-sp__bar">
            <p className="psh-sp__barlabel">Media {channel.sections.media.length}</p>
          </div>
          {channel.sections.media.length ? (
            <FeedList {...feedProps} filter="all" />
          ) : (
            <SpaceEmpty
              title="Hakuna media bado"
              text="Video, picha na sauti za channel hii zitaonekana hapa — kwa muundo wa aina yao."
            />
          )}
          <p className="psh-sp__note">
            <IconVideo size={14} /> Video huonekana kwanza (media-first), makala huanza na maandishi, kura
            huanza na swali.
          </p>
        </div>
      ) : null}

      {/* ── Kuhusu (+ msimamizi) ──────────────────────────── */}
      {tab === 'kuhusu' ? (
        <div className="psh-sp__pane">
          <section className="psh-sp__card" aria-label="Kuhusu channel">
            <h2 className="psh-sp__h">Kuhusu</h2>
            <p className="psh-sp__text">{channel.sections.about.purpose}</p>
            <dl className="psh-sp__dl">
              <div>
                <dt>Kategoria</dt>
                <dd>{channel.sections.about.category || '—'}</dd>
              </div>
              <div>
                <dt>Kuanzishwa</dt>
                <dd>{channel.sections.about.founded}</dd>
              </div>
              <div>
                <dt>Ufikivu</dt>
                <dd>{channel.sections.about.visibilityLabel}</dd>
              </div>
              <div>
                <dt>Uhusiano wangu</dt>
                <dd>{channel.membership.relation}</dd>
              </div>
            </dl>
          </section>

          {channel.canManage ? (
            <section className="psh-sp__card psh-sp__card--owner" aria-label="Msimamizi">
              <h2 className="psh-sp__h">Msimamizi</h2>
              <p className="psh-sp__text">
                Sehemu za usimamizi: Yaliyomo · Hadhira · Maoni · Muonekano · Timu · Faragha · Takwimu.
              </p>
              <ul className="psh-sp__manage">
                <li>
                  <button type="button" className="psh-sp__manageRow" onClick={compose}>
                    Yaliyomo — chapisha au teua kipengele
                  </button>
                </li>
                <li>
                  <button type="button" className="psh-sp__manageRow" onClick={() => setTab('mapya')}>
                    Hadhira — machapisho na mwingiliano
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="psh-sp__manageRow"
                    onClick={() => onToast?.('Maoni yanadhibitiwa kwenye kila chapisho — hakuna mfumo wa pili')}
                  >
                    Maoni — dhibiti kwenye chapisho husika
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="psh-sp__manageRow"
                    onClick={() =>
                      onToast?.(
                        channel.appearance.allowed.join(' · ') + ' — hakuna fonts/themes/wallpaper',
                      )
                    }
                  >
                    Muonekano — {channel.appearance.allowed.length} vipengele vinavyoruhusiwa
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="psh-sp__manageRow"
                    onClick={() =>
                      onToast?.(
                        channel.team.length
                          ? `Timu: ${channel.team.map((t) => `${t.name} (${t.role})`).join(' · ')}`
                          : 'Timu: wewe pekee — unaweza kuongeza Editor au Moderator',
                      )
                    }
                  >
                    Timu — roles 4 (Owner · Admin · Editor · Moderator)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="psh-sp__manageRow"
                    onClick={() => onToast?.(`Ufikivu: ${channel.visibilityLabel} — unaweza kubadilisha`)}
                  >
                    Faragha — {channel.visibilityLabel}
                  </button>
                </li>
                <li>
                  <button type="button" className="psh-sp__manageRow" onClick={() => setTab('kuhusu')}>
                    Takwimu — zinazoonekana hapa chini
                  </button>
                </li>
              </ul>
              <p className="psh-sp__note">
                <IconInfo size={14} /> {channel.appearance.note}
              </p>
            </section>
          ) : null}

          <StatGrid stats={channel.stats} type="channel" />

          <MembersBlock
            team={channel.team}
            members={[]}
            onOpenProfile={onOpenProfile}
            title={`Timu ya ${channel.name}`}
          />

          {channel.sections.about.resources?.length ? (
            <>
              <h3 className="psh-sp__h">Rasilimali</h3>
              {channel.sections.about.resources.map((r) => (
                <ResourceRow key={r.id} r={r} onSave={saveResource} busy={busy} />
              ))}
            </>
          ) : null}

          {channel.sections.about.events?.length ? (
            <MiniRow
              icon="event"
              title={channel.sections.about.events[0].media?.caption || 'Tukio'}
              text={channel.sections.about.events[0].text}
              actionLabel="Mapya"
              onAction={() => setTab('mapya')}
            />
          ) : null}

          <p className="psh-sp__note">
            <IconEye size={14} /> Takwimu hizi ni za kikao hiki cha prototype: machapisho, reactions, maoni
            na kushiriki — si makadirio ya mapato.
          </p>
        </div>
      ) : null}
    </div>
  )
}
