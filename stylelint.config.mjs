/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-standard',
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'theme', 'custom-variant'],
      },
    ],
    'hue-degree-notation': null,
    'import-notation': null,
    'keyframes-name-pattern': null,
    'lightness-notation': null,
    'no-duplicate-selectors': null,
    'rule-empty-line-before': null,
    'value-keyword-case': null,
  },
};
