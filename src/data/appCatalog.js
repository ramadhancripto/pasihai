// PASIHAI — static app vocabulary (si data ya watumiaji).
export const entityRoles = {
  friend: 'Mtu',
  person: 'Mtu',
  channel: 'Channel',
  hub: 'Hub',
  community: 'Jumuiya',
  group: 'Kikundi',
  business: 'Biashara',
  creator: 'Mbunifu',
  you: 'Wewe',
}

export const entityActions = {
  friend: { action: 'Ongeza rafiki', done: 'Rafiki', secondary: 'Ujumbe' },
  person: { action: 'Omba urafiki', done: 'Ombi limetumwa', secondary: 'Wasifu' },
  channel: { action: 'Fuata', done: 'Unafuatilia' },
  hub: { action: 'Jiunge', done: 'Umejiunga' },
  community: { action: 'Omba kujiunga', done: 'Umeomba' },
  group: { action: 'Jiunge', done: 'Umejiunga' },
  business: { action: 'Fuata', done: 'Unafuatilia', secondary: 'Wasiliana' },
  creator: { action: 'Fuata', done: 'Unafuatilia' },
  you: null,
}

export const homeTabs = [
  {
    id: 'mchanganyiko',
    label: 'Kwa ajili yako',
    prompt: 'Nini kinaendelea?',
    meaning: 'Marafiki, Channels, Spaces na biashara — vyote mahali pamoja.',
  },
  {
    id: 'reels',
    label: 'Reels',
    prompt: 'Unda Reel mpya…',
    meaning: 'Video fupi — moja kwa wakati, bila kupoteza mkondo.',
  },
  {
    id: 'friends',
    label: 'Friends',
    prompt: 'Shiriki jambo na marafiki zako…',
    meaning: 'Machapisho na matukio kutoka kwa marafiki zako pekee.',
  },
  {
    id: 'channels',
    label: 'Channels',
    prompt: 'Tangaza kwa wanaofuatilia…',
    meaning: 'Matangazo kutoka Channels unazofuata — si mazungumzo.',
  },
  {
    id: 'live',
    label: 'Live',
    prompt: 'Anzisha kikao cha moja kwa moja…',
    meaning: 'Vikao vya moja kwa moja: video, sauti na Live Activity.',
  },
]

/* ── Content filter (compact, si tabs) ────────────────────── */

export const contentFilters = [
  { id: 'all', label: 'Zote' },
  { id: 'video', label: 'Video' },
  { id: 'picha', label: 'Picha' },
  { id: 'posts', label: 'Machapisho' },
  { id: 'reels', label: 'Reels' },
  { id: 'audio', label: 'Sauti' },
  { id: 'polls', label: 'Kura' },
  { id: 'live', label: 'Live' },
  { id: 'announcements', label: 'Matangazo' },
]

/* ── Feed (Mchanganyiko) ──────────────────────────────────── */


export const viewModes = [
  {
    id: 'large-post-feed',
    label: 'Large Post Feed',
    desc: 'Default — post kubwa na sehemu ya post inayofuata inaonekana.',
  },
  {
    id: 'vertical-slide',
    label: 'Vertical Slide',
    desc: 'Post moja karibu full-screen; swipe juu/chini.',
  },
  {
    id: 'horizontal-slide',
    label: 'Horizontal Full Screen',
    desc: 'Post moja kubwa; swipe kushoto/kulia.',
  },
  {
    id: 'automatic-view',
    label: 'Automatic View',
    desc: 'Mfumo unachagua mpangilio unaofaa kwa aina ya maudhui na kifaa.',
  },
]


export const feedPreferences = {
  sort: [
    { id: 'relevant', label: 'Muhimu kwangu', desc: 'Mchanganyiko wa marafiki, channels na maudhui muhimu.' },
    { id: 'latest', label: 'Mapya kwanza', desc: 'Kila kitu kwa mpangilio wa muda.' },
    { id: 'friends-first', label: 'Marafiki kwanza', desc: 'Maudhui ya marafiki yanatangulia.' },
  ],
  show: [
    { id: 'reels-in-feed', label: 'Reels kwenye mkondo', on: true },
    { id: 'channels-in-feed', label: 'Channels kwenye mkondo', on: true },
    { id: 'business-in-feed', label: 'Biashara kwenye mkondo', on: true },
    { id: 'live-in-feed', label: 'Live kwenye mkondo', on: true },
    { id: 'autoplay', label: 'Kucheza video kiotomatiki', on: false },
  ],
}

