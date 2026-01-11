/**
 * Script to merge split i18n locale files into single files
 * Run with: node scripts/merge-i18n.js
 * 
 * This should be run before build or dev to create merged locale files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../i18n/locales');
const LOCALES = [
    { folder: 'en-US', output: 'en-US.json' },
    { folder: 'lo-LA', output: 'lo-LA.json' },
];

function mergeLocaleFiles(folder, outputFile) {
    const localeDir = path.join(LOCALES_DIR, folder);
    const outputPath = path.join(LOCALES_DIR, outputFile);

    if (!fs.existsSync(localeDir) || !fs.statSync(localeDir).isDirectory()) {
        console.log(`⚠️ Skipping ${folder}: directory not found`);
        return;
    }

    const messages = {};
    const files = fs.readdirSync(localeDir).filter(f => f.endsWith('.json'));

    console.log(`Merging ${files.length} files from ${folder}...`);

    for (const file of files) {
        const filePath = path.join(localeDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        Object.assign(messages, data);
    }

    fs.writeFileSync(
        outputPath,
        JSON.stringify(messages, null, 2) + '\n',
        'utf-8'
    );

    console.log(`✅ Created ${outputFile} (${Object.keys(messages).length} namespaces)`);
}

// Run for all locales
for (const locale of LOCALES) {
    try {
        mergeLocaleFiles(locale.folder, locale.output);
    } catch (error) {
        console.error(`Error merging ${locale.folder}:`, error.message);
    }
}

console.log('\n🎉 Done! Merged locale files are ready.');
