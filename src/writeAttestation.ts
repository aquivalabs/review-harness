import { computeReviewHash } from './diffHash';
import { writeAttestation, type Attestation, type AgentResult } from './attestation';

/** All agents must PASS for the set to pass. An empty set is FAIL (nothing was reviewed). */
export const deriveOverall = (perAgent: Record<string, AgentResult>): 'PASS' | 'FAIL' => {
  const results = Object.values(perAgent);
  return results.length > 0 && results.every((result) => result.verdict === 'PASS') ? 'PASS' : 'FAIL';
};

/** CLI entry (the `review-attest` bin): reads per-agent results as JSON from argv[2], stamps the
 * current diff hash + HEAD commitSha, writes `.review/attestation.json`. */
export const cli = (): void => {
  const perAgent = JSON.parse(process.argv[2] ?? '{}') as Record<string, AgentResult>;
  const attestation: Attestation = {
    diffHash: computeReviewHash(),
    perAgent,
    overall: deriveOverall(perAgent),
    timestamp: new Date().toISOString(),
  };
  writeAttestation(attestation);
  console.log(`Wrote attestation: ${attestation.overall} (${attestation.diffHash.slice(0, 12)})`);
};

