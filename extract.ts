import fs from 'fs';

const html = fs.readFileSync('github_index.html', 'utf-8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (scriptMatch) {
  fs.writeFileSync('extracted_app.jsx', scriptMatch[1]);
  console.log('Extracted React code to extracted_app.jsx');
} else {
  console.log('Could not find Babel script tag');
}
