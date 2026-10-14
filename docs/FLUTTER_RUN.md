# Running the Android app locally

Start Django and Redis, start an Android emulator in Android Studio, then run:

```powershell
. .\scripts\env.ps1
cd mobile_app
flutter run -d emulator-5554
```

Use `flutter devices` if the emulator has another device ID. In the IDE, choose
**SKY Mobile (Flutter)** in Run and Debug, select the Android emulator, and press
F5. Launch configurations exist for both the parent workspace and sky-platform.

The emulator accesses Django through `http://10.0.2.2:8000/api/v1/`. A physical
phone needs a reachable host address supplied with `--dart-define=API_BASE_URL=...`.
Non-Android targets default to local loopback. Production builds must specify
their HTTPS API URL. Debug Android builds permit local HTTP; release builds do
not inherit that debug allowance. Internet permission is declared in the main
manifest so release builds can access HTTPS APIs too.

## Reproduced build failure

The first emulator run failed before installation because Android NDK
`28.2.13676358` was missing. The installed 2026 sdkmanager compatibility wrapper
split the NDK package name and reported `Package ndk not found` and
`Package 28.2.13676358 not found`. The new Android CLI listed the actual package
as `ndk/28.2.13676358`. Install it using the new syntax:

```powershell
& 'C:\Android\Sdk\cmdline-tools\latest\bin\android.exe' --sdk=C:\Android\Sdk sdk install 'ndk/28.2.13676358'
```

Use your configured SDK directory if it differs. This is a one-time local SDK
operation; the application retains Flutter's NDK version configuration. No
framework downgrade or global SDK-manager wrapper edits are required.

This machine also lacked SDK Platforms 36 and 35 and CMake 3.22.1. Platform 36
was installed explicitly and Gradle installed the remaining required packages.
The completed local setup built the debug APK and installed it on Android 17
emulator `emulator-5554` successfully.

Regression checks:

```powershell
flutter analyze
flutter test
flutter test integration_test/startup_test.dart -d emulator-5554
```

The emulator integration test requires Django to be running and checks that the
real category feed loads into the app, rather than testing a mocked launch only.

Verified on 14 October 2026: Flutter analyzer clean; 11 unit/widget/API tests
passed; the Android emulator startup integration test passed. A screenshot of
the real running app, including its category image from Django, was captured at
`.run/flutter-android-home.png`. Maestro is unavailable; this verification used
Flutter integration_test and ADB on the connected Android emulator. No iOS build
or physical-device verification is claimed.
