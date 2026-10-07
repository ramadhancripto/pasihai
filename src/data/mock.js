// ══════════════════════════════════════════════════════════════
// PASIHAI — MOCK DATA (Hatua 0)
// Data ya majaribio pekee. Hakuna mtandao, hakuna backend.
// MUHIMU: UI haitakiwi kutegemea majina haya — yanaweza kubadilika.
// ══════════════════════════════════════════════════════════════

/* ── Main entity types ─────────────────────────────────────
   type: 'friend' | 'channel' | 'hub' | 'business' | 'creator' | 'you'
   Uhusiano (relationship) unaonyeshwa kwa uthabiti kila mahali.
   ───────────────────────────────────────────────────────── */

/* ── Entity vocabulary (Role ≠ Relationship ≠ Action) ───────
   ROLE        : "huyu ni nani / ni kitu gani?"      (aina ya entity)
   RELATIONSHIP: "mimi na yeye tuko katika uhusiano gani?"
   ACTION      : "nifanye nini?"  (kitendo kinachofaa aina hiyo)

   Sheria: kila entity ina ROLE moja ya kudumu; relationship inaweza
   kubadilika; action inafuata aina ya entity. Hazichanganywi.            */
export const entityRoles = {
  friend: 'Mtu',
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
  channel: { action: 'Fuata', done: 'Unafuatilia' },
  hub: { action: 'Jiunge', done: 'Umejiunga' },
  community: { action: 'Omba kujiunga', done: 'Umeomba' },
  group: { action: 'Jiunge', done: 'Umejiunga' },
  business: { action: 'Fuata', done: 'Unafuatilia', secondary: 'Wasiliana' },
  creator: { action: 'Fuata', done: 'Unafuatilia' },
  you: null,
}

