import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hooksDir = path.join(__dirname, 'src', 'hooks');

const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.js') || f.endsWith('.jsx'));

let modifiedCount = 0;

for (const file of files) {
  const filePath = path.join(hooksDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Inject Authorization header in fetch calls
  const targetHeaderStr = `headers: { 'Content-Type': 'application/json' }`;
  const replacementHeaderStr = `headers: { 
      'Content-Type': 'application/json',
      ...(localStorage.getItem('sernic_jwt_token') ? { 'Authorization': 'Bearer ' + localStorage.getItem('sernic_jwt_token') } : {})
    }`;

  if (content.includes(targetHeaderStr)) {
    content = content.replace(new RegExp(targetHeaderStr.replace(/[.*+?^$\/{}()|\[\]\\]/g, '\\$&'), 'g'), replacementHeaderStr);
    
    // Specifically for useAuthData.js to save the token on authenticate
    if (file === 'useAuthData.js') {
      const loginTarget = `const res = await api('POST', '/login', { username, password });`;
      const loginReplacement = `const res = await api('POST', '/login', { username, password });\n      if (res.token) localStorage.setItem('sernic_jwt_token', res.token);`;
      content = content.replace(loginTarget, loginReplacement);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`Updated ${file}`);
  }
}

// Update AuthContext.jsx logout to clear the token
const authContextPath = path.join(__dirname, 'src', 'contexts', 'AuthContext.jsx');
if (fs.existsSync(authContextPath)) {
  let ctxContent = fs.readFileSync(authContextPath, 'utf8');
  if (ctxContent.includes(`localStorage.removeItem('sernic_logged_user');`) && !ctxContent.includes(`sernic_jwt_token`)) {
    ctxContent = ctxContent.replace(
      `localStorage.removeItem('sernic_logged_user');`,
      `localStorage.removeItem('sernic_logged_user');\n    localStorage.removeItem('sernic_jwt_token');`
    );
    fs.writeFileSync(authContextPath, ctxContent, 'utf8');
    console.log(`Updated AuthContext.jsx`);
  }
}

console.log(`Done. Modified ${modifiedCount} hook files.`);
