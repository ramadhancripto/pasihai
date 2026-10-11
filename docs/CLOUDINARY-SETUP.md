# Cloudinary — usanidi na hatua za mikono (PASIHAI)

Hali: code imekamilika na kupimwa kwa majaribio ya stub (`npm run test:cloudinary`).
Bado HAIJATHIBITISHWA na upload halisi kwenye akaunti ya Cloudinary. Hatua zifuatazo ni za mtumiaji.

## 1. Ukaguzi wa preset (LAZIMA kabla ya kuweka env za frontend)
Kwenye Cloudinary Console → Settings → Upload → Upload presets → `pasihai_preset`:
- Signing mode: **Unsigned**. (Probe ya curl ilithibitisha preset ipo; haikuthibitisha mipangilio hii.)
- Folder: `pasihai` (au tumia folder restriction).
- Allowed formats: picha `jpg, png, webp, gif`; video `mp4, webm, mov`.
- Max file size: picha 25 MB (status) / 50 MB (posts); video kulingana na mahitaji.
- Disable overwrite; ongeza moderation/transformations kama inahitajika.

## 2. Env za frontend (`.env.local` imeundwa; ina thamani mbili za umma pekee)
Zimewekwa kwenye `.env.local` (ambayo iko kwenye `.gitignore`). Thamani zilizowekwa:
```
VITE_CLOUDINARY_CLOUD_NAME=noropw5y
VITE_CLOUDINARY_UPLOAD_PRESET=pasihai_preset
```
Ukiweka moja tu, upload inakataliwa kwa kosa wazi (hakuna fallback kimya).

## 3. Backend (si frontend)
`CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@noropw5y` — weka kwenye environment ya backend pekee.
Thamani hizi HAZIPASWI kwenda kwenye React, `VITE_*`, `.env.example`, ZIP, wala GitHub.
Kwa sasa hakuna backend ya signed upload; secret haitumiki na app.

## 4. Data
- Posts: `media_url` = `secure_url`, `media_path` = NULL, `media_meta` = {provider, publicId, resourceType, format, bytes, ...}.
- Status: `media_url` = `secure_url`, `media_path` = NULL (inakidhi `statuses_content_check`, migration 017).
- Hakuna mabadiliko ya schema wala migration. Hakuna data iliyofutwa.
- Status inaisha kwa `expires_at` (kusomwa kunachuja). Asset ya Cloudinary HAIFUTWI kiotomatiki (unsigned haiwezi kufuta). Asset za yatima zinahitaji usafishaji wa mkono au backend ya signed.

## 5. Ukaguzi wa usalama uliofanyika
- URL ya mteja: `addPost` inakubali `mediaUrl` tu ikiwa inaanza na `https://res.cloudinary.com/noropw5y/{image|video}/upload/`.
- Jibu la Cloudinary: `secure_url` lazima iwe ya cloud yetu; `public_id` lazima ianze na `pasihai/`; `resource_type` lazima ilingane.
- Aina za faili na ukubwa vinakaguliwa kabla ya mtandao (client), na preset inapaswa kukagua pia (hatua 1).
- Upload moja kwa wakati mmoja kwa kila tab.
- Mtumiaji asiye na session: hakuna upload wala row.

## 6. Mapungufu yanayojulikana
- Unsigned upload: mtu mwenye preset name anaweza kupakia moja kwa moja kwa API. Kizuizi halisi ni preset settings na rate limit ya Cloudinary, si app.
- Rate limit ya app ni ya tab moja tu (in-flight lock). Kikomo halisi cha kiasi kinahitaji backend.
- `statuses` haina safu ya `public_id`. Inaweza kupatikana kutoka `secure_url` (`/upload/v<ver>/pasihai/<id>.<ext>`). Kuiongeza kama safu kunahitaji migration, na hilo halijaidhinishwa.
- Ukaguzi wa "URL ya cloud yetu" unakubali asset yoyote ndani ya cloud hiyo, si lazima iwe ya mtumiaji huyo.
- Upload ya Cloudinary inahitaji live Supabase kuhifadhi row (mode ya mock haihifadhi status/post zenye media).

## 6a. Hali ya majaribio ya upload halisi
Upload halisi kwenye akaunti ya noropw5y HAIJAFANYIKA. Inasubiri idhini ya mtumiaji.
Hakuna signed backend bado; unsigned inaendelea kwa sasa.

## 7. Kabla ya production
- [ ] Hatua 1 imekaguliwa kwenye dashboard.
- [ ] Upload halisi ya picha na video kwenye akaunti ya test, kisha kufuta asset za test kwa mkono.
- [ ] Backend ya signed upload (au kufuta asset) imeamuliwa.
- [ ] Ukaguzi wa usalama wa mtumiaji mwingine kuweka URL ya cloud yetu umefanyika.
