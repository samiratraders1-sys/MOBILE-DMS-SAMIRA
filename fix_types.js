const fs = require('fs');
const path = require('path');
const componentsDir = './src/components';
fs.readdirSync(componentsDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(componentsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/Promise<void>/g, 'Promise<any>');
    fs.writeFileSync(filePath, content);
  }
});
