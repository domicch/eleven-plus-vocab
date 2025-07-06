import re
import csv

# Read the text file
with open('words.txt', 'r') as f:
    content = f.read()

# Parse the content line by line
words_data = []
lines = content.strip().split('\n')

for line in lines:
    line = line.strip()
    if line:  # Skip empty lines
        # Split on first space to separate word from definition
        parts = line.split(' ', 1)
        if len(parts) == 2:
            word = parts[0]
            definition = parts[1]
            words_data.append((word, definition))

# Create CSV file
with open('vocabulary.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(['Word', 'Definition'])
    
    for word, definition in words_data:
        # Clean up the definition by removing extra whitespace and newlines
        clean_definition = ' '.join(definition.strip().split())
        writer.writerow([word, clean_definition])

print(f'Created vocabulary.csv with {len(words_data)} words')