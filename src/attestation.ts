import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export type Verdict = 'PASS' | 'FAIL';

export interface AgentResult {
  score: number;
  verdict: Verdict;
}

/**
 * The committed attestation is a pure function of the diff: NO per-run fields (timestamp,
 * commitSha, numeric scores). The same reviewed diff therefore produces byte-identical content on
 * any branch, so the content-addressed files never collide on a merge — two branches either add
 * files with different names (different diffs) or add the identical file (same diff).
 */
export interface Attestation {
  diffHash: string;
  overall: Verdict;
  /** Per-agent verdicts (verdict-only, so the content stays deterministic). An agent absent here
   * was not dispatched (no changed file in its zone). */
  agents: Record<string, Verdict>;
}

/** Content-addressed store: one file per reviewed diff, named by its hash. */
export const ATTESTATIONS_DIR = '.review/attestations';
/** Legacy single-slot path (pre content-addressed). Read as a fallback during migration only. */
export const LEGACY_ATTESTATION_PATH = '.review/attestation.json';

export const attestationPathFor = (diffHash: string, dir: string = ATTESTATIONS_DIR): string =>
  join(dir, `${diffHash}.json`);

/**
 * Write the attestation at its content-addressed path AND delete every sibling. On any branch only
 * the current diff's attestation survives, so the directory self-prunes to one file per branch tip;
 * a merge transiently holds one file per merged branch and the next review collapses it back to one.
 */
export const writeAttestation = (attestation: Attestation, dir: string = ATTESTATIONS_DIR): void => {
  mkdirSync(dir, { recursive: true });
  const keep = `${attestation.diffHash}.json`;
  for (const entry of readdirSync(dir)) {
    if (entry !== keep) {
      rmSync(join(dir, entry), { recursive: true, force: true });
    }
  }
  writeFileSync(join(dir, keep), `${JSON.stringify(attestation, null, 2)}\n`);
};

const parse = (path: string): Attestation | null => {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Attestation;
  } catch {
    return null;
  }
};

/**
 * Read the attestation for a specific diff hash. Falls back to the legacy single-slot file so a
 * repo mid-migration (old committed `.review/attestation.json`, new gate) still validates until its
 * next review rewrites the store. Validity (hash match) is enforced separately by isAttestationValid.
 */
export const readAttestationFor = (
  diffHash: string,
  dir: string = ATTESTATIONS_DIR,
  legacyPath: string = LEGACY_ATTESTATION_PATH,
): Attestation | null => {
  return parse(attestationPathFor(diffHash, dir)) ?? parse(legacyPath);
};

/** Diff hashes that currently have an attestation on file (basenames without `.json`). */
export const listAttestedHashes = (dir: string = ATTESTATIONS_DIR): string[] => {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => entry.slice(0, -'.json'.length));
};

/** A push is allowed only if the attestation passed AND was produced for this exact diff. */
export const isAttestationValid = (attestation: Attestation | null, currentHash: string): boolean => {
  if (!attestation) {
    return false;
  }
  return attestation.overall === 'PASS' && attestation.diffHash === currentHash;
};
