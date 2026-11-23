import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises';

const previa = process.argv.includes('--previa');
const raiz = new URL('./', import.meta.url);
const destino = new URL('dist/', raiz);
const arquivos = [
  'index.html', 'CBC-CORRIGIDO-LOGO.html', 'cbc-firebase.mjs',
  'cbc-manifest.json', 'cbc-sw.js', 'cbc-logo.png', 'cbc-192.png', 'cbc-512.png'
];
if (!previa) {
  const config = JSON.parse(await readFile(new URL('firebase-web.json', raiz), 'utf8'));
  const campos = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId', 'databaseURL'];
  if (config.projectId !== 'candeias-bike-clube' ||
      !config.apiKey || !config.authDomain || !config.appId ||
      Object.keys(config).some(campo => !campos.includes(campo) || typeof config[campo] !== 'string')) {
    throw new Error('Use o objeto original de configuração do app web candeias-bike-clube.');
  }
  arquivos.push('firebase-web.json');
}
await mkdir(destino, { recursive: true });
if (previa) await rm(new URL('firebase-web.json', destino), { force: true });
const entradas = await readdir(destino, { withFileTypes: true });
if (entradas.some(entrada => !entrada.isFile() || !arquivos.includes(entrada.name))) {
  throw new Error('A pasta dist contém arquivos fora da lista de publicação.');
}
await Promise.all(arquivos.map(arquivo => copyFile(new URL(arquivo, raiz), new URL(arquivo, destino))));
