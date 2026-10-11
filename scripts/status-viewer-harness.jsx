// QA-only mount seam for StatusViewerPanel; this file is not imported by the app.
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { StatusViewerPanel } from '../src/components/feed/FeedPanels.jsx'

let viewerRoot = null
let mountNode = null

export function mountStatusViewerFixture(group) {
  mountNode = document.createElement('div')
  mountNode.id = 'qa-status-viewer-root'
  mountNode.style.cssText = 'position:fixed;inset:0;z-index:100000;overflow:auto;background:var(--bg);padding:14px;'
  document.body.append(mountNode)
  viewerRoot = createRoot(mountNode)
  viewerRoot.render(createElement(StatusViewerPanel, { group }))
  return true
}

export function unmountStatusViewerFixture() {
  viewerRoot?.unmount()
  mountNode?.remove()
  viewerRoot = null
  mountNode = null
}
