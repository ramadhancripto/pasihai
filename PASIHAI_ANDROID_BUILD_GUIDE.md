# PASIHAI — ANDROID BUILD GUIDE

**Tarehe:** 2026-01-XX  
**Lengo:** Kuunda debug APK ya PASIHAI kwa majaribio kwenye simu ya Android

---

## 1. MAHITAJI YA MFUMO (Windows)

### Software Inayohitajika
1. **Node.js** (v18 au v20) - https://nodejs.org/
2. **npm** (v9+) - Inakuja na Node.js
3. **Android Studio** (latest) - https://developer.android.com/studio
4. **Java JDK** (v17) - Inakuja na Android Studio
5. **Git** (optional) - https://git-scm.com/

### Hardware Inayohitajika
- RAM: 8 GB minimum (16 GB inapendekezwa)
- Disk Space: 10 GB kwa Android Studio + SDK
- CPU: Intel i5/AMD Ryzen 5 au bora zaidi

---

## 2. HATUA ZA KUANZA

### 2.1 Pakua na Sakinisha Android Studio
1. Enda https://developer.android.com/studio
2. Pakua Android Studio kwa Windows
3. Sakinisha na ufuate maagizo ya installer
4. Fungua Android Studio na ukamilishe setup wizard:
   - Chagua "Standard" installation
   - Hakikisha "Android SDK" na "Android Virtual Device" zimechaguliwa
   - Subiri download ikamilike (~2 GB)

### 2.2 Hakikisha Java JDK Imewekwa
```cmd
java --version
```
**Inayotarajiwa:** `openjdk 17.x.x` au `java 17.x.x`

Kama haipo, sakinisha kutoka Android Studio:
- File → Settings → Build, Execution, Deployment → Build Tools → Gradle
- Chagua "JDK 17" kutoka dropdown

### 2.3 Weka Environment Variables
Fungua "Environment Variables" kwenye Windows:
1. Bonyeza `Win + R`, andika `sysdm.cpl`, bonyeza Enter
2. Tab "Advanced" → "Environment Variables"
3. Kwenye "System variables", bonyeza "New":
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Android\Android Studio\jbr` (au path yako ya JDK)
4. Bonyeza OK

### 2.4 Pakua Project
Kama una ZIP ya project:
1. Extract ZIP kwenye folder unayotaka (mfano: `C:\Users\user\Desktop\pasihai`)
2. Fungua Command Prompt au PowerShell kwenye folder hiyo

Kama una Git repository:
```cmd
git clone https://github.com/ramadhancripto/pasihai.git
cd pasihai
```

---

## 3. SANIDI PROJECT

### 3.1 Sakinisha Dependencies
```cmd
npm install
```
**Muda:** ~2-5 dakika  
**Matokeo:** `node_modules/` folder itaundwa (~150 MB)

### 3.2 Unda Environment Variables
```cmd
copy .env.example .env.local
```

Fungua `.env.local` na Notepad au editor yako:
```cmd
notepad .env.local
```

Jaza thamani halisi:
```env
# Supabase URL (kutoka https://supabase.com/dashboard/project/lbcpacijbiukqcpkfktp/settings/api)
VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co

