const fs = require('fs');
const path = require('path');

// Path to the avatar images directories
const greetingImagesDir = path.join(__dirname, '../public/images/avatar/greeting');
const happyImagesDir = path.join(__dirname, '../public/images/avatar/happy');
const unhappyImagesDir = path.join(__dirname, '../public/images/avatar/unhappy');

// Path to vocabulary images directories
const elevenPlusImagesDir = path.join(__dirname, '../public/images/words/11plus');
const musicImagesDir = path.join(__dirname, '../public/images/words/music');

const greetingImagesOutputFile = path.join(__dirname, '../public/greeting-images.json');
const happyImagesOutputFile = path.join(__dirname, '../public/happy-images.json');
const unhappyImagesOutputFile = path.join(__dirname, '../public/unhappy-images.json');
const elevenPlusImagesOutputFile = path.join(__dirname, '../public/11plus-images.json');
const musicImagesOutputFile = path.join(__dirname, '../public/music-images.json');
const manifestOutputFile = path.join(__dirname, '../public/site.webmanifest');


function generateManifest() {
  try {
    // Determine if this is a production build - check multiple indicators
    const isProduction = process.env.NODE_ENV === 'production' || 
                         process.env.GITHUB_ACTIONS === 'true' ||
                         process.argv.includes('--production');
    const basePath = isProduction ? '/eleven-plus-vocab' : '';
    
    const manifest = {
      name: "Wocab - 11+ Vocabulary Learning",
      short_name: "Wocab",
      description: "Master essential vocabulary words for your 11+ exam with Wocab. Interactive flashcards and quizzes featuring Dale the Shiba Inu!",
      start_url: `${basePath}/`,
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#3B82F6",
      icons: [
        {
          src: `${basePath}/android-chrome-192x192.png`,
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: `${basePath}/android-chrome-512x512.png`,
          sizes: "512x512",
          type: "image/png"
        },
        {
          src: `${basePath}/apple-touch-icon.png`,
          sizes: "180x180",
          type: "image/png"
        }
      ]
    };

    // Write the manifest file
    fs.writeFileSync(manifestOutputFile, JSON.stringify(manifest, null, 2));
    
    console.log(`Generated manifest for ${isProduction ? 'production' : 'development'} with base path: "${basePath}"`);
    
  } catch (error) {
    console.error('Error generating manifest:', error);
  }
}

function generateAvatarImagesList(mood) {
  const imageDir = mood === 'greeting' ? greetingImagesDir : 
                   mood === 'happy' ? happyImagesDir : unhappyImagesDir;
  const outputFile = mood === 'greeting' ? greetingImagesOutputFile :
                     mood === 'happy' ? happyImagesOutputFile : unhappyImagesOutputFile;
  const pattern = mood === 'greeting' ? /^greeting-\d+$/ : 
                  mood === 'happy' ? /^happy-\d+$/ : /^unhappy-\d+$/;
  
  try {
    // Check if the images directory exists
    if (!fs.existsSync(imageDir)) {
      console.log(`${mood} images directory not found. Creating empty list.`);
      fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
      return;
    }

    // Read all files in the images directory
    const files = fs.readdirSync(imageDir);
    
    // Filter for image files with the correct pattern
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const avatarImages = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        const name = path.basename(file, ext);
        return imageExtensions.includes(ext) && name.match(pattern);
      })
      .sort((a, b) => {
        // Sort by number for consistent ordering
        const aNum = parseInt(a.match(/(\d+)/)[1]);
        const bNum = parseInt(b.match(/(\d+)/)[1]);
        return aNum - bNum;
      });

    // Write the list to a JSON file
    fs.writeFileSync(outputFile, JSON.stringify(avatarImages, null, 2));
    
    console.log(`Generated ${mood} images list with ${avatarImages.length} images:`);
    avatarImages.forEach(image => console.log(`  - ${image}`));
    
  } catch (error) {
    console.error(`Error generating ${mood} images list:`, error);
    // Create empty list as fallback
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
  }
}

function generateVocabularyImagesList(category) {
  const imageDir = category === '11plus' ? elevenPlusImagesDir : musicImagesDir;
  const outputFile = category === '11plus' ? elevenPlusImagesOutputFile : musicImagesOutputFile;
  
  try {
    // Check if the images directory exists
    if (!fs.existsSync(imageDir)) {
      console.log(`${category} vocabulary images directory not found. Creating empty manifest.`);
      fs.writeFileSync(outputFile, JSON.stringify({}, null, 2));
      return;
    }

    // Read all files in the images directory
    const files = fs.readdirSync(imageDir);
    
    // Filter for image files and create word-to-filename mapping
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const imageManifest = {};
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      const word = path.basename(file, ext);
      
      if (imageExtensions.includes(ext)) {
        imageManifest[word] = file;
      }
    });

    // Write the manifest to a JSON file
    fs.writeFileSync(outputFile, JSON.stringify(imageManifest, null, 2));
    
    console.log(`Generated ${category} vocabulary images manifest with ${Object.keys(imageManifest).length} images`);
    
  } catch (error) {
    console.error(`Error generating ${category} vocabulary images manifest:`, error);
    // Create empty manifest as fallback
    fs.writeFileSync(outputFile, JSON.stringify({}, null, 2));
  }
}

generateAvatarImagesList('greeting');
generateAvatarImagesList('happy');
generateAvatarImagesList('unhappy');
generateVocabularyImagesList('11plus');
generateVocabularyImagesList('music');
generateManifest();