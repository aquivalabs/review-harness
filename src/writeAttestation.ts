import { computeReviewHash, resolveBase, resolveHeadSha, trackedFilesAt } from './diffHash';
import {
  ATTESTATIONS_DIR,
  writeAttestation,
  type Attestation,
  type AgentResult,
  type Verdict,
} from './attestation';

/** All agents must PASS for the set to pass. An empty set is FAIL (nothing was reviewed). */
export const deriveOverall = (perAgent: Record<string, AgentResult>): Verdict => {
  const results = Object.values(perAgent);
  return results.length > 0 && results.every((result) => result.verdict === 'PASS') ? 'PASS' : 'FAIL';
};

/** CLI entry (the `review-attest` bin): reads per-agent results as JSON from argv[2], stamps the
 * current diff hash + HEAD commitSha, writes the content-addressed attestation, and prunes only the
 * branch's own stale siblings — the files the base ref tracks stay, so the branch never deletes an
 * attestation `main` holds (see `writeAttestation`). */
export const cli = (): void => {
  const perAgent = JSON.parse(process.argv[2] ?? '{}') as Record<string, AgentResult>;
  const commitSha = resolveHeadSha();
  const attestation: Attestation = {
    diffHash: computeReviewHash(),
    commitSha,
    perAgent,
    overall: deriveOverall(perAgent),
    timestamp: new Date().toISOString(),
  };
  writeAttestation(attestation, ATTESTATIONS_DIR, trackedFilesAt(resolveBase(), ATTESTATIONS_DIR));
  console.log(
    `Wrote attestation: ${attestation.overall} (${attestation.diffHash.slice(0, 12)} @ ${commitSha.slice(0, 12)})`,
  );
};
