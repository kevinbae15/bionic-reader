// A simple script to create basic PNG icons
// To use this script, first install jimp: npm install jimp

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Function to create a simple icon
async function createIcon(size, isActive, outputPath) {
  // Create a new image
  const image = new Jimp(size, size);
  
  // Set background color
  const bgColor = isActive ? 0xe74c3cff : 0x3498dbff; // Red or Blue
  image.background(bgColor);
  
  // Fill with background color
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      image.setPixelColor(bgColor, x, y);
    }
  }
  
  // Add a white border
  const borderColor = 0xffffffff; // White
  
  // Top and bottom borders
  for (let x = 0; x < size; x++) {
    image.setPixelColor(borderColor, x, 0);
    image.setPixelColor(borderColor, x, size - 1);
  }
  
  // Left and right borders
  for (let y = 0; y < size; y++) {
    image.setPixelColor(borderColor, 0, y);
    image.setPixelColor(borderColor, size - 1, y);
  }
  
  // Save the image
  await image.writeAsync(outputPath);
  console.log(`Created ${outputPath}`);
}

// Create icons of different sizes
async function createIcons() {
  const sizes = [16, 48, 128];
  
  for (const size of sizes) {
    // Active icon
    await createIcon(
      size, 
      true, 
      path.join(iconsDir, `active-icon-${size}.png`)
    );
    
    // Inactive icon
    await createIcon(
      size, 
      false, 
      path.join(iconsDir, `inactive-icon-${size}.png`)
    );
  }
  
  console.log('All icons created successfully!');
}

// Run the icon creation
createIcons().catch(err => {
  console.error('Error creating icons:', err);
}); 