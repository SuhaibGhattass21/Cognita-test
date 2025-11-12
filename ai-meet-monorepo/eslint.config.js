import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Safely extract plugin recommended rules (will be merged into final rules).
const tsRecommendedRules = (typescriptEslint && typescriptEslint.configs && typescriptEslint.configs.recommended && typescriptEslint.configs.recommended.rules) || {};

export default [
  // NOTE: When files aren't matched or are ignored, you may need to review
  // the files array in the third config object. This config uses a global
  // ignores setting but then permits linting on workspace files.
  {
    ignores: ['**/dist', '**/node_modules', '**/coverage', '**/.nx'],
  },
  ...fixupConfigRules(
    // Keep eslint:recommended via compat, and merge the plugin's recommended
    // rules into our final rules object below to avoid shareable-config
    // resolution problems on some environments.
    compat.extends('eslint:recommended'),
  ),
  {
    // files array to explicitly define which files ESLint should process
    files: ['**/*.{js,ts,tsx,jsx}', '!**/dist/**/*', '!**/node_modules/**/*'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',
      // Provide globals to prevent no-undef errors for Node/Jest globals
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        fail: 'readonly',
      },
      parserOptions: {
        project: ['tsconfig.base.json'],
      },
    },
    rules: {
      // Start with plugin recommended rules, then apply workspace overrides
      ...tsRecommendedRules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];