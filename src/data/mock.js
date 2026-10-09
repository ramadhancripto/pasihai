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
    areas: ['Warsha', 'Kazi', 'Miradi'],
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
    areas: ['Reels', 'Sauti', 'Kushirikiana'],
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
    category: 'Maduka',
    mada: ['kiuchumi', 'teknolojia'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 0.8,
    open: true,
    openLabel: 'Wazi: saa 8:00 asubuhi – 8:00 usiku',
    offers: false,
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
    mada: ['burudani'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    friendState: 'not_friend',
    discoverReason: 'Kupitia jina la mtumiaji',
  },

  // ── GUNDUA: watu wa kugundua (PASIHAI accounts) ──────────────
  // Hali ya urafiki ni ileile ya Chat/identity (friend request model).
  neemaCreates: {
    id: 'neemaCreates',
    name: 'Neema Mwamba',
    handle: '@neema_creates',
    type: 'creator',
    subtitle: 'Muundaji',
    avatarTone: 'plum',
    bio: 'Mbunifu wa Maudhui · Dar es Salaam',
    interests: ['Flutter', 'Kilimo Biashara'],
    followers: 12400,
    mada: ['burudani', 'ubunifu', 'kiuchumi'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 2.1,
    online: true,
    friendState: 'sent',
    discoverReason: 'Kupitia jina la mtumiaji',
  },
  barakaEng: {
    id: 'barakaEng',
    name: 'Baraka Eliya',
    handle: '@baraka_e',
    type: 'person',
    subtitle: 'Mhandisi wa Programu',
    avatarTone: 'blue',
    bio: 'Mhandisi wa Programu · Kinondoni',
    interests: ['Flutter', 'Kilimo Biashara'],
    followers: 1240,
    mada: ['teknolojia', 'elimu', 'kiuchumi'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 3.4,
    online: false,
    friendState: 'not_friend',
    discoverReason: 'Kupitia Dar Tech Hub',
  },
  zawadiStyles: {
    id: 'zawadiStyles',
    name: 'Zawena Kombo',
    handle: '@zawena.kombo',
    type: 'person',
    subtitle: 'Mbunifu wa Mitindo',
    avatarTone: 'teal',
    bio: 'Mbunifu wa Mitindo & Nguo · Mikocheni',
    followers: 860,
    mada: ['ubunifu', 'utamaduni'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 1.8,
    online: true,
    friendState: 'received',
    discoverReason: 'Kupitia jina la mtumiaji',
  },
  zainabAsili: {
    id: 'zainabAsili',
    name: 'Zainab Rashid',
    handle: '@zainab.asili',
    type: 'friend',
    relationship: 'Rafiki',
    ring: 'friend',
    subtitle: 'Muuzaji wa Bidhaa za Asili',
    avatarTone: 'green',
    bio: 'Muuzaji wa Bidhaa za Asili · Mikocheni',
    followers: 420,
    mada: ['kiuchumi', 'kijamii'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 0.9,
    online: true,
    friendState: 'friend',
    discoverReason: 'Karibu nawe',
  },
  musaKhalfan: {
    id: 'musaKhalfan',
    name: 'Musa Khalfan',
    handle: '@musak',
    type: 'person',
    subtitle: 'Fundi wa Sola',
    avatarTone: 'slate',
    bio: 'Vifaa vya sola na umeme · Kariakoo',
    followers: 210,
    mada: ['kiuchumi', 'teknolojia'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 5.6,
    online: false,
    friendState: 'not_friend',
    discoverReason: 'Kupitia utafutaji wa namba',
  },
  kelvinMushi: {
    id: 'kelvinMushi',
    name: 'Kelvin Mushi',
    handle: '@kmushi',
    type: 'person',
    subtitle: 'Mkufunzi wa Flutter',
    avatarTone: 'clay',
    bio: 'Mkufunzi wa Flutter · Upanga',
    followers: 340,
    mada: ['teknolojia', 'elimu'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 6.2,
    online: false,
    friendState: 'blocked',
    discoverReason: 'Kupitia Flutter & AI Developers',
  },

  // ── GUNDUA: biashara za kugundua ─────────────────────────────
  kipepeoLeather: {
    id: 'kipepeoLeather',
    name: 'Kipepeo Leather Crafts',
    handle: '@kipepeo.leather',
    type: 'business',
    subtitle: 'Mavazi & Vifaa',
    verified: true,
    avatarTone: 'clay',
    bio: 'Sanaa ya Mikono · Mikocheni B, Mwai Kibaki Road',
    followers: 2400,
    category: 'Maduka',
    mada: ['utamaduni', 'kiuchumi', 'ubunifu'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 3.2,
    open: true,
    openLabel: 'Wazi hadi saa 2:00 usiku',
    offers: false,
    rating: 4.8,
    reviews: 142,
    since: 'Biashara tangu 2023',
  },
  samakiKupaka: {
    id: 'samakiKupaka',
    name: 'Samaki wa Kupaka Kunduchi',
    handle: '@samaki.kunduchi',
    type: 'business',
    subtitle: 'Vyakula',
    verified: true,
    avatarTone: 'gold',
    bio: 'Chakula cha Bahari · Kunduchi Beach',
    followers: 3100,
    category: 'Vyakula',
    mada: ['kiuchumi', 'kijamii', 'utamaduni'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 1.4,
    open: true,
    openLabel: 'Imefunguliwa hadi saa 4:00 usiku',
    offers: false,
    rating: 4.9,
    reviews: 340,
    since: 'Biashara tangu 2022',
  },
  mlimaniSeafood: {
    id: 'mlimaniSeafood',
    name: 'Mlimani Fresh Seafoods',
    handle: '@mlimani.seafood',
    type: 'business',
    subtitle: 'Chakula & Mapishi ya Bahari',
    verified: false,
    avatarTone: 'teal',
    bio: 'Samaki wa kupaka, kamba & pweza safi · Mbezi Beach',
    followers: 980,
    category: 'Vyakula',
    mada: ['kiuchumi'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 2.8,
    open: true,
    openLabel: 'Wazi: saa 5:00 asubuhi – 5:00 usiku',
    offers: false,
    rating: 4.7,
    reviews: 98,
    since: 'Biashara tangu 2024',
  },
  mwengeWood: {
    id: 'mwengeWood',
    name: 'Mwenge Woodcarvers & Curio',
    handle: '@mwenge.wood',
    type: 'business',
    subtitle: 'Sanaa na Huduma',
    verified: true,
    avatarTone: 'slate',
    bio: 'Kikundi cha Wasanii · Mwenge',
    followers: 1500,
    category: 'Wataalamu',
    mada: ['utamaduni', 'kiuchumi'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 4.8,
    open: false,
    openLabel: 'Wazi: saa 8:00 asubuhi – 6:00 usiku',
    offers: false,
    rating: 4.9,
    reviews: 76,
    since: 'Biashara tangu 2021',
  },
  wakumeleStore: {
    id: 'wakumeleStore',
    name: 'Wakulima Store',
    handle: '@wakulima.store',
    type: 'business',
    subtitle: 'Maduka ya Kilimo',
    verified: true,
    avatarTone: 'green',
    bio: 'Mbolea, mbegu na zana za kilimo · Tegeta Kibaoni',
    followers: 4200,
    category: 'Maduka',
    mada: ['kilimo', 'kiuchumi'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 4.2,
    open: true,
    openLabel: 'Wazi: saa 7:00 asubuhi – 7:00 usiku',
    offers: true,
    rating: 4.6,
    reviews: 210,
    since: 'Biashara tangu 2022',
  },

  // ── GUNDUA: channels za kugundua ─────────────────────────────
  bbcSwahili: {
    id: 'bbcSwahili',
    name: 'BBC Swahili',
    handle: '@bbcswahili',
    type: 'channel',
    relationship: 'Hujafuatilia',
    verified: true,
    subtitle: 'Habari',
    avatarTone: 'clay',
    bio: 'Habari za kimataifa na Afrika kwa Kiswahili.',
    followers: 286000,
    following: 0,
    posts: 12500,
    since: 'Channel tangu 2024',
    category: 'Habari',
    mada: ['kijamii', 'siasa', 'elimu'],
    place: { mji: 'Global', mkoa: 'Global', nchi: 'Global' },
    online: true,
    language: 'Kiswahili',
  },
  azamSports: {
    id: 'azamSports',
    name: 'Azam Sports',
    handle: '@azamsports',
    type: 'channel',
    relationship: 'Hujafuatilia',
    verified: true,
    subtitle: 'Michezo',
    avatarTone: 'blue',
    bio: 'Michezo, matokeo na uchambuzi wa Ligi Kuu.',
    followers: 412000,
    following: 0,
    posts: 8600,
    since: 'Channel tangu 2024',
    category: 'Michezo',
    mada: ['michezo', 'burudani'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    online: true,
    language: 'Kiswahili',
  },

  // ── GUNDUA: hubs za kugundua ─────────────────────────────────
  morogoroOrganic: {
    id: 'morogoroOrganic',
    name: 'Morogoro Organic Farming Hub',
    handle: '@morogoro.organic',
    type: 'hub',
    relationship: 'Hujajiunga',
    verified: false,
    subtitle: 'Kilimo Endelevu',
    avatarTone: 'green',
    bio: 'Kilimo hai, umwagiliaji wa kisasa na masoko ya moja kwa moja.',
    followers: 1850,
    members: 1850,
    mada: ['kilimo', 'mazingira', 'kiuchumi'],
    place: { mji: 'Morogoro', mkoa: 'Morogoro', nchi: 'Tanzania' },
    online: true,
    activityToday: 34,
  },

  // ── GUNDUA: jumuiya za umma (communities) ───────────────────
  wakulimaTz: {
    id: 'wakulimaTz',
    name: 'Wakulima Tanzania',
    handle: '@wakulima.tz',
    type: 'community',
    relationship: 'Hujajiunga',
    subtitle: 'Kilimo-biashara, Ufugaji & Masoko',
    avatarTone: 'gold',
    bio: 'Kuunganisha wakulima na masoko ya moja kwa moja bila madalali.',
    members: 12800,
    followers: 12800,
    mada: ['kilimo', 'kiuchumi', 'kijamii'],
    place: { mji: 'Morogoro', mkoa: 'Morogoro', nchi: 'Tanzania' },
    online: true,
    public: true,
  },
  afyaJamii: {
    id: 'afyaJamii',
    name: 'Afya kwa Jamii',
    handle: '@afya.jamii',
    type: 'community',
    relationship: 'Hujajiunga',
    subtitle: 'Afya & Ustawi',
    avatarTone: 'teal',
    bio: 'Elimu ya afya, kinga ya magonjwa na ustawi wa jamii.',
    members: 6400,
    followers: 6400,
    mada: ['afya', 'ustawi', 'elimu'],
    place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    online: true,
    public: true,
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

/* ── Kurasa za placeholder (Gundua, Spaces, Business) + Chat (halisi) ─ */
// Kumbuka: haya ni MAELEZO ya kile kitakachojengwa — si UI ya mwisho.

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

/* ══════════════════════════════════════════════════════════════
   MFUMO (SYSTEM) — hali ya kifaa, data iliyookolewa, relay,
   foleni ya kusubiri, cache, nearby na shughuli za usafirishaji.

   HAYA NI DATA YA MAJARIBIO. Hali halisi itatoka kwa local DB,
   sync engine na transport halisi baadaye — kupitia service ileile.

   "DATA SAVED" = data ya internet ILIYOEPUSHWA kwa sababu content
   ilifika kwa njia ya karibu / cache / relay iliyoidhinishwa.
   SI: salio la relay, Hai Points, ukubwa wa storage, wala cache pekee.
   ══════════════════════════════════════════════════════════════ */

/* ── Data iliyookolewa (MB) kwa kila kipimo ────────────────── */

export const systemDataSaved = {
  today: {
    total: 184,
    breakdown: [
      { id: 'sharing', label: 'Kushiriki kwa karibu', mb: 96, hint: 'Watu waliipata content moja kwa moja' },
      { id: 'cache', label: 'Content iliyokuwa cached', mb: 52, hint: 'Ilikuwa kwenye kifaa tayari' },
      { id: 'delivery', label: 'Uwasilishaji wa karibu', mb: 24, hint: 'Faili zilizohamishwa bila internet' },
      { id: 'mesh', label: 'Local Mesh', mb: 12, hint: 'Faili zilizopeanwa kifaa kwa kifaa — bila internet' },
    ],
    impact: [
      { id: 'received', label: 'Content iliyopokelewa kwa karibu', value: '42' },
      { id: 'shared', label: 'Content iliyoshirikiwa kwa karibu', value: '17' },
      { id: 'devices', label: 'Vifaa vilivyosaidiwa', value: '2' },
      { id: 'transfers', label: 'Uhamisho uliokamilika', value: '61' },
      { id: 'used', label: 'Data ya internet iliyotumika', value: '96 MB' },
      { id: 'avoided', label: 'Data ya internet iliyoepushwa', value: '184 MB' },
    ],
  },
  week: {
    total: 1043,
    breakdown: [
      { id: 'sharing', label: 'Kushiriki kwa karibu', mb: 560, hint: 'Watu waliipata content moja kwa moja' },
      { id: 'cache', label: 'Content iliyokuwa cached', mb: 280, hint: 'Ilikuwa kwenye kifaa tayari' },
      { id: 'delivery', label: 'Uwasilishaji wa karibu', mb: 131, hint: 'Faili zilizohamishwa bila internet' },
      { id: 'mesh', label: 'Local Mesh', mb: 72, hint: 'Faili zilizopeanwa kifaa kwa kifaa — bila internet' },
    ],
    impact: [
      { id: 'received', label: 'Content iliyopokelewa kwa karibu', value: '238' },
      { id: 'shared', label: 'Content iliyoshirikiwa kwa karibu', value: '96' },
      { id: 'devices', label: 'Vifaa vilivyosaidiwa', value: '6' },
      { id: 'transfers', label: 'Uhamisho uliokamilika', value: '341' },
      { id: 'used', label: 'Data ya internet iliyotumika', value: '612 MB' },
      { id: 'avoided', label: 'Data ya internet iliyoepushwa', value: '1.0 GB' },
    ],
  },
  month: {
    total: 4230,
    breakdown: [
      { id: 'sharing', label: 'Kushiriki kwa karibu', mb: 2210, hint: 'Watu waliipata content moja kwa moja' },
      { id: 'cache', label: 'Content iliyokuwa cached', mb: 1180, hint: 'Ilikuwa kwenye kifaa tayari' },
      { id: 'delivery', label: 'Uwasilishaji wa karibu', mb: 520, hint: 'Faili zilizohamishwa bila internet' },
      { id: 'mesh', label: 'Local Mesh', mb: 320, hint: 'Faili zilizopeanwa kifaa kwa kifaa — bila internet' },
    ],
    impact: [
      { id: 'received', label: 'Content iliyopokelewa kwa karibu', value: '986' },
      { id: 'shared', label: 'Content iliyoshirikiwa kwa karibu', value: '412' },
      { id: 'devices', label: 'Vifaa vilivyosaidiwa', value: '19' },
      { id: 'transfers', label: 'Uhamisho uliokamilika', value: '1,428' },
      { id: 'used', label: 'Data ya internet iliyotumika', value: '2.4 GB' },
      { id: 'avoided', label: 'Data ya internet iliyoepushwa', value: '4.1 GB' },
    ],
  },
}

/* ── Cache ≠ Saved ──────────────────────────────────────────
   `saved` = vitu mtumiaji ameviweka kwa mkono (Zilizohifadhiwa).
   `cached` = content inayobaki kwa ufanisi wa mtandao.         */

export const systemCache = {
  savedItems: 3,
  savedMb: 1268,
  cachedItems: 18,
  cachedMb: 640,
  note: 'Cache inabaki kwa ufanisi wa mtandao. Si kila byte yake inaepusha internet — ile iliyoepusha imeorodheshwa kwenye Data Saved.',
}

/* ── Foleni ya vitendo vinavyosubiri (base) ────────────────── */

export const systemQueueItems = [
  { id: 'q1', kind: 'message', label: 'Ujumbe kwa Amina', detail: 'Chat · maandishi', at: 'dakika 4' },
  { id: 'q2', kind: 'post', label: 'Chapisho: “Mafunzo ya kilimo”', detail: 'Chapisho · 1 picha', at: 'dakika 9' },
  { id: 'q3', kind: 'photo', label: 'Picha 2 (albamu ya sherehe)', detail: 'Picha · 6.4 MB', at: 'dakika 12' },
  { id: 'q4', kind: 'reaction', label: 'Mapenzi kwa chapisho la Juma', detail: 'Mwingiliano', at: 'dakika 30' },
  { id: 'q5', kind: 'comment', label: 'Maoni kwenye Reel', detail: 'Maoni · lilihitaji mtandao', at: 'saa 2' },
]

/* ── Sera ya Internet Relay (POLICY) ────────────────────────
   Internet Relay = njia ya MAWASILIANO yenye ukomo mkubwa:
   ujumbe mfupi pekee. SI mfumo wa kupeleka faili.

   ⛔ HAIRUHUSIWI: video · reels · picha · sauti · hati · PDF ·
      ZIP · viambatisho · uploads kubwa · uhamishaji wa media.
      Hakuna vighairi (exceptions) kwa faili kubwa.              */

export const systemRelayPolicy = {
  hardMaxMb: 5,          // ukomo wa lazima — hauwezi kuvukwa
  defaultMb: 3,          // kiwango cha kuanzia
  optionsMb: [3, 5],     // mtumiaji achague kati ya hizi
  maxMessageKb: 32,      // ujumbe mmoja: mdogo na ulioboreshwa
  eligible: [
    { id: 'text', label: 'Ujumbe wa maandishi', hint: 'Maandishi pekee — bila viambatisho' },
    { id: 'deliveryMeta', label: 'Metadata ya uwasilishaji', hint: 'delivery · read · sync' },
    { id: 'syncMeta', label: 'Metadata ya usawazishaji', hint: 'Kiwango cha chini kinachohitajika' },
    { id: 'routing', label: 'Uelekezaji mdogo', hint: 'Taarifa ndogo ili ujumbe ufike' },
  ],
  ineligible: [
    { id: 'video', label: 'Video' },
    { id: 'reel', label: 'Reels' },
    { id: 'image', label: 'Picha' },
    { id: 'audio', label: 'Sauti' },
    { id: 'document', label: 'Hati' },
    { id: 'pdf', label: 'PDF' },
    { id: 'zip', label: 'ZIP' },
    { id: 'attachment', label: 'Viambatisho' },
    { id: 'largeUpload', label: 'Uploads kubwa' },
  ],
  priorities: ['Ujumbe wa maandishi', 'Metadata ya uwasilishaji', 'Metadata ya usawazishaji'],
  optimization: [
    'Uwekaji mfupi (compact serialization)',
    'Metadata isiyo ya lazima inaondolewa',
    'Uandishi bora (efficient encoding)',
    'Ujumuishaji wa majibu (ack batching)',
    'Kuepuka kutuma kinachojulikana tayari',
  ],
  alternatives: [
    { id: 'wifiDirect', label: 'Wi-Fi Direct' },
    { id: 'bluetooth', label: 'Bluetooth' },
    { id: 'wifi', label: 'Wi-Fi ya karibu' },
    { id: 'internet', label: 'Upload ya kawaida (internet, kwa uamuzi wako)' },
  ],
  messages: {
    purpose: 'Internet Relay husaidia ujumbe mfupi kusafiri kwa kutumia data ndogo iwezekanavyo.',
    blocked: 'Internet Relay supports messages only.',
    tooLarge: 'Message too large for Internet Relay',
    off: 'Internet Relay imezimwa — washa kwanza.',
    limitReached: 'Daily Internet Relay limit reached',
    noAutoFallback: 'Faili haziingii kwenye relay, na hatubadili kwenda internet ya simu kimya kimya.',
    measurable:
      'Tunaripoti tu kile tunachopima. Haturipoti salio la bundle, kifurushi wala salio la carrier.',
    separate:
      'Relay Data Used (data ya internet iliyotumika kusaidia ujumbe) ni kipimo tofauti na Data Saved (data ya internet iliyoepushwa).',
  },
}

/* ── Relay: chaguo za mawasiliano (maandishi pekee) ────────── */

export const systemRelayChoices = [
  { id: 'help', label: 'Kusaidia ujumbe wa wengine', hint: 'Ujumbe mfupi wa wengine unaweza kupita njia yako' },
  { id: 'mine', label: 'Kupitisha ujumbe wangu', hint: 'Ujumbe wako unafika hata mtandao ukiwa dhaifu' },
  { id: 'selected', label: 'Ujumbe niliouchagua pekee', hint: 'Mazungumzo unayochagua moja moja' },
]

/* ── Njia: Local Mesh (content) vs Internet Relay (ujumbe) ── */

export const systemTransports = [
  { id: 'wifi', scope: 'local', label: 'Wi-Fi ya karibu', hint: 'Kifaa kwa kifaa kwenye mtandao mmoja — bila data' },
  { id: 'wifiDirect', scope: 'local', label: 'Wi-Fi Direct', hint: 'Moja kwa moja kati ya vifaa — bila router' },
  { id: 'bluetooth', scope: 'local', label: 'Bluetooth', hint: 'Faili ndogo, bila data' },
  { id: 'internet', scope: 'internet', label: 'Internet Relay', hint: 'Ujumbe mfupi pekee · ukomo wa kila siku' },
]

/* ── Local Mesh: content ya ndani (kitu tofauti kabisa) ────── */

export const systemLocalMesh = {
  kinds: [
    { id: 'video', label: 'Video', hint: 'kwa Wi-Fi Direct' },
    { id: 'image', label: 'Picha', hint: 'kwa Wi-Fi ya karibu' },
    { id: 'audio', label: 'Sauti', hint: 'kwa Bluetooth' },
    { id: 'document', label: 'Hati', hint: 'faili ndogo' },
    { id: 'message', label: 'Ujumbe', hint: 'maandishi' },
  ],
  rules: [
    'Ruhusa ya mpokeaji inahitajika',
    'Inategemea uwezo wa njia, storage na betri',
    'Sheria za usalama zinafuata',
  ],
  stats: { dataRelayedMb: 12, devicesHelped: 4 },
  note:
    'Local Mesh hubeba content kubwa bila data ya simu. Internet Relay hubeba ujumbe mfupi pekee — haya ni mambo mawili tofauti.',
}

/* ── Foleni ya relay: ujumbe mfupi ulioboreshwa ─────────────
   `rawKb` = ukubwa kabla; `compactKb` = baada ya uboreshaji.   */

export const systemRelayMessages = [
  { id: 'rm1', kind: 'text', priority: 1, label: 'Ujumbe kwa Amina: “Nimefika”', rawKb: 5.4, compactKb: 3, state: 'relayed' },
  { id: 'rm2', kind: 'deliveryMeta', priority: 2, label: 'Risiti ya uwasilishaji (Juma)', rawKb: 2.1, compactKb: 1, state: 'relayed' },
  { id: 'rm3', kind: 'text', priority: 1, label: 'Ujumbe kwa Fatma: “Nitachelewa”', rawKb: 6.2, compactKb: 4, state: 'waiting' },
  { id: 'rm4', kind: 'syncMeta', priority: 3, label: 'Metadata ya usawazishaji', rawKb: 3.5, compactKb: 2, state: 'waiting' },
]

/* ── Content inayopatikana karibu (Share Nearby) ───────────── */

export const systemLocalContent = [
  { id: 's1', kind: 'reel', label: 'Reel: Mafunzo ya kilimo', meta: 'Amina · 18 MB', state: 'ready' },
  { id: 's2', kind: 'photo', label: 'Picha 6: Sherehe', meta: 'Hassan · 12 MB', state: 'ready' },
  { id: 's3', kind: 'audio', label: 'Sauti: Mahojiano', meta: 'Tech Sasa · 6 MB', state: 'ready' },
  { id: 's4', kind: 'document', label: 'Hati: Muhtasari wa warsha', meta: 'Dar Tech Hub · 1.2 MB', state: 'ready' },
]

/* ── Content inayoweza kuhifadhiwa kwa matumizi bila mtandao ── */

export const systemOfflineables = [
  { id: 'o1', kind: 'video', label: 'Video: Mahojiano ya mwalimu', meta: '48 MB · inahitaji mtandao' },
  { id: 'o2', kind: 'reel', label: 'Reel: Kidokezo cha kilimo', meta: '18 MB · inahitaji mtandao' },
  { id: 'o3', kind: 'document', label: 'Hati: Muhtasari wa warsha', meta: '1.2 MB · faili ndogo' },
]

/* ── Shughuli za mfumo (transport activity) ────────────────── */

export const systemActivity = {
  summary: { receiving: 2, sharing: 1, waiting: 3, lastSync: 'dakika 2' },
  items: [
    { id: 'a1', kind: 'receiving', label: 'Unapokea kutoka kwa Juma', detail: 'Wi-Fi Direct · Reel 18 MB', at: 'sasa hivi' },
    { id: 'a2', kind: 'relay', label: 'Ulipitisha ujumbe kwa Hassan', detail: 'Internet Relay · 0.9 MB', at: 'dakika 3' },
    { id: 'a3', kind: 'sync', label: 'Sync ya vitendo 2', detail: 'Internet · 1.4 MB', at: 'dakika 2' },
    { id: 'a4', kind: 'cache', label: 'Cache ya video imeongezwa', detail: 'Reel 24 MB imehifadhiwa kwa muda', at: 'dakika 18' },
    { id: 'a5', kind: 'queued', label: 'Chapisho linasubiri', detail: 'Linahitaji internet', at: 'dakika 9' },
  ],
}

/* ── Walio karibu (Nearby) — watu wanajoin na identity ─────── */

export const systemNearby = {
  people: [
    { userId: 'amina', meta: 'meta 40 · Wi-Fi Direct' },
    { userId: 'juma', meta: 'meta 90 · Bluetooth' },
    { userId: 'fatma', meta: 'meta 120 · Wi-Fi ya karibu' },
  ],
  content: [
    { id: 'nc1', label: 'Reel: Mafunzo ya kilimo', meta: 'Amina · 18 MB' },
    { id: 'nc2', label: 'Picha 6: Sherehe', meta: 'Hassan · 12 MB' },
  ],
  hubs: [{ id: 'nh1', label: 'Dar Tech Hub', meta: 'watu 12 wapo sasa' }],
  notes: ['Kifaa 3 vinaonekana', 'Faili 2 zinapatikana bila internet'],
}

/* ── Uwasilishaji wa chapisho (Post delivery) ──────────────────
   Post ni MOJA. Uwasilishaji ni metadata — si aina ya pili ya post. */

export const systemDeliveryOptions = [
  { id: 'local', label: 'Local only', hint: 'Hubaki kwenye kifaa hiki', needs: [] },
  { id: 'nearby', label: 'Nearby', hint: 'Watu walio karibu wanaweza kuipata', needs: ['nearby'] },
  { id: 'community', label: 'Community', hint: 'Channels, Hubs na jumuiya zako', needs: ['internet'] },
  { id: 'global', label: 'Global', hint: 'Inaonekana kwa wote mtandaoni', needs: ['internet'] },
]

/* ── Hali za kifaa (scenarios za majaribio) ──────────────────
   Local Mesh NA Internet Relay ni hali mbili TOFAUTI.
   Internet Relay: imezimwa kwa default (OFF by default).       */

export const systemScenarioDefault = 'local'

export const systemScenarios = {
  online: {
    id: 'online',
    connection: { state: 'ONLINE', label: 'Mtandaoni', detail: 'Internet inapatikana kwa kasi ya kawaida', transport: 'Internet' },
    localMesh: { status: 'available', label: 'Available', detail: 'Vifaa vya karibu vinaweza kuonekana' },
    internetRelay: { enabled: true, limitMb: 3, usedMb: 1.2, messagesRelayed: 18, devicesHelped: 4 },
    relayChoices: { help: false, mine: false, selected: false },
    transports: { wifi: true, wifiDirect: true, bluetooth: true, internet: true },
    transportReasons: {},
    queue: { q1: 'synced', q2: 'synced', q3: 'waiting', q4: 'synced', q5: 'failed' },
    lastSync: 'dakika 2',
    nearby: { people: 3, content: 2, hubs: 1 },
  },
  local: {
    id: 'local',
    connection: { state: 'LOCAL', label: 'Local Active', detail: 'Umeunganishwa na kundi la karibu (vifaa 3)', transport: 'Wi-Fi Direct' },
    localMesh: { status: 'active', label: 'Active', detail: 'Vifaa 3 vinaunganishwa kwa Wi-Fi Direct' },
    internetRelay: { enabled: false, limitMb: 3, usedMb: 0, messagesRelayed: 0, devicesHelped: 0 },
    relayChoices: { help: true, mine: true, selected: false },
    transports: { wifi: true, wifiDirect: true, bluetooth: true, internet: false },
    transportReasons: { internet: 'Internet Relay imezimwa — ujumbe mfupi pekee, kwa idhini yako' },
    queue: { q1: 'waiting', q2: 'waiting', q3: 'waiting', q4: 'synced', q5: 'failed' },
    lastSync: 'dakika 2',
    nearby: { people: 3, content: 2, hubs: 1 },
  },
  limited: {
    id: 'limited',
    connection: { state: 'LIMITED', label: 'Limited', detail: 'Internet ni dhaifu — content kubwa inasubiri', transport: 'Internet (polepole)' },
    localMesh: { status: 'available', label: 'Available', detail: 'Kifaa kimoja kinaweza kuonekana karibu' },
    internetRelay: { enabled: true, limitMb: 3, usedMb: 3, messagesRelayed: 41, devicesHelped: 3 },
    relayChoices: { help: false, mine: true, selected: false },
    transports: { wifi: true, wifiDirect: true, bluetooth: true, internet: false },
    transportReasons: { internet: 'Ukomo wa kila siku umefikiwa — relay imesimama' },
    queue: { q1: 'synced', q2: 'waiting', q3: 'waiting', q4: 'synced', q5: 'failed' },
    lastSync: 'dakika 11',
    nearby: { people: 2, content: 1, hubs: 0 },
  },
  offline: {
    id: 'offline',
    connection: { state: 'OFFLINE', label: 'Offline', detail: 'Hakuna internet — michango inasubiri', transport: 'Bluetooth' },
    localMesh: { status: 'off', label: 'Offline', detail: 'Hakuna kifaa kinachoonekana karibu' },
    internetRelay: { enabled: false, limitMb: 3, usedMb: 0.4, messagesRelayed: 3, devicesHelped: 1 },
    relayChoices: { help: false, mine: false, selected: false },
    transports: { wifi: false, wifiDirect: false, bluetooth: true, internet: false },
    transportReasons: {
      wifi: 'Hakuna kundi la karibu linaloonekana',
      wifiDirect: 'Haipatikani kwa sasa',
      internet: 'Hakuna mtandao',
    },
    queue: { q1: 'waiting', q2: 'waiting', q3: 'waiting', q4: 'waiting', q5: 'failed' },
    lastSync: 'saa 3',
    nearby: { people: 0, content: 0, hubs: 0 },
  },
  waiting_sync: {
    id: 'waiting_sync',
    connection: { state: 'WAITING_SYNC', label: 'Waiting for Sync', detail: 'Vitendo 3 vinasubiri mtandao', transport: 'Internet inahitajika' },
    localMesh: { status: 'off', label: 'Offline', detail: 'Hakuna kifaa kinachoonekana' },
    internetRelay: { enabled: true, limitMb: 3, usedMb: 2.4, messagesRelayed: 12, devicesHelped: 1 },
    relayChoices: { help: false, mine: true, selected: false },
    transports: { wifi: false, wifiDirect: false, bluetooth: true, internet: false },
    transportReasons: {
      wifi: 'Hakuna kundi la karibu',
      wifiDirect: 'Haipatikani kwa sasa',
      internet: 'Inasubiri mtandao',
    },
    queue: { q1: 'waiting', q2: 'waiting', q3: 'waiting', q4: 'synced', q5: 'failed' },
    lastSync: 'saa 1',
    nearby: { people: 0, content: 0, hubs: 0 },
  },
  syncing: {
    id: 'syncing',
    connection: { state: 'SYNCING', label: 'Syncing', detail: 'Inatuma vitendo vinavyosubiri', transport: 'Internet' },
    localMesh: { status: 'active', label: 'Active', detail: 'Vifaa 2 vinaunganishwa' },
    internetRelay: { enabled: true, limitMb: 5, usedMb: 1.6, messagesRelayed: 22, devicesHelped: 5 },
    relayChoices: { help: false, mine: true, selected: false },
    transports: { wifi: true, wifiDirect: true, bluetooth: true, internet: true },
    transportReasons: {},
    queue: { q1: 'sending', q2: 'sending', q3: 'waiting', q4: 'synced', q5: 'failed' },
    lastSync: 'sasa hivi',
    nearby: { people: 1, content: 1, hubs: 0 },
  },
}

/* ══════════════════════════════════════════════════════════════
   CHAT — mfumo mmoja wa mawasiliano
   conversation.type: 'direct' | 'group'
   parentContext: community/hub = METADATA pekee (si engine ya pili)
   Identity: Phone Contact → PASIHAI Account → PASIHAI Friend → Saved Friend
   ══════════════════════════════════════════════════════════════ */

export const chatFilters = [
  { id: 'zote', label: 'Zote' },
  { id: 'direct', label: 'Direct' },
  { id: 'vikundi', label: 'Vikundi' },
  { id: 'haijasomwa', label: 'Haijasomwa' },
]

export const chatConversations = [
  {
    id: 'c1', type: 'direct', title: 'Amina Hassan', tone: 'green', unread: 2,
    accountId: 'amina', relationship: 'saved', delivery: 'synced', updatedAt: '10:42',
    last: { by: 'them', text: 'Habari! Umefika salama Kunduchi?', at: '10:42', kind: 'text' },
  },
  {
    id: 'c2', type: 'group', title: 'Madaktari Class', tone: 'blue', unread: 0, members: 48,
    groupIcon: 'group', parentContext: null, delivery: 'synced', updatedAt: '09:18',
    last: { by: 'juma', text: 'Juma: Kesho lecture ya mifupa inaanza saa 3 kamili.', at: '09:18', kind: 'text' },
  },
  {
    id: 'c3', type: 'group', title: 'Wakulima Dar', tone: 'gold', unread: 5, members: 36,
    groupIcon: 'group', parentContext: { type: 'community', label: 'Wakulima Tanzania', spaces: true },
    delivery: 'synced', updatedAt: '08:51',
    last: { by: 'asha', text: 'Asha: Nimetuma taarifa ya mbegu za mahindi zilizoidhinishwa.', at: '08:51', kind: 'text' },
  },
  {
    id: 'c4', type: 'direct', title: 'Juma Rashid', tone: 'clay', unread: 0,
    accountId: 'juma', relationship: 'friend', delivery: 'synced', updatedAt: 'Jana',
    last: { by: 'them', text: 'Sauti ya majadiliano ya leo iko tayari', at: 'Jana', kind: 'audio' },
  },
  {
    id: 'c5', type: 'group', title: 'Flutter & AI Developers', tone: 'plum', unread: 0, members: 126,
    groupIcon: 'hub', parentContext: { type: 'hub', label: 'Dar Tech Hub' }, delivery: 'synced', updatedAt: 'Jana',
    last: { by: 'kelvin', text: 'Kelvin: Mkutano wa Jumamosi Masaki utaanza saa 4', at: 'Jana', kind: 'text' },
  },
  {
    id: 'c6', type: 'direct', title: 'Hamisi Bakari', tone: 'slate', unread: 0,
    accountId: 'hamisi', relationship: 'friend', delivery: 'local', updatedAt: '11:19',
    last: { by: 'them', text: 'Ramani na Mavazi Safari', at: '11:19', kind: 'video' },
  },
]

/* ── Ujumbe: kinds zote za mfumo mmoja ───────────────────────
   state:  synced · sent · waiting · local · relayed · vault ·
           blocked-media · waiting-wifi · waiting-data
   route:  internet · relay · mesh · local                      */

export const chatMessages = {
  c1: [
    { id: 'm1', from: 'them', kind: 'text', text: 'Habari! Nimefika Kunduchi beach, upepo ni mwanana sana. Uko njiani kuja? 🏖️✨', at: '10:38', state: 'sent' },
    { id: 'm2', from: 'me', kind: 'text', text: 'Ndiyo niko njiani, nimepanda bodaboda nimefika karibu na Slipway.', at: '10:40', state: 'synced' },
    { id: 'm3', from: 'them', kind: 'shared', text: 'Chapisho la Home', at: '10:41', state: 'sent',
      shared: { kind: 'post', title: 'Samaki wa kupaka karibu na ufukwe wa Kunduchi', sub: 'Ushauri bora kabisa wa chakula cha mchana kwa leo!…', tone: 'clay', meta: 'Kunduchi Beach', cta: 'Tazama chapisho kwenye Home' } },
    { id: 'm4', from: 'them', kind: 'audio', at: '10:42', state: 'sent', reactions: { heart: 1 },
      audio: { duration: '0:38', progress: 0.35, bars: 26, label: 'Sauti' } },
    { id: 'm5', from: 'them', kind: 'poll', at: '10:43', state: 'sent',
      poll: { title: 'Tuagize nini kwa chakula cha mchana?', total: 4, options: [
        { id: 'p1', label: 'Samaki wa Kupaka', votes: 72, by: 'Amina alipiga kura hii' },
        { id: 'p2', label: 'Biriani ya Kuku', votes: 18 },
        { id: 'p3', label: 'Mishkaki ya Ng’ombe', votes: 10 },
      ] } },
    { id: 'm6', from: 'them', kind: 'location', at: '10:44', state: 'sent',
      location: { title: 'Kunduchi Beach Road', sub: 'Usawazishaji wa moja kwa moja kupitia mtandao wa PASIHAI', badge: 'Dakika 8 zimebaki', who: 'Mtandaoni' } },
  ],
  c2: [
    { id: 'g1', from: 'kelvin', kind: 'text', at: '08:30', state: 'sent', role: 'Msimamizi',
      text: 'Habari wote, tafadhali kumbukeni ratiba ya masomo ya Muhimbili kwa wiki hii imeboreshwa.',
      doc: { name: 'Ratiba_Rotations_Muhimbili.pdf', meta: '1.4 MB · PDF Doc', kb: 1434 }, reactions: { like: 14, clap: 6 } },
    { id: 'g2', from: 'sarah', kind: 'text', at: '08:42', state: 'sent', role: 'Mwanafunzi', text: 'Asante Dr. Kesho tunakutana wodi gani asubuhi?' },
    { id: 'g3', from: 'me', kind: 'text', at: '09:10', state: 'synced', replyTo: { by: 'Sarah', text: 'Kesho tunakutana wodi gani asubuhi?' },
      text: 'Tutaanza Wodi 4 ya Watoto kisha kuelekea ICU ya Upasuaji.' },
    { id: 'g4', from: 'juma', kind: 'text', at: '09:18', state: 'waiting', role: 'Kiongozi',
      text: 'Kesho lecture ya mifupa inaanza saa 3 kamili asubuhi. Nitaweka kinasa sauti tayari kwa wote.',
      audioNote: 'Audio imeandaliwa' },
    { id: 'g5', from: 'juma', kind: 'poll', at: '09:22', state: 'sent',
      poll: { title: 'Je tufanye mjadala wa marudio Ijumaa jioni au Jumamosi asubuhi?', total: 42, options: [
        { id: 'g5a', label: 'Ijumaa 12:00 Jioni', votes: 42, count: 18 },
        { id: 'g5b', label: 'Jumamosi 03:00 Asubuhi', votes: 58, count: 24, chosen: true },
      ] } },
  ],
  c3: [
    { id: 'w1', from: 'rAshid', kind: 'announcement', at: 'Leo', state: 'sent',
      announcement: { from: 'Wakulima Tanzania', text: 'Msimu mpya wa ruzuku ya mbegu za mahindi na mtama umeanza. Wasiliana na viongozi wa vikundi vyenu vya mkoa kupata mgawao.' } },
    { id: 'w2', from: 'rAshid', kind: 'text', at: '08:30', state: 'sent', role: 'Kiongozi wa Kikundi',
      text: 'Habari za asubuhi wakulima wenzangu wa Dar es Salaam. Malori ya mboea yatafika kesho eneo la Mbagala na Tegeta kwa ajili ya usambazaji.' },
    { id: 'w3', from: 'asha', kind: 'text', at: '08:51', state: 'sent', role: 'Rafiki',
      text: 'Nimetuma taarifa ya mbegu za mahindi zilizoidhinishwa kwa msimu huu kwenye faili hapa chini. Pakueni na muangalie aina inayofaa mchanga wenu.',
      doc: { name: 'Muongozo_Mbegu_Dar_2025.pdf (680 KB)', meta: '680 KB · Hati Rasmi', kb: 680 }, reactions: { like: 19, heart: 12 } },
    { id: 'w4', from: 'me', kind: 'text', at: '09:05', state: 'synced', replyTo: { by: 'Asha Mussa', text: 'Muongozo_Mbegu_Dar_2025.pdf (680 KB)' },
      text: 'Asante sana Asha, je wakulima wa Kigamboni watafikishiwa lini mizigo yao?' },
    { id: 'w5', from: 'space', kind: 'shared', at: '09:14', state: 'sent',
      shared: { kind: 'article', eyebrow: 'Imechapishwa kutoka Spaces · Wakulima Tanzania', title: 'Uzoefu wa kilimo cha umwagiliaji kwa matone mjini', sub: 'Mbinu bora za kupunguza gharama za maji hadi asilimia sitini huku ukiongeza mavuno…', meta: 'Mwandi: Juma Khalfan · 4 min kusoma' } },
  ],
  c4: [
    { id: 'j1', from: 'them', kind: 'audio', at: 'Jana', state: 'sent', audio: { duration: '1:12', progress: 0.15, bars: 22, label: 'Sauti' } },
    { id: 'j2', from: 'me', kind: 'text', at: 'Jana', state: 'synced', text: 'Nimesikiliza, nitakujibu kwa urefu jioni hii.' },
    { id: 'j3', from: 'them', kind: 'image', at: 'Jana', state: 'blocked-media',
      media: { label: 'Picha (3.2 MB)', meta: 'Juma Rashid · picha 4' },
      guard: { title: 'Inasubiri Wi-Fi au Data Kamili',
        text: 'Internet Relay haibebi picha nzito hivi sasa ili kulinda bando la wenzako kwenye mtandao wa dhahura.',
        primary: 'Tuma sasa kwa Data Yako', secondary: 'Subiri Wi-Fi' } },
  ],
  c5: [
    { id: 'f1', from: 'kelvin', kind: 'text', at: 'Jana', state: 'sent', text: 'Mkutano wa Jumamosi Masaki utaanza saa 4 usiku. Tafadhali jisajili kabla ya Ijumaa.' },
    { id: 'f2', from: 'me', kind: 'text', at: 'Jana', state: 'synced', text: 'Nimeshajisajili, nitakuja na laptop.' },
  ],
  c6: [
    { id: 'h1', from: 'me', kind: 'text', at: '10:52', state: 'synced', text: 'Hamisi, nimepata ramani ya safari ya Bagamoyo.' },
    { id: 'h2', from: 'them', kind: 'text', at: '11:15', state: 'sent', route: 'mesh', role: 'Local Mesh · kupitia ukaribu',
      text: 'Safi sana! Nipo hapa Tegeta stendi, nimeunganishwa kwenye PASIHAI Local node.' },
    { id: 'h3', from: 'me', kind: 'text', at: '11:16', state: 'relayed', route: 'relay',
      text: 'Nimekutumia ujumbe mfupi wa maandishi, utapokelewa haraka maana Internet Relay inapitisha maandishi pekee.' },
    { id: 'h4', from: 'me', kind: 'text', at: '11:18', state: 'vault', text: 'Tutakutana saa ngapi Posta kabla ya kuanza safari?', note: 'Folent #1 · Waiting for sync (upo kwenye foleni ya kutuma)' },
    { id: 'h5', from: 'them', kind: 'video', at: '11:19', state: 'blocked-media',
      text: 'Ramani_na_Mavazi_Safari.mp4',
      media: { label: 'Video · MP4 H.264', kb: 25400, meta: '24.8 MB', tone: 'slate' },
      guard: {
        title: 'Inasubiri Wi-Fi au Data Kamili',
        text: 'Internet Relay haibebi video au picha nzito hivi sasa ili kulinda na kuweka huru bando la wenzako kwenye mtandao wa dhahura.',
        primary: 'Tuma sasa kwa Data Yako',
        secondary: 'Subiri Wi-Fi',
        vault: 'Imehifadhiwa (Offline Vault)',
      } },
  ],
}

/* ── Simu (device contacts) — chanzo cha kifaa, si PASIHAI ── */

export const chatPhoneBook = [
  { id: 'p1', name: 'Amina Hassan', phone: '+255 784 ··· 120', tone: 'green', accountId: 'amina', friend: true, saved: true, member: true },
  { id: 'p2', name: 'Juma Rashid', phone: '+255 712 ··· 884', tone: 'clay', accountId: 'juma', friend: true, saved: true, member: true },
  { id: 'p3', name: 'Neema Mwamba', phone: '+255 754 ··· 003', tone: 'plum', accountId: 'neemaCreates', friend: true, saved: true, member: true },
  { id: 'p4', name: 'Hamisi Bakari', phone: '+255 754 ··· 654', tone: 'slate', accountId: 'hamisi', friend: true, saved: false, member: true },
  { id: 'p5', name: 'Rehema Salum', phone: '+255 786 ··· 220', tone: 'teal', accountId: 'rehema', friend: true, saved: false, member: true },
  { id: 'p6', name: 'Baraka Eliya', phone: '+255 745 ··· 118', tone: 'gold', accountId: 'barakaEng', friend: true, saved: false, member: true },
  { id: 'p7', name: 'Daudi Msuya', phone: '+255 715 ··· 447', tone: 'blue', accountId: 'daudi', friend: false, saved: false, member: true },
  { id: 'p8', name: 'Fatma Nassor', phone: '+255 689 ··· 992', tone: 'clay', accountId: 'fatma', friend: false, saved: false, member: true },
  { id: 'p9', name: 'Babu Ally', phone: '+255 712 458 902', tone: 'slate', accountId: null, friend: false, saved: false, member: false },
  { id: 'p10', name: 'Zawadi Komba', phone: '+255 784 112 334', tone: 'teal', accountId: null, friend: false, saved: false, member: false },
]

/* ── Utafutaji wa namba (kesi 4) ────────────────────────────── */

export const chatNumberLookup = {
  defaultNumber: '0784 123 456',
  country: '+255',
  cases: [
    { id: 'k1', match: '784123456', case: 'Kesi 1', name: 'Amina Hassan', phone: '+255 784 123 456', tone: 'green',
      accountId: 'amina', friend: true, saved: true, verified: true,
      note: 'Akaunti ipo kwenye marafiki uliohifadhi kwa mazungumzo ya faragha na ulinzi kamili.' },
    { id: 'k2', match: '754987654', case: 'Kesi 2', name: 'Hamisi Bakari', phone: '+255 754 987 654', tone: 'slate',
      accountId: 'hamisi', friend: true, saved: false,
      note: 'Rafiki wa PASIHAI aliyekubaliwa. Unaweza kumhifadhi kwa ufikiaji wa haraka.' },
    { id: 'k3', match: '682333444', case: 'Kesi 3', name: 'Musa Khalfan', phone: '+255 682 333 444', tone: 'blue',
      accountId: 'musa', friend: false, saved: false, handle: '@musak',
      note: 'Mtumiaji anaruhusu maombi ya mazungumzo kutoka kwa watu wasio marafiki kupitia uthibitishaji.' },
    { id: 'k4', match: '713000111', case: 'Kesi 4', name: null, phone: '+255 713 000 111', tone: 'slate',
      accountId: null, friend: false, saved: false,
      note: 'Namba hii haijasajiliwa kwenye mtandao wa PASIHAI bado. Mualike ajiunge sasa!' },
  ],
}

/* ── Maoni ya kielelezo (chanzo: contentRepository) ─────────────
   Maoni ni data ya demo; mtumiaji anaweza kuongeza maoni yake
   kwenye kikao (hali ya ndani — hakuna backend). */

export const postComments = {
  p1: [
    { id: 'cm1', authorId: 'juma', author: 'Juma Mwakyusa', tone: 'clay', text: 'Mimi huenda saa 5 asubuhi — nyanya nyingi huwa hazijaisha.', at: 'dakika 8' },
    { id: 'cm2', authorId: 'fatma', author: 'Fatma Nuru', tone: 'clay', text: 'Asante kwa taarifa. Bei ya nyanya leo ni shilingi ngapi kwa kilo?', at: 'dakika 5' },
  ],
  p2: [
    { id: 'cm3', authorId: 'hamisi', author: 'Hamisi Bakari', tone: 'slate', text: 'Hii ni muhimu. Tutumie nafasi hii kujifunza kwa pamoja.', at: 'saa 1' },
  ],
  p9: [
    { id: 'cm4', authorId: 'rehema', author: 'Rehema Salum', tone: 'teal', text: 'Mazoezi haya yalinisaidia sana kwenye mtihani wa mwaka jana.', at: 'saa 2' },
  ],
  p14: [
    { id: 'cm5', authorId: 'daudi', author: 'Daudi Msuya', tone: 'blue', text: 'Nimefika dukani leo — bidhaa ni halisi na bei ni ile iliyoandikwa.', at: 'saa 3' },
  ],
  p3: [
    { id: 'cm6', authorId: 'zainab', author: 'Zainab Rashid', tone: 'green', text: 'Muonekano ni safi. Nina swali: mnafanya usafirishaji Kariakoo?', at: 'saa 4' },
  ],
}

/* ── Maombi ya mazungumzo (chat requests) ──────────────────── */

export const chatRequests = [
  { id: 'r1', from: 'Musa Juma', handle: '@musajuma', tone: 'blue', state: 'pending', type: 'received',
    text: '“Habari Amir, nimepata namba yako kutoka kwa Hamisi kuhusu vifaa vya jua (solar panels). Tunaweza kuongea?”',
    via: 'Kupitia: Utafutaji wa Namba', mutual: 'Hamisi Bakari ni rafiki yenu wa pamoja.', mutualTone: 'clay', at: 'Leo 11:05' },
  { id: 'r2', from: 'Zawadi Komba', tone: 'teal', state: 'sent', type: 'sent', text: 'Ombi la mazungumzo kuhusu ushirikiano wa biashara.', at: 'Jana' },
  { id: 'r3', from: 'Kelvin Mushi', tone: 'plum', state: 'sent', type: 'sent', text: 'Ombi la mazungumzo kuhusu mafunzo ya Flutter.', at: 'Ikiwa 2 siku' },
]

/* ── Menu ya Chat (⋮) — Chat pekee ─────────────────────────── */

export const chatMoreMenu = [
  { id: 'settings', label: 'Mipangilio ya Chat', hint: 'Ulinzi, sauti na mwonekano' },
  { id: 'privacy', label: 'Faragha', hint: 'Nani anaweza kukutumia ombi' },
  { id: 'notifications', label: 'Taarifa', hint: 'Sauti na kimya' },
  { id: 'archived', label: 'Chats zilizohifadhiwa (Archived)', hint: '2' },
  { id: 'requests', label: 'Maombi ya mazungumzo', hint: '1 mpya' },
  { id: 'blocked', label: 'Waliotiwa marufuku', hint: '1' },
  { id: 'storage', label: 'Storage na media', hint: 'Media inayotumika: 84 MB' },
  { id: 'markall', label: 'Weka zote kama zimesomwa', hint: '' },
]

export const chatSettings = {
  /* Mwonekano: karatasi ni chaguo. Default = imezimwa (kawaida). */
  appearance: [{ id: 'paperView', label: 'Mwonekano wa karatasi', on: false }],
  privacy: ['Nani anaweza kutuma ombi la mazungumzo', 'Nani anaona namba yangu', 'Uthibitishaji wa marafiki wa pamoja'],
  notifications: [
    { id: 'n1', label: 'Sauti ya ujumbe', on: true },
    { id: 'n2', label: 'Kimya wakati wa usiku', on: false },
    { id: 'n3', label: 'Onyesho la kikundi', on: true },
  ],
  storage: [
    { id: 's1', label: 'Kupakua media kiotomatiki', on: false },
    { id: 's2', label: 'Hifadhi kwa matumizi bila mtandao', on: true },
  ],
  legacy: [
    { id: 'l1', label: 'Imehifadhiwa (Kifaa & Wingu)', hint: 'Chats 6', icon: 'cloud' },
    { id: 'l2', label: 'Sogeza kwa machaguo', hint: 'Arrange with swipe', icon: 'shuffle' },
  ],
  e2e: 'Ujumbe wako unalindwa na mifumo ya PASIHAI — mwanzo hadi mwisho.',
  localFirst:
    'Mawasiliano yanahifadhiwa kwenye kumbukumbu ya simu yako kwanza kabla ya kutumwa. Hakuna data inayopotea hata ukikishiwa na mtandao ghafla.',
}

/* ══════════════════════════════════════════════════════════════
   GUNDUA — safu ya UGUNDUZI (discovery layer)

   · Gundua HAIUNDI entity mpya: inasoma `users` (identity vikanoniki)
     + `liveSessions`. Hapa ni metadata ya UGUNDUZI pekee
     (mada · eneo · wakati · hali ya urafiki · profiles za umma).
   · PUBLIC pekee: kila kitu kinachoonekana kina `visibility: 'public'`.
     `gunduaPrivateEntities` ni ya MAJARIBIO pekee — haitokei kamwe.
   · Eneo = relevance, SI ruhusa. Karibu Nami huchuja ndani ya public.
   · Hakuna "mutual friends" (Facebook model) — kila mtu ana SABABU MOJA
     ya muktadha (`discoverReason`).
   ══════════════════════════════════════════════════════════════ */

/* Kiungo na msimbo wangu wa kugundulika (QR haitumii namba ya simu) */
export const gunduaMyLink = {
  code: 'PASAI-4K7Q-NJ2',
  link: 'pasihai.app/jiunge',
  note: 'Mtu anaweza kukunasa kwa QR au kiungo — bila kuona namba yako.',
}

export const gunduaModes = [
  { id: 'mchanganyiko', label: 'Mchanganyiko', hint: 'Ugunduzi mseto', icon: 'spark', tone: 'green', primary: true },
  { id: 'friends', label: 'Friends', hint: 'Marafiki & watu', icon: 'people', tone: 'green', primary: true },
  { id: 'channels', label: 'Channels', hint: 'Habari & elimu', icon: 'megaphone', tone: 'blue', primary: true },
  { id: 'live', label: 'Live', hint: 'Vipindi mubashara', icon: 'live', tone: 'gold', primary: true },
]

export const gunduaCategories = [
  { id: 'businesses', label: 'Biashara', hint: 'Karibu nawe', icon: 'store', mode: 'businesses' },
  { id: 'people', label: 'Watu', hint: 'Wapya kwako', icon: 'personSearch', mode: 'people' },
  { id: 'groups', label: 'Vikundi', hint: 'Vya umma', icon: 'group', mode: 'groups' },
  { id: 'hubs', label: 'Public Hubs', hint: 'Kwa eneo', icon: 'hub', mode: 'hubs' },
  { id: 'communities', label: 'Communities', hint: 'Za umma', icon: 'globe', mode: 'communities' },
  { id: 'channels', label: 'Channels', hint: 'Za umma', icon: 'channel', mode: 'channels' },
  { id: 'friends', label: 'Friends', hint: 'Marafiki na maombi', icon: 'people', mode: 'friends' },
  { id: 'addFriend', label: 'Ongeza Rafiki', hint: 'Namba · QR · contacts', icon: 'personAdd', mode: 'addfriend' },
  { id: 'live', label: 'Live', hint: 'Vikao vya moja kwa moja', icon: 'live', mode: 'live' },
  { id: 'mchanganyiko', label: 'Mchanganyiko', hint: 'Ugunduzi wote', icon: 'spark', mode: 'mchanganyiko' },
]

/* ── Vichujio: WHAT (mode) · ABOUT (mada) · WHERE (eneo) · WHEN (wakati) · RELATION ── */

export const gunduaFilterGroups = {
  mada: {
    id: 'mada', label: 'Shughuli na Mada', multi: true,
    hint: 'Kuhusu nini?',
    options: [
      { id: 'kijamii', label: 'Kijamii' }, { id: 'kiuchumi', label: 'Kiuchumi' },
      { id: 'elimu', label: 'Elimu' }, { id: 'afya', label: 'Afya' },
      { id: 'siasa', label: 'Siasa' }, { id: 'dini', label: 'Dini' },
      { id: 'michezo', label: 'Michezo' }, { id: 'kilimo', label: 'Kilimo' },
      { id: 'teknolojia', label: 'Teknolojia' }, { id: 'burudani', label: 'Burudani' },
      { id: 'utamaduni', label: 'Utamaduni' }, { id: 'mazingira', label: 'Mazingira' },
      { id: 'ustawi', label: 'Ustawi wa Jamii' }, { id: 'huduma', label: 'Huduma za Umma' },
      { id: 'ubunifu', label: 'Ubunifu' }, { id: 'kazi', label: 'Kazi na Ajira' },
      { id: 'biashara', label: 'Biashara' },
    ],
  },
  eneo: {
    id: 'eneo', label: 'Eneo', multi: false, hint: 'Wapi?',
    options: [
      { id: 'karibu', label: 'Karibu Nami' }, { id: 'nililochagua', label: 'Eneo Nililochagua' },
      { id: 'mji', label: 'Mji' }, { id: 'mkoa', label: 'Mkoa' },
      { id: 'nchi', label: 'Nchi' }, { id: 'global', label: 'Global' },
      { id: 'online', label: 'Online' },
    ],
    distances: [
      { id: '100m', label: '100 m', km: 0.1 }, { id: '1km', label: '1 km', km: 1 },
      { id: '5km', label: '5 km', km: 5 }, { id: '10km', label: '10 km', km: 10 },
      { id: '25km', label: '25 km', km: 25 }, { id: '45km', label: '45 km+', km: 45 },
    ],
  },
  wakati: {
    id: 'wakati', label: 'Wakati', multi: true, hint: 'Lini?',
    options: [
      { id: 'live_sasa', label: 'Live sasa' }, { id: 'leo', label: 'Leo' },
      { id: 'upcoming', label: 'Upcoming' }, { id: 'wiki', label: 'Wiki hii' },
      { id: 'mwezi', label: 'Mwezi huu' },
    ],
  },
  mahusiano: {
    id: 'mahusiano', label: 'Mahusiano', multi: true, hint: 'Uhusiano gani?',
    options: [
      { id: 'friends', label: 'Friends' }, { id: 'not_friends', label: 'Not Friends' },
      { id: 'following', label: 'Following' }, { id: 'joined', label: 'Joined' },
      { id: 'new', label: 'New to Me' },
    ],
  },
  biashara: {
    id: 'biashara', label: 'Kategoria za Biashara', multi: true, hint: 'Aina gani?',
    options: [
      { id: 'Vyakula', label: 'Vyakula' }, { id: 'Maduka', label: 'Maduka' },
      { id: 'Huduma', label: 'Huduma' }, { id: 'Afya', label: 'Afya' },
      { id: 'Wataalamu', label: 'Wataalamu' },
    ],
  },
  hali: {
    id: 'hali', label: 'Hali', multi: true, hint: 'Hali gani?',
    options: [
      { id: 'open_now', label: 'Open Now' }, { id: 'offers', label: 'Ofa na Punguzo' },
      { id: 'new', label: 'Mpya' },
    ],
  },
}

/* Vichujio vinavyoonekana kwa kila mode (progressive disclosure) */
export const gunduaFilterSchema = {
  mchanganyiko: ['mada', 'eneo', 'wakati'],
  friends: ['mahusiano', 'eneo', 'mada'],
  people: ['mahusiano', 'eneo', 'mada'],
  businesses: ['eneo', 'biashara', 'hali', 'mada'],
  groups: ['mada', 'eneo', 'mahusiano'],
  hubs: ['mada', 'eneo'],
  communities: ['mada', 'eneo'],
  channels: ['mada', 'eneo', 'mahusiano'],
  live: ['wakati', 'mada', 'eneo'],
  search: ['mada', 'eneo', 'wakati'],
}

export const gunduaSearchIdeas = [
  'Samaki wa Kupaka', 'Wakulima Tanzania', 'Baiskeli Dar', 'Kipepeo Leather', 'Afya kwa Jamii',
]

/* ── Vikundi vya umma vya kugundua ──────────────────────────────
   Vikundi ni vitu vya CHAT: kujiunga kunatengeneza conversation kwa
   chatRepository.createGroup() — hakuna engine ya pili ya ujumbe. */

export const gunduaPublicGroups = [
  {
    id: 'baiskeliDar', name: 'Baiskeli Dar es Salaam', handle: '@baiskeli.dar',
    visibility: 'public', ownerId: 'juma', members: 420, tone: 'blue', groupIcon: 'group',
    purpose: 'Mazoezi ya wikendi na usalama wa waendesha baiskeli jijini',
    nextSession: 'Jumamosi 6:00 AM', activity: 'Wazi kwa wote',
    mada: ['michezo', 'kijamii', 'afya'], place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 2.2, online: false, friendState: 'not_friend',
  },
  {
    id: 'mamaLishe', name: 'Mama Lishe & Mapishi', handle: '@mama.lishe',
    visibility: 'public', ownerId: 'sara', members: 1240, tone: 'gold', groupIcon: 'group',
    purpose: 'Mapishi ya nyumbani, lishe bora na biashara ndogo za vyakula',
    nextSession: 'Jumapili 4:00 PM', activity: 'Wazi kwa wote',
    mada: ['kijamii', 'kiuchumi', 'afya'], place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 3.9, online: true, friendState: 'not_friend',
  },
  {
    id: 'programuWazi', name: 'Programu Bila Malipo', handle: '@programu.wazi',
    visibility: 'public', ownerId: 'barakaEng', members: 890, tone: 'plum', groupIcon: 'group',
    purpose: 'Mafunzo ya uandishi wa programu, msaada wa miradi na ajira za teknolojia',
    nextSession: 'Jumamosi 5:00 PM', activity: 'Wazi kwa wote',
    mada: ['teknolojia', 'elimu', 'kazi'], place: { mji: 'Dar es Salaam', mkoa: 'Dar es Salaam', nchi: 'Tanzania' },
    distanceKm: 5.1, online: true, friendState: 'not_friend',
  },
]

/* ── Profiles za biashara (taarifa za UMAA pekee) ─────────────── */

export const gunduaBusinessProfiles = {
  exampleStore: {
    about: 'Duka la umeme Kariakoo — bidhaa halisi, bei wazi, na huduma ya haraka.',
    hours: ['Jumatatu–Jumamosi: 8:00 – 20:00', 'Jumapili: 9:00 – 14:00'],
    products: [
      { id: 'es1', name: 'Redio ya Sola', price: 'TSh 145,000', tag: 'Maarufu' },
      { id: 'es2', name: 'Taa za LED (seti)', price: 'TSh 28,000', tag: '' },
      { id: 'es3', name: 'Chaja za Simu', price: 'TSh 12,000', tag: '' },
    ],
    services: ['Ufungaji wa sola nyumbani', 'Kukarabati vifaa vya umeme'],
    trust: { verified: true, rating: 4.7, reviews: 184, customers: 1840, response: 'Hujibu kwa saa 1', payments: ['Malipo ya Simu', 'Kadi', 'Fedha taslimu'] },
    updates: [{ id: 'u5', text: 'Redio mpya za sola zimewasili Kariakoo.', at: 'siku 1' }],
  },
  exampleServices: {
    about: 'Huduma za ufungaji umeme na maji — kazi za nyumbani na ofisini.',
    hours: ['Jumatatu–Jumamosi: 8:00 – 18:00'],
    products: [{ id: 'xs1', name: 'Paket ya ufungaji wa nyumbani', price: 'Kutoka TSh 250,000', tag: '' }],
    services: ['Ufungaji umeme', 'Ufungaji maji', 'Ukaguzi wa usalama'],
    trust: { verified: false, rating: 4.4, reviews: 96, customers: 420, response: 'Hujibu kwa siku 1', payments: ['Malipo ya Simu', 'Fedha taslimu'] },
    updates: [],
  },
  kipepeoLeather: {
    about: 'Uzalishaji wa mikoba safi ya ngozi asilia ya Kitanzania, mikanda imara na viatu vya kudumu vilivyoshonwa kwa mikono.',
    hours: ['Jumatatu–Jumamosi: 8:00 – 20:00', 'Jumapili: 10:00 – 16:00'],
    products: [
      { id: 'kp1', name: 'Mikoba ya Ngozi ya Asili', price: 'TSh 120,000', tag: 'Maarufu' },
      { id: 'kp2', name: 'Viatu vya Asili', price: 'TSh 85,000', tag: '' },
      { id: 'kp3', name: 'Mikanda ya Ngozi', price: 'TSh 25,000', tag: '' },
    ],
    services: ['Kushona kwa amri (custom order)', 'Kukarabati mikoba ya ngozi'],
    trust: { verified: true, rating: 4.8, reviews: 142, customers: 320, response: 'Hujibu kwa saa 1', payments: ['Malipo ya Simu', 'Fedha taslimu'] },
    updates: [{ id: 'u1', text: 'Mkusanyiko mpya wa mikoba ya ngozi ya mbuzi umewasili.', at: 'siku 2' }],
  },
  samakiKupaka: {
    about: 'Chakula cha bahari safi kutoka Kunduchi — samaki wa kupaka, biriani ya nazi na mishkaki inayopikwa papo hapo.',
    hours: ['Kila siku: 11:00 – 16:00 usiku'],
    products: [
      { id: 'sk1', name: 'Samaki Choma', price: 'TSh 18,000', tag: 'Maarufu zaidi' },
      { id: 'sk2', name: 'Biriani ya Nazi', price: 'TSh 15,500', tag: 'Maalum leo' },
      { id: 'sk3', name: 'Mishkaki Moto', price: 'TSh 6,000', tag: '' },
    ],
    services: ['Oda za hafla', 'Kupika kwa tukio lako'],
    trust: { verified: true, rating: 4.9, reviews: 340, customers: 1200, response: 'Hujibu kwa dakika 30', payments: ['Malipo ya Simu', 'Kadi'] },
    updates: [{ id: 'u2', text: 'Leo: samaki wapya wamewasili asubuhi hii.', at: 'leo' }],
  },
  mlimaniSeafood: {
    about: 'Samaki wa kupaka, kamba na pweza safi — tunapika kwa oda na kupakua.',
    hours: ['Kila siku: 5:00 asubuhi – 5:00 usiku'],
    products: [
      { id: 'ml1', name: 'Pweza wa Nazi', price: 'TSh 22,000', tag: '' },
      { id: 'ml2', name: 'Kamba za Kuchoma', price: 'TSh 26,000', tag: 'Maarufu' },
    ],
    services: ['Kupakua oda (delivery) Mbezi na jirani'],
    trust: { verified: false, rating: 4.7, reviews: 98, customers: 260, response: 'Hujibu kwa saa 2', payments: ['Malipo ya Simu'] },
    updates: [],
  },
  mwengeWood: {
    about: 'Kikundi cha wasanii 12 wa Mwenge — sanamu, vinyago na fanicha za mikono.',
    hours: ['Jumatatu–Jumamosi: 8:00 – 18:00'],
    products: [
      { id: 'mw1', name: 'Sanamu za Mikono', price: 'Kutoka TSh 45,000', tag: '' },
      { id: 'mw2', name: 'Fanicha ndogo za mbao', price: 'Kutoka TSh 150,000', tag: '' },
    ],
    services: ['Kuchonga kwa amri', 'Ziara ya warsha ya wasanii'],
    trust: { verified: true, rating: 4.9, reviews: 76, customers: 180, response: 'Hujibu kwa siku 1', payments: ['Fedha taslimu'] },
    updates: [{ id: 'u3', text: 'Warsha yetu inafunguliwa kwa ziara Jumamosi hii.', at: 'siku 3' }],
  },
  wakumeleStore: {
    about: 'Mbolea, mbegu bora na zana za kilimo kwa wakulima wa mbogamboga na mazao ya shamba.',
    hours: ['Jumatatu–Jumamosi: 7:00 – 19:00'],
    products: [
      { id: 'wk1', name: 'Mbolea ya Mbogamboga (kg 25)', price: 'TSh 38,000', tag: 'Ofa' },
      { id: 'wk2', name: 'Mbegu za Mbogamboga', price: 'TSh 6,500', tag: '' },
    ],
    services: ['Ushauri wa kilimo', 'Usambazaji kwa vikundi vya wakulima'],
    trust: { verified: true, rating: 4.6, reviews: 210, customers: 890, response: 'Hujibu kwa saa 1', payments: ['Malipo ya Simu', 'Fedha taslimu'] },
    updates: [{ id: 'u4', text: 'Mbegu bora za msimu zimewasili.', at: 'leo' }],
  },
}

export const gunduaOffers = [
  {
    id: 'of1', businessId: 'wakumeleStore', label: 'PUNGUZO 15%',
    title: 'Mbolea na Mbegu Bora za Mbogamboga', code: 'PASI-KILIMO',
    expires: 'Inaisha kesho jioni', tone: 'green',
  },
  {
    id: 'of2', businessId: 'samakiKupaka', label: 'OFa ya LEO',
    title: 'Mlo wa familia (watu 4) kwa bei ya 3', code: 'KUNDUCHI4',
    expires: 'Bado masaa 6', tone: 'gold',
  },
]

/* ── Channels: preview ya maudhui ya umma (kadi ya identity pekee) ── */

export const gunduaChannelProfiles = {
  bbcSwahili: { language: 'Kiswahili', preview: { title: 'Habari za Afrika Mashariki', text: 'Muhtasari wa habari za siku kwa Kiswahili.', at: 'saa 2' } },
  azamSports: { language: 'Kiswahili', preview: { title: 'Matokeo ya Ligi Kuu', text: 'Matokeo na uchambuzi wa mechi za juzi.', at: 'saa 5' } },
  techSasa: { language: 'Kiswahili', preview: { title: 'Zana za AI kwa biashara ndogo', text: 'Mbinu tano za kutumia AI kuendesha biashara.', at: 'siku 1' } },
  elimuYetu: { language: 'Kiswahili', preview: { title: 'Mazoezi ya Hisabati: sehemu', text: 'Mazoezi 20 kwa darasa la tano na majibu.', at: 'siku 2' } },
  pasihaiUpdates: { language: 'Kiswahili', preview: { title: 'Nini kipya mwezi huu', text: 'Vipengele vipya vya PASIHAI na maboresho.', at: 'wiki 1' } },
}

/* ── Live: metadata ya ugunduzi (chanzo: liveSessions) ────────── */

export const gunduaLiveMeta = {
  l1: { mada: ['kiuchumi', 'kazi'], place: 'Dar es Salaam', discoverable: true, lang: 'Video' },
  l2: { mada: ['elimu'], place: 'Dar es Salaam', discoverable: true, lang: 'Video' },
  l3: { mada: ['teknolojia', 'ubunifu'], place: 'Dar es Salaam', discoverable: true, lang: 'Video' },
  l4: { mada: ['burudani'], place: 'Dar es Salaam', discoverable: true, lang: 'Sauti' },
  l5: { mada: ['elimu', 'kijamii'], place: 'Dar es Salaam', discoverable: false, note: 'Kikao cha faragha cha mwaliko' },
  l6: { mada: ['kiuchumi'], place: 'Dar es Salaam', discoverable: true, lang: 'Video' },
  l7: { mada: ['kilimo', 'kijamii'], place: 'Mbeya', discoverable: true, lang: 'Mchanganyiko' },
  l8: { mada: ['kijamii'], place: 'Dar es Salaam', discoverable: false, note: 'Majadiliano ya mitaa — faragha' },
  l9: { mada: ['mafunzo', 'ubunifu'], place: 'Dar es Salaam', discoverable: true, lang: 'Video' },
  l10: { mada: ['michezo'], place: 'Dar es Salaam', discoverable: true, lang: 'Sauti' },
  l11: { mada: ['habari'], place: 'Global', discoverable: true, lang: 'Video' },
  l12: { mada: ['burudani', 'kijamii'], place: 'Dar es Salaam', discoverable: true, lang: 'Mchanganyiko' },
}

/* ── Kumbi za moja kwa moja (kumbi za sauti za umma) ──────────── */

export const gunduaAudioRooms = [
  { id: 'ar1', title: 'Mustakabali wa Kilimo Biashara Afrika Mashariki', hostId: 'barakaEng', host2: 'Dkt. Neema Mwangi', room: 'Mjumuiko wa Biashara', listeners: 312, state: 'live', mada: ['kilimo', 'kiuchumi'], place: 'Dar es Salaam' },
]

/* ── Entity za FARAGHA — majaribio pekee ────────────────────────
   Hazina `visibility: 'public'`; repository haizirudishi KAMWE.
   `familiaYetuHub` ina distanceKm 0.4 — uthibitisho: "Karibu Nami"
   HAIWEZI kufunua kitu cha faragha. */

export const gunduaPrivateEntities = [
  { id: 'madaktariClass', type: 'group', name: 'Madaktari Class', visibility: 'private', reason: 'Kikundi cha kibinafsi — mwaliko pekee' },
  { id: 'kamatiHarusi', type: 'group', name: 'Kamati ya Harusi', visibility: 'private', reason: 'Kikundi cha kibinafsi — mwaliko pekee' },
  { id: 'familiaYetuHub', type: 'hub', name: 'Familia Yetu', visibility: 'private', distanceKm: 0.4, reason: 'Hub ya kibinafsi' },
  { id: 'studioNeema', type: 'channel', name: 'Studio ya Neema (Faragha)', visibility: 'private', reason: 'Channel ya kibinafsi' },
  { id: 'wakulimaMbeya', type: 'community', name: 'Wakulima wa Mbeya (Faragha)', visibility: 'private', reason: 'Jumuiya ya kibinafsi' },
]

/* ══════════════════════════════════════════════════════════════
   SPACES — MUKTADHA (Hub · Jumuiya · Channel)
   ══════════════════════════════════════════════════════════════
   Hii SI aina ya nne ya kitu: Hub na Community ni familia moja ya
   kukutana/kushiriki; Channel ni tawi la kuchapisha. Hapa ni
   MUKTADHA pekee (kusudi · kanuni · timu · ufikivu · vikundi
   vinavyohusiana). Content, maoni, hifadhi, chat na ugavi
   vinatoka kwenye mifumo iliyopo — hakuna engine ya pili.

   UFIKIVU (§5/§15/§29) — ni HALI, si aina ya kitu:
     'public'  → Wazi: inaonekana kwenye Gundua na Spaces
     'listed'  → Binafsi-Iliyoorodheshwa: utambulisho unaonekana,
                 content haipatikani; kujiunga = ombi
     'hidden'  → Binafsi-Fichwa: haipatikani kwa kutafuta;
                 mwaliko/kiungo pekee
   Eneo (place) linatumika kwa UMUHIMU pekee — si ruhusa.
   ══════════════════════════════════════════════════════════════ */

export const spacesMeta = {
  /* ── Hub: mahali/muktadha (Dar Tech Hub) ── */
  darTechHub: {
    visibility: 'public',
    joinMode: 'open',
    purpose: 'Mahali pa wabunifu na wafanyabiashara wa Dar es Salaam kukutana, kujifunza na kushirikiana kazi.',
    founded: '2023',
    rules: [
      'Shiriki kwa heshima — hakuna matangazo ya nje.',
      'Uliza kabla ya kushiriki kazi ya mtu.',
      'Warsha zinatangazwa hapa; usajili ni wa bure.',
    ],
    team: [
      { userId: 'juma', role: 'Owner' },
      { userId: 'amina', role: 'Admin' },
      { userId: 'hassan', role: 'Moderator' },
    ],
    relatedGroups: ['programuWazi'],
    relatedChannels: ['techSasa'],
    resources: [
      { id: 'o3', kind: 'document', label: 'Hati: Muhtasari wa warsha', meta: '1.2 MB · faili ndogo' },
      { id: 'o1', kind: 'video', label: 'Video: Mahojiano ya mwalimu', meta: '48 MB · inahitaji mtandao' },
    ],
    cover: 'teal',
  },

  /* ── Hub: Tanzania Creators ── */
  tzCreators: {
    visibility: 'public',
    joinMode: 'open',
    purpose: 'Wabunifu wa maudhui Tanzania — Reels, sauti na kushirikiana miradi.',
    founded: '2024',
    rules: [
      'Weka kazi yako mwenyewe — taja vyanzo.',
      'Hakuna kushiriki kazi ya mtu bila ridhaa.',
    ],
    team: [
      { userId: 'neemaCreates', role: 'Owner' },
      { userId: 'neemaBeats', role: 'Editor' },
    ],
    relatedGroups: [],
    relatedChannels: [],
    resources: [{ id: 'o2', kind: 'reel', label: 'Reel: Kidokezo cha kilimo', meta: '18 MB · inahitaji mtandao' }],
    cover: 'blue',
  },

  /* ── Hub: Morogoro Organic (hujajiunga — CTA ya kujiunga) ── */
  morogoroOrganic: {
    visibility: 'public',
    joinMode: 'open',
    purpose: 'Kilimo endelevu Morogoro — mbinu, masoko na kushirikiana pembejeo.',
    founded: '2022',
    rules: ['Shiriki uzoefu wa shamba lako halisi.', 'Hakuna bei za kubuni.'],
    team: [{ userId: 'zainabAsili', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [{ id: 'o2', kind: 'reel', label: 'Reel: Kidokezo cha kilimo', meta: '18 MB · inahitaji mtandao' }],
    cover: 'green',
  },

  /* ── Jumuiya: Wakulima Tanzania (familia moja na Hub) ── */
  wakulimaTz: {
    visibility: 'public',
    joinMode: 'open',
    purpose: 'Watu wa kilimo-biashara, ufugaji na masoko — lengo moja: mkulima apate soko.',
    founded: '2021',
    rules: [
      'Weka bei halisi — hakuna matangazo ya uongo.',
      'Uliza kabla ya kuuza kwa mtu binafsi.',
      'Kikundi cha mazungumzo ni cha Chat — si sehemu ya Jumuiya.',
    ],
    team: [
      { userId: 'musaKhalfan', role: 'Owner' },
      { userId: 'zainabAsili', role: 'Admin' },
      { userId: 'mwengeWood', role: 'Moderator' },
    ],
    relatedGroups: ['mamaLishe'],
    relatedChannels: ['elimuYetu'],
    resources: [{ id: 'o2', kind: 'reel', label: 'Reel: Kidokezo cha kilimo', meta: '18 MB · inahitaji mtandao' }],
    cover: 'green',
  },

  /* ── Jumuiya: Afya kwa Jamii ── */
  afyaJamii: {
    visibility: 'public',
    joinMode: 'open',
    purpose: 'Afya na ustawi kwa jamii — taarifa sahihi, msaada na kujifunza pamoja.',
    founded: '2022',
    rules: ['Hakuna ushauri wa matibabu badala ya daktari.', 'Heshima kwa kila mwanachama.'],
    team: [
      { userId: 'sara', role: 'Owner' },
      { userId: 'kelvinMushi', role: 'Admin' },
    ],
    relatedGroups: [],
    relatedChannels: ['pasihaiUpdates'],
    resources: [{ id: 'o3', kind: 'document', label: 'Hati: Muhtasari wa warsha', meta: '1.2 MB · faili ndogo' }],
    cover: 'teal',
  },

  /* ── Channels (tawi la kuchapisha) ── */
  pasihaiUpdates: {
    visibility: 'public',
    joinMode: 'follow',
    purpose: 'Channel rasmi ya PASIHAI — matoleo, mabadiliko na maelezo ya huduma.',
    founded: '2025',
    rules: ['Tangazo pekee — maoni yanafunguliwa kwa chapisho husika.'],
    team: [
      { userId: 'pasihaiUpdates', role: 'Owner' },
      { userId: 'amina', role: 'Editor' },
    ],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    cover: 'blue',
  },
  techSasa: {
    visibility: 'public',
    joinMode: 'follow',
    purpose: 'Teknolojia kwa Kiswahili — vifaa, programu na mbinu za kufanya kazi.',
    founded: '2024',
    rules: ['Taja chanzo cha picha.', 'Hakuna kuuza vifaa moja kwa moja — tumia Biashara.'],
    team: [{ userId: 'techSasa', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: ['pasihaiUpdates'],
    resources: [],
    cover: 'teal',
  },
  elimuYetu: {
    visibility: 'public',
    joinMode: 'follow',
    purpose: 'Elimu kwa wote — masomo, mitihani na mbinu za kusoma.',
    founded: '2023',
    rules: ['Somoa, uliza, kisha shiriki.'],
    team: [{ userId: 'elimuYetu', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [{ id: 'o3', kind: 'document', label: 'Hati: Muhtasari wa warsha', meta: '1.2 MB · faili ndogo' }],
    cover: 'green',
  },
  bbcSwahili: {
    visibility: 'public',
    joinMode: 'follow',
    purpose: 'Habari za dunia kwa Kiswahili.',
    founded: '2024',
    rules: ['Habari pekee — maoni yanadhibitiwa.'],
    team: [{ userId: 'bbcSwahili', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    cover: 'slate',
  },
  azamSports: {
    visibility: 'public',
    joinMode: 'follow',
    purpose: 'Michezo Tanzania — matokeo, ratiba na mahojiano.',
    founded: '2024',
    rules: ['Matokeo pekee — hakuna viungo vya kutazama nje.'],
    team: [{ userId: 'azamSports', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    cover: 'gold',
  },

  /* ── Faragha: hali tatu za ufikivu (§5/§15/§29) ── */
  familiaYetuHub: {
    visibility: 'listed',
    joinMode: 'request',
    purpose: 'Hub ya familia — mipango, matukio na kumbukumbu zetu.',
    founded: '2024',
    rules: ['Mwaliko wa mwanachama pekee.'],
    team: [{ userId: 'hassan', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    cover: 'slate',
  },
  studioNeema: {
    visibility: 'hidden',
    joinMode: 'invite',
    purpose: 'Studio ya Neema — rasimu za miradi.',
    founded: '2025',
    rules: ['Kiungo cha mwaliko pekee.'],
    team: [{ userId: 'neemaCreates', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    cover: 'slate',
  },
  wakulimaMbeya: {
    visibility: 'hidden',
    joinMode: 'invite',
    purpose: 'Jumuiya ya wakulima wa Mbeya — mazao ya msimu.',
    founded: '2025',
    rules: ['Kiungo cha mwaliko pekee.'],
    team: [{ userId: 'musaKhalfan', role: 'Owner' }],
    relatedGroups: [],
    relatedChannels: [],
    resources: [],
    cover: 'slate',
  },
}

/* Uanachama (kielelezo cha wanachama kwa safu ya Watu) */
export const spacesMembers = {
  darTechHub: ['juma', 'amina', 'hassan', 'fatma', 'barakaEng', 'kelvinMushi', 'neemaCreates'],
  tzCreators: ['neemaCreates', 'neemaBeats', 'zawadiStyles', 'fatma'],
  morogoroOrganic: ['zainabAsili', 'mwengeWood', 'musaKhalfan'],
  wakulimaTz: ['musaKhalfan', 'zainabAsili', 'mwengeWood', 'samakiKupaka', 'kipepeoLeather'],
  afyaJamii: ['sara', 'kelvinMushi', 'amina', 'hassan'],
  pasihaiUpdates: ['pasihaiUpdates', 'amina'],
  techSasa: ['techSasa', 'juma'],
  elimuYetu: ['elimuYetu', 'sara'],
  bbcSwahili: ['bbcSwahili'],
  azamSports: ['azamSports'],
  familiaYetuHub: ['hassan', 'fatma'],
  studioNeema: ['neemaCreates'],
  wakulimaMbeya: ['musaKhalfan'],
}

/* Nafasi zangu (uanachama/umiliki wa kikao hiki) */
export const spacesMine = {
  owned: ['pasihaiUpdates'],
  hubs: ['darTechHub', 'tzCreators'],
  communities: [],
  channels: ['pasihaiUpdates', 'techSasa'],
}

/* ── Content ya ndani ya Spaces ──────────────────────────────
   Machapisho yanayochapishwa NDANI ya Space (activity). Yanapita
   kwenye mapper ileile ya feed na vitendo vilevile (maoni ·
   reactions · hifadhi). Haya hayaingilii hesabu za mkondo wa Home:
   yanapatikana kupitia `contentRepository.listSpacePosts(id)`. */
export const spacePosts = [
  {
    id: 'sp1',
    spaceId: 'darTechHub',
    userId: 'amina',
    relationship: 'Mwanachama',
    ageMinutes: 95,
    text: 'Kikao cha leo: tulimaliza ramani ya miradi ya wiki hii. Asante kwa wote waliohudhuria warsha ya ujasiriamali.',
    kind: 'text',
    reactions: 41,
    comments: 7,
    filterTypes: ['posts'],
  },
  {
    id: 'sp2',
    spaceId: 'darTechHub',
    userId: 'darTechHub',
    relationship: 'Hub',
    ageMinutes: 260,
    text: 'Tunatafuta wakufunzi wawili wa Python kwa kikao cha Jumamosi. Muda: masaa mawili.',
    kind: 'text',
    reactions: 28,
    comments: 12,
    filterTypes: ['posts'],
  },
  {
    id: 'sp3',
    spaceId: 'wakulimaTz',
    userId: 'wakulimaTz',
    relationship: 'Jumuiya',
    ageMinutes: 300,
    text: 'Mkutano wa wakulima wa msimu: bei za pembejeo, masoko na ushirika. Jumamosi asubuhi, Morogoro.',
    kind: 'event',
    media: { tone: 'green', caption: 'Mkutano · Jumamosi 09:00', ratio: '16 / 9' },
    label: 'Tukio',
    cta: { label: 'Nataka kuhudhuria', tone: 'primary' },
    reactions: 96,
    comments: 23,
    shares: 18,
    filterTypes: ['picha', 'posts'],
  },
  {
    id: 'sp4',
    spaceId: 'wakulimaTz',
    userId: 'musaKhalfan',
    relationship: 'Mwanachama',
    ageMinutes: 640,
    text: 'Mahindi yangu yameanza kuiva wiki hii. Nimejifunza kupunguza gharama kwa kutumia mbolea ya samadi.',
    kind: 'text',
    reactions: 54,
    comments: 15,
    filterTypes: ['posts'],
  },
  {
    id: 'sp5',
    spaceId: 'wakulimaTz',
    userId: 'zainabAsili',
    relationship: 'Mwanachama',
    ageMinutes: 900,
    text: 'Kura: msimu huu tuuze pamoja kwa ushirika au kila mtu peke yake?',
    kind: 'poll',
    poll: {
      question: 'Tuuze pamoja kwa ushirika?',
      options: [
        { id: 'a', label: 'Ndiyo — tuuze pamoja', votes: 48 },
        { id: 'b', label: 'Hapana — kila mtu peke yake', votes: 12 },
      ],
    },
    reactions: 33,
    comments: 9,
    filterTypes: ['polls', 'posts'],
  },
  {
    id: 'sp6',
    spaceId: 'afyaJamii',
    userId: 'sara',
    relationship: 'Mwanachama',
    ageMinutes: 150,
    text: 'Siku ya afya bure: kipimo cha presha na ushauri wa lishe. Kituo cha Mwenge, Jumamosi.',
    kind: 'event',
    media: { tone: 'teal', caption: 'Siku ya afya · Jumamosi 10:00', ratio: '16 / 9' },
    label: 'Tukio',
    cta: { label: 'Nataka kuhudhuria', tone: 'primary' },
    reactions: 71,
    comments: 11,
    shares: 9,
    filterTypes: ['picha', 'posts'],
  },
  {
    id: 'sp7',
    spaceId: 'afyaJamii',
    userId: 'afyaJamii',
    relationship: 'Jumuiya',
    ageMinutes: 420,
    text: 'Kumbuka: kunywa maji ya kutosha wakati wa joto. Ushauri huu sio badala ya daktari.',
    kind: 'text',
    reactions: 88,
    comments: 6,
    filterTypes: ['posts'],
  },
  {
    id: 'sp8',
    spaceId: 'bbcSwahili',
    userId: 'bbcSwahili',
    relationship: 'Channel',
    ageMinutes: 60,
    text: 'Habari za asubuhi: muhtasari wa matukio makuu ya siku.',
    kind: 'text',
    reactions: 122,
    comments: 18,
    shares: 40,
    filterTypes: ['posts'],
  },
  {
    id: 'sp9',
    spaceId: 'azamSports',
    userId: 'azamSports',
    relationship: 'Channel',
    ageMinutes: 180,
    text: 'Matokeo ya jana na ratiba ya leo — timu za Tanzania zote.',
    kind: 'text',
    reactions: 205,
    comments: 32,
    shares: 51,
    filterTypes: ['posts'],
  },
  {
    id: 'sp10',
    spaceId: 'techSasa',
    userId: 'techSasa',
    relationship: 'Channel',
    ageMinutes: 240,
    text: 'Vidokezo vitano vya kuokoa data ya internet kwenye simu yako.',
    kind: 'text',
    reactions: 64,
    comments: 14,
    shares: 22,
    filterTypes: ['posts'],
  },
]

/* Vikundi vya Chat vinavyohusiana na Space (object moja: conversation) */
export const spacesGroupLinks = {
  darTechHub: ['programuWazi'],
  wakulimaTz: ['mamaLishe'],
}
