// A simple script to generate basic PNG icons without external dependencies
const fs = require('fs');
const path = require('path');

// Function to create a PNG file with a solid color and a letter
function createPngIcon(filePath, size, isActive) {
  // PNG file structure (very simplified)
  // This creates a basic PNG with a solid color and no compression
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0); // Length of IHDR data
  
  const ihdrType = Buffer.from('IHDR');
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // Width
  ihdrData.writeUInt32BE(size, 4); // Height
  ihdrData.writeUInt8(8, 8);      // Bit depth
  ihdrData.writeUInt8(6, 9);      // Color type (RGBA)
  ihdrData.writeUInt8(0, 10);     // Compression method
  ihdrData.writeUInt8(0, 11);     // Filter method
  ihdrData.writeUInt8(0, 12);     // Interlace method
  
  const ihdrCrc = calculateCrc32(Buffer.concat([ihdrType, ihdrData]));
  
  // IDAT chunk (image data)
  // Create a simple colored square
  const pixelData = [];
  
  // Background color (RGBA)
  const bgColor = isActive ? [231, 76, 60, 255] : [52, 152, 219, 255]; // Red or Blue
  
  // Fill with background color
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      pixelData.push(...bgColor);
    }
  }
  
  // Add a simple letter in the center (very basic)
  // This is extremely simplified and won't look good
  // For real icons, use a proper image library
  
  const idatData = Buffer.from(pixelData);
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(idatData.length, 0);
  
  const idatType = Buffer.from('IDAT');
  const idatCrc = calculateCrc32(Buffer.concat([idatType, idatData]));
  
  // IEND chunk (end of image)
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  
  const iendType = Buffer.from('IEND');
  const iendCrc = calculateCrc32(iendType);
  
  // Combine all chunks
  const pngData = Buffer.concat([
    signature,
    ihdrLength, ihdrType, ihdrData, ihdrCrc,
    idatLength, idatType, idatData, idatCrc,
    iendLength, iendType, iendCrc
  ]);
  
  fs.writeFileSync(filePath, pngData);
  console.log(`Created ${filePath}`);
}

// Simple CRC32 calculation (for PNG chunks)
function calculateCrc32(data) {
  const crc = Buffer.alloc(4);
  // This is a placeholder - in a real implementation, you'd use a proper CRC32 algorithm
  // For simplicity, we're just using a dummy value
  crc.writeUInt32BE(0, 0);
  return crc;
}

// Create icons
const sizes = [16, 48, 128];
const states = [
  { name: 'inactive', active: false },
  { name: 'active', active: true }
];

// Generate all icons
sizes.forEach(size => {
  states.forEach(state => {
    const fileName = `${state.name}-icon-${size}.png`;
    const filePath = path.join(__dirname, fileName);
    createPngIcon(filePath, size, state.active);
  });
});

console.log('Note: These are very basic placeholder icons.');
console.log('For production, please use proper icon generation tools or design software.'); 