export const chatFilters = [
  { id: 'zote', label: 'Zote' },
  { id: 'direct', label: 'Direct' },
  { id: 'vikundi', label: 'Vikundi' },
  { id: 'haijasomwa', label: 'Haijasomwa' },
]


export const upNext = {
  chat: {
    title: 'Chat',
    tagline: 'Mawasiliano',
    note: 'Chat ni MFUMO MMOJA wa mawasiliano: Inbox, Direct, Vikundi, Saved Friends, Maombi, New Chat na New Group. Community/Hub ni metadata ya kikundi — usimamizi wao uko Spaces.',
    items: ['Inbox (direct · vikundi)', 'Mazungumzo (Direct + Group)', 'New Chat (Saved · Friends · simu)', 'Maombi ya mazungumzo', 'Vikundi vipya', 'Hali za local/offline/sync'],
    concept: 'Chat = Communicate (mfumo mmoja)',
  },
  gundua: {
    title: 'Gundua',
    tagline: 'Kugundua',
    note: 'Pasi hai zaidi ya watu unaowafahamu. Hapa unagundua Channels, Reels, wabunifu, biashara na Hubs kulingana na mapenzi yako.',
    items: ['Channels zinazopendekezwa', 'Reels na video', 'Wabunifu', 'Hubs na Jumuiya', 'Nearby (kwa idhini)', 'Biashara'],
    concept: 'Gundua = Discover',
  },
  spaces: {
    title: 'Spaces',
    tagline: 'Kushiriki na kukutana',
    /* Muundo (§0–§3): Hub na Jumuiya ni FAMILIA MOJA (mahali + watu);
       Channel ni TAWI la kuchapisha. Vikundi ni vya Chat — si sehemu ya
       Spaces. Hakuna "Private Space" kama kitu: ufikivu ni HALI. */
    note: 'Spaces ina familia mbili: Hubs & Jumuiya (mahali na watu wa lengo moja) na Channels (kuchapisha kwa hadhira). Vikundi ni vya Chat. Ufikivu ni hali: Wazi · Binafsi-Iliyoorodheshwa · Binafsi-Fichwa.',
    items: [
      { label: 'Hubs (mahali: watu · matukio · rasilimali)', icon: 'hub' },
      { label: 'Jumuiya (watu wa lengo moja)', icon: 'globe' },
      { label: 'Channels (kuchapisha kwa hadhira)', icon: 'megaphone' },
      { label: 'Nafasi Zangu (My Spaces · Joined)', icon: 'person' },
      { label: 'Ufikivu: Wazi · Iliyoorodheshwa · Fichwa', icon: 'shield' },
    ],
    types: [
      { name: 'Hub', desc: 'Mahali/muktadha — watu, shughuli, matukio, rasilimali.', icon: 'hub' },
      { name: 'Community', desc: 'Watu wa lengo moja — hukutana, hushirikiana na kuunganisha vikundi vya Chat.', icon: 'globe' },
      { name: 'Channel', desc: 'Creator → content → hadhira. Uwasilishaji wa maudhui kwa aina.', icon: 'megaphone' },
    ],
    concept: 'Spaces = Participate (Hubs & Jumuiya | Channels)',
  },
  business: {
    title: 'Business',
    tagline: 'Kuendesha',
    note: 'Kituo cha biashara: bidhaa, huduma, wateja, matangazo na maonyesho ya kazi — vyote mahali pamoja.',
    items: ['Bidhaa na huduma', 'Wateja', 'Oda na maombi', 'Matangazo', 'Ufuatiliaji wa kazi', 'Channel ya biashara'],
    concept: 'Business = Operate',
  },
}

/* ── Menu: More (Home pekee) ──────────────────────────────── */
