import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  attestationPathFor,
  writeAttestation,
  readAttestationFor,
  listAttestedHashes,
  isAttestationValid,
  type Attestation,
} from './attestation';

const att = (diffHash: string, overall: Attestation['overall'] = 'PASS'): Attestation => ({
  diffHash,
  commitSha: 'sha123',
  perAgent: { conventions: { score: 10, verdict: 'PASS' } },
  overall,
  timestamp: '2026-01-01T00:00:00.000Z',
});

describe('attestationPathFor', () => {
  it('names the file by the diff hash under the given dir', () => {
    expect(attestationPathFor('abc', 'root')).toBe(join('root', 'abc.json'));
  });
});

describe('isAttestationValid', () => {
  it('is valid only when overall PASS and the hash matches', () => {
    expect(isAttestationValid(att('abc'), 'abc')).toBe(true);
    expect(isAttestationValid(att('abc'), 'xyz')).toBe(false);
    expect(isAttestationValid(att('abc', 'FAIL'), 'abc')).toBe(false);
    expect(isAttestationValid(null, 'abc')).toBe(false);
  });
});

describe('content-addressed store', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'attest-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes at the hash path and reads it back', () => {
    writeAttestation(att('hash1'), dir);
    expect(readAttestationFor('hash1', dir)).toEqual(att('hash1'));
  });

  it("prunes the branch's own earlier attestation on write", () => {
    writeAttestation(att('hash1'), dir);
    writeAttestation(att('hash2'), dir);
    expect(readdirSync(dir)).toEqual(['hash2.json']);
    expect(readAttestationFor('hash1', dir)).toBeNull();
    expect(readAttestationFor('hash2', dir)).toEqual(att('hash2'));
  });

  it('keeps every attestation the base tracks, so a branch never deletes one that main holds', () => {
    // Setup: `hash1` is main's (the base tracks it); `hash2` is the branch's own earlier round.
    writeAttestation(att('hash1'), dir);
    writeAttestation(att('hash2'), dir, ['hash1.json']);
    // Exercise: a new round on the branch, with main's file protected.
    writeAttestation(att('hash3'), dir, ['hash1.json']);
    // Verify: main's survives, the branch's own stale round is gone, the new one is there.
    expect(readdirSync(dir).sort()).toEqual(['hash1.json', 'hash3.json']);
    expect(readAttestationFor('hash2', dir)).toBeNull();
  });

  it('never deletes the file it is writing, even when protect names it too', () => {
    writeAttestation(att('hash1'), dir, ['hash1.json']);
    expect(readAttestationFor('hash1', dir)).toEqual(att('hash1'));
  });

  it('lists the hashes currently on file', () => {
    writeAttestation(att('hash2'), dir);
    expect(listAttestedHashes(dir)).toEqual(['hash2']);
  });

  it('falls back to the legacy single-slot file when the hash file is absent', () => {
    const legacy = join(dir, 'legacy.json');
    writeFileSync(legacy, JSON.stringify({ diffHash: 'old', overall: 'PASS', perAgent: {}, timestamp: 't' }));
    const found = readAttestationFor('old', join(dir, 'missing'), legacy);
    expect(found?.diffHash).toBe('old');
    expect(isAttestationValid(found, 'old')).toBe(true);
  });

  it('prefers the content-addressed file over the legacy fallback', () => {
    mkdirSync(join(dir, 'store'), { recursive: true });
    writeAttestation(att('hash1'), join(dir, 'store'));
    const legacy = join(dir, 'legacy.json');
    writeFileSync(legacy, JSON.stringify({ diffHash: 'hash1', overall: 'FAIL', perAgent: {}, timestamp: 't' }));
    expect(readAttestationFor('hash1', join(dir, 'store'), legacy)?.overall).toBe('PASS');
  });
});
