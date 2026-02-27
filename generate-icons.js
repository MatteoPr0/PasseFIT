import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = './public/pwa-512x512.svg';
const out192 = './public/pwa-192x192.png';
const out512 = './public/pwa-512x512.png';

async function generateIcons() {
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(out192);
      
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(out512);
      
    console.log('Icons generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
  }
}

generateIcons();
