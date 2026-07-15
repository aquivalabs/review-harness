// Public programmatic API of the review harness. The primary interface is the two bins
// (`review-gate`, `review-attest`); these exports are for tests and tooling that embed the harness.
export * from './attestation';
export * from './config';
export * from './diffHash';
export * from './docPairing';
export * from './secretScan';
export { evaluateGate, runGate, type GateInput, type GateResult } from './gate';
export { deriveOverall } from './writeAttestation';

// CLI entrypoints, exported so a thin `scripts/review/*` facade in a consuming repo can delegate to
// the package (the `review-gate` / `review-attest` bins call these same functions).
export { cli as runGateCli } from './gate';
export { cli as runAttestCli } from './writeAttestation';
