// ══════════════════════════════════════════════════════════════
// PASIHAI — HOME
// Hierarchy (Phase 2A):
//   Header → Status/Stories → Tabs → Create → Mstari wa hali → MKONDO (feed)
//
// Feed inatoka kwa feedService (si mock.js moja kwa moja) — seam ya Phase 1
// inaendelea kufuatwa.
// ══════════════════════════════════════════════════════════════

import StatusRow from '../components/home/StatusRow.jsx'
import HomeTabs from '../components/home/HomeTabs.jsx'
import CreateArea from '../components/home/CreateArea.jsx'
import FeedList from '../components/feed/FeedList.jsx'
import { Chip } from '../components/ui.jsx'
import { homeService } from '../services/homeService.js'
import { settingsService } from '../services/settingsService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import { IconEye } from '../components/icons.jsx'

export default function Home({
  homeTab,
  setHomeTab,
  filter,
  setFilter,
  viewMode,
  onCreate,
  onOpenStatus,
  onOpenAllStatus,
  onOpenProfile,
  onToast,
  onOpenPanel,
  onRefreshFeed,
  onOpenChat,
  feedVersion = 0,
  onOpenViewMode,
  onOpenMore,
}) {
  // Data za skrini (tabs/filters/view modes) zinatoka kwa services.
  const nav = useAsyncData(() => homeService.getNavigation(), [])
  const modes = useAsyncData(() => settingsService.getViewModes(), [])

  const activeTab = nav?.tabs.find((t) => t.id === homeTab) || nav?.tabs[0]
  const activeFilter = nav?.filters.find((f) => f.id === filter) || nav?.filters[0]
  const activeMode = modes?.find((m) => m.id === viewMode) || modes?.[0]
  const stripReady = Boolean(activeTab && activeFilter && activeMode)

  return (
    <div className="psh-col">
      <StatusRow
        onOpenStatus={onOpenStatus}
        onOpenAll={onOpenAllStatus}
        version={feedVersion}
      />

      <HomeTabs
        active={homeTab}
        onChange={setHomeTab}
        filter={filter}
        onFilter={setFilter}
        onOpenViewMode={onOpenViewMode}
        modeLabel={activeMode?.label}
      />

      <CreateArea onCreate={onCreate} prompt={activeTab?.prompt} />

      {/* Mstari wa hali: inaonyesha tab · muonekano · kichujio vilivyochaguliwa.
          Hii inafanya View Mode na Filter kuonekana BILA kujaza skrini. */}
      {stripReady ? (
        <div className="psh-strip">
          <span className="psh-strip__label">Unatazama</span>
          <Chip tone="soft">{activeTab.label}</Chip>
          <Chip tone="soft">{activeFilter.label}</Chip>
          <button type="button" className="psh-strip__mode" onClick={onOpenViewMode}>
            <IconEye size={16} />
            {activeMode.label}
          </button>
        </div>
      ) : null}

      <FeedList
        tab={homeTab}
        filter={filter}
        filterLabel={activeFilter?.label}
        tabMeaning={activeTab?.meaning}
        onOpenProfile={onOpenProfile}
        onToast={onToast}
        onOpenPanel={onOpenPanel}
        onRefreshFeed={onRefreshFeed}
        onOpenChat={onOpenChat}
        feedVersion={feedVersion}
      />
    </div>
  )
}
