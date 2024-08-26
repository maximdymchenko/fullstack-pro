module.exports = {
    '*.{js,jsx,ts,tsx,json,md}': ['prettier --write', 'git add'],
    // '*.{ts,tsx}': ['eslint --fix'], // this can be tested
    'package.json': ['sort-package-json', 'prettier --write'],
    '*/**/package.json': ['sort-package-json', 'prettier --write'],
    '**/**/*/package.json': ['sort-package-json', 'prettier --write'],
};
