# PASIHAI — KNOWN LIMITATIONS

**Tarehe:** 2026-01-XX  
**Hali ya Mfumo:** 74% tayari kwa production

---

## 1. MUHTASARI

PASIHAI ni mradi wenye vipengele vingi vilivyokamilika, lakini bado kuna mapungufu muhimu ambayo yanahitaji kushughulikiwa kabla ya production deployment.

**Yenye Kufanya Kazi:**
- ✅ Core features (Feed, Chat, Spaces, Gundua)
- ✅ Authentication na profile management
- ✅ Offline-first architecture
- ✅ Server-side idempotency (local)
- ✅ Tests zote (706/706)

**Yenye Kuhitaji Kazi:**
- ⚠️ Android wrapper (Capacitor)
- ⚠️ Environment configuration
- ⚠️ Supabase migrations deployment
- ⚠️ Realtime integration
- ⚠️ E2E tests
- ⚠️ Production monitoring

---

## 2. VIPENGELE AMBAVYO BADO HAVIJAKAMILIKA

### 2.1 Android/Mobile Support
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Hakuna wrapper ya Android (Capacitor au similar)  
**Athari:** Huwezi kujenga APK au kusambaza kwa simu  
**Suluhisho:** Ongeza Capacitor na kusanidi  
**Kipaumbele:** JUU

### 2.2 Supabase Realtime
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Realtime subscriptions hazijatekelezwa  
**Athari:** 
- Messages hazionekani mara moja (inahitaji refresh)
- Posts mpya hazionekani kwenye feed moja kwa moja
- Notifications hazifiki papo hapo  
**Suluhisho:** Wezesha Supabase Realtime na ongeza subscriptions  
**Kipaumbele:** KATI

### 2.3 Supabase Storage
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Media upload/download haijatekelezwa kikamilifu  
**Athari:**
- Huwezi kupakia picha au video
- Media URLs zinaweza kuwa placeholder  
**Suluhisho:** Sanidi Supabase Storage bucket na ongeza upload logic  
**Kipaumbele:** KATI

### 2.4 Push Notifications
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna push notification system  
**Athari:** Watumiaji hawapokei notifications kwenye simu  
**Suluhisho:** 
- Wezesha Supabase Edge Functions
- Sanidi Firebase Cloud Messaging (FCM)
- Ongeza service worker kwa web notifications  
**Kipaumbele:** CHINI

### 2.5 E2E Tests
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna end-to-end tests na Playwright au Cypress  
**Athari:** 
- Bugs zinaweza kupatikana kwa majaribio ya manual tu
- Regression testing ni ngumu  
**Suluhisho:** Andika E2E tests kwa workflows muhimu  
**Kipaumbele:** CHINI

### 2.6 Production Monitoring
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna error tracking au performance monitoring  
**Athari:** 
- Bugs za production hazijulikani mara moja
- Performance issues hazionekani  
**Suluhisho:** Ongeza Sentry au similar tool  
**Kipaumbele:** CHINI

---

## 3. VIPENGELE AMBAVYO HAVIJATHIBITISHWA

### 3.1 Supabase Migrations
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** Migration 016 (idempotency) ipo kwenye repo lakini haijatumwa kwa hosted database  
**Athari:**
- Idempotency haifanyi kazi kwenye production
- Duplicate submissions zinawezekana  
**Suluhisho:** Tumia `supabase db push` (inahitaji ruhusa)  
**Kipaumbele:** KATI

### 3.2 RLS Policies
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** RLS policies zipo kwenye migrations lakini hazijajaribiwa kwa ufanisi  
**Athari:**
- Watumiaji wanaweza kupata data wasiyostahili
- Security vulnerabilities zinawezekana  
**Suluhisho:** Andika RLS tests na kuzijaribu kwa Supabase halisi  
**Kipaumbele:** JUU

### 3.3 Service Worker
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** Service worker ipo lakini haijajaribiwa kwa ufanisi  
**Athari:**
- Offline functionality inaweza kuwa na bugs
- Cache invalidation inaweza kushindwa  
**Suluhisho:** Andika service worker tests na kuzijaribu kwa browser  
**Kipaumbele:** CHINI

### 3.4 Idempotency Implementation
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** Idempotency imetekelezwa kwenye code lakini haijajaribiwa na Supabase halisi  
**Athari:**
- Duplicate handling inaweza kushindwa
- Data integrity inaweza kuwa na matatizo  
**Suluhisho:** Jaribu na Supabase halisi baada ya kutuma migration 016  
**Kipaumbele:** KATI

---

## 4. MAPUNGUU YA KIUFUNDI

### 4.1 Build Size
**Hali:** ⚠️ TATIZO DOGO  
**Maelezo:** `index.js` ni 870 KB (zaidi ya 500 KB inayopendekezwa)  
**Athari:**
- Load time inaweza kuwa polepole kwenye network za polepole
- Initial bundle ni kubwa  
**Suluhisho:** Tumia code splitting (dynamic imports)  
**Kipaumbele:** CHINI

