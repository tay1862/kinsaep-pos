/**
 * Script to split large i18n JSON files into smaller modules
 * Run with: node scripts/split-i18n.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../i18n/locales');
const LOCALES = ['en-US', 'lo-LA'];

function splitLocaleFile(localeName) {
    const sourceFile = path.join(LOCALES_DIR, `${localeName}.json`);
    const targetDir = path.join(LOCALES_DIR, localeName);

    // Read source file
    const content = fs.readFileSync(sourceFile, 'utf-8');
    const data = JSON.parse(content);

    // Create target directory if not exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // Split into modules
    const modules = Object.keys(data);
    console.log(`Splitting ${localeName} into ${modules.length} modules...`);

    for (const moduleName of modules) {
        const moduleData = { [moduleName]: data[moduleName] };
        const moduleFile = path.join(targetDir, `${moduleName}.json`);

        fs.writeFileSync(
            moduleFile,
            JSON.stringify(moduleData, null, 2) + '\n',
            'utf-8'
        );
        console.log(`  Created: ${moduleName}.json`);
    }

    console.log(`✅ ${localeName} split into ${modules.length} files in ${targetDir}`);

    // Rename original file to backup
    const backupFile = path.join(LOCALES_DIR, `${localeName}.backup.json`);
    fs.renameSync(sourceFile, backupFile);
    console.log(`  Original file backed up to: ${localeName}.backup.json`);
}

// Run for all locales
for (const locale of LOCALES) {
    try {
        splitLocaleFile(locale);
    } catch (error) {
        console.error(`Error splitting ${locale}:`, error.message);
    }
}

console.log('\n🎉 Done! Remember to update nuxt.config.ts to use the new file structure.');
