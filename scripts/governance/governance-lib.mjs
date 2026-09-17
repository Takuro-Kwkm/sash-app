import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

export function currentExactHead() {
  return process.env.HEAD_SHA || process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']);
}

export function currentBranch() {
  return process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git(['branch', '--show-current'], { allowFailure: true }) || null;
}

export function sha256File(path) {
  if (!path || !existsSync(path)) return null;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function regexEscape(value) {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

export function globToRegExp(pattern) {
  let out = '^';
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') {
      out += '.*';
      i += 1;
    } else if (ch === '*') {
      out += '[^/]*';
    } else {
      out += regexEscape(ch);
    }
  }
  out += '$';
  return new RegExp(out);
}

export function matchesAnyPath(path, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(path));
}

export function changedPathsBetween(base, head = 'HEAD') {
  if (!base) return [];
  const output = git(['diff', '--name-only', `${base}..${head}`], { allowFailure: true });
  return output ? output.split('\n').map((row) => row.trim()).filter(Boolean) : [];
}

export function relevantChangesSince(base, patterns, head = 'HEAD') {
  return changedPathsBetween(base, head).filter((path) => matchesAnyPath(path, patterns));
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      out._.push(token);
      continue;
    }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}
