// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE SPACES REPOSITORY
//
// Inatumia: spaces (014), space_members (014), space_posts (014),
//           profiles (001), follows (002)
//
// Methods: listSpaces, getSpace, join, leave, getPeople,
//          getActivity, getEvents, getResources, getStats,
//          createSpace, getVisibilityModel, requestJoin,
//          attendEvent, saveResource, getRelatedGroups,
//          listCreated, listMyRequests
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'
import { parseSupabaseError } from '../../utils/errors.js'

function handleError(error, context) {
  const parsed = parseSupabaseError(error, context)
  console.error(`[SupabaseSpacesRepo:${context}]`, parsed.message)
  return parsed
}

const SPACE_TYPES = ['hub', 'community', 'channel']

/* ── Map DB row → Space item ──────────────────────────────── */

function mapSpace(row, { isMember, isOwner, isFollowed } = {}) {
  return {
    id: row.id,
    type: row.type,
    kind: row.type,
    name: row.name,
    handle: `@${row.slug}`,
    bio: row.description || '',
    purpose: row.description || '',
    category: '',
    tone: 'green',
    cover: 'green',
    avatarTone: 'green',
    verified: false,
    place: null,
    members: row.members_count || 0,
    followers: row.type === 'channel' ? row.members_count || 0 : 0,
    visibility: row.visibility || 'public',
    joinMode: row.type === 'channel' ? 'follow' : 'open',
    founded: new Date(row.created_at).getFullYear().toString(),
    rules: ['Kuwa mwenyewe katika kuchapisha.'],
    team: [],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    online: false,
    owned: !!isOwner,
    joined: !!isMember,
    requested: false,
  }
}

/* ── Supabase Spaces Repository ───────────────────────────── */

