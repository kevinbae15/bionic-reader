// A simple Node.js script to generate active and inactive icons for the extension
// Run this with Node.js to generate the icon files

const fs = require('fs');
const { createCanvas } = require('canvas');

// Sizes for icons
const sizes = [16, 48, 128];

// Function to create an icon
function createIcon(size, isActive) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background color
  ctx.fillStyle = isActive ? '#e74c3c' : '#3498db';
  ctx.fillRect(0, 0, size, size);
  
  // Border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1, size / 32);
  ctx.strokeRect(ctx.lineWidth/2, ctx.lineWidth/2, size - ctx.lineWidth, size - ctx.lineWidth);
  
  // Letter 'B' or 'b'
  ctx.fillStyle = '#fff';
  ctx.font = `${isActive ? 'bold ' : ''}${Math.floor(size * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isActive ? 'B' : 'b', size/2, size/2);
  
  return canvas.toBuffer('image/png');
}

// Generate icons for each size
sizes.forEach(size => {
  // Active icon
  const activeIconBuffer = createIcon(size, true);
  fs.writeFileSync(`active-icon-${size}.png`, activeIconBuffer);
  console.log(`Created active-icon-${size}.png`);
  
  // Inactive icon
  const inactiveIconBuffer = createIcon(size, false);
  fs.writeFileSync(`inactive-icon-${size}.png`, inactiveIconBuffer);
  console.log(`Created inactive-icon-${size}.png`);
});

console.log('Icon generation complete!'); 