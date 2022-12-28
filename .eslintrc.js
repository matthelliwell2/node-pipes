module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: { project: ['./tsconfig.json'] },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:sonarjs/recommended',
        'prettier'
    ],
    rules: {
        eqeqeq: 1,
        '@typescript-eslint/ban-tslint-comment': 2,
        '@typescript-eslint/consistent-indexed-object-style': 1,
        '@typescript-eslint/explicit-function-return-type': 2,
        '@typescript-eslint/member-ordering': 0,
        camelcase: 'off',
        '@typescript-eslint/naming-convention': [
            'warn',
            {
                selector: 'default',
                format: ['camelCase']
            },
            {
                selector: 'variable',
                format: ['camelCase', 'UPPER_CASE']
            },
            {
                selector: 'parameter',
                format: ['camelCase', 'PascalCase'],
                leadingUnderscore: 'allow'
            },
            {
                selector: 'objectLiteralProperty',
                format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
                leadingUnderscore: 'allow'
            },
            {
                selector: 'memberLike',
                modifiers: ['private'],
                format: ['camelCase'],
                leadingUnderscore: 'allow'
            },

            {
                selector: 'typeLike',
                format: ['PascalCase']
            },
            {
                selector: 'memberLike',
                format: ['PascalCase', 'camelCase']
            }
        ],
        '@typescript-eslint/no-confusing-non-null-assertion': 1,
        '@typescript-eslint/no-empty-function': 0,
        '@typescript-eslint/no-extraneous-class': 1,
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-require-imports': 1,
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 1,
        '@typescript-eslint/no-unnecessary-condition': 1,
        '@typescript-eslint/no-unsafe-argument': 2,
        '@typescript-eslint/prefer-for-of': 1,
        '@typescript-eslint/prefer-includes': 1,
        '@typescript-eslint/prefer-nullish-coalescing': 1,
        '@typescript-eslint/prefer-optional-chain': 1,
        '@typescript-eslint/prefer-readonly': 1,
        '@typescript-eslint/prefer-reduce-type-parameter': 1,
        '@typescript-eslint/prefer-ts-expect-error': 1,
        '@typescript-eslint/promise-function-async': 2,
        'require-await': 'off',
        '@typescript-eslint/require-await': 0,
        '@typescript-eslint/restrict-template-expressions': ['warn', { allowNumber: true, allowBoolean: true, allowAny: false, allowNullish: true }],
        '@typescript-eslint/strict-boolean-expressions': [
            'warn',
            {
                allowString: false,
                allowNumber: false,
                allowNullableObject: true,
                allowNullableBoolean: false,
                allowNullableString: false,
                allowNullableNumber: false,
                allowAny: false,
                allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false
            }
        ],
        '@typescript-eslint/switch-exhaustiveness-check': 1,

        'no-dupe-class-members': 'off',
        '@typescript-eslint/no-dupe-class-members': ['warn'],

        'no-loop-func': 'off',
        '@typescript-eslint/no-loop-func': ['warn'],

        'no-redeclare': 'off',
        '@typescript-eslint/no-redeclare': ['warn'],

        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': ['warn'],

        'no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-expressions': ['warn'],

        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error']
    }
}
