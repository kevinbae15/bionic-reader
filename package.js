// A simple script to package the extension for distribution
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files and directories to include in the package
const filesToInclude = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'icons/*.png', // Only include PNG icons
  'LICENSE',
  'README.md'
];

// Files and directories to exclude
const filesToExclude = [
  'icons/*.svg',
  'icons/*.js',
  'convert_icons.html',
  'package.js',
  'todo.md',
  'prompt-plan.md',
  'spec.md',
  '.cursor',
  '.git'
];

// Output directory
const outputDir = 'dist';
const packageName = 'bionic-reading-extension';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Function to copy files to the output directory
function copyFiles() {
  console.log('Copying files to output directory...');
  
  // Create icons directory in output
  if (!fs.existsSync(path.join(outputDir, 'icons'))) {
    fs.mkdirSync(path.join(outputDir, 'icons'));
  }
  
  // Copy each file
  filesToInclude.forEach(filePattern => {
    if (filePattern.includes('*')) {
      // Handle glob patterns
      const dirPath = filePattern.split('/')[0];
      const extension = filePattern.split('*.')[1];
      
      // Read directory and filter by extension
      const files = fs.readdirSync(dirPath)
        .filter(file => file.endsWith(`.${extension}`));
      
      // Copy each matching file
      files.forEach(file => {
        const sourcePath = path.join(dirPath, file);
        const destPath = path.join(outputDir, dirPath, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied ${sourcePath} to ${destPath}`);
      });
    } else {
      // Copy individual file
      const destPath = path.join(outputDir, filePattern);
      fs.copyFileSync(filePattern, destPath);
      console.log(`Copied ${filePattern} to ${destPath}`);
    }
  });
}

// Function to create a ZIP archive
function createZipArchive() {
  console.log('Creating ZIP archive...');
  
  try {
    // Check if zip command is available
    execSync('which zip');
    
    // Create ZIP archive
    const zipCommand = `cd ${outputDir} && zip -r ../${packageName}.zip .`;
    execSync(zipCommand);
    console.log(`Created ${packageName}.zip`);
  } catch (error) {
    console.error('Error creating ZIP archive:', error.message);
    console.log('Please manually zip the contents of the dist directory.');
  }
}

// Main function
function packageExtension() {
  console.log('Packaging Bionic Reading Extension...');
  
  // Check if PNG icons exist
  const pngIconsExist = fs.existsSync('icons/inactive-icon-16.png');
  if (!pngIconsExist) {
    console.warn('Warning: PNG icons not found. Please generate them first using one of the icon scripts.');
    console.warn('Continuing with packaging, but the extension may not work correctly without icons.');
  }
  
  // Copy files to output directory
  copyFiles();
  
  // Create ZIP archive
  createZipArchive();
  
  console.log('Packaging complete!');
  console.log(`Output: ${packageName}.zip`);
  console.log('You can now upload this ZIP file to the Chrome Web Store Developer Dashboard.');
}

// Run the packaging process
packageExtension(); 