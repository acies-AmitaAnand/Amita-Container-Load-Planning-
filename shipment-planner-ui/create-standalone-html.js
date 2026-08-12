import fs from 'fs';
import path from 'path';

const distDir = path.resolve('c:/Users/Amita Anand/solutions-inventory-optimization/shipment-planner-ui/dist');
const assetsDir = path.join(distDir, 'assets');
const outputHtmlPath = path.resolve('c:/Users/Amita Anand/solutions-inventory-optimization/shipment-planner-dashboard.html');

console.log('Reading dist files...');
const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

if (!jsFile) {
  console.error('Could not find JS asset in dist/assets!');
  process.exit(1);
}

const cssContent = cssFile ? fs.readFileSync(path.join(assetsDir, cssFile), 'utf8') : '';
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

const standaloneHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shipment Planner & Freight Intelligence Dashboard</title>
    ${cssContent ? `<style>\n${cssContent}\n</style>` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script>
${jsContent}
    </script>
  </body>
</html>`;

fs.writeFileSync(outputHtmlPath, standaloneHtml, 'utf8');
console.log(`Successfully generated standalone HTML at:\n${outputHtmlPath}\nFile size: ${(fs.statSync(outputHtmlPath).size / 1024 / 1024).toFixed(2)} MB`);
