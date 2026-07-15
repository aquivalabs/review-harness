import { defineConfig } from 'tsup';

// Bundle the library entry + the two CLI bins to plain ESM JS. esbuild resolves the extensionless
// relative imports, so the sources stay as-is. The bins keep their `#!/usr/bin/env node` shebang.
export default defineConfig({
  entry: ['src/index.ts', 'src/review-gate.ts', 'src/review-attest.ts', 'src/review-info.ts'],
  format: ['esm'],
  target: 'node18',
  dts: { entry: 'src/index.ts' },
  clean: true,
  sourcemap: false,
});