export const users = {
  amina: {
    id: 'amina',
    name: 'Amina Said',
    handle: '@amina.said',
    type: 'friend',
    relationship: 'Rafiki',
    ring: 'friend',      // amekuwa rafiki (two-way)
    avatarTone: 'green',
    bio: 'Mwalimu wa sekondari, Dar. Ninapenda kusoma na kupika.',
    friends: 214,
    following: 84,
    followers: 37,
    since: 'Mwanachama tangu 2024',
    online: true,
  },
  juma: {
    id: 'juma',
    name: 'Juma Mwakyusa',
    handle: '@juma.m',
    type: 'friend',
    relationship: 'Rafiki',
    ring: 'friend',
    avatarTone: 'blue',
    bio: 'Fundi umeme. Mpira kila Jumapili, Kariakoo.',
    friends: 132,
    following: 190,
    followers: 46,
    since: 'Mwanachama tangu 2023',
    online: false,
  },
  sara: {
    id: 'sara',
    name: 'Sara Kimaro',
    handle: '@sara.kimaro',
    type: 'friend',
    relationship: 'Rafiki',
    ring: 'friend',
    avatarTone: 'plum',
    bio: 'Muuguzi, Arusha. Ninapenda kuoka.',
    friends: 178,
    following: 62,
    followers: 21,
    since: 'Mwanachama tangu 2024',
    online: true,
  },
  hassan: {
    id: 'hassan',
    name: 'Hassan Ally',
    handle: '@hassan.ally',
    type: 'friend',
    relationship: 'Rafiki',
    ring: 'friend',
    avatarTone: 'teal',
    bio: 'Nahodha wa teksi, Zanzibar.',
    friends: 96,
    following: 40,
    followers: 12,
    since: 'Mwanachama tangu 2025',
    online: false,
  },
  fatma: {
    id: 'fatma',
    name: 'Fatma Nuru',
    handle: '@fatma.n',
    type: 'friend',
    relationship: 'Rafiki',
    ring: 'friend',
    avatarTone: 'clay',
    bio: 'Mkulima mdogo, Mbeya. Chakula kwa kila mtu.',
    friends: 141,
    following: 108,
    followers: 58,
    since: 'Mwanachama tangu 2024',
    online: true,
  },

  // Channels — one-to-many publishing. SI chat.
  pasihaiUpdates: {
    id: 'pasihaiUpdates',
    name: 'Pasihai Updates',
    handle: '@pasihai.updates',
    type: 'channel',
    relationship: 'Unafuatilia',
    verified: true,
    subtitle: 'Channel rasmi',
    avatarTone: 'green',
    bio: 'Habari za bidhaa, vipengele vipya na matengenezo ya Pasihai.',
    followers: 128000,
    following: 4,
    posts: 412,
    since: 'Channel tangu 2024',
    category: 'Habari',
  },
  techSasa: {
    id: 'techSasa',
    name: 'Tech Sasa',
    handle: '@techsasa',
    type: 'channel',
    relationship: 'Unafuatilia',
    verified: true,
    subtitle: 'Channel',
    avatarTone: 'blue',
    bio: 'Teknolojia ya Afrika Mashariki kwa lugha rahisi.',
    followers: 46200,
    following: 12,
    posts: 861,
    since: 'Channel tangu 2023',
    category: 'Teknolojia',
  },
  elimuYetu: {
    id: 'elimuYetu',
    name: 'Elimu Yetu',
    handle: '@elimu.yetu',
    type: 'channel',
    relationship: 'Hujafuatilia',
    verified: false,
    subtitle: 'Channel',
    avatarTone: 'gold',
    bio: 'Masomo, mitihani na ushauri wa masomo kwa wanafunzi wa Tanzania.',
    followers: 31400,
    following: 30,
    posts: 1204,
    since: 'Channel tangu 2025',
    category: 'Elimu',
  },

  // Hubs & Spaces
  darTechHub: {
    id: 'darTechHub',
    name: 'Dar Tech Hub',
    handle: '@dartechhub',
    type: 'hub',
    relationship: 'Umejiunga',
    subtitle: 'Hub',
    avatarTone: 'teal',
    bio: 'Hub ya wabunifu na waandaaji wa programu jijini Dar es Salaam.',
    members: 4820,
    online: 63,
    spaces: ['Warsha', 'Kazi', 'Miradi'],
    since: 'Hub tangu 2024',
    category: 'Teknolojia',
  },
  tzCreators: {
    id: 'tzCreators',
    name: 'Tanzania Creators',
    handle: '@tzcreators',
    type: 'hub',
    relationship: 'Umejiunga',
    subtitle: 'Hub',
    avatarTone: 'plum',
    bio: 'Watumiaji wa Pasihai wanao tengeneza video, sauti na maandishi.',
    members: 9140,
    online: 121,
    spaces: ['Reels', 'Sauti', 'Kushirikiana'],
    since: 'Hub tangu 2024',
    category: 'Sanaa',
  },

  // Business
  exampleStore: {
    id: 'exampleStore',
    name: 'Example Store',
    handle: '@examplestore',
    type: 'business',
    relationship: 'Unafuatilia',
    subtitle: 'Duka',
    verified: true,
    avatarTone: 'clay',
    bio: 'Duka la umeme Kariakoo. Bidhaa halisi, bei wazi.',
    customers: 1840,
    followers: 2200,
    products: 312,
    rating: 4.7,
    since: 'Biashara tangu 2023',
    location: 'Kariakoo, Dar es Salaam',
    category: 'Rejareja',
  },
  exampleServices: {
    id: 'exampleServices',
    name: 'Example Services',
    handle: '@exampleservices',
    type: 'business',
    relationship: 'Hujafuatilia',
    subtitle: 'Huduma',
    verified: false,
    avatarTone: 'slate',
    bio: 'Huduma za ufungaji umeme na maji. Kazi za nyumbani na ofisini.',
    customers: 420,
    followers: 640,
    products: 26,
    rating: 4.4,
    since: 'Biashara tangu 2024',
    location: 'Arusha',
    category: 'Huduma',
  },

  // Creator (one-way following)
  neemaBeats: {
    id: 'neemaBeats',
    name: 'Neema Beats',
    handle: '@neemabeats',
    type: 'creator',
    relationship: 'Unafuatilia',
    subtitle: 'Mbunifu',
    avatarTone: 'gold',
    bio: 'Sauti na muziki. Naunganisha wasanii wa Kitanzania.',
    followers: 89300,
    following: 210,
    posts: 540,
    following_you: false,
    you_follow: true,
  },
}

