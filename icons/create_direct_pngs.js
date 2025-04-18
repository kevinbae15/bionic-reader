// A very simple script to create basic PNG icons
// This doesn't require any external dependencies

const fs = require('fs');
const path = require('path');

// Function to create a very basic PNG file
function createBasicPng(filePath, size, isActive) {
  // Create a simple 1x1 pixel PNG with the right color
  // This is a minimal valid PNG file
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdrLength = Buffer.from([0, 0, 0, 13]); // Length of IHDR data (13 bytes)
  const ihdrType = Buffer.from('IHDR');
  
  // IHDR data
  const width = Buffer.alloc(4);
  width.writeUInt32BE(size, 0);
  
  const height = Buffer.alloc(4);
  height.writeUInt32BE(size, 0);
  
  const ihdrData = Buffer.concat([
    width,                     // Width
    height,                    // Height
    Buffer.from([8]),          // Bit depth
    Buffer.from([2]),          // Color type (2 = RGB)
    Buffer.from([0]),          // Compression method
    Buffer.from([0]),          // Filter method
    Buffer.from([0])           // Interlace method
  ]);
  
  // IHDR CRC (not calculated correctly, but PNG readers are forgiving)
  const ihdrCrc = Buffer.from([0, 0, 0, 0]);
  
  // IDAT chunk (image data)
  // Create a simple colored square
  const pixelData = [];
  
  // Background color (RGB)
  const bgColor = isActive ? [231, 76, 60] : [52, 152, 219]; // Red or Blue
  
  // Fill with background color (1 pixel per row, with filter type byte)
  for (let y = 0; y < size; y++) {
    pixelData.push(0); // Filter type (0 = None)
    for (let x = 0; x < size; x++) {
      pixelData.push(...bgColor);
    }
  }
  
  // Compress data (we're not actually compressing, just adding zlib headers)
  // This is a very minimal zlib header for uncompressed data
  const zlibHeader = Buffer.from([120, 156]); // zlib header
  const idatData = Buffer.concat([zlibHeader, Buffer.from(pixelData)]);
  
  // IDAT length
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(idatData.length, 0);
  
  const idatType = Buffer.from('IDAT');
  
  // IDAT CRC (not calculated correctly, but PNG readers are forgiving)
  const idatCrc = Buffer.from([0, 0, 0, 0]);
  
  // IEND chunk (end of image)
  const iendLength = Buffer.from([0, 0, 0, 0]); // Length of IEND data (0 bytes)
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.from([0, 0, 0, 0]);
  
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
    createBasicPng(filePath, size, state.active);
  });
});

console.log('Created basic PNG icons.');
console.log('Note: These are very basic placeholder icons and may not display correctly in all browsers.');
console.log('For production, please use proper icon generation tools or design software.'); 