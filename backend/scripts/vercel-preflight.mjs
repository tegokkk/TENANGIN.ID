import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'production';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const issues = [];
if (config.outputDirectory !== 'frontend/dist')
  issues.push('Output Directory harus frontend/dist.');
if (!fs.existsSync(path.join(root, 'api/index.mjs'))) issues.push('Entrypoint API belum tersedia.');
if (packageJson.engines.node !== '24.x') issues.push('Node.js proyek harus 24.x.');
if (!fs.existsSync(path.join(root, 'frontend/dist/index.html')))
  issues.push('Jalankan npm run build terlebih dahulu.');
if (process.argv.includes('--env')) {
  try {
    const { loadVercelEnv } = await import('../src/config/vercel-env.js');
    loadVercelEnv();
  } catch (error) {
    issues.push(error.message);
  }
}
if (issues.length) {
  console.error(issues.map((issue) => `- ${issue}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Konfigurasi build, routing, dan entrypoint Vercel siap.');
  console.log(
    process.argv.includes('--env')
      ? 'Format environment tervalidasi; koneksi dan migrasi database tetap perlu diverifikasi operator.'
      : 'Untuk memeriksa environment operator: npm run vercel:check -- --env'
  );
}
