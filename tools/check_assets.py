# Checks the service worker's file list (sw.js ASSETS) against what's on
# disk: every listed file must exist, and every game file must be listed -
# a file left off the list is missing the first time the iPad is offline.
#
#   python3 tools/check_assets.py

import glob
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
GAME_FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'js/*.js', 'fonts/*.woff2', 'icons/*.png', 'sounds/*.m4a']


def main():
    source = open(os.path.join(ROOT, 'sw.js')).read()
    block = source[source.index('const ASSETS = ['):source.index('];', source.index('const ASSETS = ['))]
    listed = set(re.findall(r"'([^']+)'", block)) - {'./'}

    on_disk = set()
    for pattern in GAME_FILES:
        for path in glob.glob(os.path.join(ROOT, pattern)):
            on_disk.add(os.path.relpath(path, ROOT))

    missing_files = sorted(path for path in listed if not os.path.exists(os.path.join(ROOT, path)))
    unlisted = sorted(on_disk - listed)
    for path in missing_files:
        print(f'sw.js lists {path}, which does not exist')
    for path in unlisted:
        print(f'{path} is not in sw.js ASSETS, so it will not work offline')
    if missing_files or unlisted:
        sys.exit(1)
    print(f'assets: {len(listed)} files listed, all present')


if __name__ == '__main__':
    main()
