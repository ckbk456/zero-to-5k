const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['.local/**', '.expo/**', 'dist/**', 'coverage/**'] },
]);
