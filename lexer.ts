
import { type Token, TokenType } from './tokens';

// ============================================
// IJe Lexer - Tokenizes source code
// ============================================

const KEYWORDS: Record<string, TokenType> = {
    // Original keywords
    'ao': TokenType.AO,
    'da': TokenType.DA,
    'tha': TokenType.THA,
    'maichai': TokenType.MAICHAI,
    'wonn': TokenType.WONN,
    'job': TokenType.JOB,
    'kian': TokenType.KIAN,

    // New keywords
    'kuun': TokenType.KUUN,
    'nam': TokenType.NAM,
    'song': TokenType.SONG,
    'klum': TokenType.KLUM,
    'mai': TokenType.MAI,
    'ni': TokenType.NI,
    'long': TokenType.LONG,
    'jab': TokenType.JAB,
    'wonntak': TokenType.WONNTAK,
    'tueng': TokenType.TUENG,
    'ror': TokenType.ROR,
    'prom': TokenType.PROM,
    'cheek': TokenType.CHEEK,
    'karani': TokenType.KARANI,
    'machangnan': TokenType.MACHANGNAN,
    'yut': TokenType.YUT,
    'toor': TokenType.TOOR,

    // Literals
    'jing': TokenType.TRUE,
    'true': TokenType.TRUE,
    'tej': TokenType.FALSE,
    'false': TokenType.FALSE,
    'wang': TokenType.NULL,
    'null': TokenType.NULL,

    // Type annotations
    'lek': TokenType.TYPE_LEK,
    'kum': TokenType.TYPE_KUM,
    'bool': TokenType.TYPE_BOOL,
    'list': TokenType.TYPE_LIST,
    'kong': TokenType.TYPE_KONG,
    'any': TokenType.TYPE_ANY,
};

export class Lexer {
    private source: string;
    private tokens: Token[] = [];
    private start: number = 0;
    private current: number = 0;
    private line: number = 1;
    private column: number = 1;

    private keywords: Record<string, TokenType> = KEYWORDS;

    constructor(source: string, customKeywords?: Record<string, TokenType>) {
        this.source = source;
        if (customKeywords) {
            this.keywords = { ...KEYWORDS, ...customKeywords };
        }
    }

    tokenize(): Token[] {
        while (!this.isAtEnd()) {
            this.start = this.current;
            this.scanToken();
        }

        this.tokens.push(this.makeToken(TokenType.EOF, ''));
        return this.tokens;
    }

    private scanToken(): void {
        const char = this.advance();

        switch (char) {
            // Single-character tokens
            case '(': this.addToken(TokenType.LPAREN); break;
            case ')': this.addToken(TokenType.RPAREN); break;
            case '[': this.addToken(TokenType.LBRACKET); break;
            case ']': this.addToken(TokenType.RBRACKET); break;
            case '{': this.addToken(TokenType.LBRACE); break;
            case '}': this.addToken(TokenType.RBRACE); break;
            case ',': this.addToken(TokenType.COMMA); break;
            case ':': this.addToken(TokenType.COLON); break;
            case ';': this.addToken(TokenType.SEMICOLON); break;
            case '?': this.addToken(TokenType.QUESTION); break;
            case '@': this.addToken(TokenType.AT); break;
            case '#': this.addToken(TokenType.HASH); break;
            case '~': this.addToken(TokenType.BIT_NOT); break;
            case '^': this.addToken(TokenType.BIT_XOR); break;
            case '%': this.addToken(TokenType.MODULO); break;

            // Dot or spread
            case '.':
                if (this.match('.') && this.match('.')) {
                    this.addToken(TokenType.SPREAD);
                } else {
                    this.addToken(TokenType.DOT);
                }
                break;

            // Plus operators
            case '+':
                if (this.match('+')) {
                    this.addToken(TokenType.INCREMENT);
                } else if (this.match('=')) {
                    this.addToken(TokenType.PLUS_ASSIGN);
                } else {
                    this.addToken(TokenType.PLUS);
                }
                break;

            // Minus operators
            case '-':
                if (this.match('-')) {
                    this.addToken(TokenType.DECREMENT);
                } else if (this.match('=')) {
                    this.addToken(TokenType.MINUS_ASSIGN);
                } else if (this.match('>')) {
                    this.addToken(TokenType.ARROW);
                } else {
                    this.addToken(TokenType.MINUS);
                }
                break;

            // Multiply operators
            case '*':
                if (this.match('*')) {
                    this.addToken(TokenType.POWER);
                } else if (this.match('=')) {
                    this.addToken(TokenType.MULT_ASSIGN);
                } else {
                    this.addToken(TokenType.MULTIPLY);
                }
                break;

            // Divide or comment
            case '/':
                if (this.match('/')) {
                    // Single-line comment
                    while (this.peek() !== '\n' && !this.isAtEnd()) {
                        this.advance();
                    }
                } else if (this.match('*')) {
                    // Multi-line comment
                    this.blockComment();
                } else if (this.match('=')) {
                    this.addToken(TokenType.DIV_ASSIGN);
                } else {
                    this.addToken(TokenType.DIVIDE);
                }
                break;

            // Greater than operators
            case '>':
                if (this.match('=')) {
                    this.addToken(TokenType.GTE);
                } else if (this.match('>')) {
                    this.addToken(TokenType.RSHIFT);
                } else {
                    this.addToken(TokenType.GT);
                }
                break;

            // Less than operators
            case '<':
                if (this.match('=')) {
                    this.addToken(TokenType.LTE);
                } else if (this.match('<')) {
                    this.addToken(TokenType.LSHIFT);
                } else {
                    this.addToken(TokenType.LT);
                }
                break;

            // Equals operators
            case '=':
                if (this.match('=')) {
                    this.addToken(TokenType.EQ);
                } else if (this.match('>')) {
                    this.addToken(TokenType.FAT_ARROW);
                } else {
                    this.addToken(TokenType.ASSIGN);
                }
                break;

            // Not equals
            case '!':
                if (this.match('=')) {
                    this.addToken(TokenType.NEQ);
                } else {
                    this.addToken(TokenType.NOT);
                }
                break;

            // And operators
            case '&':
                if (this.match('&')) {
                    this.addToken(TokenType.AND);
                } else {
                    this.addToken(TokenType.BIT_AND);
                }
                break;

            // Or operators
            case '|':
                if (this.match('|')) {
                    this.addToken(TokenType.OR);
                } else {
                    this.addToken(TokenType.BIT_OR);
                }
                break;

            // Whitespace
            case ' ':
            case '\r':
            case '\t':
                // Ignore whitespace
                break;

            case '\n':
                this.line++;
                this.column = 1;
                break;

            // String literals
            case '"': this.string('"'); break;
            case "'": this.string("'"); break;
            case '`': this.templateString(); break;

            default:
                if (this.isDigit(char)) {
                    this.number();
                } else if (this.isAlpha(char)) {
                    this.identifier();
                } else {
                    this.error(`Unexpected character: ${char}`);
                }
                break;
        }
    }

