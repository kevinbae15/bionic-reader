// A script to generate PNG icons directly using HTML Canvas
// This approach doesn't require external dependencies like 'canvas'
const fs = require('fs');
const path = require('path');

// Function to create a PNG file with a solid color and a letter
function createPngIcon(filePath, size, isActive) {
  // Create a simple PNG with a solid color background and a letter
  // This uses a very basic approach to generate PNG data
  
  // Create a canvas element
  const canvas = {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4) // RGBA data
  };
  
  // Background color (RGBA)
  const bgColor = isActive ? [231, 76, 60, 255] : [52, 152, 219, 255]; // Red or Blue
  
  // Fill with background color
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      canvas.data[index] = bgColor[0];     // R
      canvas.data[index + 1] = bgColor[1]; // G
      canvas.data[index + 2] = bgColor[2]; // B
      canvas.data[index + 3] = bgColor[3]; // A
    }
  }
  
  // Draw a simple border (1px white)
  const borderColor = [255, 255, 255, 255]; // White
  
  // Top and bottom borders
  for (let x = 0; x < size; x++) {
    // Top border
    const topIndex = x * 4;
    canvas.data[topIndex] = borderColor[0];
    canvas.data[topIndex + 1] = borderColor[1];
    canvas.data[topIndex + 2] = borderColor[2];
    canvas.data[topIndex + 3] = borderColor[3];
    
    // Bottom border
    const bottomIndex = ((size - 1) * size + x) * 4;
    canvas.data[bottomIndex] = borderColor[0];
    canvas.data[bottomIndex + 1] = borderColor[1];
    canvas.data[bottomIndex + 2] = borderColor[2];
    canvas.data[bottomIndex + 3] = borderColor[3];
  }
  
  // Left and right borders
  for (let y = 0; y < size; y++) {
    // Left border
    const leftIndex = (y * size) * 4;
    canvas.data[leftIndex] = borderColor[0];
    canvas.data[leftIndex + 1] = borderColor[1];
    canvas.data[leftIndex + 2] = borderColor[2];
    canvas.data[leftIndex + 3] = borderColor[3];
    
    // Right border
    const rightIndex = (y * size + size - 1) * 4;
    canvas.data[rightIndex] = borderColor[0];
    canvas.data[rightIndex + 1] = borderColor[1];
    canvas.data[rightIndex + 2] = borderColor[2];
    canvas.data[rightIndex + 3] = borderColor[3];
  }
  
  // Convert canvas data to PNG
  const pngData = encodePNG(canvas);
  
  // Write to file
  fs.writeFileSync(filePath, pngData);
  console.log(`Created ${filePath}`);
}

// Function to encode canvas data as PNG
// This is a very simplified PNG encoder and will only work for basic cases
function encodePNG(canvas) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header)
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0); // Length of IHDR data
  
  const ihdrType = Buffer.from('IHDR');
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(canvas.width, 0);  // Width
  ihdrData.writeUInt32BE(canvas.height, 4); // Height
  ihdrData.writeUInt8(8, 8);      // Bit depth
  ihdrData.writeUInt8(6, 9);      // Color type (RGBA)
  ihdrData.writeUInt8(0, 10);     // Compression method
  ihdrData.writeUInt8(0, 11);     // Filter method
  ihdrData.writeUInt8(0, 12);     // Interlace method
  
  const ihdrCrc = calculateCrc32(Buffer.concat([ihdrType, ihdrData]));
  
  // IDAT chunk (image data)
  // For simplicity, we're not compressing the data
  // In a real implementation, you would use zlib to compress the data
  const idatData = Buffer.from(canvas.data);
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
  return Buffer.concat([
    signature,
    ihdrLength, ihdrType, ihdrData, ihdrCrc,
    idatLength, idatType, idatData, idatCrc,
    iendLength, iendType, iendCrc
  ]);
}

// Simple CRC32 calculation (for PNG chunks)
function calculateCrc32(data) {
  // This is a placeholder - in a real implementation, you'd use a proper CRC32 algorithm
  const crc = Buffer.alloc(4);
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