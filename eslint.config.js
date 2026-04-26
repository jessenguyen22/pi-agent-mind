// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import perfectionist from 'eslint-plugin-perfectionist';
import unusedImports from 'eslint-plugin-unused-imports';
import jest from 'eslint-plugin-jest';
import globals from 'globals';

/**
 * pi-agent-mind ESLint Configuration
 *
 * TypeScript-aware, strict, and opinionated.
 * Based on typescript-eslint-recommended + perfectionist + strict extras.
 */
export default tseslint.config(
  // ── Base ──────────────────────────────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript ─────────────────────────────────────────────────────────
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ── Project override ──────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      // TypeScript-specific
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false } },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Formatting handled by Prettier — disable ESLint formatting rules
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      'comma-dangle': 'off',
      'object-curly-spacing': 'off',
      'array-bracket-spacing': 'off',
      'max-len': 'off',
    },
  },

  // ── Test files ────────────────────────────────────────────────────────
  {
    files: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    plugins: {
      jest,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.vitest,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/valid-expect': 'error',
      'jest/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'assert', 'should'] },
      ],
    },
  },

  // ── Example files ──────────────────────────────────────────────────────
  {
    files: ['examples/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
    },
  },

  // ── Config files (relaxed) ────────────────────────────────────────────
  {
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },

  // ── Ignore patterns ───────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.git/**',
      '*.min.js',
      '**/*.min.js',
      '**/vendor/**',
      'examples/dist/**',
    ],
  }
);
