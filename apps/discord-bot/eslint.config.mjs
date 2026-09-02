import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  ...compat.config({
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    env: {
      es2022: true,
      node: true,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@otr/core',
              message:
                'Import a subpath such as @otr/core/osu; the index pulls in the database schema.',
            },
          ],
          patterns: [
            {
              regex:
                '^@/(?!lib/enum-helpers$|lib/utils/tierData$|lib/utils/mods$)',
              allowTypeImports: true,
              message:
                'Only @/lib/enum-helpers, @/lib/utils/tierData, and @/lib/utils/mods run in the bot; import other web modules as types.',
            },
          ],
        },
      ],
    },
    overrides: [
      {
        files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
        env: {
          jest: true,
        },
      },
    ],
  }),
];

export default eslintConfig;
