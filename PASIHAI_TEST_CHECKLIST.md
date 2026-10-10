# PASIHAI — TEST CHECKLIST (ANDROID)

**Tarehe:** 2026-01-XX  
**Simu:** [Andika model ya simu hapa]  
**Android Version:** [Andika version hapa]  
**APK Version:** Debug Build

---

## 1. INSTALLATION NA SETUP

### 1.1 Installation
- [ ] APK imesakinishwa bila errors
- [ ] App icon inaonekana kwenye app drawer
- [ ] App inafunguka mara ya kwanza
- [ ] Hakuna "App has stopped" error

### 1.2 First Launch
- [ ] Splash screen inaonekana
- [ ] Loading indicator inafanya kazi
- [ ] App inafika kwenye login screen (au home kama umeingia)
- [ ] Hakuna white screen au blank page

### 1.3 Permissions
- [ ] App inaomba permissions zinazohitajika (kama kuna)
- [ ]Permissions zinaruhusiwa bila crash
- [ ] App inafanya kazi hata kama permissions zimekataliwa

---

## 2. AUTHENTICATION

### 2.1 Login (Mock Mode)
- [ ] Login screen inaonekana
- [ ] Email field inafanya kazi
- [ ] Password field inafanya kazi
- [ ] "Login" button inafanya kazi
- [ ] Login inafanikiwa (mock mode)
- [ ] Redirect kwa home screen inafanya kazi

### 2.2 Login (Live Mode - Supabase)
- [ ] Login na credentials halisi inafanikiwa
- [ ] Invalid credentials inaonyesha error message
- [ ] Loading indicator inaonekana wakati wa login
- [ ] Session inadumu baada ya kufunga na kufungua app

### 2.3 Logout
- [ ] Logout button inafanya kazi
- [ ] Redirect kwa login screen inafanya kazi
- [ ] Session imefutwa (hauwezi kuingia tena bila credentials)

### 2.4 Password Reset
- [ ] "Forgot password" link inafanya kazi
- [ ] Email ya reset inatumwa (kama live mode)
- [ ] Password mpya inaweza kuwekwa

---

## 3. NAVIGATION

### 3.1 Bottom Navigation
- [ ] Bottom nav inaonekana
- [ ] Icons zote zinaonekana (Home, Chat, Spaces, Gundua, Profile)
- [ ] Kila icon inafanya kazi
- [ ] Active state inaonekana vizuri
- [ ] Navigation ni smooth (hakuna lag)

### 3.2 Header
- [ ] Header inaonekana kwenye screens zote
- [ ] Logo/title inaonekana
- [ ] Menu buttons zinafanya kazi (kama kuna)

### 3.3 Back Navigation
- [ ] Back button ya Android inafanya kazi
- [ ] Inarudi kwenye screen iliyotangulia
- [ ] Haifungi app isipokuwa kwenye home screen

---

## 4. HOME / FEED

### 4.1 Feed Display
- [ ] Posts zinaonekana
- [ ] Post cards zinaonekana vizuri
- [ ] User avatars zinaonekana
- [ ] Timestamps zinaonekana
- [ ] Post content (text) inasomeka
- [ ] Media (images/videos) zinaonekana (kama kuna)

### 4.2 Create Post
- [ ] "Create post" button/fab inafanya kazi
- [ ] Post composer inafunguka
- [ ] Text input inafanya kazi
- [ ] "Post" button inafanya kazi
- [ ] Post inaundwa na kuonekana kwenye feed
- [ ] Loading indicator inaonekana wakati wa posting

### 4.3 Post Interactions
- [ ] Like button inafanya kazi
- [ ] Like count inabadilika
- [ ] Comment button inafanya kazi
- [ ] Comment section inafunguka
- [ ] Kuandika comment inafanya kazi
- [ ] Comment inaonekana baada ya kutumwa
- [ ] Share button inafanya kazi (kama ipo)
- [ ] Save/bookmark button inafanya kazi

### 4.4 Feed Refresh
- [ ] Pull-to-refresh inafanya kazi (kama ipo)
- [ ] Feed inasasishwa na posts mpya
- [ ] Loading indicator inaonekana wakati wa refresh

### 4.5 Infinite Scroll
- [ ] Scrolling chini inapakia posts zaidi
- [ ] Loading indicator inaonekana
- [ ] Hakuna duplicate posts

---

## 5. CHAT

### 5.1 Chat List
- [ ] Chat list inaonekana
- [ ] Conversations zinaonekana
- [ ] User names na avatars zinaonekana
- [ ] Last message inaonekana
- [ ] Unread count inaonekana (kama ipo)

### 5.2 Start New Chat
- [ ] "New chat" button inafanya kazi
- [ ] User selection inafanya kazi
- [ ] Chat mpya inaundwa

