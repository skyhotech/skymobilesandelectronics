import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sky_mobile/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('Android launches and loads the real Django category feed', (
    tester,
  ) async {
    app.main();
    for (var attempt = 0; attempt < 30; attempt++) {
      await tester.pump(const Duration(seconds: 1));
      if (find.text('Explore Our Categories').evaluate().isNotEmpty) break;
    }
    expect(find.text('SKY Mobile & Electronics'), findsOneWidget);
    expect(find.text('Explore Our Categories'), findsOneWidget);
    expect(find.text('Retry'), findsNothing);
  });
}
