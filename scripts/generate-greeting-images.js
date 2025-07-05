const fs = require('fs');
const path = require('path');

// Path to the greeting images directory
const greetingImagesDir = path.join(__dirname, '../public/images/avatar/greeting');
const outputFile = path.join(__dirname, '../public/greeting-images.json');

function generateGreetingImagesList() {
  try {
    // Check if the greeting images directory exists
    if (!fs.existsSync(greetingImagesDir)) {
      console.log('Greeting images directory not found. Creating empty list.');
      fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
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
    fs.writeFileSync(outputFile, JSON.stringify(greetingImages, null, 2));
    
    console.log(`Generated greeting images list with ${greetingImages.length} images:`);
    greetingImages.forEach(image => console.log(`  - ${image}`));
    
  } catch (error) {
    console.error('Error generating greeting images list:', error);
    // Create empty list as fallback
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
  }
}

generateGreetingImagesList();