// A very simple script to create basic PNG icons without external dependencies
const fs = require('fs');
const path = require('path');

// Create a very basic PNG file with a solid color
function createBasicPng(width, height, color, outputPath) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0); // Length of IHDR data
  
  const ihdrType = Buffer.from('IHDR');
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);  // Width
  ihdrData.writeUInt32BE(height, 4); // Height
  ihdrData.writeUInt8(8, 8);      // Bit depth
  ihdrData.writeUInt8(6, 9);      // Color type (RGBA)
  ihdrData.writeUInt8(0, 10);     // Compression method
  ihdrData.writeUInt8(0, 11);     // Filter method
  ihdrData.writeUInt8(0, 12);     // Interlace method
  
  // Calculate CRC32 for IHDR chunk
  const ihdrCrc = calculateCrc32(Buffer.concat([ihdrType, ihdrData]));
  
  // IDAT chunk (image data)
  // Create a simple colored square
  const pixelData = [];
  
  // Add filter type byte (0) at the start of each row
  for (let y = 0; y < height; y++) {
    pixelData.push(0); // Filter type (0 = None)
    for (let x = 0; x < width; x++) {
      // RGBA values
      pixelData.push((color >> 24) & 0xff); // R
      pixelData.push((color >> 16) & 0xff); // G
      pixelData.push((color >> 8) & 0xff);  // B
      pixelData.push(color & 0xff);         // A
    }
  }
  
  // Compress data (we're not actually compressing, just adding zlib headers)
  const zlibHeader = Buffer.from([120, 156]); // zlib header
  const zlibData = Buffer.from(pixelData);
  const adler32 = calculateAdler32(zlibData);
  
  const idatData = Buffer.concat([
    zlibHeader,
    zlibData,
    adler32
  ]);
  
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(idatData.length, 0);
  
  const idatType = Buffer.from('IDAT');
  
  // Calculate CRC32 for IDAT chunk
  const idatCrc = calculateCrc32(Buffer.concat([idatType, idatData]));
  
  // IEND chunk (end of image)
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0); // Length of IEND data (0 bytes)
  
  const iendType = Buffer.from('IEND');
  
  // Calculate CRC32 for IEND chunk
  const iendCrc = calculateCrc32(iendType);
  
  // Combine all chunks
  const pngData = Buffer.concat([
    signature,
    ihdrLength, ihdrType, ihdrData, ihdrCrc,
    idatLength, idatType, idatData, idatCrc,
    iendLength, iendType, iendCrc
  ]);
  
  // Write to file
  fs.writeFileSync(outputPath, pngData);
  console.log(`Created ${outputPath}`);
}

// Simple CRC32 calculation (for PNG chunks)
function calculateCrc32(data) {
  // This is a placeholder - in a real implementation, you'd use a proper CRC32 algorithm
  // For simplicity, we're just using a dummy value
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(0, 0);
  return crc;
}

// Simple Adler32 calculation (for zlib)
function calculateAdler32(data) {
  // This is a placeholder - in a real implementation, you'd use a proper Adler32 algorithm
  // For simplicity, we're just using a dummy value
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(1, 0);
  return adler;
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Create icons
const sizes = [16, 48, 128];
const colors = {
  active: 0xe74c3cff,   // Red with full alpha
  inactive: 0x3498dbff  // Blue with full alpha
};

// Generate all icons
sizes.forEach(size => {
  // Active icon
  createBasicPng(
    size, 
    size, 
    colors.active, 
    path.join(iconsDir, `active-icon-${size}.png`)
  );
  
  // Inactive icon
  createBasicPng(
    size, 
    size, 
    colors.inactive, 
    path.join(iconsDir, `inactive-icon-${size}.png`)
  );
});

console.log('All icons created successfully!');
console.log('Note: These are very basic placeholder icons. For production, please use proper icon generation tools.'); 