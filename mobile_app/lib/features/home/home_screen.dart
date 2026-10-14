import '../../shared/widgets/media_image.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../categories/homepage_categories.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  Timer? _updates;
  bool _foreground = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _updates = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_foreground &&
          mounted &&
          !ref.read(homepageCategoriesProvider).isLoading) {
        ref.invalidate(homepageCategoriesProvider);
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    if (_foreground) ref.invalidate(homepageCategoriesProvider);
  }

  @override
  void dispose() {
    _updates?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ref.watch(homepageCategoriesProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('SKY Mobile & Electronics'),
        actions: [
          IconButton(
            tooltip: 'Refresh categories',
            onPressed: () => ref.invalidate(homepageCategoriesProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: categories.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Categories are temporarily unavailable. Please try again.',
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => ref.invalidate(homepageCategoriesProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (items) => RefreshIndicator(
          onRefresh: () => ref.refresh(homepageCategoriesProvider.future),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Everything Tech',
                        style: Theme.of(context).textTheme.labelLarge,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Explore Our Categories',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 8),
                      const Text('Find your next device at SKY.'),
                    ],
                  ),
                ),
              ),
              if (items.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('New categories are coming soon.'),
                  ),
                ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList.separated(
                  itemCount: items.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) =>
                      _CategoryCard(category: items[index]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({required this.category});
  final HomepageCategory category;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (category.badge.isNotEmpty) Chip(label: Text(category.badge)),
          Center(
            child: SkyMediaImage(
              reference: category.imageUrl,
              width: 180,
              height: 150,
              fit: BoxFit.contain,
            ),
          ),
          const SizedBox(height: 12),
          Text(category.name, style: Theme.of(context).textTheme.titleLarge),
          if (category.parentName.isNotEmpty) Text('In ${category.parentName}'),
          if (category.startingPrice != null)
            Text('From \u20b9${category.startingPrice}'),
          if (category.description.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(category.description),
            ),
        ],
      ),
    ),
  );
}
