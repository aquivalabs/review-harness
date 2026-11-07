import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashDiff, resolveBase, stripReviewPaths } from './diffHash';

describe('stripReviewPaths', () => {
  it('drops diff sections for files under .review/', () => {
    const diff = [
      'diff --git a/src/app.ts b/src/app.ts',
      '+const value = 1;',
      'diff --git a/.review/attestation.json b/.review/attestation.json',
      '+{"overall":"PASS"}',
    ].join('\n');
    const stripped = stripReviewPaths(diff);
    expect(stripped).toContain('src/app.ts');
    expect(stripped).not.toContain('.review/attestation.json');
  });
});

describe('hashDiff', () => {
  it('is stable and ignores .review/ changes', () => {
    const base = 'diff --git a/src/app.ts b/src/app.ts\n+const value = 1;\n';
    const withReview = `${base}diff --git a/.review/attestation.json b/.review/attestation.json\n+{}\n`;
    expect(hashDiff(base)).toBe(hashDiff(withReview));
  });
});

// A clone of a bare remote whose default branch is main, with a feature branch pushed with -u.
const cloneWithBranch = (): { dir: string; git: (...args: string[]) => string } => {
  const root = mkdtempSync(join(tmpdir(), 'harness-base-'));
  const run = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  run(root, 'init', '-q', '--bare', '-b', 'main', 'remote.git');
  run(root, 'clone', '-q', join(root, 'remote.git'), 'work');
  const dir = join(root, 'work');
  const git = (...args: string[]) => run(dir, '-c', 'user.name=Demo', '-c', 'user.email=d@example.com', ...args);
  git('commit', '-q', '--allow-empty', '-m', 'base');
  git('push', '-q', 'origin', 'main');
  git('remote', 'set-head', 'origin', 'main');
  git('switch', '-q', '-c', 'feature');
  git('commit', '-q', '--allow-empty', '-m', 'work');
  git('push', '-q', '-u', 'origin', 'feature');
  return { dir, git };
};

describe('resolveBase', () => {
  it('ignores an upstream that is the branch\'s own remote copy and takes the default branch', () => {
    const { dir } = cloneWithBranch();
    expect(resolveBase(dir)).toBe('origin/main');
  });

  it('keeps an upstream that is another branch, as a stacked branch tracks its parent', () => {
    const { dir, git } = cloneWithBranch();
    git('switch', '-q', '-c', 'stacked', '--track', 'origin/feature');
    expect(resolveBase(dir)).toBe('origin/feature');
  });

  it('falls back to the default branch with no upstream at all', () => {
    const { dir, git } = cloneWithBranch();
    git('switch', '-q', '-c', 'local-only');
    expect(resolveBase(dir)).toBe('origin/main');
  });
});