### 5.3 Chat Interface
- [ ] Chat screen inafunguka
- [ ] Messages zinaonekana
- [ ] Message bubbles zinaonekana vizuri
- [ ] Sent messages ziko upande wa kulia
- [ ] Received messages ziko upande wa kushoto
- [ ] Timestamps zinaonekana

### 5.4 Send Message
- [ ] Text input inafanya kazi
- [ ] Send button inafanya kazi
- [ ] Message inatumwa
- [ ] Message inaonekana mara moja
- [ ] Loading indicator inaonekana (kama ipo)

### 5.5 Real-time Updates (kama live mode)
- [ ] Messages mpya zinaonekana bila refresh
- [ ] Typing indicator inaonekana (kama ipo)
- [ ] Read receipts zinafanya kazi (kama ipo)

---

## 6. SPACES

### 6.1 Spaces List
- [ ] Spaces zinaonekana
- [ ] Space cards zinaonekana vizuri
- [ ] Space names na descriptions zinasomeka
- [ ] Member counts zinaonekana

### 6.2 Join Space
- [ ] "Join" button inafanya kazi
- [ ] Joining inafanikiwa
- [ ] Space inaonekana kwenye "My Spaces"

### 6.3 Space Details
- [ ] Space details screen inafunguka
- [ ] Posts za space zinaonekana
- [ ] Members wanaonekana
- [ ] Space info inasomeka

### 6.4 Create Space (kama ipo)
- [ ] "Create space" button inafanya kazi
- [ ] Space creation form inafanya kazi
- [ ] Space inaundwa

---

## 7. GUNDUA (DISCOVER)

### 7.1 Discover Feed
- [ ] Discover screen inaonekana
- [ ] Suggested content inaonekana
- [ ] Categories/tags zinaonekana (kama ipo)

### 7.2 Search
- [ ] Search bar inafanya kazi
- [ ] Search results zinaonekana
- [ ] Search ni haraka

### 7.3 Trending
- [ ] Trending content inaonekana
- [ ] Trending hashtags zinaonekana (kama ipo)

---

## 8. PROFILE

### 8.1 Profile Display
- [ ] Profile screen inaonekana
- [ ] Avatar inaonekana
- [ ] Display name inaonekana
- [ ] Username/handle inaonekana
- [ ] Bio inasomeka
- [ ] Stats zinaonekana (posts, followers, following)

### 8.2 Edit Profile
- [ ] "Edit profile" button inafanya kazi
- [ ] Edit form inafanya kazi
- [ ] Avatar inaweza kubadilishwa (kama ipo)
- [ ] Display name inaweza kubadilishwa
- [ ] Bio inaweza kubadilishwa
- [ ] Changes zinahifadhiwa

### 8.3 My Posts
- [ ] Posts zangu zinaonekana
- [ ] Naweza kufuta posts zangu

### 8.4 Settings
- [ ] Settings screen inafunguka
- [ ] Settings zinaonekana
- [ ] Settings zinaweza kubadilishwa

---

## 9. OFFLINE FUNCTIONALITY

### 9.1 Offline Detection
- [ ] Zima WiFi na mobile data
- [ ] Offline banner inaonekana
- [ ] App inabaki wazi (haifungi)

### 9.2 Offline Actions
- [ ] Naweza kuunda post offline
- [ ] Post inaonyesha "pending" status
- [ ] Naweza kuandika comment offline
- [ ] Naweza kupendwa post offline

### 9.3 Sync Baada ya Kuwa Online
- [ ] Washa WiFi au mobile data
- [ ] Sync indicator inaonekana
- [ ] Pending actions zinasindikizwa
- [ ] Posts/comments zinaonekana kwenye server
- [ ] "Pending" status inaondolewa

### 9.4 Conflict Resolution
- [ ] Kama action imeshindwa, error message inaonekana
- [ ] Naweza kujaribu tena (retry)
- [ ] Hakuna data loss

---

## 10. PERFORMANCE

### 10.1 App Launch Time
- [ ] App inafunguka chini ya sekunde 3
- [ ] Hakuna ANR (App Not Responding)

### 10.2 Navigation Speed
- [ ] Navigation kati ya screens ni haraka
- [ ] Hakuna lag au stutter
- [ ] Animations ni smooth

### 10.3 Feed Performance
- [ ] Feed inapakia haraka
- [ ] Scrolling ni smooth (60 FPS)
- [ ] Hakuna jank au freezing

### 10.4 Memory Usage
- [ ] App haitumii memory nyingi sana
- [ ] Hakuna OutOfMemoryError
- [ ] App haifungi baada ya matumizi ya muda mrefu

### 10.5 Battery Usage
- [ ] App haitumii battery nyingi
- [ ] Hakuna excessive background activity

---

## 11. UI/UX

