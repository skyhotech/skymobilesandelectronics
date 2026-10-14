import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sky_mobile/app/app.dart';
import 'package:sky_mobile/core/api/api_client.dart';

void main() {
  testWidgets('Open home screen updates categories without manual refresh', (
    tester,
  ) async {
    final client = Dio(BaseOptions(baseUrl: 'https://example.invalid/api/v1/'));
    var calls = 0;
    client.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          calls++;
          if (calls > 1) {
            expect(request.headers['If-None-Match'], '"categories-1"');
          }
          handler.resolve(
            Response(
              requestOptions: request,
              statusCode: 200,
              headers: Headers.fromMap({
                'etag': ['"categories-1"'],
              }),
              data: {
                'revision': calls,
                'nodes': [
                  {
                    'id': 1,
                    'parent': null,
                    'parent_name': '',
                    'name': calls == 1
                        ? 'Before admin edit'
                        : 'After admin edit',
                    'description': '',
                    'badge': '',
                    'image_url': '',
                    'starting_price': null,
                  },
                ],
              },
            ),
          );
        },
      ),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [apiClientProvider.overrideWithValue(client)],
        child: const SkyApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Before admin edit'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.text('After admin edit'), findsOneWidget);
    expect(find.text('Before admin edit'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    client.close(force: true);
  });
}