export const supabaseSpacesRepository = {

  async listSpaces({ includeHidden = false } = {}) {
    if (!isSupabaseLive || !supabase) {
      return { hubs: [], communities: [], channels: [], places: [], counts: { hubs: 0, communities: 0, places: 0, channels: 0 }, mine: [], followed: [] }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id

      // Get all visible spaces
      let query = supabase
        .from('spaces')
        .select('*')
        .is('deleted_at', null)

      if (!includeHidden) {
        query = query.in('visibility', ['public', 'listed'])
      }

      const { data: spaces, error } = await query.order('members_count', { ascending: false })
      if (error) throw error

      // Get user's memberships
      let memberSpaceIds = new Set()
      let ownedSpaceIds = new Set()
      if (currentUserId) {
        const { data: memberships } = await supabase
          .from('space_members')
          .select('space_id, role')
          .eq('user_id', currentUserId)
          .eq('status', 'active')

        for (const m of memberships || []) {
          memberSpaceIds.add(m.space_id)
          if (m.role === 'owner') ownedSpaceIds.add(m.space_id)
        }
      }

      // Get followed channels
      let followedChannelIds = new Set()
      if (currentUserId) {
        const { data: follows } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', currentUserId)
        followedChannelIds = new Set((follows || []).map(f => f.followee_id))
      }

      const items = (spaces || []).map(s =>
        mapSpace(s, {
          isMember: memberSpaceIds.has(s.id),
          isOwner: ownedSpaceIds.has(s.id),
          isFollowed: followedChannelIds.has(s.creator_id),
        })
      )

      const hubs = items.filter(i => i.type === 'hub')
      const communities = items.filter(i => i.type === 'community')
      const channels = items.filter(i => i.type === 'channel')

      return {
        hubs,
        communities,
        channels,
        places: [...hubs, ...communities],
        counts: {
          hubs: hubs.length,
          communities: communities.length,
          places: hubs.length + communities.length,
          channels: channels.length,
        },
        mine: items.filter(i => i.joined || i.owned),
        followed: channels.filter(i => i.joined),
      }
    } catch (err) {
      const parsed = handleError(err, 'listSpaces')
      // PGRST205: table doesn't exist yet — return empty, don't crash
      if (parsed?.code === 'SCHEMA_ERROR') return { hubs: [], communities: [], channels: [], places: [], counts: { hubs: 0, communities: 0, places: 0, channels: 0 }, mine: [], followed: [] }
      throw parsed
    }
  },

  async getSpace(type, id) {
    if (!isSupabaseLive || !supabase) return null
    try {
      const { data: space, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error || !space) return null

      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id

      let isMember = false
      let isOwner = space.creator_id === currentUserId
      if (currentUserId) {
        const { data: membership } = await supabase
          .from('space_members')
          .select('role')
          .eq('space_id', id)
          .eq('user_id', currentUserId)
          .eq('status', 'active')
          .maybeSingle()
        isMember = !!membership
        if (membership?.role === 'owner') isOwner = true
      }

      const item = mapSpace(space, { isMember, isOwner })

      // Get people
      const people = await this.getPeople(id)
      // Get activity
      const activity = await this.getActivity(id)
      // Get related groups
      const relatedGroups = await this.getRelatedGroups(id)

      return {
        ...item,
        people,
        activity,
        relatedGroups,
        canManage: isOwner,
      }
    } catch (err) {
      handleError(err, 'getSpace')
      return null
    }
  },

  async getPeople(id) {
    if (!isSupabaseLive || !supabase) return { team: [], members: [], lead: null }
    try {
      const { data: memberships, error } = await supabase
        .from('space_members')
        .select('user_id, role, status, profiles!inner(user_id, username, display_name, avatar_tone, verified)')
        .eq('space_id', id)
        .eq('status', 'active')

      if (error) throw error

      const members = (memberships || []).map(m => ({
        id: m.user_id,
        name: m.profiles?.display_name || m.profiles?.username || '',
        handle: `@${m.profiles?.username || ''}`,
        tone: m.profiles?.avatar_tone || 'green',
        verified: !!m.profiles?.verified,
        role: m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : m.role === 'moderator' ? 'Moderator' : 'Mwanachama',
        isTeam: ['owner', 'admin', 'moderator'].includes(m.role),
      }))

      const team = members.filter(m => m.isTeam)
      const regular = members.filter(m => !m.isTeam)
      const lead = members.find(m => m.role === 'Owner') || null

      return { lead, team, members: regular, memberRoles: [...new Set(members.map(m => m.role))] }
    } catch (err) {
      handleError(err, 'getPeople')
      return { team: [], members: [], lead: null }
    }
  },

  async getActivity(id, { kind = 'all' } = {}) {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data, error } = await supabase
        .from('space_posts')
        .select('post_id, posts!inner(id, kind, text, media_url, media_meta, author_id, visibility, reactions_count, comments_count, shares_count, created_at)')
        .eq('space_id', id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const items = (data || []).map(row => ({
        id: row.posts.id,
        kind: row.posts.kind,
        sourceKind: row.posts.kind,
        text: row.posts.text || '',
        mediaUrl: row.posts.media_url,
        media: row.posts.media_url ? { url: row.posts.media_url, ...(row.posts.media_meta || {}) } : undefined,
        userId: row.posts.author_id,
        visibility: row.posts.visibility,
        stats: {
          reactions: row.posts.reactions_count || 0,
          comments: row.posts.comments_count || 0,
          shares: row.posts.shares_count || 0,
        },
        createdAt: row.posts.created_at,
        filters: [],
        source: 'post',
      }))

      if (kind === 'event') return items.filter(i => i.sourceKind === 'event')
      if (kind === 'media') return items.filter(i => ['image', 'video', 'reel', 'audio'].includes(i.kind))
      return items
    } catch (err) {
      handleError(err, 'getActivity')
      return []
    }
  },

  async getEvents(id) {
    return this.getActivity(id, { kind: 'event' })
  },

  async attendEvent(eventId, on = true) {
    // Events not yet fully in schema — session-only
    return { id: eventId, attending: !!on }
  },

  async getResources(id) {
    return { items: [], available: false } // Resources not yet in schema
  },

  async saveResource(id) {
    return [] // Delegates to systemRepository in mock
  },

  async getRelatedGroups(id) {
    return [] // Groups not yet in spaces schema
  },

  async getStats(id) {
    if (!isSupabaseLive || !supabase) return null
    try {
      const { data: space } = await supabase
        .from('spaces')
        .select('members_count')
        .eq('id', id)
        .single()

      const activity = await this.getActivity(id)
      const reactions = activity.reduce((n, i) => n + (i.stats?.reactions || 0), 0)
      const comments = activity.reduce((n, i) => n + (i.stats?.comments || 0), 0)
      const shares = activity.reduce((n, i) => n + (i.stats?.shares || 0), 0)

      return {
        followers: space?.members_count || 0,
        members: space?.members_count || 0,
        posts: activity.length,
        events: 0,
        reactions,
        comments,
        shares,
        note: 'Takwimu hizi ni kutoka kwenye database.',
      }
    } catch (err) {
      handleError(err, 'getStats')
      return null
    }
  },

  async join(type, id) {
    if (!isSupabaseLive || !supabase) return { id, joined: false }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { id, joined: false }

      const { error } = await supabase
        .from('space_members')
        .upsert({
          space_id: id,
          user_id: user.id,
          role: 'member',
          status: 'active',
        }, { onConflict: 'space_id,user_id' })

      if (error) throw error
      return { type, id, joined: true, note: 'Umejiunga' }
    } catch (err) {
      throw handleError(err, 'join')
    }
  },

  async requestJoin(type, id) {
    if (!isSupabaseLive || !supabase) return { id, requested: false }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { id, requested: false }

      const { error } = await supabase
        .from('space_members')
        .upsert({
          space_id: id,
          user_id: user.id,
          role: 'member',
          status: 'pending',
        }, { onConflict: 'space_id,user_id' })

      if (error) throw error
      return { id, type, requested: true, joined: false, note: 'Ombi limekutumwa' }
    } catch (err) {
      throw handleError(err, 'requestJoin')
    }
  },

  async leave(type, id) {
    if (!isSupabaseLive || !supabase) return { id, joined: false }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { id, joined: false }

      const { error } = await supabase
        .from('space_members')
        .delete()
        .eq('space_id', id)
        .eq('user_id', user.id)

      if (error) throw error
      return { id, joined: false, note: 'Umetoka' }
    } catch (err) {
      throw handleError(err, 'leave')
    }
  },

  async createSpace(draft) {
    if (!isSupabaseLive || !supabase) return null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const type = SPACE_TYPES.includes(draft?.type) ? draft.type : 'hub'
      const slug = (draft?.name || `${type}-space`).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)

      const { data: space, error } = await supabase
        .from('spaces')
        .insert({
          name: draft?.name || (type === 'channel' ? 'Channel yangu' : type === 'community' ? 'Jumuiya yangu' : 'Hub yangu'),
          slug,
          type,
          description: draft?.purpose || '',
          creator_id: user.id,
          visibility: ['public', 'listed', 'hidden'].includes(draft?.visibility) ? draft.visibility : 'public',
        })
        .select('*')
        .single()

      if (error) throw error

      // Add creator as owner
      await supabase
        .from('space_members')
        .insert({ space_id: space.id, user_id: user.id, role: 'owner', status: 'active' })

      return {
        ...mapSpace(space, { isMember: true, isOwner: true }),
        owned: true,
        joined: true,
      }
    } catch (err) {
      throw handleError(err, 'createSpace')
    }
  },

  async listCreated() {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data } = await supabase
        .from('spaces')
        .select('*')
        .eq('creator_id', user.id)
        .is('deleted_at', null)

      return (data || []).map(s => mapSpace(s, { isOwner: true, isMember: true }))
    } catch {
      return []
    }
  },

  async getVisibilityModel() {
    return [
      { id: 'public', label: 'Wazi (Public)', hint: 'Inaonekana kwenye Gundua na Spaces. Kujiunga ni papo hapo.', joinLabel: 'Jiunge' },
      { id: 'listed', label: 'Binafsi — Iliyoorodheshwa', hint: 'Utambulisho unaonekana; content haipatikani hadi ujiunge kwa ombi.', joinLabel: 'Omba kujiunga' },
      { id: 'hidden', label: 'Binafsi — Fichwa', hint: 'Haipatikani kwa kutafuta — mwaliko au kiungo pekee.', joinLabel: 'Mwaliko pekee' },
    ]
  },

  listMyRequests() {
    return [] // Session-only in mock
  },

  isAttending(eventId) {
    return false
  },
}