### 11.1 Layout
- [ ] UI inaonekana vizuri kwenye screen size yako
- [ ] Hakuna overlapping elements
- [ ] Text inasomeka (si ndogo sana)
- [ ] Buttons zinaonekana na zinaweza kubonyezwa

### 11.2 Dark Mode (kama ipo)
- [ ] Dark mode inafanya kazi
- [ ] Colors zinaonekana vizuri
- [ ] Contrast ni ya kutosha

### 11.3 Accessibility
- [ ] Text inaweza kusomwa na screen reader
- [ ] Buttons zina labels za kutosha
- [ ] Touch targets ni kubwa ya kutosha (48dp+)

### 11.4 Error States
- [ ] Error messages zinaonekana vizuri
- [ ] Error messages zinasomeka na kueleweka
- [ ] Kuna njia ya kurekebisha error (retry, back, etc.)

### 11.5 Empty States
- [ ] Empty screens zinaonekana vizuri
- [ ] Kuna message ya kueleza kwa nini ni tupu
- [ ] Kuna call-to-action (kama inafaa)

### 11.6 Loading States
- [ ] Loading indicators zinaonekana
- [ ] Skeleton screens zinaonekana (kama ipo)
- [ ] Hakuna confusion kuhusu kama app inafanya kazi

---

## 12. NETWORK HANDLING

### 12.1 Network Transitions
- [ ] WiFi → Mobile Data: App inabaki kufanya kazi
- [ ] Mobile Data → WiFi: App inabaki kufanya kazi
- [ ] Online → Offline: Offline banner inaonekana
- [ ] Offline → Online: Sync inaanza

### 12.2 Slow Network
- [ ] App inafanya kazi kwenye 3G au polepole
- [ ] Loading indicators zinaonekana
- [ ] Hakuna timeout errors za mara kwa mara

### 12.3 Network Errors
- [ ] Network errors zinaonyeshwa vizuri
- [ ] Retry button inafanya kazi
- [ ] App haifungi kwa sababu ya network error

---

## 13. SECURITY

### 13.1 Authentication
- [ ] Password haionekani (masked)
- [ ] Session inadumu kwa muda unaofaa
- [ ] Logout inafuta session

### 13.2 Data Privacy
- [ ] Hakuna data ya mtumiaji inayoonekana kwenye logs
- [ ] Hakuna sensitive data kwenye local storage (isipokuwa cache)
- [ ] API calls zinatuma data kwa HTTPS

### 13.3 Input Validation
- [ ] Invalid input inaonyesha error
- [ ] SQL injection haifanyi kazi (kama kuna input fields)
- [ ] XSS haifanyi kazi (kama kuna user-generated content)

---

## 14. EDGE CASES

### 14.1 App Lifecycle
- [ ] Minimize app: Haifungi
- [ ] Maximize app: Inaendelea kufanya kazi
- [ ] Kill app: Inafunguka tena vizuri
- [ ] Screen rotation: UI inabadilika vizuri (kama inasaidiwa)

### 14.2 Low Memory
- [ ] App inafanya kazi hata kama memory ni ndogo
- [ ] Hakuna crashes za OutOfMemoryError

### 14.3 Storage
- [ ] App inafanya kazi hata kama storage ni ndogo
- [ ] Cache inaweza kufutwa bila kuharibu app

### 14.4 Concurrent Usage
- [ ] Kufungua app kwenye devices mbili: Hakuna conflicts
- [ ] Kufanya action kwenye device moja: Inaonekana kwenye nyingine (kama live mode)

---

## 15. BUGS ZILIZOPATIKANA

| # | Screen/Feature | Tatizo | Severity | Screenshot |
|---|----------------|--------|----------|------------|
| 1 |                |        |          |            |
| 2 |                |        |          |            |
| 3 |                |        |          |            |

**Severity Levels:**
- **Critical:** App inafunga au haifanyi kazi kabisa
- **High:** Feature muhimu haifanyi kazi
- **Medium:** Feature inafanya kazi lakini kuna tatizo
- **Low:** Cosmetic issue au tatizo dogo

---

## 16. MAoni YA MTUMIAJI

### Nini Kinafanya Kazi Vizuri
- 
- 
- 

### Nini Kinahitaji Kuboreshwa
- 
- 
- 

### Mapendekezo
- 
- 
- 

---

## 17. MATOKEO YA MWISHO

### Jumla ya Tests
- **Passed:** ___ / ___
- **Failed:** ___
- **Skipped:** ___

### Hitimisho
- [ ] App iko tayari kwa majaribio zaidi
- [ ] App inahitaji kazi zaidi kabla ya majaribio
- [ ] App iko tayari kwa production (baada ya kurekebisha bugs)

### Hatua Zinazofuata
1. 
2. 
3. 

---

**Checklist hii imeandaliwa na Mfumo wa Audit wa PASIHAI**  
**Mwisho wa sasisho:** 2026-01-XX
