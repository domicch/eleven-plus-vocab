# Image Download Scripts

These scripts download images from Pixabay for vocabulary words using the Pixabay API.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API key:**
   Create a `.env` file in this directory with your Pixabay API key:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your actual Pixabay API key
   PIXABAY_API_KEY=your_api_key_here
   ```
   
   Get your free API key from: https://pixabay.com/api/docs/

## Usage

### Download all images
```bash
python fetch_all_images.py
```

### Continue interrupted download
```bash
python continue_download.py
```

### Test with few images
```bash
python fetch_pixabay_images.py
```

## Files

- `fetch_all_images.py` - Downloads images for all 503+ vocabulary words
- `continue_download.py` - Resumes download for missing images
- `fetch_pixabay_images.py` - Test script for first few words
- `requirements.txt` - Python dependencies
- `README.md` - This file

## Notes

- Scripts look for `vocabulary.csv` in the parent directory
- Images are saved to `images/` folder in the parent directory
- Scripts include rate limiting (1 second delay between requests)
- Failed downloads are reported but don't stop the process
- Existing images are skipped automatically