module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 13,
  },
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    'consistent-return': 0,
    'import/no-unresolved': 0,
  },
};
