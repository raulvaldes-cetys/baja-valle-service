// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'src/generated/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      // Política de SQL Injection: solo consultas parametrizadas.
      // Para SQL crudo usar $queryRaw / $executeRaw con tagged template, nunca las variantes Unsafe.
      'no-restricted-properties': [
        'error',
        ...['$queryRawUnsafe', '$executeRawUnsafe'].map((property) => ({
          property,
          message:
            'Prohibido por la política de SQL Injection: usa $queryRaw`...` / $executeRaw`...` con parámetros.',
        })),
      ],
    },
  },
);
