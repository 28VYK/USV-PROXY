const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const masterIconPath = 'C:/Users/Adi/.gemini/antigravity-ide/brain/ab4836cf-f6e7-4cc1-a0c9-41dbae638c3b/master_icon_glass_1780340893619.png';
const masterOgPath = 'C:/Users/Adi/.gemini/antigravity-ide/brain/ab4836cf-f6e7-4cc1-a0c9-41dbae638c3b/og_image_glass_1780340913361.png';
const publicDir = path.join(__dirname, 'public');

// Build ICO container from multiple PNG buffers
function buildIco(pngBuffers, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type (1 = ICO)
  header.writeUInt16LE(pngBuffers.length, 4); // Number of images

  const entries = [];
  let currentOffset = 6 + pngBuffers.length * 16;

  for (let i = 0; i < pngBuffers.length; i++) {
    const buf = pngBuffers[i];
    const size = sizes[i];

    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel (32)
    entry.writeUInt32LE(buf.length, 8); // Size of image data
    entry.writeUInt32LE(currentOffset, 12); // Offset of image data

    entries.push(entry);
    currentOffset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function run() {
  console.log('Starting asset generation...');

  // 1. Read master icon
  const masterIcon = await Jimp.read(masterIconPath);
  console.log(`Loaded master icon: ${masterIcon.width}x${masterIcon.height}`);

  // 2. Generate android-chrome-512x512.png
  console.log('Generating android-chrome-512x512.png...');
  const icon512 = masterIcon.clone().resize({ w: 512, h: 512 });
  await icon512.write(path.join(publicDir, 'android-chrome-512x512.png'));

  // 3. Generate android-chrome-192x192.png
  console.log('Generating android-chrome-192x192.png...');
  const icon192 = masterIcon.clone().resize({ w: 192, h: 192 });
  await icon192.write(path.join(publicDir, 'android-chrome-192x192.png'));

  // 4. Generate apple-touch-icon.png (180x180, solid dark background, centered with padding)
  console.log('Generating apple-touch-icon.png...');
  const appleIcon = new Jimp({ width: 180, height: 180, color: 0x020617FF }); // RGBA format, so FF is fully opaque
  const resizedInnerIcon = masterIcon.clone().resize({ w: 140, h: 140 }); // 140px inside 180px gives 20px padding around it
  appleIcon.composite(resizedInnerIcon, 20, 20);
  await appleIcon.write(path.join(publicDir, 'apple-touch-icon.png'));

  // 5. Generate favicon.ico (containing 16, 32, 48, 96, 144, 192)
  console.log('Generating favicon.ico multi-size container...');
  const sizes = [16, 32, 48, 96, 144, 192];
  const pngBuffers = [];

  for (const size of sizes) {
    const resized = masterIcon.clone().resize({ w: size, h: size });
    const buffer = await resized.getBuffer('image/png');
    pngBuffers.push(buffer);
  }

  const icoBuffer = buildIco(pngBuffers, sizes);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`Successfully wrote favicon.ico (multi-size, total ${icoBuffer.length} bytes).`);

  // 6. Generate og-image.png (1200x630)
  console.log('Generating og-image.png...');
  const masterOg = await Jimp.read(masterOgPath);
  console.log(`Loaded master OG: ${masterOg.width}x${masterOg.height}`);
  const ogResized = masterOg.clone().resize({ w: 1200, h: 630 });
  await ogResized.write(path.join(publicDir, 'og-image.png'));

  console.log('All assets generated successfully!');
}

run().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
