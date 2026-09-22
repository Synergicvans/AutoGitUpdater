import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomInt } from 'node:crypto';
import { runInNewContext } from 'node:vm';

export function indiaDay(now = new Date()) {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

export function generate(slot, root = process.cwd(), day = indiaDay()) {
  if (![1, 2, 3].includes(slot)) throw new Error('Slot must be 1, 2 or 3.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid day.');
  const folder = join(root, 'Project_github1');
  const file = join(folder, `example-${slot}.js`);
  if (existsSync(file)) {
    const previous = readFileSync(file, 'utf8').match(/^\/\/ AutoGitUpdater day: (\d{4}-\d{2}-\d{2})$/m)?.[1];
    if (!previous) throw new Error(`Refusing to overwrite unrecognized file: ${file}`);
    if (previous > day) throw new Error('Future progress detected; refusing to backdate.');
    if (previous === day) return false;
  }
  const multiplier = randomInt(1, 100);
  const offset = randomInt(1, 100);
  const code = `// AutoGitUpdater day: ${day}\n// Generated arithmetic example ${slot}/3; this is an automated change.\nfunction transform(value) {\n  return value * ${multiplier} + ${offset};\n}\nif (transform(2) !== ${2 * multiplier + offset}) throw new Error('Example check failed');\n`;
  runInNewContext(code, Object.create(null), { timeout: 1000 });
  mkdirSync(folder, { recursive: true });
  writeFileSync(file, code);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(generate(Number(process.argv[2])) ? 'Generated and validated example.' : 'Already completed today; no change.');
}
