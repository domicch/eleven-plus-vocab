import requests
import csv
import os
import time
from urllib.parse import quote
import json
from dotenv import load_dotenv

# Load environment variables from .env file in current directory
load_dotenv('.env')

# Pixabay API key from environment variable
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")

if not PIXABAY_API_KEY:
    raise ValueError("PIXABAY_API_KEY not found in environment variables. Please check your .env file.")

def download_image(word, image_url, folder_path):
    """Download image from URL and save it"""
    try:
        response = requests.get(image_url, timeout=15)
        if response.status_code == 200:
            filename = f"{word.lower()}.jpg"
            filepath = os.path.join(folder_path, filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"Downloaded: {word}")
            return True
        else:
            print(f"Failed to download image for: {word} (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"Error downloading {word}: {e}")
        return False

def fetch_pixabay_image(word):
    """Fetch image URL from Pixabay for a given word"""
    try:
        # Pixabay API endpoint
        url = f"https://pixabay.com/api/?key={PIXABAY_API_KEY}&q={quote(word)}&image_type=photo&orientation=horizontal&min_width=400&min_height=300&per_page=3"
        
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data['hits']:
                # Get the first image's web format URL
                image_url = data['hits'][0]['webformatURL']
                return image_url
            else:
                print(f"No images found for: {word}")
                return None
        else:
            print(f"API request failed for {word}: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching image for {word}: {e}")
        return None

def main():
    # Create images folder if it doesn't exist
    images_folder = "images"
    if not os.path.exists(images_folder):
        os.makedirs(images_folder)
    
    # Read vocabulary from CSV
    with open('vocabulary.csv', 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        words = list(reader)
    
    # Process only first 3 words as a test
    test_words = words[:3]
    print(f"Testing with {len(test_words)} words using placeholder images")
    
    # Process each word
    for i, row in enumerate(test_words):
        word = row['Word']
        print(f"Processing {i+1}/{len(test_words)}: {word}")
        
        # Get image URL from Pixabay
        image_url = fetch_pixabay_image(word)
        
        if image_url:
            # Download the image
            download_image(word, image_url, images_folder)
        
        # Add a small delay
        time.sleep(1)
    
    print("Test image download complete!")
    print("Images are now fetched from Pixabay based on word relevance!")

if __name__ == "__main__":
    main()