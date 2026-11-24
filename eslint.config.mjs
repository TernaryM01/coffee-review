import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import convexPlugin from '@convex-dev/eslint-plugin'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...convexPlugin.configs.recommended,
  {
    rules: {
      // Images come from Convex storage URLs, which next/image would need configured per deployment.
      '@next/next/no-img-element': 'off',
      // Apostrophes in JSX text are fine in React; escaping them is noise.
      'react/no-unescaped-entities': 'off',
      // `const { dropped, ...rest } = obj` is the idiomatic way to omit a key.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    },
  },
  {
    // Raw DevTools-protocol messages are untyped JSON.
    files: ['scripts/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  globalIgnores(['.next/**', 'convex/_generated/**', 'next-env.d.ts', '.agents/**', '.claude/**']),
])
