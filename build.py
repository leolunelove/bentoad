from pathlib import Path
import base64
import json
from urllib.parse import quote
root = Path(__file__).resolve().parent
src = root / 'src'
levels = json.loads((src / 'levels.json').read_text())
engine = (src / 'engine.js').read_text().replace('export ', '')
motion = (src / 'motion.js').read_text().replace('export ', '')
layout = (src / 'layout.js').read_text().replace('export ', '')
transfer = (src / 'transfer.js').read_text().replace('export ', '')
transfer = '\n'.join(line for line in transfer.splitlines() if not line.startswith('import '))
app = (src / 'app.js').read_text()
game = 'const LEVEL_DATA=' + json.dumps(levels, separators=(',', ':')) + ';\n' + engine + '\n' + motion + '\n' + layout + '\n' + transfer + '\n(async()=>{\n' + app + '\n})();'
html = (src / 'template.html').read_text().replace('/* STYLES */', (src / 'style.css').read_text()).replace('/* GAME */', game).replace('TOTAL_LEVELS', str(len(levels)))
brand = root / 'brand'
svg = lambda name: (brand / name).read_text().strip().replace('<svg ', '<svg aria-hidden="true" focusable="false" ', 1)
html = html.replace('BRAND_MARK', svg('toad.svg')).replace('BRAND_WORDMARK', svg('wordmark.svg'))
html = html.replace('BRAND_FAVICON', 'data:image/svg+xml,' + quote((brand / 'app-icon.svg').read_text(), safe=''))
html = html.replace('BRAND_TOUCH_ICON', 'data:image/png;base64,' + base64.b64encode((brand / 'apple-touch-icon.png').read_bytes()).decode())
for directory in ('dist', 'docs'):
    (root / directory).mkdir(exist_ok=True)
    (root / directory / 'index.html').write_text(html)
(root / 'docs' / 'CNAME').write_text('bentoad.leolune.fun\n')
(root / 'docs' / '.nojekyll').touch()
(root / 'index.html').write_text(html)
(root / 'CNAME').write_text('bentoad.leolune.fun\n')
(root / '.nojekyll').touch()
legacy = root / 'legacy'
legacy.mkdir(exist_ok=True)
(legacy / 'index.html').write_text((src / 'moved.html').read_text())
(legacy / 'save-bridge.html').write_text((src / 'save-bridge.html').read_text())
(legacy / 'CNAME').write_text('squared.leolune.fun\n')
(legacy / '.nojekyll').touch()
print(f'Built standalone game: {len(html.encode()):,} bytes, {len(levels)} levels')
