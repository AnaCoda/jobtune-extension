// Test file for splitResume function
// Run this in Node.js: node test-split.js

const fs = require('fs');
const path = require('path');
const { ResumeItemType, ResumeItem, splitResume } = require('./scripts.js');

// Load resumes from files
const jakeResume = fs.readFileSync(path.join(__dirname, '../test-resumes/jakesResume.tex'), 'utf8');
const anasResume = fs.readFileSync(path.join(__dirname, '../test-resumes/anasResume.tex'), 'utf8');

// Run the test
console.log('Testing splitResume with Resume...\n');
console.log('='.repeat(80));

const items = splitResume(anasResume);

console.log(`\nTotal items found: ${items.length}\n`);

items.forEach((item, index) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Item ${index + 1}:`);
    console.log(`  Type: ${item.type}`);
    console.log(`  Always Include: ${item.alwaysInclude}`);
    console.log(`  Content Length: ${item.content.length} characters`);
    console.log(`  Content Preview:`);
    console.log(`  ${item.humanReadableContent.substring(0, 1000).replace(/\n/g, '\\n')}`);
});

console.log('\n' + '='.repeat(80));
console.log('\nSummary:');
console.log(`  - OTHER items: ${items.filter(i => i.type === ResumeItemType.OTHER).length}`);
console.log(`  - EXPERIENCE items: ${items.filter(i => i.type === ResumeItemType.EXPERIENCE).length}`);
console.log(`  - PROJECT items: ${items.filter(i => i.type === ResumeItemType.PROJECT).length}`);
console.log(`  - Always include items: ${items.filter(i => i.alwaysInclude).length}`);