### 4.2 Performance Optimization
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Hakuna lazy loading, prefetching, au optimizations nyingine  
**Athari:**
- App inaweza kuwa polepole kwenye devices za chini
- Memory usage inaweza kuwa kubwa  
**Suluhisho:** Ongeza lazy loading, code splitting, na caching strategies  
**Kipaumbele:** CHINI

### 4.3 Accessibility
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Accessibility features zipo lakini hazijajaribiwa kwa ufanisi  
**Athari:**
- Watumiaji wenye ulemavu wanaweza kupata shida
- Screen readers wanaweza kushindwa  
**Suluhisho:** Fanya accessibility audit na kurekebisha matatizo  
**Kipaumbele:** CHINI

### 4.4 Internationalization (i18n)
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** App inatumia Kiswahili pekee  
**Athari:**
- Watumiaji wasiojua Kiswahili hawawezi kutumia app  
**Suluhisho:** Ongeza i18n framework (react-i18next au similar)  
**Kipaumbele:** CHINI (kama unataka lugha nyingine)

---

## 5. MAPUNGUU YA KIBIASHARA

### 5.1 Analytics
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna user analytics au tracking  
**Athari:**
- Huwezi kuelewa jinsi watumiaji wanavyotumia app
- Huwezi kupima engagement au retention  
**Suluhisho:** Ongeza Google Analytics, Mixpanel, au similar  
**Kipaumbele:** CHINI (kwa sasa)

### 5.2 A/B Testing
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna A/B testing framework  
**Athari:**
- Huwezi kujaribu features tofauti
- Huwezi kuboresha conversion rates  
**Suluhisho:** Ongeza LaunchDarkly, Optimizely, au similar  
**Kipaumbele:** CHINI (kwa sasa)

### 5.3 Content Moderation
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna automatic content moderation  
**Athari:**
- Content mbaya inaweza kuonekana
- Inahitaji manual moderation  
**Suluhisho:** Ongeza AI moderation (Perspective API au similar)  
**Kipaumbele:** KATI (kama utakuwa na watumiaji wengi)

---

## 6. MAPUNGUU YA KISHERIA

### 6.1 Privacy Policy
**Hali:** ❌ HAIJAKAMILIKA  
**Maelezo:** Hakuna privacy policy wazi  
**Athari:**
- Huwezi kuchapisha kwenye app stores
- Watumiaji hawajui jinsi data yao inavyotumika  
**Suluhisho:** Andika privacy policy na kuionyesha kwenye app  
**Kipaumbele:** JUU (kabla ya production)

### 6.2 Terms of Service
**Hali:** ❌ HAIJAKAMILIKA  
**Maelezo:** Hakuna terms of service  
**Athari:**
- Huwezi kuchapisha kwenye app stores
- Hakuna mkataba wazi na watumiaji  
**Suluhisho:** Andika terms of service  
**Kipaumbele:** JUU (kabla ya production)

### 6.3 GDPR Compliance
**Hali:** ❌ HAIJATHIBITISHWA  
**Maelezo:** GDPR compliance haijathibitishwa  
**Athari:**
- Huwezi kutumika Ulaya
- Faini zinawezekana  
**Suluhisho:** Fanya GDPR audit na kurekebisha matatizo  
**Kipaumbele:** KATI (kama utakuwa na watumiaji wa Ulaya)

---

## 7. MAPUNGUU YA USAKinishaji

### 7.1 CI/CD Pipeline
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna continuous integration au deployment  
**Athari:**
- Testing na deployment ni manual
- Bugs zinaweza kufika production  
**Suluhisho:** Sanidi GitHub Actions au similar  
**Kipaumbele:** KATI

### 7.2 Automated Testing
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Kuna unit tests na integration tests, lakini hakuna E2E tests  
**Athari:**
- Regression testing ni ngumu
- Bugs zinaweza kupatikana kwa manual testing tu  
**Suluhisho:** Ongeza E2E tests na CI/CD pipeline  
**Kipaumbele:** KATI

### 7.3 Backup na Recovery
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna automated database backups  
**Athari:**
- Data loss inawezekana kama Supabase inashindwa
- Recovery ni ngumu  
**Suluhisho:** Sanidi Supabase backups na disaster recovery plan  
**Kipaumbele:** JUU (kabla ya production)

---

## 8. MAPUNGUU YA USAKinishaji (ANDROID)

### 8.1 Play Store Listing
**Hali:** ❌ HAIJAKAMILIKA  
**Maelezo:** Hakuna Play Store listing (screenshots, description, etc.)  
**Athari:**
- Huwezi kuchapisha kwenye Play Store  
**Suluhisho:** Andaa screenshots, description, na metadata  
**Kipaumbele:** CHINI (kwa sasa)