    // ============================================
    // Token Scanners
    // ============================================

    private string(quote: string): void {
        let value = '';

        while (this.peek() !== quote && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                this.line++;
                this.column = 1;
            }

            // Handle escape sequences
            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case 'r': value += '\r'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    case "'": value += "'"; break;
                    default: value += escaped;
                }
            } else {
                value += this.advance();
            }
        }

        if (this.isAtEnd()) {
            this.error('Unterminated string');
            return;
        }

        // Closing quote
        this.advance();
        this.tokens.push(this.makeToken(TokenType.STRING, value));
    }

    private templateString(): void {
        // For now, treat template strings like regular strings
        // Future: Add interpolation support
        let value = '';

        while (this.peek() !== '`' && !this.isAtEnd()) {
            if (this.peek() === '\n') {
                this.line++;
                this.column = 1;
            }
            value += this.advance();
        }

        if (this.isAtEnd()) {
            this.error('Unterminated template string');
            return;
        }

        this.advance(); // Closing backtick
        this.tokens.push(this.makeToken(TokenType.STRING, value));
    }

    private number(): void {
        // Integer part
        while (this.isDigit(this.peek())) {
            this.advance();
        }

        // Decimal part
        if (this.peek() === '.' && this.isDigit(this.peekNext())) {
            this.advance(); // Consume '.'
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }

        // Exponent part (scientific notation)
        if (this.peek() === 'e' || this.peek() === 'E') {
            this.advance();
            if (this.peek() === '+' || this.peek() === '-') {
                this.advance();
            }
            while (this.isDigit(this.peek())) {
                this.advance();
            }
        }

        const value = this.source.substring(this.start, this.current);
        this.tokens.push(this.makeToken(TokenType.NUMBER, value));
    }

    private identifier(): void {
        while (this.isAlphaNumeric(this.peek())) {
            this.advance();
        }

        const text = this.source.substring(this.start, this.current);
        const type = this.keywords[text] || TokenType.IDENTIFIER;
        this.tokens.push(this.makeToken(type, text));
    }

    private blockComment(): void {
        let depth = 1;

        while (depth > 0 && !this.isAtEnd()) {
            if (this.peek() === '/' && this.peekNext() === '*') {
                this.advance();
                this.advance();
                depth++;
            } else if (this.peek() === '*' && this.peekNext() === '/') {
                this.advance();
                this.advance();
                depth--;
            } else {
                if (this.peek() === '\n') {
                    this.line++;
                    this.column = 1;
                }
                this.advance();
            }
        }

        if (depth > 0) {
            this.error('Unterminated block comment');
        }
    }

    // ============================================
    // Helper Methods
    // ============================================

    private isAtEnd(): boolean {
        return this.current >= this.source.length;
    }

    private advance(): string {
        this.column++;
        return this.source[this.current++];
    }

    private peek(): string {
        if (this.isAtEnd()) return '\0';
        return this.source[this.current];
    }

    private peekNext(): string {
        if (this.current + 1 >= this.source.length) return '\0';
        return this.source[this.current + 1];
    }

    private match(expected: string): boolean {
        if (this.isAtEnd()) return false;
        if (this.source[this.current] !== expected) return false;
        this.current++;
        this.column++;
        return true;
    }

    private addToken(type: TokenType): void {
        const text = this.source.substring(this.start, this.current);
        this.tokens.push(this.makeToken(type, text));
    }

    private makeToken(type: TokenType, value: string): Token {
        return {
            type,
            value,
            line: this.line,
            column: this.column - value.length
        };
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isAlpha(char: string): boolean {
        return (char >= 'a' && char <= 'z') ||
            (char >= 'A' && char <= 'Z') ||
            char === '_' ||
            // Thai characters
            (char >= '\u0E00' && char <= '\u0E7F');
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private error(message: string): void {
        console.error(`[Line ${this.line}, Col ${this.column}] Lexer Error: ${message}`);
    }
}

