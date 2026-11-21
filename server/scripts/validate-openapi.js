import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const specPath = path.join(root, 'docs', 'openapi.yaml');
const doc = yaml.load(fs.readFileSync(specPath, 'utf8'));
const problems = [];
const refs = [];
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);

function resolve(node) {
  let current = node;
  const seen = new Set();
  while (current && typeof current.$ref === 'string') {
    if (seen.has(current.$ref) || !current.$ref.startsWith('#/')) return null;
    seen.add(current.$ref);
    let target = doc;
    for (const part of current.$ref.slice(2).split('/')) {
      target = target && target[part.replace(/~1/g, '/').replace(/~0/g, '~')];
    }
    current = target;
  }
  return current;
}

function walk(node, at) {
  if (Array.isArray(node)) {
    node.forEach((value, index) => walk(value, `${at}[${index}]`));
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (typeof node.$ref === 'string') refs.push({ ref: node.$ref, at });
  for (const [key, value] of Object.entries(node)) walk(value, `${at}.${key}`);
}

if (typeof doc.openapi !== 'string' || !doc.openapi.startsWith('3.')) problems.push('openapi must be a 3.x version string');
if (!doc.info || typeof doc.info.title !== 'string' || typeof doc.info.version !== 'string') problems.push('info.title and info.version are required');
if (!doc.paths || typeof doc.paths !== 'object' || Object.keys(doc.paths).length === 0) problems.push('paths must contain at least one path');

if (doc.paths && typeof doc.paths === 'object') {
  for (const [route, item] of Object.entries(doc.paths)) {
    if (!item || typeof item !== 'object') {
      problems.push(`${route} must be an object`);
      continue;
    }
    const pathParams = [...route.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    const sharedParams = Array.isArray(item.parameters) ? item.parameters : [];
    for (const [key, operation] of Object.entries(item)) {
      if (!methods.has(key)) continue;
      if (!operation || typeof operation !== 'object') {
        problems.push(`${key.toUpperCase()} ${route} must be an object`);
        continue;
      }
      if (!operation.responses || typeof operation.responses !== 'object' || Object.keys(operation.responses).length === 0) {
        problems.push(`${key.toUpperCase()} ${route} has no responses`);
      }
      for (const status of Object.keys(operation.responses || {})) {
        if (status !== 'default' && !/^[1-5]\d{2}$/.test(status)) problems.push(`${key.toUpperCase()} ${route} has invalid response status "${status}"`);
      }
      const declared = new Set([
        ...sharedParams,
        ...(Array.isArray(operation.parameters) ? operation.parameters : []),
      ].map(resolve).filter((p) => p && p.in === 'path' && typeof p.name === 'string').map((p) => p.name));
      for (const name of pathParams) {
        if (!declared.has(name)) problems.push(`${key.toUpperCase()} ${route} does not declare path parameter "${name}"`);
      }
    }
  }
}

walk(doc, '$');

for (const { ref, at } of refs) {
  if (!ref.startsWith('#/')) {
    problems.push(`${at}: only internal refs are supported (${ref})`);
    continue;
  }
  let target = doc;
  for (const part of ref.slice(2).split('/')) {
    target = target && target[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  if (target === undefined) problems.push(`${at}: unresolved ref ${ref}`);
}

if (!doc.components || !doc.components.securitySchemes || !doc.components.securitySchemes.cookieAuth) {
  problems.push('components.securitySchemes.cookieAuth is required');
}

if (problems.length) {
  console.error('OpenAPI validation failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`OpenAPI valid: ${Object.keys(doc.paths).length} paths, ${refs.length} refs`);
