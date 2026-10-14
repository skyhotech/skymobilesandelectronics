import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/media_url.dart';

class SkyMediaImage extends ConsumerWidget {
  const SkyMediaImage({
    super.key,
    required this.reference,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.semanticLabel = 'Product image',
  });

  final String? reference;
  final double? width;
  final double? height;
  final BoxFit fit;
  final String semanticLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final base = Uri.parse(ref.watch(apiClientProvider).options.baseUrl);
    final url = resolveMediaUrl(reference, base);
    Widget placeholder() => SizedBox(
      width: width,
      height: height,
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, size: 48),
      ),
    );
    return Semantics(
      label: semanticLabel,
      image: true,
      child: url == null
          ? placeholder()
          : CachedNetworkImage(
              imageUrl: url,
              width: width,
              height: height,
              fit: fit,
              placeholder: (context, url) => placeholder(),
              errorWidget: (context, url, error) => placeholder(),
            ),
    );
  }
}
