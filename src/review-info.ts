#!/usr/bin/env node
// Prints the orchestration inputs the /review command needs as one JSON blob, so it can drive the
// gate without any vendored scripts: the resolved base ref, the current diff hash (base..HEAD, for
// the step-0 attestation short-circuit), and the merged review config (agents/zones/thresholds).
import { resolveBase, computeReviewHash } from './diffHash';
import { loadConfig } from './config';

process.stdout.write(
  JSON.stringify({
    base: resolveBase(),
    hash: computeReviewHash(),
    config: loadConfig(),
  }),
);
