# SKY mobile app

Android and iOS platform projects are generated. The starter uses Riverpod and go_router,
with a Dio client and bounded timeouts. Installed packages include secure storage,
cached_network_image, and web_socket_channel; authentication, caching screens, and realtime
features are not implemented yet.

Run `flutter pub get --enforce-lockfile`, `flutter analyze`, and `flutter test`.
Use `flutter devices` then `flutter run -d <device-id>` to launch.
The API URL can be supplied with `--dart-define=API_BASE_URL=https://host/api/v1/`.
Android builds require Android SDK/JDK; iOS builds require macOS/Xcode and signing credentials.
