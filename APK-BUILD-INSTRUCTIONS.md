# PASIHAI — APK Build Instructions

## Build Steps (run on local machine with Android SDK)

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npx vite build

# 3. Sync to Android
npx cap sync android

# 4. Build APK (debug)
cd android
./gradlew assembleDebug

# 5. APK output location:
# android/app/build/outputs/apk/debug/app-debug.apk

# 6. For release APK (signed):
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Prerequisites
- Node.js 18+
- Android SDK (API 33+)
- Java 11+
- Set `ANDROID_HOME` environment variable

## Environment Setup
```bash
# Create .env.local for Supabase connection
VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_MODE=live
```

## Capacitor Config
- App ID: `com.pasihai.app`
- App Name: `PASIHAI`
- Web Dir: `dist`