import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sky_mobile/core/api/api_client.dart';
import 'package:sky_mobile/features/categories/homepage_categories.dart';

void main() {
  const base = String.fromEnvironment('LIVE_API_BASE_URL');
  test(
    'Mobile category provider reads the actual published DRF feed',
    () async {
      final client = Dio(BaseOptions(baseUrl: base));
      final container = ProviderContainer(
        overrides: [apiClientProvider.overrideWithValue(client)],
      );
      addTearDown(container.dispose);
      addTearDown(() => client.close(force: true));
      final response = await client.get<Map<String, dynamic>>('categories/');
      expect(response.statusCode, 200);
      final categories = await container.read(
        homepageCategoriesProvider.future,
      );
      expect(categories.length, response.data!['count']);
      for (final category in categories) {
        expect(category.name, isNotEmpty);
        expect(Uri.parse(category.imageUrl).isAbsolute, isTrue);
      }
    },
    skip: base.isEmpty
        ? 'Supply LIVE_API_BASE_URL for the local DRF integration test'
        : false,
  );
}
