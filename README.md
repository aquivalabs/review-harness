# bladeforge-review-harness

Stack-agnostic pre-push **review gate** harness — the deterministic core behind the `/review`
framework. Ships two CLIs plus a small programmatic API. No runtime dependencies (Node builtins only).

## What it does

- **`review-gate`** — the pre-push gate. Resolves the base ref, hashes the cumulative diff
  (`base..HEAD`, excluding `.review/`), runs the deterministic secret scan, and verifies a passing
  `.review/attestation.json` matches the current diff. Exits non-zero (with a readable report) when
  the review has not passed for this exact change set. Wire it into `.husky/pre-push` and CI.
- **`review-attest`** — writes `.review/attestation.json` after an all-pass review, stamping the
  current `diffHash` and the `commitSha` (HEAD the review covered). Called by the `/review`
  orchestrator on PASS.

Both run relative to the current working directory, so they read the *consuming* repo's
`.claude/review.config.json` and git state.

## Install

```bash
npm i -D bladeforge-review-harness
```

`.husky/pre-push`:

```bash
npx review-gate
```

CI (secret scan only, base-independent):

```bash
npx review-gate --secrets-only --base origin/main
```

## Programmatic API

```ts
import { evaluateGate, computeReviewHash, scanForSecrets, loadConfig } from 'bladeforge-review-harness';
```

Exposes the config loader, diff-hashing, secret scan, doc-pairing, and the pure gate decision for
embedding in other tooling.
