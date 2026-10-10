// ══════════════════════════════════════════════════════════════
// PASIHAI — TRANSPORT INTERFACES
//
// Interfaces za transport layers tatu za PASIHAI:
//   1. ContentProvider / ContentSharingService - Automatic Content Sharing
//   2. LocalMessagingTransport - Local Group Messaging (bila internet)
//   3. InternetRelayTransport - Internet Relay (ujumbe mdogo tu)
//
// MUHIMU:
//   - Hizi ni INTERFACES tu (hazijatekelezwa kikamilifu)
//   - Transport halisi itatekelezwa katika Batch C na kuendelea
//   - Kila interface inaeleza contract na madhumuni yake
//
// KANUNI:
//   - Tofautisha content sharing na messaging
//   - Internet relay ni kwa ujumbe mdogo tu (si media kubwa)
//   - Local messaging inaweza kufanya kazi bila internet
//   - Heshimu privacy na access permissions
// ══════════════════════════════════════════════════════════════

/* ══════════════════════════════════════════════════════════════
   1. CONTENT PROVIDER / CONTENT SHARING SERVICE
   ══════════════════════════════════════════════════════════════
   
   Madhumuni:
   - Kusambaza content (posts, videos, n.k.) iliyohifadhiwa kwenye
     kifaa kwa vifaa vingine vinavyoshiriki
   - Content inayoshirikiwa lazima iheshimu access permissions
   - Haipaswi kutumia internet relay (ni tofauti)
   
   Mfano wa Matumizi:
   - Mtumiaji A anaona video ya umma
   - Video inahifadhiwa kwenye cache ya kifaa cha A
   - Mtumiaji B (karibu na A) anaweza kupata video hiyo kupitia
     local connection (Bluetooth, Wi-Fi Direct, n.k.)
   - B anaweza kuona video hata kama hana internet
   
   Access Control:
   - Public content: inaweza kushirikiwa kwa mtu yeyote
   - Followers-only content: inaweza kushirikiwa kwa followers tu
   - Private content: HAISHIRIKIWI (isipokuwa kwa ruhusa maalum)
   ══════════════════════════════════════════════════════════════ */

/**
 * @interface ContentProvider
 * @description Interface ya kutoa content kwa vifaa vingine
 */
export class ContentProvider {
  /**
   * Pata content inayopatikana kwa kusambazwa.
   * @param {Object} request - Ombi la content
   * @param {string} request.contentId - ID ya content inayohitajika
   * @param {string} request.requestorId - ID ya mtumiaji anayeomba
   * @param {string} [request.contentType] - Aina ya content (post, reel, n.k.)
   * @returns {Promise<ContentResponse>} - Content au error
   */
  async getContent(request) {
    throw new Error('Not implemented: ContentProvider.getContent')
  }
  
  /**
   * Tangaza content mpya inayopatikana.
   * @param {Object} announcement - Tangazo la content
   * @param {string} announcement.contentId - ID ya content
   * @param {string} announcement.contentType - Aina ya content
   * @param {Object} announcement.metadata - Metadata (size, visibility, n.k.)
   * @returns {Promise<void>}
   */
  async announceContent(announcement) {
    throw new Error('Not implemented: ContentProvider.announceContent')
  }
  
  /**
   * Pata orodha ya content inayopatikana.
   * @param {Object} [filters] - Filters za utafutaji
   * @param {string} [filters.contentType] - Chuja kwa aina
   * @param {string} [filters.visibility] - Chuja kwa visibility
   * @returns {Promise<ContentListItem[]>}
   */
  async listAvailableContent(filters = {}) {
    throw new Error('Not implemented: ContentProvider.listAvailableContent')
  }
}

/**
 * @typedef {Object} ContentResponse
 * @property {string} contentId - ID ya content
 * @property {string} contentType - Aina ya content
 * @property {*} data - Data ya content (post, media, n.k.)
 * @property {Object} metadata - Metadata (size, version, n.k.)
 * @property {Object} accessPermissions - Ruhusa za ufikivu
 */

/**
 * @typedef {Object} ContentListItem
 * @property {string} contentId - ID ya content
 * @property {string} contentType - Aina ya content
 * @property {Object} metadata - Metadata
 * @property {boolean} canAccess - Je, mtumiaji anaweza kuipata?
 */

/* ══════════════════════════════════════════════════════════════
   2. LOCAL MESSAGING TRANSPORT
   ══════════════════════════════════════════════════════════════
   
   Madhumuni:
   - Kutuma ujumbe kati ya watu wa group/community/channel moja
     kupitia local connection (bila internet)
   - Ujumbe unaweza kusubiri kwenye outbox hadi connection ipatikane
   - Haipaswi kutumia internet relay
   
   Mfano wa Matumizi:
   - Watumiaji A, B, C wako kwenye group moja "Wanafunzi wa Chuo"
   - A anatuma ujumbe "Tukutane saa 10"
   - Ujumbe unatolewa kwa B na C kupitia Bluetooth/Wi-Fi Direct
   - Hakuna internet inayohitajika
   
   Delivery Guarantees:
   - Ujumbe unahifadhiwa kwenye outbox hadi uwasilishwe
   - Acknowledgements zinathibitisha kuwa ujumbe umefika
   - Duplicates zinakataliwa (idempotency keys)
   
   Security:
   - Ujumbe wa group unaweza kuwa E2E encrypted
   - Hakuna mtu nje ya group anayeweza kusoma ujumbe
   ══════════════════════════════════════════════════════════════ */

