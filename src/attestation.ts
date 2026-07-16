import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export type Verdict = 'PASS' | 'FAIL';

export interface AgentResult {
  score: number;
  verdict: Verdict;
}

export interface Attestation {
  diffHash: string;
  /** HEAD SHA the review covered — the anchor for the next incremental review
   * (`git diff <commitSha>..HEAD` = what changed since). Optional for backward compatibility. */
  commitSha?: string;
  perAgent: Record<string, AgentResult>;
  overall: Verdict;
  timestamp: string;
}

/**
 * Content-addressed store: one file per reviewed diff, named by its hash. Different diffs land in
 * different files, so two branches never touch the same file on a merge — the store never conflicts.
 * The file CONTENT still carries commitSha/perAgent/timestamp (the incremental-review anchor and the
 * carry-forward verdicts need them); only the same-diff-on-two-branches edge could differ, and that
 * is rare and harmless.
 */
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
