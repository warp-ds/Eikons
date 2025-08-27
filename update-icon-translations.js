#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the default icon descriptions
import defaultIconDescriptions from './default-icon-descriptions.js';

const SVG_DIR = path.join(__dirname, 'svg/Regular');
const MESSAGES_PO_FILE = path.join(__dirname, 'locales/en/messages.po');

// Function to normalize icon name (remove .svg extension and convert to lowercase)
function normalizeIconName(filename) {
    return path.basename(filename, '.svg').toLowerCase();
}

// Function to generate new messages.po content
function generateNewMessagesPoContent(iconUpdates) {
    const header = `msgid ""
msgstr ""
"POT-Creation-Date: 2025-03-25 11:21+0100\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"X-Generator: @lingui/cli\\n"
"Language: en\\n"
"Project-Id-Version: \\n"
"Report-Msgid-Bugs-To: \\n"
"PO-Revision-Date: \\n"
"Last-Translator: \\n"
"Language-Team: \\n"
"Plural-Forms: \\n"

`;

    let entries = '';
    
    // Sort the icon updates by ID for consistency
    const sortedUpdates = Array.from(iconUpdates.entries()).sort((a, b) => a[1].id.localeCompare(b[1].id));
    
    for (const [iconName, iconData] of sortedUpdates) {
        const titleComment = iconName.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
        entries += `#. Title for ${titleComment} icon
#. js-lingui-explicit-id
msgid "${iconData.id}"
msgstr "${iconData.message}"

`;
    }
    
    return header + entries;
}

// Main function
function updateIconTranslations() {
    console.log('Starting icon translation update...');
    
    // Read all SVG files from the Regular directory
    let svgFiles;
    try {
        svgFiles = fs.readdirSync(SVG_DIR).filter(file => file.endsWith('.svg'));
        console.log(`Found ${svgFiles.length} SVG files in ${SVG_DIR}`);
    } catch (error) {
        console.error('Error reading SVG directory:', error);
        return;
    }
    
    // Map to store icon updates
    const iconUpdates = new Map();
    let matchedCount = 0;
    let notFoundCount = 0;
    
    // Process each SVG file
    for (const svgFile of svgFiles) {
        const normalizedName = normalizeIconName(svgFile);
        
        if (defaultIconDescriptions[normalizedName]) {
            iconUpdates.set(svgFile, {
                id: defaultIconDescriptions[normalizedName].id,
                message: defaultIconDescriptions[normalizedName].message
            });
            matchedCount++;
            console.log(`✓ Matched: ${svgFile} -> ${defaultIconDescriptions[normalizedName].id}`);
        } else {
            notFoundCount++;
            console.log(`✗ No description found for: ${svgFile} (normalized: ${normalizedName})`);
        }
    }
    
    console.log(`\nMatched: ${matchedCount}, Not found: ${notFoundCount}`);
    
    if (iconUpdates.size === 0) {
        console.log('No icons to update. Exiting.');
        return;
    }
    
    // Generate new messages.po content
    const newContent = generateNewMessagesPoContent(iconUpdates);
    
    // Write to messages.po file
    try {
        fs.writeFileSync(MESSAGES_PO_FILE, newContent);
        console.log(`\nSuccessfully updated ${MESSAGES_PO_FILE} with ${iconUpdates.size} entries.`);
    } catch (error) {
        console.error('Error writing to messages.po file:', error);
    }
}

// Run the script
updateIconTranslations();
