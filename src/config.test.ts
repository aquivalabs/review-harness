import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, DEFAULT_CONFIG } from './config';

const writeConfig = (obj: unknown): string => {
  const dir = mkdtempSync(join(tmpdir(), 'review-cfg-'));
  mkdirSync(join(dir, '.claude'), { recursive: true });
  writeFileSync(join(dir, '.claude/review.config.json'), JSON.stringify(obj));
  return dir;
};

describe('loadConfig', () => {
  it('returns defaults when no file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'review-none-'));
    expect(loadConfig(dir)).toEqual(DEFAULT_CONFIG);
  });

  it('default security threshold is 9', () => {
    const security = DEFAULT_CONFIG.agents.find((agent) => agent.name === 'security');
    expect(security?.threshold).toBe(9);
  });

  it('merges a partial file over defaults', () => {
    const dir = writeConfig({ agents: [{ name: 'security', threshold: 10 }] });
    const cfg = loadConfig(dir);
    const security = cfg.agents.find((agent) => agent.name === 'security');
    expect(security?.threshold).toBe(10);
    expect(security?.enabled).toBe(true);
    expect(cfg.agents).toHaveLength(5);
  });

  it('the craft lens replaced conventions', () => {
    const names = DEFAULT_CONFIG.agents.map((agent) => agent.name);
    expect(names).toContain('craft');
    expect(names).not.toContain('conventions');
  });

  it('no agent carries a zones key, in the defaults or in a loaded config', () => {
    const dir = writeConfig({ agents: [{ name: 'craft', threshold: 8 }] });
    const carriesZones = (agents: unknown[]): boolean =>
      agents.some((agent) => 'zones' in (agent as Record<string, unknown>));
    expect(carriesZones(DEFAULT_CONFIG.agents)).toBe(false);
    expect(carriesZones(loadConfig(dir).agents)).toBe(false);
  });
});
