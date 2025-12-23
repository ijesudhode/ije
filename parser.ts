
import { type Token, TokenType } from './tokens';
import * as AST from './ast';

// ============================================
// IJe Parser - Converts tokens to AST
// ============================================

export class Parser {
    private tokens: Token[];
    private current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    parse(): AST.Program {
        const statements: AST.Statement[] = [];
        while (!this.isAtEnd()) {
            if (this.match(TokenType.SEMICOLON)) continue;
            try {
                const stmt = this.declaration();
                if (stmt) statements.push(stmt);
            } catch (error) {
                // Sync to next statement on error
                this.synchronize();
            }
        }
        return { type: 'Program', body: statements };
    }

    // ============================================
    // DECLARATIONS
    // ============================================

    private declaration(): AST.Statement | null {
        // Import/Export
        if (this.match(TokenType.NAM)) return this.importStatement();
        if (this.match(TokenType.SONG)) return this.exportStatement();

        // Class
        if (this.match(TokenType.KLUM)) return this.classDeclaration();

        // Function (async or regular)
        if (this.check(TokenType.PROM) && this.checkNext(TokenType.KIAN)) {
            this.advance(); // consume 'prom'
            return this.functionDeclaration(true);
        }
        if (this.match(TokenType.KIAN)) return this.functionDeclaration(false);

        // Variable
        if (this.match(TokenType.AO)) return this.varDeclaration();

        return this.statement();
    }

    // ============================================
    // STATEMENTS
    // ============================================

    private statement(): AST.Statement {
        if (this.match(TokenType.DA)) return this.printStatement();
        if (this.match(TokenType.THA)) return this.ifStatement();
        if (this.match(TokenType.WONN)) return this.whileStatement();
        if (this.match(TokenType.WONNTAK)) return this.forStatement();
        if (this.match(TokenType.KUUN)) return this.returnStatement();
        if (this.match(TokenType.LONG)) return this.tryStatement();
        if (this.match(TokenType.CHEEK)) return this.switchStatement();
        if (this.match(TokenType.YUT)) return this.breakStatement();
        if (this.match(TokenType.TOOR)) return this.continueStatement();

        if (this.match(TokenType.JOB)) {
            // Stray 'job' - shouldn't happen with proper parsing
            return { type: 'ExprStmt', expression: { type: 'Literal', value: null } };
        }

        return this.expressionStatement();
    }

    // Import: nam "module.ije" ao { name1, name2 }
    private importStatement(): AST.ImportStmt {
        const source = this.consume(TokenType.STRING, "Expect module path after 'nam'.").value;

        const imports: AST.ImportSpecifier[] = [];

        if (this.match(TokenType.AO)) {
            if (this.match(TokenType.LBRACE)) {
                // Named imports: nam "module" ao { a, b, c }
                if (!this.check(TokenType.RBRACE)) {
                    do {
                        const name = this.consume(TokenType.IDENTIFIER, "Expect import name.").value;
                        let alias: string | undefined;
                        if (this.match(TokenType.AO)) {
                            alias = this.consume(TokenType.IDENTIFIER, "Expect alias after 'ao'.").value;
                        }
                        imports.push({ name, alias });
                    } while (this.match(TokenType.COMMA));
                }
                this.consume(TokenType.RBRACE, "Expect '}' after import list.");
            } else {
                // Default import: nam "module" ao MyModule
                const name = this.consume(TokenType.IDENTIFIER, "Expect module name.").value;
                imports.push({ name });
            }
        }

        return { type: 'ImportStmt', source, imports, line: this.previous().line };
    }

    // Export: song kian/ao/klum OR song name
    private exportStatement(): AST.ExportStmt {
        const line = this.previous().line;

        if (this.match(TokenType.KIAN)) {
            const decl = this.functionDeclaration(false);
            return { type: 'ExportStmt', declaration: decl, line };
        }
        if (this.match(TokenType.AO)) {
            const decl = this.varDeclaration();
            return { type: 'ExportStmt', declaration: decl, line };
        }
        if (this.match(TokenType.KLUM)) {
            const decl = this.classDeclaration();
            return { type: 'ExportStmt', declaration: decl, line };
        }

        // Export existing name
        const name = this.consume(TokenType.IDENTIFIER, "Expect name to export.").value;
        return { type: 'ExportStmt', name, line };
    }

