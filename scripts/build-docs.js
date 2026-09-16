import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');

if (!fs.existsSync(distDir)) {
  console.error('Directory "dist" non trovata. Esegui prima "vite build".');
  process.exit(1);
}

// Rimuovi docs esistente se presente
if (fs.existsSync(docsDir)) {
  fs.rmSync(docsDir, { recursive: true, force: true });
}

// Copia dist in docs
fs.cpSync(distDir, docsDir, { recursive: true });

// Copia index.html come 404.html per il routing SPA di GitHub Pages
const indexPath = path.join(docsDir, 'index.html');
const notFoundPath = path.join(docsDir, '404.html');
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
}

// Crea il file .nojekyll necessario per GitHub Pages
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');

console.log('Cartella "docs" generata con successo per GitHub Pages!');
