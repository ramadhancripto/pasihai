function formatStatusAge(createdAt) {
  const timestamp = Date.parse(createdAt || '')
  if (!Number.isFinite(timestamp)) return ''

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'sasa hivi'
  if (minutes < 60) return `dakika ${minutes} zilizopita`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `saa ${hours} zilizopita`
  return `siku ${Math.floor(hours / 24)} zilizopita`
}

function formatStatusDate(value) {
  const date = new Date(value || '')
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleString('sw-TZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mapStatusUser(row) {
  const profile = Array.isArray(row.author) ? row.author[0] : row.author
  if (!profile) return null

  return {
    id: profile.user_id || row.user_id,
    name: profile.display_name || profile.username || '',
    handle: profile.username ? `@${profile.username}` : '',
    type: profile.entity_type || 'person',
    avatarTone: profile.avatar_tone || 'green',
    verified: profile.verified === true,
  }
}

export function mapSupabaseStatus(row, { currentUserId, mediaUrl = null } = {}) {
  if (!row) return null

  const text = typeof row.text === 'string' ? row.text : ''
  const createdAt = row.created_at || null
  const expiresAt = row.expires_at || null
  const own = Boolean(currentUserId && row.user_id === currentUserId)
  const user = mapStatusUser(row)
  const effectiveMediaUrl = mediaUrl || (!row.media_path ? row.media_url : null) || null
  const label = text.trim()
    ? text.trim().slice(0, 32)
    : row.media_type === 'video'
      ? 'Video'
      : row.media_type === 'image'
        ? 'Picha'
        : 'Status'

  return {
    id: row.id,
    userId: row.user_id,
    own,
    saved: true, // RLS returns only this user's or followed users' active statuses.
    tone: row.tone || 'green',
    label,
    text,
    mediaUrl: effectiveMediaUrl,
    mediaType: row.media_type || null,
    hasVideo: row.media_type === 'video',
    media: effectiveMediaUrl
      ? { url: effectiveMediaUrl, type: row.media_type || 'image' }
      : null,
    createdAt,
    expiresAt,
    createdAtLabel: formatStatusDate(createdAt),
    expiresAtLabel: formatStatusDate(expiresAt),
    ago: formatStatusAge(createdAt),
    user,
    persistence: 'supabase',
  }
}
