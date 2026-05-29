import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // eslint-config-next 16 bundles eslint-plugin-react-hooks v7, which enables
    // the new React Compiler ruleset. The rules below are deliberately kept off:
    // our usage of these patterns is safe and idiomatic, so enforcing them would
    // require widespread inline disables rather than improving the code. The
    // classic rules-of-hooks / exhaustive-deps checks remain active, and the
    // other React Compiler rules are enforced.
    rules: {
      // Off: required for SSR mount guards, client-only values (hydration), async loading flags, and focus management.
      'react-hooks/set-state-in-effect': 'off',
      // Off: idiomatic library usage reads refs during render (@tanstack/react-virtual scrollMargin, react-hook-form handleSubmit).
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/component-hook-factories': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/gating': 'off',
      'react-hooks/config': 'off',
      'react-hooks/unsupported-syntax': 'off',
    },
  },
];

export default eslintConfig;
