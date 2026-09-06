const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to create PNG buffer with RGBA pixels
function createPng(width, height, getPixelRgba) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Compression method 0
  ihdr.writeUInt8(0, 11); // Filter method 0
  ihdr.writeUInt8(0, 12); // Interlace method 0
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Brand color palette:
// Background: Forest Green (#162F24) -> [22, 47, 36]
// Accent Sage: (#D6E3D8) -> [214, 227, 216]
// Soft Mint: (#A3C2AC) -> [163, 194, 172]
function renderIconPixel(x, y, w, h, isMaskable = false) {
  // Coordinates normalized to -1 .. 1
  const cx = (x / w) * 2 - 1;
  const cy = (y / h) * 2 - 1;
  const r = Math.sqrt(cx * cx + cy * cy);

  // Background
  let bgR = 22, bgG = 47, bgB = 36, bgA = 255; // #162F24
  
  if (!isMaskable && r > 0.98) {
    // Transparent outside rounded corner for standard icon
    const cornerRadius = 0.22;
    const qx = Math.max(0, Math.abs(cx) - (1 - cornerRadius));
    const qy = Math.max(0, Math.abs(cy) - (1 - cornerRadius));
    const dist = Math.sqrt(qx * qx + qy * qy);
    if (dist > cornerRadius) {
      return [0, 0, 0, 0];
    }
  }

  // Draw loop motif in center (scale inside 0.55 radius for safe zone)
  const scale = isMaskable ? 0.45 : 0.55;
  const nx = cx / scale;
  const ny = cy / scale;

  // Outer loop ring: r around 0.65
  const ringDist = Math.abs(Math.sqrt(nx * nx + ny * ny) - 0.65);
  const ringThickness = 0.18;

  // Interruption slit: opening at top-right (angle between 35 deg and 65 deg)
  const angle = Math.atan2(ny, nx); // -PI to PI
  const isOpening = angle > 0.4 && angle < 1.0;

  // Center core dot
  const centerDist = Math.sqrt(nx * nx + ny * ny);

  if (centerDist < 0.22) {
    // Sage core dot: representing awareness / observer
    return [214, 227, 216, 255];
  }

  if (ringDist < ringThickness && !isOpening) {
    // Loop path: interrupted ring (breaking the loop)
    const antialias = Math.max(0, Math.min(1, (ringThickness - ringDist) * 10));
    const rVal = Math.round(bgR + (214 - bgR) * antialias);
    const gVal = Math.round(bgG + (227 - bgG) * antialias);
    const bVal = Math.round(bgB + (216 - bgB) * antialias);
    return [rVal, gVal, bVal, 255];
  }

  // Little marker at the interrupt threshold
  const markerDist = Math.sqrt((nx - 0.48) * (nx - 0.48) + (ny - 0.48) * (ny - 0.48));
  if (markerDist < 0.12) {
    return [163, 194, 172, 255];
  }

  return [bgR, bgG, bgB, bgA];
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
fs.writeFileSync(
  path.join(publicDir, 'pwa-192x192.png'),
  createPng(192, 192, (x, y, w, h) => renderIconPixel(x, y, w, h, false))
);

// Generate 512x512
fs.writeFileSync(
  path.join(publicDir, 'pwa-512x512.png'),
  createPng(512, 512, (x, y, w, h) => renderIconPixel(x, y, w, h, false))
);

// Generate 512x512 maskable (full bleed background)
fs.writeFileSync(
  path.join(publicDir, 'pwa-maskable-512x512.png'),
  createPng(512, 512, (x, y, w, h) => renderIconPixel(x, y, w, h, true))
);

// Generate apple-touch-icon 180x180
fs.writeFileSync(
  path.join(publicDir, 'apple-touch-icon.png'),
  createPng(180, 180, (x, y, w, h) => renderIconPixel(x, y, w, h, true))
);

// Generate favicon (32x32 PNG)
fs.writeFileSync(
  path.join(publicDir, 'favicon.ico'),
  createPng(32, 32, (x, y, w, h) => renderIconPixel(x, y, w, h, false))
);

console.log('Successfully generated all PWA icons!');
