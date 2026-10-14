import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

import '../../core/api/api_client.dart';
import '../../core/api/media_url.dart';

class HomepageCategory {
  const HomepageCategory({
    required this.id,
    required this.name,
    required this.description,
    required this.badge,
    required this.imageUrl,
    required this.startingPrice,
    this.parentId,
    this.parentName = '',
  });

  factory HomepageCategory.fromJson(Map<String, dynamic> json, Uri apiBase) {
    final imagePath = json['image_url'] as String;
    // Resolve against the API host, including Android's 10.0.2.2 development host.
    return HomepageCategory(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String,
      badge: json['badge'] as String,
      imageUrl: resolveMediaUrl(imagePath, apiBase) ?? '',
      startingPrice: json['starting_price'] as String?,
      parentId: json['parent'] as int?,
      parentName: json['parent_name'] as String? ?? '',
    );
  }

  final int id;
  final String name;
  final String description;
  final String badge;
  final String imageUrl;
  final String? startingPrice;
  final int? parentId;
  final String parentName;
}

class CategorySnapshotCache {
  String? etag;
  List<HomepageCategory> nodes = [];
}

final categorySnapshotCacheProvider = Provider<CategorySnapshotCache>((ref) {
  ref.watch(apiClientProvider);
  return CategorySnapshotCache();
});

List<HomepageCategory> orderCategoryTree(List<HomepageCategory> nodes) {
  final children = <int?, List<HomepageCategory>>{};
  for (final node in nodes) {
    (children[node.parentId] ??= []).add(node);
  }
  final ordered = <HomepageCategory>[];
  final seen = <int>{};
  void visit(int? parent) {
    for (final node in children[parent] ?? <HomepageCategory>[]) {
      if (!seen.add(node.id)) continue;
      ordered.add(node);
      visit(node.id);
    }
  }

  visit(null);
  return ordered;
}

final homepageCategoriesProvider = FutureProvider<List<HomepageCategory>>((
  ref,
) async {
  final client = ref.watch(apiClientProvider);
  final cache = ref.watch(categorySnapshotCacheProvider);
  final response = await client.get<Map<String, dynamic>>(
    'categories/tree/',
    options: Options(
      headers: {if (cache.etag != null) 'If-None-Match': cache.etag!},
      validateStatus: (status) => status == 200 || status == 304,
    ),
  );
  if (response.statusCode == 304) return cache.nodes;
  final results = response.data!['nodes'] as List<dynamic>;
  final categories = orderCategoryTree(
    results
        .map(
          (row) => HomepageCategory.fromJson(
            Map<String, dynamic>.from(row as Map),
            Uri.parse(client.options.baseUrl),
          ),
        )
        .toList(),
  );
  cache.nodes = categories;
  cache.etag = response.headers.value('etag');
  return categories;
});
