const fs = require('fs');
const path = require('path');

const targetDirs = [
  path.join(__dirname, 'components/Inventar'),
  path.join(__dirname, 'components/InventarApp.tsx'),
  path.join(__dirname, 'components/Dashboard.tsx'),
  path.join(__dirname, 'components/DashboardConfigDrawer.tsx'),
  path.join(__dirname, 'components/UserTasksWidget.tsx'),
  path.join(__dirname, 'components/NewsWidget.tsx')
];

const mappings = [
  { regex: /bg-slate-950/g, target: 'bg-background' },
  { regex: /bg-\[#0B0F19\]/g, target: 'bg-background' },
  { regex: /bg-\[#101622\]/g, target: 'bg-background' },
  { regex: /bg-slate-900/g, target: 'bg-card' },
  { regex: /bg-slate-800\/60/g, target: 'bg-card/60' },
  { regex: /bg-slate-800\/50/g, target: 'bg-card/50' },
  { regex: /bg-slate-800/g, target: 'bg-card' },
  { regex: /hover:bg-slate-800/g, target: 'hover:bg-card' },
  { regex: /hover:bg-slate-700\/60/g, target: 'hover:bg-muted/60' },
  { regex: /hover:bg-slate-700/g, target: 'hover:bg-muted' },
  { regex: /bg-slate-700\/50/g, target: 'bg-muted/50' },
  { regex: /bg-slate-700/g, target: 'bg-muted' },
  { regex: /hover:bg-slate-600/g, target: 'hover:bg-muted-foreground/20' },
  { regex: /bg-slate-600/g, target: 'bg-muted-foreground/30' },
  
  { regex: /text-white/g, target: 'text-foreground' },
  { regex: /text-slate-200/g, target: 'text-foreground' },
  { regex: /text-slate-300/g, target: 'text-foreground/90' },
  { regex: /text-slate-400/g, target: 'text-muted-foreground' },
  { regex: /text-slate-500/g, target: 'text-muted-foreground' },
  { regex: /text-slate-600/g, target: 'text-muted-foreground/80' },
  { regex: /text-brand-/g, target: 'text-primary-' },
  { regex: /bg-brand-/g, target: 'bg-primary-' },
  { regex: /border-brand-/g, target: 'border-primary-' },
  { regex: /shadow-brand-/g, target: 'shadow-primary-' },
  
  { regex: /border-slate-800/g, target: 'border-border' },
  { regex: /border-slate-700\/60/g, target: 'border-border/60' },
  { regex: /border-slate-700\/50/g, target: 'border-border/50' },
  { regex: /border-slate-700/g, target: 'border-border' },
  { regex: /border-slate-600/g, target: 'border-border/80' },

  { regex: /divide-slate-700\/60/g, target: 'divide-border/60' },
  { regex: /divide-slate-700/g, target: 'divide-border' },
  { regex: /divide-slate-800/g, target: 'divide-border' }
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

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    processDirectory(dir);
  } else {
    console.warn(`Dir not found: ${dir}`);
  }
});
