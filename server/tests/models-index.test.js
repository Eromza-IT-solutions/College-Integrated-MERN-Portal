import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import '../src/models/index.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'models');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== 'index.js');

describe('src/models/index.js', () => {
  test('registers every model file', async () => {
    const registered = new Set(mongoose.modelNames());
    const exported = [];
    for (const f of files) exported.push((await import(pathToFileURL(path.join(dir, f)).href)).default.modelName);
    expect(exported.filter((n) => !registered.has(n))).toEqual([]);
    const listed = fs.readFileSync(path.join(dir, 'index.js'), 'utf8');
    expect(files.filter((f) => !listed.includes(`import './${f}'`))).toEqual([]);
  });
  test('every model that is looked up by name while running is registered', () => {
    const wanted = new Set();
    for (const f of files) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of text.matchAll(/\.db\.model\('(\w+)'\)/g)) wanted.add(m[1]);
    }
    expect(wanted.size).toBeGreaterThan(5);
    expect([...wanted].filter((n) => !mongoose.modelNames().includes(n))).toEqual([]);
  });
});
