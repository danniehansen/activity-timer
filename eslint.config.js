const js = require('@eslint/js');
const globals = require('globals');
const pluginVue = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const unusedImports = require('eslint-plugin-unused-imports');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

// Flat config (ESLint 9+). Kept as CommonJS on purpose: package.json has no
// "type": "module", and every plugin in this chain is CJS.
module.exports = [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'infrastructure/cdk.out/**',
      'infrastructure/node_modules/**',
      'src/types/trello.d.ts'
    ]
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.{js,cjs,mjs,ts,vue}'],
    languageOptions: {
      // v10 no longer ships environment globals in its shared configs.
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.amd
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'unused-imports': unusedImports
    },
    rules: {
      'vue/component-definition-name-casing': 'off',

      // not needed for vue 3
      'vue/no-multiple-template-root': 'off',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'vue/multi-word-component-names': 'off',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          // ESLint 9 flipped this default from 'none' to 'all'. Kept at
          // 'none' so the flat-config migration reports exactly what the
          // old .eslintrc.js did — unused `catch (e)` bindings are fine.
          caughtErrors: 'none'
        }
      ]
    }
  },

  // eslint-plugin-vue 10 binds vue-eslint-parser to **/*.vue only, so .ts
  // files need the TS parser wired up separately.
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser, sourceType: 'module' }
    }
  },

  prettierRecommended
];
