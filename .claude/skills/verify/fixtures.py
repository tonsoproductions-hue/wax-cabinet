# Test photos for drive.mjs: a 23.8 MB JPEG (bigger than Vercel's 4.5 MB
# upload limit) and a HEIC file Chromium can't decode.
# Usage: python3 -I fixtures.py <out dir>
import os, sys
from PIL import Image

out = sys.argv[1]
Image.frombytes('RGB', (5712, 4284), os.urandom(5712 * 4284 * 3)).save(f'{out}/big-photo.jpg', quality=92)
with open(f'{out}/photo.heic', 'wb') as f:
    f.write(b'\x00\x00\x00\x18ftypheic' + os.urandom(5000))