    // Class: klum Name ... job
    private classDeclaration(): AST.ClassStmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect class name.").value;
        const line = this.previous().line;

        let superclass: string | undefined;
        // TODO: Add inheritance syntax if needed

        const properties: AST.ClassProperty[] = [];
        const methods: AST.FunctionStmt[] = [];
        let constructor: AST.FunctionStmt | undefined;

        while (!this.check(TokenType.JOB) && !this.isAtEnd()) {
            if (this.match(TokenType.AO)) {
                // Property
                const propName = this.consume(TokenType.IDENTIFIER, "Expect property name.").value;
                let value: AST.Expression | undefined;
                if (this.match(TokenType.ASSIGN)) {
                    value = this.expression();
                }
                properties.push({ name: propName, value });
            } else if (this.check(TokenType.PROM) && this.checkNext(TokenType.KIAN)) {
                // Async method
                this.advance();
                const method = this.functionDeclaration(true);
                methods.push(method);
            } else if (this.match(TokenType.KIAN)) {
                // Method or constructor
                const method = this.functionDeclaration(false);
                if (method.name === 'sang' || method.name === 'constructor') {
                    constructor = method;
                } else {
                    methods.push(method);
                }
            } else {
                break;
            }
        }

        this.consume(TokenType.JOB, "Expect 'job' after class body.");

