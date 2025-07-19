#!/usr/bin/env python3
"""
Sort vocabulary CSV file by the first column (Word column).
"""

import csv
import sys
from pathlib import Path

def sort_vocabulary_csv(input_file, output_file=None):
    """
    Sort a vocabulary CSV file by the first column (Word).
    
    Args:
        input_file (str): Path to the input CSV file
        output_file (str, optional): Path to the output CSV file. If None, overwrites input file.
    """
    # Read the CSV file
    try:
        with open(input_file, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)  # Read the header row
            rows = list(reader)    # Read all data rows
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
        return False
    except Exception as e:
        print(f"Error reading file: {e}")
        return False
    
    # Sort rows by the first column (Word column)
    # Skip empty rows and sort case-insensitively
    valid_rows = [row for row in rows if row and len(row) > 0]
    sorted_rows = sorted(valid_rows, key=lambda x: x[0].lower() if x[0] else '')
    
    # Add sequential IDs if the first column is 'id'
    if header and header[0].lower() == 'id':
        for i, row in enumerate(sorted_rows, 1):
            if len(row) > 0:
                row[0] = str(i)
    
    # Write the sorted data
    output_path = output_file if output_file else input_file
    try:
        with open(output_path, 'w', encoding='utf-8', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(header)
            writer.writerows(sorted_rows)
        
        print(f"Successfully sorted {len(sorted_rows)} rows and saved to '{output_path}'")
        return True
    except Exception as e:
        print(f"Error writing file: {e}")
        return False

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 2:
        print("Usage: python sort_vocabulary.py <input_file> [output_file]")
        print("Example: python sort_vocabulary.py vocabulary-music copy.csv")
        print("Example: python sort_vocabulary.py vocabulary-music copy.csv sorted-vocabulary.csv")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Check if input file exists
    if not Path(input_file).exists():
        print(f"Error: Input file '{input_file}' does not exist.")
        sys.exit(1)
    
    success = sort_vocabulary_csv(input_file, output_file)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()