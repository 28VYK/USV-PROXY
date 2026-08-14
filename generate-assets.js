const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const masterIconPath = 'C:/Users/Adi/.gemini/antigravity-ide/brain/76cf7ed0-5d41-49cb-a31d-026002f5bdf9/usv_master_icon_black_1780905529403.png';
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

/**
 * Remove solid black background with a smooth transparency transition (alpha matting)
 * and un-multiply the color values so edges stay bright and glowing.
 */
function makeBlackTransparent(image, threshold = 12, transitionRange = 35) {
  const result = image.clone();
  const width = result.bitmap.width;
  const height = result.bitmap.height;
  
  result.scan(0, 0, width, height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    
    const maxVal = Math.max(r, g, b);
    
    if (maxVal <= threshold) {
      this.bitmap.data[idx + 3] = 0; // Fully transparent
    } else if (maxVal < threshold + transitionRange) {
      // Smooth alpha transition
      const factor = (maxVal - threshold) / transitionRange;
      this.bitmap.data[idx + 3] = Math.round(factor * 255);
      
      // Un-multiply color by factor to maintain vibrant glowing edges
      if (factor > 0) {
        this.bitmap.data[idx + 0] = Math.min(255, Math.round(r / factor));
        this.bitmap.data[idx + 1] = Math.min(255, Math.round(g / factor));
        this.bitmap.data[idx + 2] = Math.min(255, Math.round(b / factor));
      }
    }
  });
  return result;
}

async function run() {
  console.log('Starting asset generation...');

  // 1. Read master icon (using the exact one from test-transparent)
  const rawMasterIcon = await Jimp.read(masterIconPath);
  console.log(`Loaded master icon (Light): ${rawMasterIcon.width}x${rawMasterIcon.height}`);

  // 2. Remove black background to make it properly transparent
  console.log('Keying out black background...');
  const masterIcon = makeBlackTransparent(rawMasterIcon, 12, 35);

  // 3. Generate android-chrome-512x512.png (transparent background)
  console.log('Generating android-chrome-512x512.png...');
  const icon512 = masterIcon.clone().resize({ w: 512, h: 512 });
  await icon512.write(path.join(publicDir, 'android-chrome-512x512.png'));

  // 4. Generate android-chrome-192x192.png (transparent background)
  console.log('Generating android-chrome-192x192.png...');
  const icon192 = masterIcon.clone().resize({ w: 192, h: 192 });
  await icon192.write(path.join(publicDir, 'android-chrome-192x192.png'));

  // 5. Generate apple-touch-icon.png (180x180, solid white background, centered with padding)
  console.log('Generating apple-touch-icon.png...');
  const appleIcon = new Jimp({ width: 180, height: 180, color: 0xFFFFFFFF }); // Solid white background
  const resizedInnerIcon = masterIcon.clone().resize({ w: 140, h: 140 }); // 140px inside 180px gives 20px padding around it
  appleIcon.composite(resizedInnerIcon, 20, 20);
  await appleIcon.write(path.join(publicDir, 'apple-touch-icon.png'));

  // 6. Generate favicon.ico (containing 16, 32, 48, 96, 144, 192)
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

  // 7. Generate favicon.svg (wrapper embedding base64 PNG)
  console.log('Generating favicon.svg...');
  const svgPngBuffer = await masterIcon.clone().resize({ w: 128, h: 128 }).getBuffer('image/png');
  const base64Png = svgPngBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="128" height="128" />
</svg>`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

  // 8. Generate og-image.png (1200x630, programmatic layout using the exact same logo)
  console.log('Generating og-image.png...');
  const ogBg = new Jimp({ width: 1200, height: 630, color: 0xF8FAFCFF }); // Light slate background
  const ogLogo = masterIcon.clone().resize({ w: 400, h: 400 });
  ogBg.composite(ogLogo, 400, 115); // Centered
  await ogBg.write(path.join(publicDir, 'og-image.png'));

  console.log('All assets generated successfully!');
}

run().catch(err => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