        return {
            type: 'ClassStmt',
            name,
            superclass,
            body: { properties, methods, constructor },
            line
        };
    }

    // Function: kian name(params) ... job
    private functionDeclaration(isAsync: boolean): AST.FunctionStmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect function name.").value;
        const line = this.previous().line;

        const params = this.parseParameters();
        const body = this.block();

        return { type: 'FunctionStmt', name, params, body, isAsync, line };
    }

    private parseParameters(): AST.Parameter[] {
        const params: AST.Parameter[] = [];

        if (this.match(TokenType.LPAREN)) {
            if (!this.check(TokenType.RPAREN)) {
                do {
                    const paramName = this.consume(TokenType.IDENTIFIER, "Expect parameter name.").value;
                    let paramType: string | undefined;
                    let defaultValue: AST.Expression | undefined;

                    // Check for type annotation: param: type
                    if (this.match(TokenType.COLON)) {
                        paramType = this.parseTypeAnnotation();
                    }

                    if (this.match(TokenType.ASSIGN)) {
                        defaultValue = this.expression();
                    }

                    params.push({ name: paramName, type: paramType, defaultValue });
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RPAREN, "Expect ')' after parameters.");
        }

        return params;
    }

    // Variable: ao name = value OR ao name: type = value
    private varDeclaration(): AST.VarStmt {
        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.").value;
        const line = this.previous().line;

        // Check for type annotation: ao name: type = value
        let typeAnnotation: string | undefined;
        if (this.match(TokenType.COLON)) {
            typeAnnotation = this.parseTypeAnnotation();
        }

        let value: AST.Expression = { type: 'Literal', value: null };
        if (this.match(TokenType.ASSIGN) || this.match(TokenType.EQ)) {
            value = this.expression();
        }

        return { type: 'VarStmt', name, value, typeAnnotation, line };
    }

    // Parse type annotation: lek, kum, list[lek], etc.
    private parseTypeAnnotation(): string {
        // Check for type keywords
        if (this.match(TokenType.TYPE_LEK)) return 'lek';
        if (this.match(TokenType.TYPE_KUM)) return 'kum';
        if (this.match(TokenType.TYPE_BOOL)) return 'bool';
        if (this.match(TokenType.TYPE_WANG)) return 'wang';
        if (this.match(TokenType.TYPE_ANY)) return 'any';
        if (this.match(TokenType.TYPE_KONG)) return 'kong';

        // Array type: list[elementType]
        if (this.match(TokenType.TYPE_LIST)) {
            if (this.match(TokenType.LBRACKET)) {
                const elementType = this.parseTypeAnnotation();
                this.consume(TokenType.RBRACKET, "Expect ']' after array element type.");
                return `list[${elementType}]`;
            }
            return 'list';
        }

        // Allow identifier as custom type
        if (this.check(TokenType.IDENTIFIER)) {
            return this.advance().value;
        }

        throw this.error(this.peek(), "Expect type annotation.");
    }

    // Print: da expr, expr, ...
    private printStatement(): AST.PrintStmt {
        const line = this.previous().line;
        const expressions: AST.Expression[] = [];

        do {
            expressions.push(this.expression());
        } while (this.match(TokenType.COMMA));

        return { type: 'PrintStmt', expressions, line };
    }

    // If: tha condition ... maichai ... job
    private ifStatement(): AST.IfStmt {
        const line = this.previous().line;
        const condition = this.expression();

        const thenStatements = this.parseBlockBody(TokenType.JOB, TokenType.MAICHAI);
        const thenBranch: AST.BlockStmt = { type: 'BlockStmt', statements: thenStatements };

        let elseBranch: AST.BlockStmt | AST.IfStmt | undefined;

        if (this.match(TokenType.MAICHAI)) {
            // Check for else-if
            if (this.match(TokenType.THA)) {
                elseBranch = this.ifStatement();
                return { type: 'IfStmt', condition, thenBranch, elseBranch, line };
            } else {
                const elseStatements = this.parseBlockBody(TokenType.JOB);
                elseBranch = { type: 'BlockStmt', statements: elseStatements };
            }
        }

        this.consume(TokenType.JOB, "Expect 'job' after if/else block.");

        return { type: 'IfStmt', condition, thenBranch, elseBranch, line };
    }

    // While: wonn condition ... job
    private whileStatement(): AST.WhileStmt {
        const line = this.previous().line;
        const condition = this.expression();
        const body = this.block();

        return { type: 'WhileStmt', condition, body, line };
    }

    // For: wonntak i = 0 tueng 10 ... job
    private forStatement(): AST.ForStmt {
        const line = this.previous().line;
        const variable = this.consume(TokenType.IDENTIFIER, "Expect loop variable.").value;

        this.consume(TokenType.ASSIGN, "Expect '=' after loop variable.");
        const start = this.expression();

        this.consume(TokenType.TUENG, "Expect 'tueng' in for loop.");
        const end = this.expression();

        let step: AST.Expression | undefined;
        // TODO: Add step syntax if needed

        const body = this.block();

        return { type: 'ForStmt', variable, start, end, step, body, line };
    }

    // Return: kuun value
    private returnStatement(): AST.ReturnStmt {
        const line = this.previous().line;
        let value: AST.Expression | undefined;

        // Check if there's a value to return (not immediately followed by job/newline)
        if (!this.check(TokenType.JOB) && !this.check(TokenType.EOF)) {
            if (!this.isAtStatementBoundary()) {
                value = this.expression();
            }
        }

        return { type: 'ReturnStmt', value, line };
    }

    // Try: long ... jab error ... job
    private tryStatement(): AST.TryStmt {
        const line = this.previous().line;
        const tryStatements = this.parseBlockBody(TokenType.JAB);
        const tryBlock: AST.BlockStmt = { type: 'BlockStmt', statements: tryStatements };

        let catchParam: string | undefined;
        let catchBlock: AST.BlockStmt | undefined;

        if (this.match(TokenType.JAB)) {
            if (this.check(TokenType.IDENTIFIER)) {
                catchParam = this.advance().value;
            }
            const catchStatements = this.parseBlockBody(TokenType.JOB);
            catchBlock = { type: 'BlockStmt', statements: catchStatements };
        }

        this.consume(TokenType.JOB, "Expect 'job' after try/catch.");

        return { type: 'TryStmt', tryBlock, catchParam, catchBlock, line };
    }

    // Switch: cheek expr ... karani value: ... machangnan: ... job
    private switchStatement(): AST.SwitchStmt {
        const line = this.previous().line;
        const discriminant = this.expression();

        const cases: AST.SwitchCase[] = [];
        let defaultCase: AST.BlockStmt | undefined;

        while (!this.check(TokenType.JOB) && !this.isAtEnd()) {
            if (this.match(TokenType.KARANI)) {
                const caseValue = this.expression();
                this.consume(TokenType.COLON, "Expect ':' after case value.");
                const caseStatements = this.parseBlockBody(TokenType.KARANI, TokenType.MACHANGNAN, TokenType.JOB);
                cases.push({
                    value: caseValue,
                    body: { type: 'BlockStmt', statements: caseStatements }
                });
            } else if (this.match(TokenType.MACHANGNAN)) {
                this.consume(TokenType.COLON, "Expect ':' after 'machangnan'.");
                const defaultStatements = this.parseBlockBody(TokenType.JOB);
                defaultCase = { type: 'BlockStmt', statements: defaultStatements };
                break;
            } else {
                break;
            }
        }

        this.consume(TokenType.JOB, "Expect 'job' after switch.");

        return { type: 'SwitchStmt', discriminant, cases, defaultCase, line };
    }

    private breakStatement(): AST.BreakStmt {
        return { type: 'BreakStmt', line: this.previous().line };
    }

    private continueStatement(): AST.ContinueStmt {
        return { type: 'ContinueStmt', line: this.previous().line };
    }

    // ============================================
    // EXPRESSIONS
    // ============================================

    private expression(): AST.Expression {
        return this.assignment();
    }

    private assignment(): AST.Expression {
        const expr = this.ternary();

        if (this.match(TokenType.ASSIGN, TokenType.PLUS_ASSIGN, TokenType.MINUS_ASSIGN,
            TokenType.MULT_ASSIGN, TokenType.DIV_ASSIGN)) {
            const operator = this.previous().value;
            const value = this.assignment();

            return {
                type: 'AssignExpr',
                target: expr,
                operator,
                value
            };
        }

        return expr;
    }

    private ternary(): AST.Expression {
        let expr = this.or();

        if (this.match(TokenType.QUESTION)) {
            const consequent = this.expression();
            this.consume(TokenType.COLON, "Expect ':' in ternary expression.");
            const alternate = this.ternary();

            return {
                type: 'TernaryExpr',
                condition: expr,
                consequent,
                alternate
            };
        }

        return expr;
    }

    private or(): AST.Expression {
        let expr = this.and();

        while (this.match(TokenType.OR)) {
            const right = this.and();
            expr = { type: 'LogicalExpr', left: expr, operator: '||', right };
        }

        return expr;
    }

    private and(): AST.Expression {
        let expr = this.equality();

        while (this.match(TokenType.AND)) {
            const right = this.equality();
            expr = { type: 'LogicalExpr', left: expr, operator: '&&', right };
        }

        return expr;
    }

    private equality(): AST.Expression {
        let expr = this.comparison();

        while (this.match(TokenType.EQ, TokenType.NEQ)) {
            const operator = this.previous().value;
            const right = this.comparison();
            expr = { type: 'BinaryExpr', left: expr, operator, right };
        }

        return expr;
    }

    private comparison(): AST.Expression {
        let expr = this.term();

        while (this.match(TokenType.GT, TokenType.GTE, TokenType.LT, TokenType.LTE)) {
            const operator = this.previous().value;
            const right = this.term();
            expr = { type: 'BinaryExpr', left: expr, operator, right };
        }

        return expr;
    }

    private term(): AST.Expression {
        let expr = this.factor();

        while (this.match(TokenType.PLUS, TokenType.MINUS)) {
            const operator = this.previous().value;
            const right = this.factor();
            expr = { type: 'BinaryExpr', left: expr, operator, right };
        }

        return expr;
    }

    private factor(): AST.Expression {
        let expr = this.power();

        while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
            const operator = this.previous().value;
            const right = this.power();
            expr = { type: 'BinaryExpr', left: expr, operator, right };
        }

        return expr;
    }

    private power(): AST.Expression {
        let expr = this.unary();

        if (this.match(TokenType.POWER)) {
            const right = this.power(); // Right associative
            expr = { type: 'BinaryExpr', left: expr, operator: '**', right };
        }

        return expr;
    }

    private unary(): AST.Expression {
        if (this.match(TokenType.NOT, TokenType.MINUS)) {
            const operator = this.previous().value;
            const operand = this.unary();
            return { type: 'UnaryExpr', operator, operand, prefix: true };
        }

        if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
            const operator = this.previous().value;
            const operand = this.unary();
            return { type: 'UnaryExpr', operator, operand, prefix: true };
        }

        if (this.match(TokenType.ROR)) {
            const argument = this.unary();
            return { type: 'AwaitExpr', argument };
        }

        if (this.match(TokenType.SPREAD)) {
            const argument = this.unary();
            return { type: 'SpreadExpr', argument };
        }

        return this.postfix();
    }

    private postfix(): AST.Expression {
        let expr = this.call();

        if (this.match(TokenType.INCREMENT, TokenType.DECREMENT)) {
            const operator = this.previous().value;
            return { type: 'UnaryExpr', operator, operand: expr, prefix: false };
        }

        return expr;
    }

    private call(): AST.Expression {
        let expr = this.primary();

        while (true) {
            if (this.match(TokenType.LPAREN)) {
                expr = this.finishCall(expr);
            } else if (this.match(TokenType.DOT)) {
                const name = this.consume(TokenType.IDENTIFIER, "Expect property name after '.'.").value;
                expr = { type: 'MemberExpr', object: expr, property: name };
            } else if (this.match(TokenType.LBRACKET)) {
                const index = this.expression();
                this.consume(TokenType.RBRACKET, "Expect ']' after index.");
                expr = { type: 'IndexExpr', object: expr, index };
            } else {
                break;
            }
        }

        return expr;
    }

    private finishCall(callee: AST.Expression): AST.CallExpr {
        const args: AST.Expression[] = [];

        if (!this.check(TokenType.RPAREN)) {
            do {
                args.push(this.expression());
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RPAREN, "Expect ')' after arguments.");

        return { type: 'CallExpr', callee, args };
    }

    private primary(): AST.Expression {
        // Literals
        if (this.match(TokenType.NUMBER)) {
            return { type: 'Literal', value: parseFloat(this.previous().value), raw: this.previous().value };
        }
        if (this.match(TokenType.STRING)) {
            return { type: 'Literal', value: this.previous().value, raw: `"${this.previous().value}"` };
        }
        if (this.match(TokenType.TRUE)) {
            return { type: 'Literal', value: true };
        }
        if (this.match(TokenType.FALSE)) {
            return { type: 'Literal', value: false };
        }
        if (this.match(TokenType.NULL)) {
            return { type: 'Literal', value: null };
        }

        // This
        if (this.match(TokenType.NI)) {
            return { type: 'ThisExpr' };
        }

        // New expression
        if (this.match(TokenType.MAI)) {
            const callee = this.call();
            // The call() would have parsed the constructor arguments
            if (callee.type === 'CallExpr') {
                return { type: 'NewExpr', callee: callee.callee, args: callee.args };
            }
            return { type: 'NewExpr', callee, args: [] };
        }

        // Anonymous function: kian(params) ... job
        if (this.match(TokenType.KIAN)) {
            const params = this.parseParameters();

            // Arrow function: kian(x) => x * 2
            if (this.match(TokenType.FAT_ARROW)) {
                const body = this.expression();
                return { type: 'FunctionExpr', params, body, isArrow: true };
            }

            const body = this.block();
            return { type: 'FunctionExpr', params, body };
        }

        // Array literal
        if (this.match(TokenType.LBRACKET)) {
            const elements: AST.Expression[] = [];

            if (!this.check(TokenType.RBRACKET)) {
                do {
                    if (this.check(TokenType.RBRACKET)) break; // Allow trailing comma
                    elements.push(this.expression());
                } while (this.match(TokenType.COMMA));
            }

            this.consume(TokenType.RBRACKET, "Expect ']' after array elements.");
            return { type: 'ArrayExpr', elements };
        }

        // Object literal
        if (this.match(TokenType.LBRACE)) {
            const properties: AST.ObjectProperty[] = [];

            if (!this.check(TokenType.RBRACE)) {
                do {
                    if (this.check(TokenType.RBRACE)) break; // Allow trailing comma

                    let key: string | AST.Expression;
                    let computed = false;

                    if (this.match(TokenType.LBRACKET)) {
                        // Computed property: { [expr]: value }
                        key = this.expression();
                        this.consume(TokenType.RBRACKET, "Expect ']' after computed property key.");
                        computed = true;
                    } else if (this.match(TokenType.STRING)) {
                        key = this.previous().value;
                    } else {
                        key = this.consume(TokenType.IDENTIFIER, "Expect property name.").value;
                    }

                    let value: AST.Expression;
                    let shorthand = false;

                    if (this.match(TokenType.COLON)) {
                        value = this.expression();
                    } else if (typeof key === 'string') {
                        // Shorthand: { name } = { name: name }
                        value = { type: 'Variable', name: key };
                        shorthand = true;
                    } else {
                        throw this.error(this.peek(), "Expect ':' after computed property key.");
                    }

                    properties.push({ key, value, computed, shorthand });
                } while (this.match(TokenType.COMMA));
            }

            this.consume(TokenType.RBRACE, "Expect '}' after object properties.");
            return { type: 'ObjectExpr', properties };
        }

        // Grouped expression
        if (this.match(TokenType.LPAREN)) {
            const expr = this.expression();
            this.consume(TokenType.RPAREN, "Expect ')' after expression.");
            return expr;
        }

        // Variable
        if (this.match(TokenType.IDENTIFIER)) {
            return { type: 'Variable', name: this.previous().value };
        }

        throw this.error(this.peek(), `Unexpected token: ${this.peek().value}`);
    }

    // ============================================
    // BLOCK PARSING
    // ============================================

    private block(): AST.BlockStmt {
        const statements = this.parseBlockBody(TokenType.JOB);
        this.consume(TokenType.JOB, "Expect 'job' after block.");
        return { type: 'BlockStmt', statements };
    }

    private parseBlockBody(...terminators: TokenType[]): AST.Statement[] {
        const statements: AST.Statement[] = [];

        while (!this.isAtEnd()) {
            if (terminators.some(t => this.check(t))) break;
            if (this.match(TokenType.COMMA) || this.match(TokenType.SEMICOLON)) continue;

            const stmt = this.declaration();
            if (stmt) statements.push(stmt);
        }

        return statements;
    }

    private expressionStatement(): AST.Statement {
        const expr = this.expression();
        const line = this.previous().line;

        // Check for assignment without 'ao'
        if (expr.type === 'Variable' && (this.match(TokenType.ASSIGN) || this.match(TokenType.EQ))) {
            const value = this.expression();
            return { type: 'AssignStmt', name: expr.name, value, line };
        }

        return { type: 'ExprStmt', expression: expr, line };
    }

    // ============================================
    // HELPERS
    // ============================================

    private match(...types: TokenType[]): boolean {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private checkNext(type: TokenType): boolean {
        if (this.current + 1 >= this.tokens.length) return false;
        return this.tokens[this.current + 1].type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current];
    }

    private previous(): Token {
        return this.tokens[this.current - 1];
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw this.error(this.peek(), message);
    }

    private isAtStatementBoundary(): boolean {
        // Check if we're at a statement boundary
        const type = this.peek().type;
        return type === TokenType.JOB ||
            type === TokenType.MAICHAI ||
            type === TokenType.KARANI ||
            type === TokenType.MACHANGNAN ||
            type === TokenType.JAB ||
            type === TokenType.EOF;
    }

    private error(token: Token, message: string): Error {
        console.error(`[Line ${token.line}] Parse Error at '${token.value}' (Type: ${token.type}): ${message}`);
        return new Error(message);
    }

    private synchronize(): void {
        this.advance();

        while (!this.isAtEnd()) {
            // After a 'job', we're probably at a new statement
            if (this.previous().type === TokenType.JOB) return;

            switch (this.peek().type) {
                case TokenType.KLUM:
                case TokenType.KIAN:
                case TokenType.AO:
                case TokenType.WONN:
                case TokenType.WONNTAK:
                case TokenType.THA:
                case TokenType.DA:
                case TokenType.KUUN:
                case TokenType.NAM:
                case TokenType.SONG:
                    return;
            }

            this.advance();
        }
    }
}