# Supabase anon/publishable key (kutoka Dashboard → Settings → API)
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# Mode: 'mock' au 'live'
VITE_SUPABASE_MODE=mock
```

**MUHIMU:** 
- Tumia `anon key` (sio `service_role key`)
- `anon key` ni salama kwa browser/mobile
- `service_role key` ni ya server pekee (USIITUMIE)

### 3.3 Jenga Web App
```cmd
npm run build
```
**Muda:** ~10-30 sekunde  
**Matokeo:** `dist/` folder itaundwa

**Kama kuna errors:**
- Hakikisha Node.js imewekwa: `node --version`
- Hakikisha dependencies zimesakinishwa: `npm install` tena
- Angalia console kwa error messages

---

## 4. ONGEZA CAPACITOR (ANDROID WRAPPER)

### 4.1 Sakinisha Capacitor
```cmd
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
```
**Muda:** ~1-2 dakika

### 4.2 Sanidi Capacitor
```cmd
npx cap init PASIHAI com.pasihai.app --web-dir=dist
```

Hii itaunda `capacitor.config.json`:
```json
{
  "appId": "com.pasihai.app",
  "appName": "PASIHAI",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

### 4.3 Ongeza Android Platform
```cmd
npx cap add android
```
**Muda:** ~1-2 dakika  
**Matokeo:** `android/` folder itaundwa

**Kama kuna error "android platform already exists":**
```cmd
npx cap remove android
npx cap add android
```

---

## 5. JENGA APK

### 5.1 Nakili Web App kwa Android
```cmd
npx cap sync android
```
**Muda:** ~30 sekunde  
**Matokeo:** `dist/` itanakiliwa kwa `android/app/src/main/assets/public/`

### 5.2 Fungua Android Studio
```cmd
npx cap open android
```
Hii itafungua Android Studio na project ya Android.

**Kama Android Studio haifunguki:**
- Fungua Android Studio manually
- File → Open → Chagua `android/` folder kwenye project yako

### 5.3 Jenga Debug APK kwenye Android Studio
1. Subiri Gradle sync ikamilike (~1-3 dakika mara ya kwanza)
2. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Subiri build ikamilike (~2-5 dakika)
4. Bonyeza "locate" kwenye notification au enda:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### 5.4 Au Jenga kwa Command Line
```cmd
cd android
.\gradlew assembleDebug
```
**Matokeo:** `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 6. SAKINISHA APK KWENYE SIMU

### 6.1 Wezesha Developer Options kwenye Simu
1. Settings → About Phone
2. Bonyeza "Build Number" mara 7
3. Rudi nyuma → Developer Options itaonekana

### 6.2 Wezesha USB Debugging
1. Settings → Developer Options
2. Wezesha "USB Debugging"
3. Unganisha simu na kompyuta kwa USB cable
4. Ruhusu USB debugging kwenye simu (prompt itaonekana)

### 6.3 Sakinisha APK kwa ADB
```cmd
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Kama adb haipatikani:**
- Ongeza kwa PATH: `C:\Users\user\AppData\Local\Android\Sdk\platform-tools`
- Au tumia Android Studio: Run → Run 'app'

### 6.4 Au Sakinisha Manual
1. Nakili `app-debug.apk` kwa simu (USB, email, au cloud storage)
2. Kwenye simu, fungua file manager na bonyeza APK
3. Ruhusu "Install from unknown sources" kama inahitajika
4. Bonyeza "Install"

---

## 7. MAJARIBIO YA KWANZA

### 7.1 Fungua App
1. Tafuta "PASIHAI" kwenye app drawer
2. Bonyeza icon kufungua

### 7.2 Angalia Hali
- ✅ App inafunguka bila crash
- ✅ Splash screen inaonekana
- ✅ Login screen inaonekana (au home kama umeingia)
- ✅ Hakuna error messages

### 7.3 Jaribu Features
1. **Login:** Ingia na account yako ya Supabase (kama `VITE_SUPABASE_MODE=live`)
2. **Feed:** Angalia kama posts zinaonekana
3. **Create Post:** Jaribu kuunda post mpya
4. **Chat:** Fungua chat na ujumbe
5. **Offline:** Zima WiFi/data na angalia kama app inafanya kazi

### 7.4 Angalia Console Logs
Kwenye Android Studio:
1. View → Tool Windows → Logcat
2. Chagua "PASIHAI" kutoka app dropdown
3. Angalia logs kwa errors au warnings

---

## 8. MATATIZO YA KAWAIDA NA SULUHISHO

### Tatizo 1: "SDK location not found"
**Suluhisho:**
```cmd
set ANDROID_HOME=C:\Users\user\AppData\Local\Android\Sdk
```
Au weka kwa Environment Variables permanently.

### Tatizo 2: "Java version mismatch"
**Suluhisho:**
- Fungua `android/gradle.properties`
- Ongeza: `org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr`

### Tatizo 3: "Build failed with exception"
**Suluhisho:**
```cmd
cd android
.\gradlew clean
.\gradlew assembleDebug
```

### Tatizo 4: "App crashes on launch"
**Suluhisho:**
- Angalia Logcat kwa error stack trace
- Hakikisha `.env.local` ina values sahihi
- Jaribu `VITE_SUPABASE_MODE=mock` kwanza

### Tatizo 5: "White screen / blank app"
**Suluhisho:**
- Hakikisha `npm run build` imefanikiwa
- Endesha `npx cap sync android` tena
- Angalia `android/app/src/main/assets/public/` ina files

---

## 9. KUBORESHA APK KWA PRODUCTION (BAADAYE)

### 9.1 Jenga Release APK
```cmd
cd android
.\gradlew assembleRelease
```
**Matokeo:** `android/app/build/outputs/apk/release/app-release-unsigned.apk`

### 9.2 Sign APK (Inahitajika kwa Play Store)
1. Unda keystore:
```cmd
keytool -genkey -v -keystore pasihai-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pasihai
```
2. Sign APK:
```cmd
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore pasihai-release-key.jks app-release-unsigned.apk pasihai
```

### 9.3 Optimize APK
```cmd
zipalign -v 4 app-release-unsigned.apk pasihai-release.apk
```

---

## 10. CHECKLIST YA MWISHO

Kabla ya kujenga APK:
- [ ] Node.js imewekwa (`node --version`)
- [ ] Android Studio imewekwa
- [ ] Java JDK imewekwa (`java --version`)
- [ ] Project imenakiliwa au kufunguliwa
- [ ] `npm install` imefanikiwa
- [ ] `.env.local` imeundwa na kujazwa
- [ ] `npm run build` imefanikiwa
- [ ] Capacitor imesakinishwa
- [ ] `npx cap add android` imefanikiwa
- [ ] `npx cap sync android` imefanikiwa

Baada ya kujenga APK:
- [ ] APK imeundwa (`app-debug.apk`)
- [ ] APK imesakinishwa kwenye simu
- [ ] App inafunguka bila crash
- [ ] Features muhimu zinafanya kazi
- [ ] Hakuna errors kwenye Logcat

---

## 11. RASLIMALI ZA ZIADA

### Documentation
- Capacitor Docs: https://capacitorjs.com/docs
- Android Developer: https://developer.android.com/docs
- Supabase Docs: https://supabase.com/docs

### Communities
- Capacitor Discord: https://discord.gg/capacitor
- Supabase Discord: https://discord.gg/supabase
- React Discord: https://discord.gg/react

### Tools
- Android Studio: https://developer.android.com/studio
- VS Code: https://code.visualstudio.com/
- Git: https://git-scm.com/

---

**Guide hii imeandaliwa na Mfumo wa Audit wa PASIHAI**  
**Mwisho wa sasisho:** 2026-01-XX