/**
 * @interface LocalMessagingTransport
 * @description Interface ya kutuma ujumbe kupitia local connections
 */
export class LocalMessagingTransport {
  /**
   * Tuma ujumbe kwa group/community/channel.
   * @param {Object} message - Ujumbe kutuma
   * @param {string} message.groupId - ID ya group/community/channel
   * @param {string} message.senderId - ID ya mtumaji
   * @param {string} message.text - Maandishi ya ujumbe
   * @param {Object} [message.metadata] - Metadata ya ziada
   * @returns {Promise<SendResult>} - Matokeo ya kutuma
   */
  async sendMessage(message) {
    throw new Error('Not implemented: LocalMessagingTransport.sendMessage')
  }
  
  /**
   * Pokea ujumbe kutoka kwa vifaa vingine.
   * @param {string} groupId - ID ya group/community/channel
   * @param {Object} [options] - Chaguzi za ziada
   * @param {number} [options.timeout] - Muda wa kusubiri (ms)
   * @returns {Promise<ReceivedMessage[]>} - Ujumbe uliopokelewa
   */
  async receiveMessages(groupId, options = {}) {
    throw new Error('Not implemented: LocalMessagingTransport.receiveMessages')
  }
  
  /**
   * Angalia kama kifaa kingine kinapatikana.
   * @param {string} deviceId - ID ya kifaa
   * @returns {Promise<boolean>}
   */
  async isDeviceAvailable(deviceId) {
    throw new Error('Not implemented: LocalMessagingTransport.isDeviceAvailable')
  }
  
  /**
   * Pata orodha ya vifaa vilivyo karibu.
   * @returns {Promise<DeviceInfo[]>}
   */
  async discoverNearbyDevices() {
    throw new Error('Not implemented: LocalMessagingTransport.discoverNearbyDevices')
  }
  
  /**
   * Thibitisha kuwa ujumbe umewasilishwa.
   * @param {string} messageId - ID ya ujumbe
   * @returns {Promise<DeliveryAcknowledgement>}
   */
  async acknowledgeDelivery(messageId) {
    throw new Error('Not implemented: LocalMessagingTransport.acknowledgeDelivery')
  }
}

/**
 * @typedef {Object} SendResult
 * @property {boolean} success - Je, ujumbe umetumwa?
 * @property {string} messageId - ID ya ujumbe
 * @property {string[]} deliveredTo - Orodha ya vifaa vilivyopokea
 * @property {string[]} pendingFor - Orodha ya vifaa vinavyosubiri
 */

/**
 * @typedef {Object} ReceivedMessage
 * @property {string} messageId - ID ya ujumbe
 * @property {string} groupId - ID ya group
 * @property {string} senderId - ID ya mtumaji
 * @property {string} text - Maandishi ya ujumbe
 * @property {Object} metadata - Metadata
 * @property {string} receivedAt - Wakati wa kupokea (ISO timestamp)
 */

/**
 * @typedef {Object} DeviceInfo
 * @property {string} deviceId - ID ya kifaa
 * @property {string} deviceName - Jina la kifaa
 * @property {string} connectionType - Aina ya connection (bluetooth, wifi-direct, n.k.)
 * @property {number} signalStrength - Nguvu ya signal (dBm)
 */

/**
 * @typedef {Object} DeliveryAcknowledgement
 * @property {string} messageId - ID ya ujumbe
 * @property {boolean} delivered - Je, umewasilishwa?
 * @property {string[]} acknowledgedBy - Orodha ya waliotambua
 * @property {string} acknowledgedAt - Wakati wa kutambua (ISO timestamp)
 */

/* ══════════════════════════════════════════════════════════════
   3. INTERNET RELAY TRANSPORT
   ══════════════════════════════════════════════════════════════
   
   Madhumuni:
   - Kutuma ujumbe mdogo na metadata kupitia internet
   - NI KWA RUhusa YA MTUMIAJI (OFF by default)
   - HAIPASWI kutumika kusambaza media kubwa (videos, picha, n.k.)
   
   Sera:
   - Quota: ~3 MB/siku (kawaida), 5 MB/siku (hard cap)
   - Ujumbe mdogo tu (maandishi, metadata, acknowledgements)
   - Hakuna media kubwa (videos, picha, files)
   - TTL: 24 masaa (ujumbe unaisha muda)
   - Hop limit: 5 (kuzuia loops)
   
   Mfano wa Matumizi:
   - Mtumiaji A anatuma ujumbe "Niko njiani" kwa B
   - B hana internet kwa sasa
   - Ujumbe unasubiri kwenye relay server
   - B anapopata internet, ujumbe unapokelewa
   
   Security:
   - Ujumbe unaweza kuwa E2E encrypted
   - Relay server HAWEZI kusoma plaintext (ikiwa E2E)
   - Metadata tu inaweza kuonekana na relay
   ══════════════════════════════════════════════════════════════ */

