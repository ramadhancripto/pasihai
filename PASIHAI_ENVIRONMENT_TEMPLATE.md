# PASIHAI — ENVIRONMENT TEMPLATE

**Tarehe:** 2026-01-XX  
**Lengo:** Mfano wa environment variables zinazohitajika kwa PASIHAI

---

## 1. MUHTASARI

PASIHAI inatumia environment variables kusanidi connection na Supabase na kudhibiti hali ya mfumo (mock vs live).

**MUHIMU:**
- USIWEKE secrets halisi kwenye `.env.example` wala `.env` (kama utaitumia)
- Tumia `.env.local` kwa development (haifuatiliwi na Git)
- USITUMIE `service_role key` kwenye frontend/mobile

---

## 2. ENVIRONMENT VARIABLES

### 2.1 Supabase Configuration (LAZIMA)

#### `VITE_SUPABASE_URL`
**Maelezo:** URL ya Supabase project yako  
**Mahali pa Kupata:** Supabase Dashboard → Settings → API → Project URL  
**Mfano:**
```
VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
```
**Notes:**
- Hii ni public URL (salama kwa browser/mobile)
- Inabaki sawa kwa development na production

#### `VITE_SUPABASE_PUBLISHABLE_KEY`
**Maelezo:** Anon/public key ya Supabase  
**Mahali pa Kupata:** Supabase Dashboard → Settings → API → Project API keys → `anon` `public`  
**Mfano:**
```
VITE_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_PUBLISHABLE_KEY_REDACTED>
```
**Notes:**
- Hii ni public key (salama kwa browser/mobile)
- RLS (Row Level Security) ndio ulinzi wa kweli
- USITUMIE `service_role key` hapa (ni ya server pekee)

### 2.2 Application Mode (LAZIMA)

#### `VITE_SUPABASE_MODE`
**Maelezo:** Hali ya mfumo - `mock` au `live`  
**Chaguzi:**
- `mock` (default): Repositories zinarudisha mock data (hakuna DB inahitajika)
- `live`: Repositories zinatuma queries kwa Supabase (inahitaji schema + RLS)

**Mfano:**
```
VITE_SUPABASE_MODE=mock
```

**Notes:**
- Tumia `mock` kwa development ya awali na testing
- Badilisha kuwa `live` wakati Supabase schema na RLS ziko tayari
- `mock` mode ni salama na haifanyi network calls

---

## 3. ENVIRONMENT VARIABLES ZA ZIADA (OPTIONAL)

### 3.1 Debug Mode
#### `VITE_DEBUG`
**Maelezo:** Wezesha debug logging  
**Chaguzi:** `true` au `false`  
**Mfano:**
```
VITE_DEBUG=false
```

### 3.2 API Timeout
#### `VITE_API_TIMEOUT`
**Maelezo:** Timeout kwa API calls (milliseconds)  
**Mfano:**
```
VITE_API_TIMEOUT=30000
```

### 3.3 Cache TTL
#### `VITE_CACHE_TTL`
**Maelezo:** Time-to-live kwa cache (milliseconds)  
**Mfano:**
```
VITE_CACHE_TTL=300000
```

---

## 4. MFANO WA .env.local

Nakili content hii kwa `.env.local` na ujaze thamani halisi:

```bash
# ══════════════════════════════════════════════════════════════
# PASIHAI — Environment Variables (Development)
# ══════════════════════════════════════════════════════════════

# Supabase Configuration (LAZIMA)
# Kutoka: https://supabase.com/dashboard/project/lbcpacijbiukqcpkfktp/settings/api

VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# Application Mode (LAZIMA)
# Chaguzi: 'mock' (default) au 'live'
VITE_SUPABASE_MODE=mock

# Optional Settings
VITE_DEBUG=false
VITE_API_TIMEOUT=30000
VITE_CACHE_TTL=300000
```

---

## 5. JINSI YA KUUNDA .env.local

### Windows (Command Prompt)
```cmd
copy .env.example .env.local
notepad .env.local
```

### Windows (PowerShell)
```powershell
Copy-Item .env.example .env.local
code .env.local  # au notepad .env.local
```

### macOS/Linux
```bash
cp .env.example .env.local
nano .env.local  # au vim .env.local au code .env.local
```

---

## 6. KUTHIBITISHA ENVIRONMENT VARIABLES