### 8.2 App Signing
**Hali:** ❌ HAIJAKAMILIKA  
**Maelezo:** Hakuna release keystore au app signing  
**Athari:**
- APK haiwezi kuchapishwa kwenye Play Store  
**Suluhisho:** Unda release keystore na kusaini APK  
**Kipaumbele:** KATI (kabla ya production)

### 8.3 ProGuard/R8
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna code obfuscation au minification  
**Athari:**
- APK ni kubwa zaidi ya inavyohitajika
- Code inaweza kusomwa na wengine  
**Suluhisho:** Wezesha ProGuard/R8 kwenye Android build  
**Kipaumbele:** CHINI

---

## 9. MAPUNGUU YA UTENDAJI

### 9.1 Offline Sync Conflicts
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** Conflict resolution haijajaribiwa kwa ufanisi  
**Athari:**
- Data inaweza kupotea wakati wa sync conflicts
- Watumiaji wanaweza kupata unexpected behavior  
**Suluhisho:** Jaribu conflict scenarios na kurekebisha matatizo  
**Kipaumbele:** KATI

### 9.2 Large Data Sets
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** Performance na large data sets haijajaribiwa  
**Athari:**
- App inaweza kuwa polepole na data nyingi
- Memory issues zinawezekana  
**Suluhisho:** Jaribu na 10,000+ posts/users na kuboresha performance  
**Kipaumbele:** CHINI

### 9.3 Concurrent Users
**Hali:** ⚠️ HAIJATHIBITISHWA  
**Maelezo:** Performance na concurrent users haijajaribiwa  
**Athari:**
- Supabase inaweza kushindwa na traffic kubwa
- App inaweza kuwa polepole  
**Suluhisho:** Fanya load testing na kuboresha Supabase configuration  
**Kipaumbele:** CHINI (kwa sasa)

---

## 10. MAPUNGUU YA USALAMA

### 10.1 Input Validation
**Hali:** ⚠️ HAIJAKAMILIKA  
**Maelezo:** Input validation ipo lakini haijakamilika  
**Athari:**
- SQL injection inawezekana (ingawa RLS inalinda)
- XSS inawezekana  
**Suluhisho:** Ongeza input validation kwenye client na server  
**Kipaumbele:** JUU

### 10.2 Rate Limiting
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna rate limiting kwa API calls  
**Athari:**
- Abuse inawezekana
- Supabase inaweza kushindwa na traffic kubwa  
**Suluhisho:** Ongeza rate limiting kwa Supabase Edge Functions  
**Kipaumbele:** KATI

### 10.3 Content Security Policy (CSP)
**Hali:** ❌ HAIJATEKELEZWA  
**Maelezo:** Hakuna CSP headers  
**Athari:**
- XSS attacks zinawezekana  
**Suluhisho:** Ongeza CSP headers kwenye server  
**Kipaumbele:** CHINI

---

## 11. MUHTASARI WA KIPAUMBELE

### Kipaumbele cha Juu (Lazima kabla ya production)
1. ⏳ Ongeza Capacitor kwa Android
2. ⏳ Tuma migration 016 kwa Supabase
3. ⏳ Jaribu RLS policies kwa Supabase halisi
4. ⏳ Andika privacy policy na terms of service
5. ⏳ Sanidi database backups

### Kipaumbele cha Kati (Inapendekezwa)
6. ⏳ Wezesha Supabase Realtime
7. ⏳ Sanidi Supabase Storage
8. ⏳ Andika E2E tests
9. ⏳ Sanidi CI/CD pipeline
10. ⏳ Ongeza production monitoring (Sentry)

### Kipaumbele cha Chini (Baadaye)
11. ⏳ Boresha build size (code splitting)
12. ⏳ Ongeza push notifications
13. ⏳ Fanya accessibility audit
14. ⏳ Ongeza analytics
15. ⏳ Sanidi Play Store listing

---

## 12. HITIMISHO

**Hali ya Sasa:** PASIHAI iko 74% tayari kwa production

**Yenye Kufanya Kazi Vizuri:**
- Core features zimekamilika na zimejaribiwa
- Offline-first architecture ni imara
- Tests zote (706/706) zinafaulu
- Idempotency imetekelezwa (local)

**Yenye Kuhitaji Kazi:**
- Android wrapper (Capacitor)
- Supabase migrations deployment
- Realtime integration
- Production monitoring
- Legal documents (privacy policy, ToS)

**Mapendekezo:**
1. Anza na Android wrapper kwa majaribio ya ndani
2. Tuma migrations kwa Supabase na ujaribu kwa ufanisi
3. Ongeza Realtime na Storage kwa user experience bora
4. Andaa legal documents kabla ya public launch
5. Sanidi monitoring na CI/CD kwa production readiness

---

**Ripoti hii imeandaliwa na Mfumo wa Audit wa PASIHAI**  
**Mwisho wa sasisho:** 2026-01-XX
