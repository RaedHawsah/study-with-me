const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, '../public/audio/custom');
const outputDir = path.join(__dirname, '../src/lib');
const outputFile = path.join(outputDir, 'sounds-list.json');

try {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let files = [];
  if (fs.existsSync(audioDir)) {
    files = fs.readdirSync(audioDir)
      .filter(file => /\.(mp3|wav|ogg|m4a)$/i.test(file));
  }

  fs.writeFileSync(outputFile, JSON.stringify({ files }, null, 2));
  console.log(`Successfully generated sounds list with ${files.length} files.`);
} catch (err) {
  console.error('Failed to generate sounds list:', err);
  process.exit(1);
}