/* ── Mtumiaji mwenyewe ─────────────────────────────────────
   Mfano wa mtumiaji wa kawaida: marafiki 15, followers 0, following 3.
   Home LAZIMA iwe na maana kamili kwa mtumiaji huyu.
   ───────────────────────────────────────────────────────── */

export const me = {
  id: 'me',
  name: 'Neema Joseph',
  handle: '@neema.j',
  type: 'you',
  avatarTone: 'green',
  bio: 'Mwanachama wa Pasihai. Dar es Salaam.',
  friends: 15,
  following: 3,
  followers: 0,
  channels: 0,
  spaces: ['Dar Tech Hub'],
  since: 'Mwanachama tangu Januari 2026',
  stats: [
    { key: 'friends', label: 'Marafiki', value: 15 },
    { key: 'following', label: 'Ninafuatilia', value: 3 },
    { key: 'followers', label: 'Wanaonifuatilia', value: 0 },
  ],
  tabs: ['Machapisho', 'Hifadhi', 'Niliyopenda', 'Kuhusu'],
}

/* ── Status / Stories (safu inayosogea kwa mlalo) ─────────── */

export const statuses = [
  { id: 'st-you', userId: 'me', label: 'Status Yako', own: true, viewed: true },
  { id: 'st-amina', userId: 'amina', label: 'Amina', viewed: false, ring: 'friend', hasVideo: false, ago: '12 dak' },
  { id: 'st-juma', userId: 'juma', label: 'Juma', viewed: false, ring: 'friend', hasVideo: true, ago: '34 dak' },
  { id: 'st-sara', userId: 'sara', label: 'Sara', viewed: false, ring: 'friend', hasVideo: false, live: true, ago: '1 saa' },
  { id: 'st-hassan', userId: 'hassan', label: 'Hassan', viewed: false, ring: 'friend', hasVideo: false, ago: '2 saa' },
  { id: 'st-fatma', userId: 'fatma', label: 'Fatma', viewed: false, ring: 'friend', hasVideo: true, ago: '3 saa' },
  { id: 'st-updates', userId: 'pasihaiUpdates', label: 'Pasihai', viewed: true, ring: 'channel', ago: '5 saa' },
  { id: 'st-tech', userId: 'techSasa', label: 'Tech Sasa', viewed: true, ring: 'channel', ago: '7 saa' },
  { id: 'st-dartech', userId: 'darTechHub', label: 'Dar Tech', viewed: false, ring: 'hub', ago: '9 saa' },
  { id: 'st-store', userId: 'exampleStore', label: 'Store', viewed: true, ring: 'business', ago: '11 saa' },
  { id: 'st-elimu', userId: 'elimuYetu', label: 'Elimu', viewed: false, ring: 'channel', ago: '13 saa' },
  { id: 'st-creators', userId: 'tzCreators', label: 'Creators', viewed: true, ring: 'hub', ago: '15 saa' },
  { id: 'st-neema', userId: 'neemaBeats', label: 'Neema', viewed: false, ring: 'creator', live: true, ago: '18 saa' },
]

/* ── Feed navigation ──────────────────────────────────────── */

