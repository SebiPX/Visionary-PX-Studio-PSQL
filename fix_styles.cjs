const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'components');

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else {
      if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        let original = content;
        
        // Fix text on primary backgrounds
        content = content.replace(/bg-primary\s+text-foreground/g, 'bg-primary text-primary-foreground');
        
        // Fix transparent sidebars
        content = content.replace(/bg-glass/g, 'bg-card border-r border-border'); // Ensures a solid boundary
        
        // In case there are buttons with bg-primary hover:bg-primary-hover text-foreground
        content = content.replace(/bg-gradient-to-r from-primary to-purple-600 text-foreground/g, 'bg-gradient-to-r from-primary to-purple-600 text-primary-foreground');
        
        // Specifically fix VoiceStudio, Chatbot, etc if they have other permutations
        content = content.replace(/bg-primary\/80 hover:bg-primary text-foreground/g, 'bg-primary/80 hover:bg-primary text-primary-foreground');

        if (content !== original) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Updated ${fullPath}`);
        }
      }
    }
  }
}

console.log('Running style fix script...');
processDirectory(componentsDir);
console.log('Done fixing styles!');
