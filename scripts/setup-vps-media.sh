#!/usr/bin/env bash
set -euo pipefail
# Run explicitly on the approved Ubuntu host. Does not deploy or replace database data.
if [[ $(id -u) != 0 ]]; then echo 'Run with sudo on the approved VPS.' >&2; exit 1; fi
export MEDIA_HOST_ROOT=${MEDIA_HOST_ROOT:-/srv/sky/media}
export PRIVATE_MEDIA_HOST_ROOT=${PRIVATE_MEDIA_HOST_ROOT:-/srv/sky/private-media}
export MEDIA_APP_UID=${MEDIA_APP_UID:-10001}
export MEDIA_APP_GID=${MEDIA_APP_GID:-10001}
export MEDIA_SETUP_MIN_FREE_BYTES=${MEDIA_SETUP_MIN_FREE_BYTES:-5368709120}
python3 - <<'PY'
import os, pathlib, shutil
public = pathlib.Path(os.environ['MEDIA_HOST_ROOT'])
private = pathlib.Path(os.environ['PRIVATE_MEDIA_HOST_ROOT'])
for root in (public, private):
    if not root.is_absolute() or '..' in root.parts or root.is_symlink():
        raise SystemExit('Use explicit absolute directories without symlinks or traversal.')
    if not root.resolve().is_relative_to('/srv/sky') or root.resolve() == pathlib.Path('/srv/sky'):
        raise SystemExit('Provisioning is limited to explicitly named /srv/sky subdirectories.')
if public == private or public.is_relative_to(private) or private.is_relative_to(public):
    raise SystemExit('Public and private directories must be separate.')
uid, gid = int(os.environ['MEDIA_APP_UID']), int(os.environ['MEDIA_APP_GID'])
for root, mode in ((public, 0o755), (private, 0o700)):
    root.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(root).free < int(os.environ['MEDIA_SETUP_MIN_FREE_BYTES']):
        raise SystemExit('Insufficient disk headroom; no media was removed.')
    paths = [root]
    for kind in ('products', 'brands', 'categories', 'banners', 'other'):
        paths += [root/kind]
        paths += [root/kind/name for name in (('optimized', 'thumbnails', 'artwork') if root == public else ('originals',))]
    for path in paths:
        if path.is_symlink(): raise SystemExit('Refusing a symlink in storage tree.')
        path.mkdir(parents=True, exist_ok=True)
        os.chown(path, uid, gid)
        os.chmod(path, mode)
    print(f'Provisioned {root}; owner {uid}:{gid}; free {shutil.disk_usage(root).free} bytes')
print('Provisioning complete. No service restart, deployment or data replacement performed.')
PY
