import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sky_mobile/app/app.dart';
import 'package:sky_mobile/features/categories/homepage_categories.dart';

void main() {
  testWidgets('App launches with the SKY home route', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [homepageCategoriesProvider.overrideWith((ref) async => [])],
        child: const SkyApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('SKY Mobile & Electronics'), findsOneWidget);
    expect(find.text('Explore Our Categories'), findsOneWidget);
    expect(find.text('New categories are coming soon.'), findsOneWidget);
  });

  testWidgets(
    'Published category content appears from the shared API provider',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            homepageCategoriesProvider.overrideWith(
              (ref) async => [
                const HomepageCategory(
                  id: 1,
                  name: 'Test category',
                  description: 'Managed in SKY admin',
                  badge: 'New',
                  imageUrl: 'http://example.invalid/category.webp',
                  startingPrice: '8999.00',
                  parentId: 5,
                  parentName: 'Managed parent',
                ),
              ],
            ),
          ],
          child: const SkyApp(),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Test category'), findsOneWidget);
      expect(find.text('Managed in SKY admin'), findsOneWidget);
      expect(find.text('New'), findsOneWidget);
      expect(find.text('In Managed parent'), findsOneWidget);
    },
  );

  testWidgets('Category failure exposes retry', (tester) async {
    var calls = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homepageCategoriesProvider.overrideWith((ref) async {
            calls++;
            throw Exception('offline');
          }),
        ],
        child: const SkyApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Retry'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(calls, greaterThanOrEqualTo(2));
  });

  test('Category image URLs resolve against the mobile API host', () {
    final category = HomepageCategory.fromJson({
      'id': 4,
      'name': 'Phones',
      'description': '',
      'badge': '',
      'image_url': '/media/categories/test.webp',
      'starting_price': null,
    }, Uri.parse('http://10.0.2.2:8000/api/v1/'));
    expect(
      category.imageUrl,
      'http://10.0.2.2:8000/media/categories/test.webp',
    );
    expect(category.startingPrice, isNull);
  });
}
