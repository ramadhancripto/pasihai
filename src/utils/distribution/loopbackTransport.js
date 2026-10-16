/**
 * LOOPBACK tu — vifaa viwili kwenye process moja.
 * SI BLE, SI Wi-Fi Direct. Haitangaze peers za uwongo.
 */
export function createLoopbackHub() {
  const engines = new Map()
  return {
    kind: 'loopback',
    register(id, engine) {
      engines.set(id, engine)
    },
    unregister(id) {
      engines.delete(id)
    },
    listPeers(exceptId) {
      return [...engines.keys()].filter((id) => id !== exceptId).map((id) => ({ id, transport: 'loopback' }))
    },
    getEngine(id) {
      return engines.get(id) || null
    },
  }
}

export function createLoopbackTransport(hub, localId) {
  return {
    kind: 'loopback',
    async listPeers() {
      return hub.listPeers(localId)
    },
    async pull(peerId, contentId, engine, ctx) {
      const remote = hub.getEngine(peerId)
      if (!remote) throw new Error('Peer haipo kwenye loopback hub')
      return engine.pullFrom(remote, contentId, { ...ctx, peerId })
    },
  }
}
