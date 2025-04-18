// A simple script to generate PNG icons from SVG files
// This script uses the browser's built-in capabilities to convert SVGs to PNGs

const fs = require('fs');
const path = require('path');
const { createCanvas, Image } = require('canvas');

// Icon configurations
const icons = [
  { name: 'inactive-icon-16', width: 16, height: 16 },
  { name: 'inactive-icon-48', width: 48, height: 48 },
  { name: 'inactive-icon-128', width: 128, height: 128 },
  { name: 'active-icon-16', width: 16, height: 16 },
  { name: 'active-icon-48', width: 48, height: 48 },
  { name: 'active-icon-128', width: 128, height: 128 }
];

// Function to convert SVG to PNG
async function convertSvgToPng(svgPath, pngPath, width, height) {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas with the desired dimensions
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      
      // Create image from SVG
      const img = new Image();
      
      // Load SVG content
      const svgContent = fs.readFileSync(svgPath, 'utf8');
      
      // Create data URL from SVG content
      const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      
      // When image is loaded, draw it on canvas and save as PNG
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Save canvas as PNG
        const pngBuffer = canvas.toBuffer('image/png');
        fs.writeFileSync(pngPath, pngBuffer);
        
        console.log(`Converted ${svgPath} to ${pngPath}`);
        resolve();
      };
      
      img.onerror = (err) => {
        console.error(`Error loading SVG: ${svgPath}`, err);
        reject(err);
      };
      
      // Set source to SVG data URL
      img.src = svgDataUrl;
    } catch (err) {
      console.error(`Error converting ${svgPath} to PNG:`, err);
      reject(err);
    }
  });
}

// Process all icons
async function processIcons() {
  for (const icon of icons) {
    const svgPath = path.join(__dirname, `${icon.name}.svg`);
    const pngPath = path.join(__dirname, `${icon.name}.png`);
    
    if (fs.existsSync(svgPath)) {
      await convertSvgToPng(svgPath, pngPath, icon.width, icon.height);
    } else {
      console.error(`SVG file not found: ${svgPath}`);
    }
  }
  
  console.log('All icons converted successfully!');
}

// Run the conversion
processIcons().catch(err => {
  console.error('Error processing icons:', err);
  process.exit(1);
}); 