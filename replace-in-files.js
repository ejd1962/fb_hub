#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node replace-in-files.js KEYWORD NEWWORD [directory]');
  console.error('  KEYWORD: The word to find (case-insensitive matching)');
  console.error('  NEWWORD: The replacement word');
  console.error('  directory: Optional directory path (defaults to current directory)');
  process.exit(1);
}

const keyword = args[0];
const newword = args[1];
const startDir = args[2] || process.cwd();

// Function to determine the case pattern of a string
function getCasePattern(str) {
  if (str === str.toLowerCase()) return 'lower';
  if (str === str.toUpperCase()) return 'upper';
  if (str[0] === str[0].toUpperCase() && str.slice(1) === str.slice(1).toLowerCase()) {
    return 'title';
  }
  return 'mixed';
}

// Function to apply case pattern to a replacement word
function applyCasePattern(word, pattern) {
  switch (pattern) {
    case 'lower':
      return word.toLowerCase();
    case 'upper':
      return word.toUpperCase();
    case 'title':
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    default:
      return word; // Keep original case for mixed case
  }
}

// Function to replace keyword with case preservation
function replaceWithCasePreservation(content, keyword, newword) {
  // Create a regex that matches the keyword case-insensitively
  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  
  return content.replace(regex, (match) => {
    const matchPattern = getCasePattern(match);
    return applyCasePattern(newword, matchPattern);
  });
}

// Function to check if a file should be processed (skip binary files)
function isTextFile(filePath) {
  const binaryExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.pdf',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
  ];
  
  const ext = path.extname(filePath).toLowerCase();
  return !binaryExtensions.includes(ext);
}

// Function to recursively traverse directory and replace in files
function traverseAndReplace(dir) {
  let filesProcessed = 0;
  let filesModified = 0;
  
  function traverse(currentDir) {
    let entries;
    
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      console.error(`Error reading directory ${currentDir}: ${err.message}`);
      return;
    }
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        traverse(fullPath);
      } else if (entry.isFile()) {
        // Skip hidden files and non-text files
        if (entry.name.startsWith('.') || !isTextFile(fullPath)) {
          continue;
        }
        
        try {
          filesProcessed++;
          const content = fs.readFileSync(fullPath, 'utf8');
          const newContent = replaceWithCasePreservation(content, keyword, newword);
          
          if (content !== newContent) {
            fs.writeFileSync(fullPath, newContent, 'utf8');
            filesModified++;
            console.log(`✓ Modified: ${fullPath}`);
          }
        } catch (err) {
          // If we can't read as UTF-8, it's probably binary, skip it
          if (err.code !== 'EISDIR') {
            console.error(`Error processing ${fullPath}: ${err.message}`);
          }
        }
      }
    }
  }
  
  traverse(dir);
  return { filesProcessed, filesModified };
}

// Main execution
console.log(`Searching for: "${keyword}"`);
console.log(`Replacing with: "${newword}"`);
console.log(`Starting directory: ${startDir}`);
console.log('---');

const stats = traverseAndReplace(startDir);

console.log('---');
console.log(`Complete! Processed ${stats.filesProcessed} files, modified ${stats.filesModified} files.`);