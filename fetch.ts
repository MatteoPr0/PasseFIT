import fs from 'fs';
import https from 'https';

https.get('https://raw.githubusercontent.com/MatteoPr0/Repcount/main/index.html', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    fs.writeFileSync('github_index.html', data);
    console.log('Downloaded index.html');
  });
});
