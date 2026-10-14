// ══════════════════════════════════════════════════════════════
// ChatHai Groups — M2: ruhusa za roles (chanzo kimoja cha JS)
//
// MIRROR ya `public.chat_group_can()` ya DB (migration 034). Chanzo cha
// mamlaka ya MWISHO ni database (RLS + triggers + RPC); JS hii inatumika
// UI/service kwa kuamua kitu kuonyesha/kuficha — je, DB itaruhusu kweli.
// Parity test: supabase/verify/groups-rbac-test.mjs (§5).
// ══════════════════════════════════════════════════════════════

export const GROUP_ROLES = ['owner', 'admin', 'moderator', 'member']

export const GROUP_ROLE_RANK = { owner: 4, admin: 3, moderator: 2, member: 1 }

export const GROUP_ROLE_LABELS = {
  owner: 'Mmiliki (Owner)',
  admin: 'Admin',
  moderator: 'Moderator',
  member: 'Mwanachama',
}

/* Action keys = zilezile za DB (`chat_group_role_max`). */
export const GROUP_ACTIONS = {
  BASE: ['read_messages', 'send_message', 'send_media', 'react_to_message'],
  MODERATOR: ['moderate_messages', 'restrict_members'],
  ADMIN: [
    'add_member', 'edit_info', 'edit_settings', 'manage_photo',
    'moderate_messages', 'restrict_members', 'manage_members', 'manage_roles',
  ],
  OWNER_ONLY: ['transfer_ownership', 'delete_group'],
}

/* Actions zinazoweza kubanwa kwa `permissions` (grants) — sawa na DB. */
export const GROUP_GRANTABLE_ACTIONS = [
  'add_member', 'edit_info', 'edit_settings', 'manage_photo',
  'moderate_messages', 'restrict_members', 'manage_members', 'manage_roles',
]

export const GROUP_ACTION_LABELS = {
  add_member: 'Kuongeza wanachama',
  edit_info: 'Kubadilisha jina/maelezo',
  edit_settings: 'Kubadilisha mipangilio',
  manage_photo: 'Kubadilisha DP/cover',
  moderate_messages: 'Kudhibiti ujumbe (kufuta)',
  restrict_members: 'Kumzuia/kumwondoa mwanachama',
  manage_members: 'Kusimamia wanachama (ban/unban)',
  manage_roles: 'Kubadilisha roles na ruhusa',
}

/** Maxcaps za role — mirror ya `chat_group_role_max` (DB). */
export function groupRoleMax(role, action) {
  if (!action) return false
  if (role === 'owner') return true
  if (role === 'admin') {
    return [...GROUP_ACTIONS.BASE, ...GROUP_ACTIONS.ADMIN].includes(action)
  }
  if (role === 'moderator') {
    return [...GROUP_ACTIONS.BASE, ...GROUP_ACTIONS.MODERATOR, 'add_member'].includes(action)
  }
  /* member: 'add_member' ipo kwenye maxcap ili `who_can_add='members'` iweze
     kumruhusu kupitia settings (can() inaamua) — sawa na DB. */
  if (role === 'member') return [...GROUP_ACTIONS.BASE, 'add_member'].includes(action)
  return false
}

/** Uhalali wa `permissions` array kwa role — mirror ya `chat_group_permissions_valid`. */
export function groupPermissionsValid(role, permissions) {
  if (permissions === null || permissions === undefined) return true
  if (!Array.isArray(permissions)) return false
  const uniq = new Set(permissions)
  if (uniq.size !== permissions.length) return false
  return permissions.every(
    (a) => groupRoleMax(role, a) && !GROUP_ACTIONS.OWNER_ONLY.includes(a),
  )
}

/**
 * Mirror ya `chat_group_can(conversation_id, user_id, action)`.
 * @param {object} p
 * @param {string|null} p.role   role ya mtumiaji kwenye kikundi (null = si mwanachama)
 * @param {string} p.status      'active' | 'pending' | 'banned' | 'left'
 * @param {string} p.type        'group' | 'direct'
 * @param {object|null} p.settings  { whoCanAdd, whoCanReply, whoCanReact, announcementSenders } (camelCase)
 * @param {string[]|null} p.permissions  grants (null = defaults za role)
 * @param {string} p.action
 */
export function groupCan({ role = null, status = 'active', kind = 'group', groupType = 'normal', settings = null, permissions = null, action }) {
  if (status !== 'active') return false

  if (kind === 'direct') {
    return GROUP_ACTIONS.BASE.includes(action)
  }

  const whoAdd = settings?.whoCanAdd ?? 'owner_admins'
  const whoReply = settings?.whoCanReply ?? 'all'
  const whoReact = settings?.whoCanReact ?? 'all'
  const ann = settings?.announcementSenders ?? 'owner_admins'

  if (role === 'owner') return true
  if (!groupRoleMax(role, action)) return false

  if (permissions != null && GROUP_GRANTABLE_ACTIONS.includes(action)) {
    if (!permissions.includes(action)) return false
  }

  if (action === 'send_message' || action === 'send_media') {
    if (groupType === 'announcement') {
      return ann === 'owner_admins' && role === 'admin'
    }
    if (whoReply === 'admins') return role === 'admin'
    return true
  }

  if (action === 'react_to_message') {
    if (whoReact === 'admins') return role === 'admin'
    return true
  }

  if (action === 'add_member') {
    if (whoAdd === 'owner_admins') return role === 'admin'
    if (whoAdd === 'members') return true
    return false
  }

  return true
}

/** Je, mtumiaji anaweza kuona/kufungua ukurasa wa usimamizi? (UI pekee) */
export function groupCanManage({ role, permissions = null }) {
  return GROUP_GRANTABLE_ACTIONS.some((a) =>
    groupCan({ role, permissions, action: a }),
  )
}
