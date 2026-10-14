import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sky_mobile/core/api/api_client.dart';

void main() {
  test(
    'Android emulator uses host bridge, browser and desktop use loopback',
    () {
      expect(
        resolveApiBaseUrl(isWeb: false, platform: TargetPlatform.android),
        'http://10.0.2.2:8000/api/v1/',
      );
      expect(
        resolveApiBaseUrl(isWeb: true, platform: TargetPlatform.android),
        'http://127.0.0.1:8000/api/v1/',
      );
      expect(
        resolveApiBaseUrl(isWeb: false, platform: TargetPlatform.windows),
        'http://127.0.0.1:8000/api/v1/',
      );
    },
  );
  test(
    'Configured device or production API keeps its API path and adds slash',
    () {
      expect(
        resolveApiBaseUrl(
          isWeb: false,
          platform: TargetPlatform.android,
          configured: 'https://api.example.test/api/v1',
        ),
        'https://api.example.test/api/v1/',
      );
    },
  );
}