export const homeTabs = [
  { id: 'mchanganyiko', label: 'Mchanganyiko', prompt: 'Nini kinaendelea?' },
  { id: 'reels', label: 'Reels', prompt: 'Unda Reel mpya…' },
  { id: 'friends', label: 'Friends', prompt: 'Shiriki jambo na marafiki zako…' },
  { id: 'channels', label: 'Channels', prompt: 'Tangaza kwa wanaofuatilia…' },
  { id: 'live', label: 'Live', prompt: 'Anzisha kikao cha moja kwa moja…' },
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

export const posts = [
  {
    id: 'p1',
    ageMinutes: 12,
    userId: 'amina',
    relationship: 'Rafiki',
    time: 'dakika 12',
    text: 'Leo nimefika sokoni Kariakoo mapema sana. Nyanya zilikuwa nzuri na bei ilikuwa rahisi kuliko wiki iliyopita. Niambie, sokoni mnaenda saa ngapi?',
    kind: 'text',
    reactions: 24,
    comments: 5,
    inHomeTabs: ['mchanganyiko', 'friends'],
    filterTypes: ['posts'],
  },
  {
    id: 'p2',
    ageMinutes: 20,
    userId: 'pasihaiUpdates',
    relationship: 'Channel',
    time: 'dakika 20',
    text: 'Toleo jipya la Pasihai linawasili. Ujumbe wa sauti sasa unatumika hata mtandao ukiwa mdogo. Huduma haitasimama wakati wa toleo hili.',
    kind: 'announcement',
    label: 'Toleo jipya',
    highlights: [
      'Ujumbe wa sauti unatumika kwenye mtandao mdogo',
      'Nafuu ya data kwa picha (ubora unadhibitiwa)',
      'Marekebisho ya uthabiti kwenye tab ya Live',
    ],
    cta: { label: 'Soma makala kamili', tone: 'quiet' },
    reactions: 342,
    comments: 48,
    shares: 420,
    inHomeTabs: ['mchanganyiko', 'channels'],
    filterTypes: ['announcements', 'posts'],
  },
  {
    id: 'p3',
    ageMinutes: 60,
    userId: 'juma',
    relationship: 'Rafiki',
    time: 'saa 1',
    text: 'Mechi ya leo ilikuwa moto! Tulienda kama kikundi cha Kariakoo na tumefurahi ushindi. Picha hapa chini.',
    kind: 'image',
    media: { tone: 'green', caption: 'Uwanja wa mitaa, Kariakoo', ratio: '4 / 3' },
    reactions: 87,
    comments: 19,
    inHomeTabs: ['mchanganyiko', 'friends'],
    filterTypes: ['picha', 'posts'],
  },
  {
    id: 'p4',
    ageMinutes: 120,
    userId: 'techSasa',
    relationship: 'Channel',
    time: 'saa 2',
    text: 'Kwa nini simu yako inapata joto wakati wa kuchaji? Tumeandaa maelezo mafupi, rahisi kueleweka, kwa lugha yetu.',
    kind: 'video',
    media: { tone: 'blue', caption: 'Video · dakika 4:12', ratio: '16 / 9', duration: '4:12', views: '24.7K' },
    shares: 63,
    reactions: 214,
    comments: 63,
    inHomeTabs: ['mchanganyiko', 'channels'],
    filterTypes: ['video', 'posts'],
  },
  {
    id: 'p5',
    ageMinutes: 180,
    userId: 'hassan',
    relationship: 'Rafiki',
    time: 'saa 3',
    text: 'Barabara za Zanzibar leo ziko wazi lakini usafiri ni mkubwa. Kwa wale wanaokuja wikendi, mpango wa safari mapema ni muhimu.',
    kind: 'poll',
    poll: {
      question: 'Mnaona usafiri wa wikendi unapaswa kuboreshwa?',
      options: [
        { id: 'o1', label: 'Ndiyo, ni muhimu sana', votes: 128 },
        { id: 'o2', label: 'Inafaa kama ilivyo', votes: 46 },
        { id: 'o3', label: 'Sina maoni', votes: 12 },
      ],
      total: 186,
      myVote: null,
    },
    reactions: 41,
    comments: 22,
    inHomeTabs: ['mchanganyiko', 'friends'],
    filterTypes: ['polls', 'posts'],
  },
  {
    id: 'p6',
    ageMinutes: 300,
    userId: 'sara',
    relationship: 'Rafiki',
    time: 'saa 5',
    text: 'Nimeanza kupika mkate wa nyumbani. Siku ya tatu leo na mkate umefanikiwa. Kwa wale wanaosema ni vigumu — jaribuni tena, uvumilivu ni funguo.',
    kind: 'text',
    reactions: 56,
    comments: 14,
    inHomeTabs: ['mchanganyiko', 'friends'],
    filterTypes: ['posts'],
  },
  {
    id: 'p7',
    ageMinutes: 420,
    userId: 'elimuYetu',
    relationship: 'Channel',
    time: 'saa 7',
    text: 'Masomo ya Hisabati: hesabu za sehemu (fractions) kwa darasa la tano. Tumeweka mazoezi matano hapa chini, jibu likiwa na maelezo.',
    kind: 'image',
    media: { tone: 'gold', caption: 'Mazoezi ya hisabati', ratio: '4 / 3' },
    reactions: 176,
    comments: 41,
    inHomeTabs: ['mchanganyiko', 'channels'],
    filterTypes: ['picha', 'posts'],
  },
  {
    id: 'p8',
    ageMinutes: 480,
    userId: 'exampleStore',
    relationship: 'Biashara',
    time: 'saa 8',
    text: 'Bidhaa mpya: redio ndogo inayotumia betri na sola. Inafaa maeneo yenye umeme wa ghaibu. Bei iko wazi kwenye ukurasa wetu.',
    kind: 'product',
    media: { tone: 'clay', caption: 'Redio ya sola', ratio: '4 / 3' },
    label: 'Bidhaa',
    cta: { label: 'Wasiliana na muuzaji', tone: 'quiet' },
    reactions: 63,
    comments: 28,
    inHomeTabs: ['mchanganyiko'],
    filterTypes: ['picha', 'posts'],
  },
  {
    id: 'p9',
    ageMinutes: 600,
    userId: 'fatma',
    relationship: 'Rafiki',
    time: 'saa 10',
    text: 'Wakulima wenzangu wa Mbeya, mvua zimeanza vizuri mwaka huu. Tumepanda mahindi mapema. Tutashirikiana kuhusu mbolea na magonjwa ya mimea.',
    kind: 'text',
    reactions: 38,
    comments: 17,
    inHomeTabs: ['mchanganyiko', 'friends'],
    filterTypes: ['posts'],
  },
  {
    id: 'p10',
    ageMinutes: 720,
    userId: 'neemaBeats',
    relationship: 'Mbunifu',
    time: 'saa 12',
    text: 'Kipande kipya cha sauti kimekamilika. Nataka nisikie maoni yenu kabla ya kuachia kwenye studio. Sauti ni fupi, kama dakika moja.',
    kind: 'audio',
    media: { duration: '1:04', waveform: [8, 14, 22, 30, 18, 26, 34, 20, 12, 24, 32, 16, 10, 20, 28, 14] },
    reactions: 129,
    comments: 35,
    inHomeTabs: ['mchanganyiko'],
    filterTypes: ['audio'],
  },
  {
    id: 'p11',
    ageMinutes: 840,
    userId: 'juma',
    relationship: 'Rafiki',
    time: 'saa 14',
    text: 'Mjadala mfupi wa sauti: tujenge vipi vikundi vya ushirikiano wa kazi mitaani? Nitawasikiliza leo jioni kwa dakika arobaini.',
    kind: 'liveActivity',
    liveInfo: { mode: 'Sauti', state: 'imepangwa', when: 'Leo, 20:00', host: 'Juma Mwakyusa', listeners: 42 },
    reactions: 19,
    comments: 8,
    inHomeTabs: ['mchanganyiko'],
    filterTypes: ['audio', 'live'],
  },
  {
    id: 'p12',
    ageMinutes: 1440,
    userId: 'darTechHub',
    relationship: 'Hub',
    time: 'siku 1',
    text: 'Warsha ya bure: jinsi ya kuandaa biashara ndogo kwa mtandao. Jumatano jioni, Dar Tech Hub. Nafasi 40, usajili unafanyika hapa Pasihai.',
    kind: 'event',
    media: { tone: 'teal', caption: 'Warsha · Jumatano 18:30', ratio: '16 / 9' },
    label: 'Tukio',
    cta: { label: 'Jiunge na warsha', tone: 'primary' },
    shares: 36,
    reactions: 154,
    comments: 39,
    inHomeTabs: ['mchanganyiko', 'friends'],
    filterTypes: ['picha', 'posts'],
  },
]

/* ── Reels ────────────────────────────────────────────────── */

export const reels = [
  { id: 'r1', ageMinutes: 120, userId: 'neemaBeats', time: 'saa 2', caption: 'Sauti mpya — sehemu ya pili. Wapi nikuachie kamili?', views: '18.4K', reactions: 892, comments: 74, duration: '0:22', tone: 'gold' },
  { id: 'r2', ageMinutes: 360, userId: 'juma', time: 'saa 6', caption: 'Ushindi wa Kariakoo jana usiku 🎉', views: '6.1K', reactions: 341, comments: 52, duration: '0:15', tone: 'blue' },
  { id: 'r3', ageMinutes: 1440, userId: 'sara', time: 'siku 1', caption: 'Hatua kwa hatua: mkate wa nyumbani. Usikate tamaa.', views: '3.2K', reactions: 218, comments: 31, duration: '0:38', tone: 'plum' },
  { id: 'r4', ageMinutes: 1500, userId: 'techSasa', time: 'siku 1', caption: 'Kidokezo kimoja kinachookoa betri yako kila siku.', views: '24.7K', reactions: 1204, comments: 155, duration: '0:45', tone: 'green' },
  { id: 'r5', ageMinutes: 2880, userId: 'fatma', time: 'siku 2', caption: 'Shamba letu la mahindi leo asubuhi. Mungu ni mwema.', views: '1.8K', reactions: 96, comments: 12, duration: '0:19', tone: 'clay' },
  { id: 'r6', ageMinutes: 2900, userId: 'exampleStore', time: 'siku 2', caption: 'Redio ya sola — mwanga kwa nyumbani na shambani.', views: '9.4K', reactions: 402, comments: 63, duration: '0:31', tone: 'slate' },
  { id: 'r7', ageMinutes: 4320, userId: 'amina', time: 'siku 3', caption: 'Kupika pilau kwa haraka — njia rahisi.', views: '2.4K', reactions: 143, comments: 27, duration: '0:52', tone: 'green' },
  { id: 'r8', ageMinutes: 4340, userId: 'tzCreators', time: 'siku 3', caption: 'Warsha ya Reels: jinsi ya kuanza bila kamera ya bei.', views: '5.6K', reactions: 267, comments: 44, duration: '0:28', tone: 'teal' },
]

/* ── Live (kategoria na aina mbalimbali) ──────────────────── */

export const liveSessions = [
  { id: 'l1', ageMinutes: 42, userId: 'techSasa', title: 'Kujenga biashara ndogo kwa mtandao', host: 'Tech Sasa', mode: 'Video', state: 'live', viewers: 1284, since: '42 dak', category: 'Biashara', tone: 'blue', kind: 'video' },
  { id: 'l2', ageMinutes: 18, userId: 'elimuYetu', title: 'Hisabati: sehemu (fractions) kwa darasa la tano', host: 'Elimu Yetu', mode: 'Video', state: 'live', viewers: 642, since: '18 dak', category: 'Elimu', tone: 'gold', kind: 'video' },
  { id: 'l3', ageMinutes: 60, userId: 'darTechHub', title: 'Kikao cha wabunifu wa Dar: hali ya kazi 2026', host: 'Dar Tech Hub', mode: 'Video', state: 'live', viewers: 318, since: '1 saa', category: 'Teknolojia', tone: 'teal', kind: 'video' },
  { id: 'l4', ageMinutes: 25, userId: 'neemaBeats', title: 'Studio hewani: kusikiliza demo mpya', host: 'Neema Beats', mode: 'Sauti', state: 'live', viewers: 876, since: '25 dak', category: 'Burudani', tone: 'plum', kind: 'audio', speakers: ['neemaBeats', 'juma', 'fatma'], waveform: [10, 18, 26, 34, 22, 30, 16, 24, 32, 20, 12, 28] },
  { id: 'l5', ageMinutes: 12, userId: 'amina', title: 'Mahojiano: mwalimu wa miaka kumi darasani', host: 'Amina Said', mode: 'Video', state: 'live', viewers: 156, since: '12 dak', category: 'Mahojiano', tone: 'green', kind: 'video', speakers: ['amina', 'hassan'] },
  { id: 'l6', ageMinutes: 0, userId: 'exampleStore', title: 'Uzinduzi wa bidhaa: redio ya sola', host: 'Example Store', mode: 'Video', state: 'upcoming', when: 'Leo, 19:30', viewers: 0, category: 'Biashara', tone: 'clay', kind: 'video' },
  { id: 'l7', ageMinutes: 0, userId: 'fatma', title: 'Mkutano wa wakulima wa Mbeya', host: 'Fatma Nuru', mode: 'Mchanganyiko', state: 'upcoming', when: 'Kesho, 09:00', viewers: 0, category: 'Jumuiya', tone: 'green', kind: 'mixed' },
  { id: 'l8', ageMinutes: 0, userId: 'juma', title: 'Majadiliano ya mitaa: ushirikiano wa kazi', host: 'Juma Mwakyusa', mode: 'Sauti', state: 'upcoming', when: 'Leo, 20:00', viewers: 0, category: 'Majadiliano', tone: 'blue', kind: 'audio', speakers: ['juma', 'sara', 'hassan'] },
  { id: 'l9', ageMinutes: 1440, userId: 'tzCreators', title: 'Warsha: kuanza Reels bila kamera ya bei', host: 'Tanzania Creators', mode: 'Video', state: 'replay', viewers: 4120, since: 'Jana', category: 'Mafunzo', tone: 'teal', kind: 'video' },
  { id: 'l10', ageMinutes: 1440, userId: 'hassan', title: 'Mpira: majadiliano ya mechi ya wikendi', host: 'Hassan Ally', mode: 'Sauti', state: 'replay', viewers: 2210, since: 'Jana', category: 'Michezo', tone: 'slate', kind: 'audio' },
  { id: 'l11', ageMinutes: 10080, userId: 'pasihaiUpdates', title: 'Habari za Pasihai: nini kipya mwezi huu', host: 'Pasihai Updates', mode: 'Video', state: 'replay', viewers: 18400, since: 'Wiki 1', category: 'Habari', tone: 'green', kind: 'video' },
  { id: 'l12', ageMinutes: 33, userId: 'sara', title: 'Kuoka pamoja: mkate wa nyumbani hatua kwa hatua', host: 'Sara Kimaro', mode: 'Mchanganyiko', state: 'live', viewers: 243, since: '33 dak', category: 'Kupika', tone: 'plum', kind: 'mixed' },
]

/* Channels zinazopendekezwa (Stitch: discovery carousel) */
export const channelSuggestions = ['techSasa', 'elimuYetu']

export const liveCategories = ['Zote', 'Biashara', 'Elimu', 'Teknolojia', 'Burudani', 'Mahojiano', 'Jumuiya', 'Michezo', 'Mafunzo', 'Habari']

/* ── Notifications ────────────────────────────────────────── */

export const notifications = [
  { id: 'n1', userId: 'amina', type: 'friend', text: 'Amina Said ameongeza chapisho jipya', time: 'dakika 12', unread: true, icon: 'none' },
  { id: 'n2', userId: 'juma', type: 'comment', text: 'Juma Mwakyusa alijibu chapisho lako', time: 'dakika 40', unread: true, icon: 'comment' },
  { id: 'n3', userId: 'darTechHub', type: 'hub', text: 'Dar Tech Hub wametangaza warsha mpya', time: 'saa 2', unread: true, icon: 'hub' },
  { id: 'n4', userId: 'pasihaiUpdates', type: 'channel', text: 'Pasihai Updates: kipengele kipya cha sauti', time: 'saa 5', unread: false, icon: 'megaphone' },
  { id: 'n5', userId: 'hassan', type: 'reaction', text: 'Hassan Ally na wengine 6 walipenda chapisho lako', time: 'saa 9', unread: false, icon: 'heart' },
  { id: 'n6', userId: 'techSasa', type: 'live', text: 'Tech Sasa wapo hewani sasa', time: 'saa 11', unread: false, icon: 'live' },
  { id: 'n7', userId: 'exampleStore', type: 'business', text: 'Example Store wana bidhaa mpya', time: 'siku 1', unread: false, icon: 'store' },
  { id: 'n8', userId: 'elimuYetu', type: 'channel', text: 'Elimu Yetu: mazoezi mapya ya hisabati', time: 'siku 1', unread: false, icon: 'megaphone' },
]

/* ── Kurasa za placeholder (Soga, Gundua, Spaces, Business) ─ */
// Kumbuka: haya ni MAELEZO ya kile kitakachojengwa — si UI ya mwisho.

export const upNext = {
  soga: {
    title: 'Soga',
    tagline: 'Mawasiliano',
    note: 'Hapa ndipo mazungumzo yanaishi. Kila ujumbe ni wa faragha au wa kikundi, na hapa ndipo sauti, simu na ujumbe wa haraka hukaa.',
    items: ['Ujumbe (moja kwa moja)', 'Vikundi vya mazungumzo', 'Ujumbe wa sauti', 'Simu za sauti na video', 'Ujumbe usio na mtandao (baadaye)'],
    concept: 'Soga = Communicate',
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
    tagline: 'Kushiriki',
    note: 'Spaces ni sehemu za kushiriki — si mazungumzo na si ujumbe. Hapa Hubs, Jumuiya, Vikundi na Nafasi za Faragha zinapangwa.',
    items: [
      { label: 'Hubs (k.m. Dar Tech Hub)', icon: 'hub' },
      { label: 'Jumuiya (Communities)', icon: 'globe' },
      { label: 'Vikundi (Groups)', icon: 'spaces' },
      { label: 'Nafasi za Faragha (Private Spaces)', icon: 'shield' },
      { label: 'Channels zinazohusiana', icon: 'megaphone' },
    ],
    types: [
      { name: 'Hub', desc: 'Kituo kikubwa kinachoshirikisha maslahi moja, chenye vikundi na matukio.', icon: 'hub' },
      { name: 'Community', desc: 'Kundi la watu lenye lengo moja, linaweza kuwa la wazi au la idhini.', icon: 'globe' },
      { name: 'Group', desc: 'Kikundi kidogo cha majadiliano na kushirikiana kazi.', icon: 'spaces' },
      { name: 'Private Space', desc: 'Nafasi ya faragha kwa wanachama walioalikwa pekee.', icon: 'shield' },
    ],
    concept: 'Spaces = Participate',
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

export const viewModes = [
  {
    id: 'auto',
    label: 'Automatic',
    desc: 'Pasihai anachagua muonekano unaofaa kwa kila chapisho.',
  },
  {
    id: 'vertical',
    label: 'Vertical',
    desc: 'Mkondo wa juu na chini. Bora kwa Reels, video na picha.',
  },
  {
    id: 'horizontal',
    label: 'Horizontal / Full Scroll',
    desc: 'Kutazama kwa undani — picha na video zinasogea kwa mlalo.',
  },
]

export const moreMenuItems = [
  { id: 'view-mode', label: 'Muonekano (View mode)', icon: 'eye', hint: 'Automatic' },
  { id: 'feed-prefs', label: 'Mapendeleo ya mkondo', icon: 'sliders', hint: '' },
  { id: 'content-prefs', label: 'Mapendeleo ya maudhui', icon: 'spark', hint: '' },
  { id: 'saved', label: 'Zilizohifadhiwa', icon: 'bookmark', hint: '3' },
  { id: 'data-saver', label: 'Kuokoa data', icon: 'gauge', hint: 'Imewashwa' },
  { id: 'refresh', label: 'Sasisha', icon: 'refresh', hint: '' },
  { id: 'settings', label: 'Mipangilio', icon: 'settings', hint: '' },
]

/* ── Filter za feed (mapendeleo) ──────────────────────────── */

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
