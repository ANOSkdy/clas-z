import fs from 'node:fs';
import path from 'node:path';

function parse(src) {
  const obj = {};
  for (const line of src.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    obj[key] = value;
  }
  return obj;
}

export function config(options = {}) {
  const envPath = options.path || path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return { parsed: undefined, error: undefined };
  }
  try {
    const parsed = parse(fs.readFileSync(envPath, 'utf8'));
    for (const [key, val] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
    return { parsed };
  } catch (error) {
    return { error };
  }
}

export default { config };