### Kwenye Browser Console
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL)
console.log(import.meta.env.VITE_SUPABASE_MODE)
```

**Inayotarajiwa:**
- `VITE_SUPABASE_URL`: URL halisi (sio undefined)
- `VITE_SUPABASE_MODE`: `mock` au `live`

### Kwenye App
Angalia kwenye console logs wakati app inafunguka:
```
[SupabaseClient] Mode: mock
[SupabaseClient] URL: https://lbcpacijbiukqcpkfktp.supabase.co
```

---

## 7. USALAMA WA ENVIRONMENT VARIABLES

### Zinazoweza Kuwekwa kwa Frontend (Salama)
- ✅ `VITE_SUPABASE_URL` - Public URL
- ✅ `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key (RLS ndio ulinzi)
- ✅ `VITE_SUPABASE_MODE` - Application mode

### Zisizoweza Kuwekwa kwa Frontend (Hatari)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Inaweza kupita RLS yote
- ❌ `SUPABASE_JWT_SECRET` - Inaweza kutengeneza tokens
- ❌ Database password au connection string

### Kwa Nini Anon Key ni Salama?
1. **RLS (Row Level Security):** Kila query inakaguliwa na RLS policies
2. **Anon key inamaanisha "mtumiaji asiyejulikana":** Haina permissions zaidi ya mtumiaji wa kawaida
3. **Service role key inamaanisha "admin":** Inaweza kupita RLS yote (HATARI)

---

## 8. TROUBLESHOOTING

### Tatizo 1: `VITE_SUPABASE_URL is undefined`
**Sababu:** `.env.local` haipo au haina `VITE_SUPABASE_URL`  
**Suluhisho:**
1. Hakikisha `.env.local` ipo kwenye root ya project
2. Hakikisha ina line: `VITE_SUPABASE_URL=...`
3. Anzisha upya dev server: `npm run dev`

### Tatizo 2: `Invalid API key`
**Sababu:** `VITE_SUPABASE_PUBLISHABLE_KEY` si sahihi  
**Suluhisho:**
1. Nakili anon key tena kutoka Supabase Dashboard
2. Hakikisha hujachanganya na service_role key
3. Anzisha upya dev server

### Tatizo 3: App inatumia mock data hata kama `VITE_SUPABASE_MODE=live`
**Sababu:** Environment variable haikubadilika  
**Suluhisho:**
1. Hakikisha `.env.local` imehifadhiwa
2. Anzisha upya dev server: `Ctrl+C` kisha `npm run dev`
3. Futa browser cache na reload

### Tatizo 4: Supabase connection inashindwa
**Sababu:** URL au key si sahihi, au Supabase project haipo  
**Suluhisho:**
1. Hakikisha Supabase project iko active
2. Hakikisha URL na key ni sahihi
3. Angalia Supabase Dashboard kwa errors
4. Jaribu `VITE_SUPABASE_MODE=mock` kwanza

---

## 9. ENVIRONMENT VARIABLES KWA PRODUCTION

### Kwa Vercel/Netlify
Weka environment variables kwenye dashboard:
1. Settings → Environment Variables
2. Ongeza kila variable
3. Deploy upya

### Kwa Docker
Tumia `.env` file au environment variables kwenye `docker-compose.yml`:
```yaml
environment:
  - VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
  - VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
  - VITE_SUPABASE_MODE=live
```

### Kwa Android (Capacitor)
Environment variables zinapakwa wakati wa build (`npm run build`), hivyo hakuna haja ya kuziweka kwenye Android Studio.

---

## 10. CHECKLIST

Kabla ya kuanza development:
- [ ] `.env.local` imeundwa kutoka `.env.example`
- [ ] `VITE_SUPABASE_URL` imewekwa
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` imewekwa
- [ ] `VITE_SUPABASE_MODE` imewekwa (mock au live)
- [ ] Dev server inaweza kuanza: `npm run dev`
- [ ] App inafunguka bila errors
- [ ] Environment variables zinaonekana kwenye browser console

Kabla ya production deployment:
- [ ] `VITE_SUPABASE_MODE=live` imewekwa
- [ ] Supabase migrations zimetumwa
- [ ] RLS policies zimewekwa
- [ ] Environment variables zimewekwa kwenye hosting platform
- [ ] App imejaribiwa na live data

---

**Template hii imeandaliwa na Mfumo wa Audit wa PASIHAI**  
**Mwisho wa sasisho:** 2026-01-XX
