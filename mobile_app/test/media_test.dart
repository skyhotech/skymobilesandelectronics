import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sky_mobile/core/api/api_client.dart';
import 'package:sky_mobile/core/api/media_url.dart';
import 'package:sky_mobile/shared/widgets/media_image.dart';

void main() {
  test('Relative media filenames work with emulator, device and production origins', () {
    for (final origin in [
      'http://10.0.2.2:8000',
      'http://192.0.2.5:8000',
      'https://api.example.test',
    ]) {
      for (final kind in ['products', 'brands', 'categories', 'banners']) {
        expect(
          resolveMediaUrl(
            '$kind/optimized/main.webp',
            Uri.parse('$origin/api/v1/'),
          ),
          '$origin/media/$kind/optimized/main.webp',
        );
      }
    }
    expect(
      resolveMediaUrl(
        '/media/products/main.webp',
        Uri.parse('https://api.example.test/api/v1/'),
        mediaOrigin: 'https://media.example.test',
      ),
      'https://media.example.test/media/products/main.webp',
    );
  });
  test('Invalid or missing references never become network image URLs', () {
    for (final value in [
      null,
      '',
      '//evil.test/image.webp',
      r'E:\media\image.webp',
      '/media/products/../secret.webp',
      'https://evil.test/media/products/x.webp',
    ]) {
      expect(
        resolveMediaUrl(value, Uri.parse('https://api.example.test/api/v1/')),
        isNull,
      );
    }
  });
  testWidgets('Missing and failed images use a placeholder', (tester) async {
    final client = Dio(
      BaseOptions(baseUrl: 'https://api.example.test/api/v1/'),
    );
    addTearDown(() => client.close(force: true));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(client)],
        child: const MaterialApp(
          home: Scaffold(
            body: SkyMediaImage(reference: null, width: 100, height: 100),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.image_not_supported_outlined), findsOneWidget);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(client)],
        child: const MaterialApp(
          home: Scaffold(
            body: SkyMediaImage(
              reference: '/media/products/missing.webp',
              width: 100,
              height: 100,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byIcon(Icons.image_not_supported_outlined), findsOneWidget);
  });
}
