String? resolveMediaUrl(String? value, Uri apiBase, {String? mediaOrigin}) {
  if (value == null ||
      value.isEmpty ||
      value.contains(r'\') ||
      RegExp(
        r'[\x00-\x1f]|%2e|%2f|%5c',
        caseSensitive: false,
      ).hasMatch(value)) {
    return null;
  }
  if (value.split('/').any((part) => part == '.' || part == '..')) { return null; }
  final configured =
      mediaOrigin ?? const String.fromEnvironment('MEDIA_ORIGIN');
  final origin = configured.isEmpty ? apiBase : Uri.tryParse(configured);
  if (origin == null || !['http', 'https'].contains(origin.scheme)) {
    return null;
  }
  var path = value;
  final supplied = Uri.tryParse(value);
  if (supplied == null) {
    return null;
  }
  if (supplied.isAbsolute) {
    if (!['http', 'https'].contains(supplied.scheme) ||
        supplied.userInfo.isNotEmpty ||
        supplied.hasQuery ||
        supplied.hasFragment ||
        ![origin.origin, apiBase.origin].contains(supplied.origin)) {
      return null;
    }
    path = supplied.path;
  }
  if (!path.startsWith('/')) {
    path = '/media/$path';
  }
  if (path.startsWith('//') ||
      path.split('/').any((part) => part == '.' || part == '..')) {
    return null;
  }
  if (!RegExp(
        r'^/media/(products|brands|categories|banners|other|thumbnails)/[A-Za-z0-9_./ -]+\.(webp|png|jpe?g|avif)$',
        caseSensitive: false,
      ).hasMatch(path) &&
      !path.startsWith('/images/homepage/')) {
    return null;
  }
  return origin.resolve(path).toString();
}
