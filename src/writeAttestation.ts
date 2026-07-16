import { computeReviewHash } from './diffHash';
import { writeAttestation, type Attestation, type AgentResult, type Verdict } from './attestation';

/** All agents must PASS for the set to pass. An empty set is FAIL (nothing was reviewed). */
export const deriveOverall = (perAgent: Record<string, AgentResult>): Verdict => {
  const results = Object.values(perAgent);
  return results.length > 0 && results.every((result) => result.verdict === 'PASS') ? 'PASS' : 'FAIL';
};

/** Reduce the per-agent input (scores + verdicts) to verdict-only, dropping the non-deterministic
 * numeric scores so the committed attestation is a pure function of the diff. */
export const toVerdicts = (perAgent: Record<string, AgentResult>): Record<string, Verdict> => {
  const agents: Record<string, Verdict> = {};
  for (const [name, result] of Object.entries(perAgent)) {
    agents[name] = result.verdict;
  }
  return agents;
};

/** CLI entry (the `review-attest` bin): reads per-agent results as JSON from argv[2], stamps the
 * current diff hash, writes the content-addressed attestation (pruning stale siblings). */
export const cli = (): void => {
  const perAgent = JSON.parse(process.argv[2] ?? '{}') as Record<string, AgentResult>;
  const diffHash = computeReviewHash();
  const attestation: Attestation = {
    diffHash,
    overall: deriveOverall(perAgent),
    agents: toVerdicts(perAgent),
  };
  writeAttestation(attestation);
  console.log(`Wrote attestation: ${attestation.overall} (${diffHash.slice(0, 12)})`);
};
