import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

String resolveApiBaseUrl({
  required bool isWeb,
  required TargetPlatform platform,
  String configured = '',
}) {
  final fallback = !isWeb && platform == TargetPlatform.android
      ? 'http://10.0.2.2:8000/api/v1/'
      : 'http://127.0.0.1:8000/api/v1/';
  final value = configured.isEmpty ? fallback : configured;
  return value.endsWith('/') ? value : '$value/';
}

final apiClientProvider = Provider<Dio>((ref) {
  final baseUrl = resolveApiBaseUrl(
    isWeb: kIsWeb,
    platform: defaultTargetPlatform,
    configured: const String.fromEnvironment('API_BASE_URL'),
  );
  final client = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 20),
    ),
  );
  ref.onDispose(() => client.close(force: true));
  return client;
});
