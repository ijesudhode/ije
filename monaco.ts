
export function setupIJeLanguage(monaco: any) {
    if (!monaco.languages.getLanguages().some((l: any) => l.id === 'ije')) {
        monaco.languages.register({ id: 'ije' });

        monaco.languages.setMonarchTokensProvider('ije', {
            defaultToken: '',
            tokenPostfix: '.ije',

            keywords: [
                'ao', 'da', 'tha', 'maichai', 'wonn', 'job', 'kian',
                'ui', 'term', 'sann', 'si', 'klea'
            ],

            operators: [
                '=', '>', '<', '==', '+', '-', '*', '/', '.', ','
            ],

            symbols: /[=><!~?:&|+\-*\/\^%]+/,

            tokenizer: {
                root: [
                    // Identifiers and keywords
                    [/[a-zA-Z_][\w]*/, {
                        cases: {
                            '@keywords': 'keyword',
                            '@default': 'identifier'
                        }
                    }],

                    // Whitespace
                    { include: '@whitespace' },

                    // Strings
                    [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
                    [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

                    // Numbers
                    [/\d+/, 'number'],

                    // Delimiters and operators
                    [/[{}()\[\]]/, '@brackets'],
                    [/[<>](?!@symbols)/, '@brackets'],
                    [/@symbols/, {
                        cases: {
                            '@operators': 'operator',
                            '@default': ''
                        }
                    }],
                ],

                string: [
                    [/[^\\"]+/, 'string'],
                    [/\\./, 'string.escape.invalid'],
                    [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
                ],

                whitespace: [
                    [/[ \t\r\n]+/, 'white'],
                    [/\/\/.*$/, 'comment'], // Simple comments
                ],
            },
        });

        monaco.languages.setLanguageConfiguration('ije', {
            comments: {
                lineComment: '//',
            },
            brackets: [
                ['(', ')'],
                ['"', '"'],
            ],
            autoClosingPairs: [
                { open: '(', close: ')' },
                { open: '"', close: '"', notIn: ['string'] },
            ],
            surroundingPairs: [
                { open: '(', close: ')' },
                { open: '"', close: '"' },
            ],
        });
    }
}
