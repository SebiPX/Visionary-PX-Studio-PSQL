const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

const mappings = [
  // Specific Hex Dark Backgrounds
  { regex: /bg-\[#101622\]/gi, target: 'bg-background' },
  { regex: /bg-\[#0b0f19\]/gi, target: 'bg-background' },
  { regex: /bg-\[#080c14\]/gi, target: 'bg-background' },
  { regex: /bg-\[#0[a-f0-9]{5}\]/gi, target: 'bg-card' }, // Catch #0a0f18, #0a0e17, etc
  { regex: /bg-\[#111\]/gi, target: 'bg-background' },
  { regex: /bg-\[#111111\]/gi, target: 'bg-background' },
  { regex: /bg-\[#1a1a1a\]/gi, target: 'bg-card' },
  { regex: /bg-\[#1[a-f0-9]{5}\]/gi, target: 'bg-card' }, // Catch #1a1f2e, #1a2333, #161f30
  
  // Slate/Gray Backgrounds
  { regex: /bg-slate-950/g, target: 'bg-background' },
  { regex: /bg-slate-900\/60/g, target: 'bg-card/60' },
  { regex: /bg-slate-900\/50/g, target: 'bg-card/50' },
  { regex: /bg-slate-900/g, target: 'bg-card' },
  { regex: /bg-slate-800\/60/g, target: 'bg-muted/60' },
  { regex: /bg-slate-800\/50/g, target: 'bg-muted/50' },
  { regex: /bg-slate-800\/40/g, target: 'bg-muted/40' },
  { regex: /hover:bg-slate-800\/40/g, target: 'hover:bg-muted/40' },
  { regex: /bg-slate-800/g, target: 'bg-muted' },
  { regex: /hover:bg-slate-800/g, target: 'hover:bg-muted' },
  { regex: /hover:bg-slate-700\/60/g, target: 'hover:bg-secondary/60' },
  { regex: /hover:bg-slate-700\/40/g, target: 'hover:bg-secondary/40' },
  { regex: /hover:bg-slate-700/g, target: 'hover:bg-secondary' },
  { regex: /bg-slate-700\/50/g, target: 'bg-secondary/50' },
  { regex: /bg-slate-700/g, target: 'bg-secondary' },
  { regex: /hover:bg-slate-600/g, target: 'hover:bg-muted-foreground/20' },
  { regex: /bg-slate-600/g, target: 'bg-muted-foreground/30' },
  { regex: /bg-slate-500\/10/g, target: 'bg-muted-foreground/10' },
  { regex: /bg-slate-500\/20/g, target: 'bg-muted-foreground/20' },
  
  // Text Colors
  { regex: /text-white/g, target: 'text-foreground' },
  { regex: /text-slate-100/g, target: 'text-foreground' },
  { regex: /text-slate-200/g, target: 'text-foreground' },
  { regex: /text-slate-300/g, target: 'text-foreground/90' },
  { regex: /text-slate-400/g, target: 'text-muted-foreground' },
  { regex: /text-slate-500/g, target: 'text-muted-foreground' },
  { regex: /text-slate-600/g, target: 'text-muted-foreground/80' },
  
  { regex: /placeholder-slate-500/g, target: 'placeholder-muted-foreground' },
  { regex: /placeholder-slate-600/g, target: 'placeholder-muted-foreground/80' },
  { regex: /placeholder-gray-600/g, target: 'placeholder-muted-foreground/80' },
  
  // Borders
  { regex: /border-white\/5/g, target: 'border-border/50' },
  { regex: /border-white\/10/g, target: 'border-border' },
  { regex: /border-white\/20/g, target: 'border-border/80' },
  { regex: /border-slate-800/g, target: 'border-border' },
  { regex: /border-slate-700\/60/g, target: 'border-border/60' },
  { regex: /border-slate-700\/50/g, target: 'border-border/50' },
  { regex: /border-slate-700/g, target: 'border-border' },
  { regex: /border-slate-600/g, target: 'border-border/80' },
  { regex: /hover:border-white\/20/g, target: 'hover:border-border' },

  // Divides
  { regex: /divide-white\/5/g, target: 'divide-border/50' },
  { regex: /divide-white\/10/g, target: 'divide-border' },
  { regex: /divide-slate-700\/60/g, target: 'divide-border/60' },
  { regex: /divide-slate-700/g, target: 'divide-border' },
  { regex: /divide-slate-800/g, target: 'divide-border' },
];

function processDirectory(dirPath) {
  if (fs.statSync(dirPath).isFile()) {
     processFile(dirPath);
     return;
  }
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        processFile(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  for (const { regex, target } of mappings) {
    content = content.replace(regex, target);
  }
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

processDirectory(componentsDir);
console.log('Done migrating all remaining components!');
