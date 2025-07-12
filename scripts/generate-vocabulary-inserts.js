const fs = require('fs');
const path = require('path');

// Read the vocabulary CSV file
const csvPath = path.join(__dirname, '..', 'public', 'vocabulary.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV (handle quotes and commas in definitions)
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

// Process CSV
const lines = csvContent.trim().split('\n');
const vocabulary = [];

// Skip header row (index 0)
for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  
  if (values.length >= 2) {
    const word = values[0].trim();
    const definition = values[1].trim();
    
    // Escape single quotes for SQL
    const escapedWord = word.replace(/'/g, "''");
    const escapedDefinition = definition.replace(/'/g, "''");
    
    vocabulary.push({
      word: escapedWord,
      definition: escapedDefinition
    });
  }
}

// Generate SQL INSERT statements
let sqlContent = `-- Complete vocabulary data INSERT statements
-- Generated from vocabulary.csv
-- Total words: ${vocabulary.length}

`;

// Split into chunks of 50 for better readability
const chunkSize = 50;
for (let i = 0; i < vocabulary.length; i += chunkSize) {
  const chunk = vocabulary.slice(i, i + chunkSize);
  
  sqlContent += `-- Words ${i + 1} to ${Math.min(i + chunkSize, vocabulary.length)}\n`;
  sqlContent += `INSERT INTO vocabulary (word, definition) VALUES\n`;
  
  const values = chunk.map(item => 
    `('${item.word}', '${item.definition}')`
  ).join(',\n');
  
  sqlContent += values + '\nON CONFLICT (word) DO NOTHING;\n\n';
}

// Write to SQL file
const outputPath = path.join(__dirname, 'sql', 'vocabulary_data_inserts.sql');
fs.writeFileSync(outputPath, sqlContent);

console.log(`Generated SQL INSERT statements for ${vocabulary.length} vocabulary words`);
console.log(`Output written to: ${outputPath}`);
console.log(`\nTo import into Supabase:`);
console.log(`1. Run the create_vocabulary_table.sql script first`);
console.log(`2. Then run this vocabulary_data_inserts.sql script`);
console.log(`3. Or use Supabase dashboard CSV import for easier import`);