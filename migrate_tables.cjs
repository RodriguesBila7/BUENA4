const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else if (dirPath.endsWith('.jsx')) {
      callback(path.join(dir, f));
    }
  });
}

const componentsDir = path.join(__dirname, 'src', 'components');

let count = 0;
walk(componentsDir, (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Replace <table style={...}> with <table className="premium-table">
  content = content.replace(/<table\s+style=\{[^}]+\}/g, '<table className="premium-table"');
  content = content.replace(/<table\s+style="[^"]+"/g, '<table className="premium-table"');
  // If it's just <table> make it premium
  // Be careful not to replace it if it already has premium-table
  content = content.replace(/<table(?! className="premium-table")/g, '<table className="premium-table"');

  // Replace th, td, tr inline styles
  content = content.replace(/<th\s+style=\{styles\.th\}/g, '<th');
  content = content.replace(/<td\s+style=\{styles\.td\}/g, '<td');
  content = content.replace(/<tr\s+style=\{styles\.tr\}/g, '<tr');

  // Specific variations that often show up
  content = content.replace(/<th\s+style=\{\{\s*\.\.\.styles\.th[^}]+\}\}/g, '<th');
  content = content.replace(/<th\s+style=\{\{\s*cursor:\s*'pointer'\s*\}\}/g, '<th style={{ cursor: "pointer" }}');

  // Replace crud action button classes if they used old btnIcon
  // Wait, EmployeeViewer already has premium-btn-icon on extra buttons
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    count++;
    console.log('Updated', filePath);
  }
});

console.log(`Updated ${count} files.`);
