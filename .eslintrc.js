module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'plugin:vue/essential',
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 13,
    parser: '@typescript-eslint/parser',
    sourceType: 'module'
  },
  plugins: [
    'vue',
    '@typescript-eslint',
    'editorconfig'
  ],
  rules: {
    semi: [2, 'always'],
    indent: ['error', 2],
    'editorconfig/charset': 'error',
    'editorconfig/eol-last': 'error',
    'editorconfig/indent': 'error',
    'editorconfig/linebreak-style': 'error',
    'editorconfig/no-trailing-spaces': 'error',
    'no-unused-vars': 'off',
    'no-use-before-define': 'off',
    'vue/no-multiple-template-root': 'off'
  }
};
