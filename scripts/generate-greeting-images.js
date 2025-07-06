const fs = require('fs');
const path = require('path');

// Path to the greeting images directory
const greetingImagesDir = path.join(__dirname, '../public/images/avatar/greeting');
const greetingImagesOutputFile = path.join(__dirname, '../public/greeting-images.json');
const manifestOutputFile = path.join(__dirname, '../public/site.webmanifest');

function generateGreetingImagesList() {
  try {
    // Check if the greeting images directory exists
    if (!fs.existsSync(greetingImagesDir)) {
      console.log('Greeting images directory not found. Creating empty list.');
      fs.writeFileSync(greetingImagesOutputFile, JSON.stringify([], null, 2));
      return;
    }

    // Read all files in the greeting images directory
    const files = fs.readdirSync(greetingImagesDir);
    
    // Filter for image files with the greeting-{number} pattern
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const greetingImages = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        const name = path.basename(file, ext);
        return imageExtensions.includes(ext) && name.match(/^greeting-\d+$/);
      })
      .sort((a, b) => {
        // Sort by number for consistent ordering
        const aNum = parseInt(a.match(/greeting-(\d+)/)[1]);
        const bNum = parseInt(b.match(/greeting-(\d+)/)[1]);
        return aNum - bNum;
      });

    // Write the list to a JSON file
    fs.writeFileSync(greetingImagesOutputFile, JSON.stringify(greetingImages, null, 2));
    
    console.log(`Generated greeting images list with ${greetingImages.length} images:`);
    greetingImages.forEach(image => console.log(`  - ${image}`));
    
  } catch (error) {
    console.error('Error generating greeting images list:', error);
    // Create empty list as fallback
    fs.writeFileSync(greetingImagesOutputFile, JSON.stringify([], null, 2));
  }
}

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

generateGreetingImagesList();
generateManifest();