/**
 * @interface InternetRelayTransport
 * @description Interface ya kutuma ujumbe mdogo kupitia internet relay
 */
export class InternetRelayTransport {
  /**
   * Tuma ujumbe kupitia relay.
   * @param {Object} message - Ujumbe kutuma
   * @param {string} message.recipientId - ID ya mpokeaji
   * @param {string} message.senderId - ID ya mtumaji
   * @param {string} message.text - Maandishi ya ujumbe
   * @param {Object} [message.metadata] - Metadata ndogo
   * @param {Object} [message.relayOptions] - Chaguzi za relay
   * @param {number} [message.relayOptions.ttl] - TTL kwa masaa (default: 24)
   * @param {number} [message.relayOptions.maxHops] - Hop limit (default: 5)
   * @returns {Promise<RelaySendResult>} - Matokeo ya kutuma
   */
  async relayMessage(message) {
    throw new Error('Not implemented: InternetRelayTransport.relayMessage')
  }
  
  /**
   * Pokea ujumbe kutoka relay.
   * @param {string} recipientId - ID ya mpokeaji
   * @param {Object} [options] - Chaguzi za ziada
   * @param {number} [options.limit] - Idadi ya juu ya ujumbe
   * @returns {Promise<RelayMessage[]>} - Ujumbe uliopokelewa
   */
  async fetchRelayedMessages(recipientId, options = {}) {
    throw new Error('Not implemented: InternetRelayTransport.fetchRelayedMessages')
  }
  
  /**
   * Angalia quota iliyobaki.
   * @returns {Promise<QuotaInfo>}
   */
  async getQuotaInfo() {
    throw new Error('Not implemented: InternetRelayTransport.getQuotaInfo')
  }
  
  /**
   * Wezesha relay (opt-in).
   * @param {Object} options - Chaguzi za relay
   * @param {number} [options.dailyLimitMB] - Quota ya kila siku (MB)
   * @returns {Promise<void>}
   */
  async enableRelay(options = {}) {
    throw new Error('Not implemented: InternetRelayTransport.enableRelay')
  }
  
  /**
   * Zima relay (opt-out).
   * @returns {Promise<void>}
   */
  async disableRelay() {
    throw new Error('Not implemented: InternetRelayTransport.disableRelay')
  }
  
  /**
   * Angalia kama relay imewezeshwa.
   * @returns {Promise<boolean>}
   */
  async isRelayEnabled() {
    throw new Error('Not implemented: InternetRelayTransport.isRelayEnabled')
  }
  
  /**
   * Thibitisha kuwa ujumbe umepokelewa na relay.
   * @param {string} messageId - ID ya ujumbe
   * @returns {Promise<RelayAcknowledgement>}
   */
  async acknowledgeRelay(messageId) {
    throw new Error('Not implemented: InternetRelayTransport.acknowledgeRelay')
  }
}

/**
 * @typedef {Object} RelaySendResult
 * @property {boolean} success - Je, ujumbe umetumwa kwa relay?
 * @property {string} messageId - ID ya ujumbe
 * @property {number} sizeBytes - Ukubwa wa ujumbe (bytes)
 * @property {number} quotaRemaining - Quota iliyobaki (bytes)
 */

/**
 * @typedef {Object} RelayMessage
 * @property {string} messageId - ID ya ujumbe
 * @property {string} senderId - ID ya mtumaji
 * @property {string} text - Maandishi ya ujumbe
 * @property {Object} metadata - Metadata
 * @property {string} relayedAt - Wakati wa relay (ISO timestamp)
 * @property {number} hops - Idadi ya hops
 * @property {string} expiresAt - Wakati wa kuisha (ISO timestamp)
 */

/**
 * @typedef {Object} QuotaInfo
 * @property {number} dailyLimitMB - Quota ya kila siku (MB)
 * @property {number} usedMB - Quota iliyotumika (MB)
 * @property {number} remainingMB - Quota iliyobaki (MB)
 * @property {string} resetAt - Wakati wa reset (ISO timestamp)
 * @property {boolean} isEnabled - Je, relay imewezeshwa?
 */

/**
 * @typedef {Object} RelayAcknowledgement
 * @property {string} messageId - ID ya ujumbe
 * @property {boolean} relayed - Je, umewekwa kwenye relay?
 * @property {string} relayedAt - Wakati wa relay (ISO timestamp)
 * @property {number} hops - Idadi ya hops
 */

/* ══════════════════════════════════════════════════════════════
   EXPORTS
   ══════════════════════════════════════════════════════════════ */

export default {
  ContentProvider,
  LocalMessagingTransport,
  InternetRelayTransport,
}
