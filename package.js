// Packages the Bionic Reading extension into a clean distributable zip.
//
// Includes the runtime files the browser needs, plus README and LICENSE;
// excludes dev-only files (icon generator, specs, plans, tests, this script,
// scratch files).
// Node-only, no dependencies. Requires the `zip` command (preinstalled on
// macOS/Linux). Run with: node package.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const stageDir = path.join(root, 'dist');
const packageName = 'bionic-reading-v2';
const zipPath = path.join(root, `${packageName}.zip`);

// Individual runtime files to include (relative to repo root).
const includeFiles = [
  'manifest.json',
  'content.js',
  'background.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'LICENSE',
  'README.md',
];

// Directories whose matching assets are included. Only PNGs — Chrome loads
// raster icons at runtime; the canonical SVGs are repo/source assets.
const includeDirs = [
  { dir: 'icons', extensions: ['.png'] },
];

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyToStage(relPath) {
  const src = path.join(root, relPath);
  const dest = path.join(stageDir, relPath);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`  + ${relPath}`);
}

function stageFiles() {
  console.log('Staging runtime files...');

  for (const file of includeFiles) {
    if (!fs.existsSync(path.join(root, file))) {
      throw new Error(`Required file missing: ${file}`);
    }
    copyToStage(file);
  }

  for (const { dir, extensions } of includeDirs) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Required directory missing: ${dir}`);
    }
    const matches = fs
      .readdirSync(dirPath)
      // Ship only the icons the manifest references; -256 is a store-listing tile.
      .filter((file) => extensions.includes(path.extname(file).toLowerCase()) && !/-256\.png$/i.test(file));
    if (matches.length === 0) {
      throw new Error(`No matching assets in ${dir} (expected ${extensions.join(', ')})`);
    }
    for (const file of matches) {
      copyToStage(path.join(dir, file));
    }
  }
}

function createZip() {
  console.log('Creating zip archive...');
  // Zip the staged contents (not the dist folder itself) so the archive
  // unpacks straight to the extension root.
  execSync(`cd "${stageDir}" && zip -r -q "${zipPath}" .`);
  console.log(`Created ${path.basename(zipPath)}`);
}

function packageExtension() {
  console.log('Packaging Bionic Reading extension...');

  // Start clean so stale files never leak into the archive.
  rmrf(stageDir);
  rmrf(zipPath);
  ensureDir(stageDir);

  stageFiles();
  createZip();

  console.log('Done.');
  console.log(`Output: ${path.basename(zipPath)}`);
  console.log('Upload this zip to the Chrome Web Store Developer Dashboard.');
}

packageExtension();
