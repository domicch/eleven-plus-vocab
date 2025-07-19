const fs = require('fs');
const path = require('path');

// Paths to CSV files and image directories
const elevenPlusCSV = path.join(__dirname, '../public/vocabulary.csv');
const musicCSV = path.join(__dirname, '../public/vocabulary-music.csv');
const elevenPlusImagesDir = path.join(__dirname, '../public/images/words/11plus');
const musicImagesDir = path.join(__dirname, '../public/images/words/music');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function loadVocabularyMapping(csvPath) {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    const mapping = new Map();
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = parseCSVLine(line);
      
      if (values.length >= 3) {
        const id = values[0].trim();
        const word = values[1].trim();
        
        if (id && word) {
          // Create normalized word for filename matching
          const normalizedWord = word.toLowerCase();
          mapping.set(normalizedWord, id);
        }
      }
    }
    
    return mapping;
  } catch (error) {
    console.error(`❌ Error loading CSV ${csvPath}:`, error.message);
    return new Map();
  }
}

function renameImagesInDirectory(imageDir, mapping, category) {
  try {
    if (!fs.existsSync(imageDir)) {
      console.log(`⚠️  Directory not found: ${imageDir}`);
      return { renamed: 0, skipped: 0, errors: 0 };
    }

    const files = fs.readdirSync(imageDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`\n📁 Processing ${category} images (${imageFiles.length} files)`);
    
    let renamed = 0;
    let skipped = 0;
    let errors = 0;

    imageFiles.forEach(filename => {
      try {
        const ext = path.extname(filename);
        const wordPart = path.basename(filename, ext);
        const oldPath = path.join(imageDir, filename);
        
        // Look up the ID for this word
        const vocabularyId = mapping.get(wordPart);
        
        if (vocabularyId) {
          const newFilename = `${vocabularyId}${ext}`;
          const newPath = path.join(imageDir, newFilename);
          
          // Check if target file already exists
          if (fs.existsSync(newPath)) {
            console.log(`⚠️  Target exists: ${filename} → ${newFilename} (skipping)`);
            skipped++;
          } else {
            fs.renameSync(oldPath, newPath);
            console.log(`✅ Renamed: ${filename} → ${newFilename} (ID: ${vocabularyId})`);
            renamed++;
          }
        } else {
          console.log(`❓ No ID found for word: ${wordPart} (file: ${filename})`);
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
        errors++;
      }
    });

    return { renamed, skipped, errors };
  } catch (error) {
    console.error(`❌ Error processing directory ${imageDir}:`, error.message);
    return { renamed: 0, skipped: 0, errors: 1 };
  }
}

function renameAllImages() {
  try {
    console.log('🚀 Starting image file renaming...\n');
    
    // Load vocabulary mappings
    console.log('📖 Loading vocabulary mappings...');
    const elevenPlusMapping = loadVocabularyMapping(elevenPlusCSV);
    const musicMapping = loadVocabularyMapping(musicCSV);
    
    console.log(`   11+ vocabulary: ${elevenPlusMapping.size} words`);
    console.log(`   Music vocabulary: ${musicMapping.size} words`);
    
    // Rename 11+ images
    const elevenPlusResults = renameImagesInDirectory(elevenPlusImagesDir, elevenPlusMapping, '11plus');
    
    // Rename music images
    const musicResults = renameImagesInDirectory(musicImagesDir, musicMapping, 'music');
    
    // Summary
    console.log('\n📊 Renaming Summary:');
    console.log(`\n11+ Images:`);
    console.log(`   Renamed: ${elevenPlusResults.renamed}`);
    console.log(`   Skipped: ${elevenPlusResults.skipped}`);
    console.log(`   Errors: ${elevenPlusResults.errors}`);
    
    console.log(`\nMusic Images:`);
    console.log(`   Renamed: ${musicResults.renamed}`);
    console.log(`   Skipped: ${musicResults.skipped}`);
    console.log(`   Errors: ${musicResults.errors}`);
    
    console.log(`\nTotal:`);
    console.log(`   Renamed: ${elevenPlusResults.renamed + musicResults.renamed}`);
    console.log(`   Skipped: ${elevenPlusResults.skipped + musicResults.skipped}`);
    console.log(`   Errors: ${elevenPlusResults.errors + musicResults.errors}`);
    
    if (elevenPlusResults.errors + musicResults.errors === 0) {
      console.log('\n✅ Image renaming completed successfully!');
    } else {
      console.log('\n⚠️  Image renaming completed with some errors. Please review the output above.');
    }
    
  } catch (error) {
    console.error('\n❌ Failed to rename images:', error.message);
    process.exit(1);
  }
}

// Run the renaming
renameAllImages();