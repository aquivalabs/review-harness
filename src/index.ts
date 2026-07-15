// Public programmatic API of the review harness. The primary interface is the two bins
// (`review-gate`, `review-attest`); these exports are for tests and tooling that embed the harness.
export * from './attestation';
export * from './config';
export * from './diffHash';
export * from './docPairing';
export * from './secretScan';
export { evaluateGate, runGate, type GateInput, type GateResult } from './gate';
export { deriveOverall } from './writeAttestation';
