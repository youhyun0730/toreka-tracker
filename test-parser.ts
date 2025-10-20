import * as fs from 'fs';
import { parseComments } from './src/scraper/parser';

// Read example.html
const html = fs.readFileSync('./example.html', 'utf-8');

// Parse comments
const comments = parseComments(html, 325, 'https://gamenv.net/tc/yodobashi');

// Show statistics
const topLevel = comments.filter(c => !c.parentId);
const replies = comments.filter(c => c.parentId);

console.log('\n=== RESULTS ===');
console.log(`Total comments: ${comments.length}`);
console.log(`Top-level: ${topLevel.length}`);
console.log(`Replies: ${replies.length}`);

console.log('\n=== REPLY SAMPLES ===');
replies.slice(0, 5).forEach(c => {
  console.log(`ID: ${c.id}, Parent: ${c.parentId}, Author: ${c.author}`);
  console.log(`Content: ${c.content.substring(0, 50)}...`);
  console.log('---');
});
