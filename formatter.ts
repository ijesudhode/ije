// ============================================
// IJe Formatter - จัดรูปแบบโค้ด
// Code Formatter with Thai-style naming
// ============================================

// @ts-nocheck

import { Lexer } from './lexer';
import { Parser } from './parser';
import * as AST from './ast';

export interface FormatOptions {
    yoNai: number;          // indentSize - ย่อหน้า (indent)
    chaiTab: boolean;       // useTabs - ใช้ Tab
    kwangSutsut: number;    // maxLineLength - ความกว้างสูงสุด
    borthatBari: boolean;   // insertFinalNewline - บรรทัดใหม่ท้ายไฟล์
    wangRawangOperator: boolean; // spacesAroundOperators - ว่างรอบ operator
}

const DEFAULT_OPTIONS: FormatOptions = {
    yoNai: 4,
    chaiTab: false,
    kwangSutsut: 100,
    borthatBari: true,
    wangRawangOperator: true
};

export class IJeFormatter {
    private options: FormatOptions;
    private indentLevel: number = 0;

    constructor(options: Partial<FormatOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    // จัดรูป - Format code
    chatRoop(source: string): string {
        try {
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            this.indentLevel = 0;
            let result = this.formatProgram(ast);

            if (this.options.borthatBari && !result.endsWith('\n')) {
                result += '\n';
            }

            return result;
        } catch (error) {
            // If parsing fails, return original with basic cleanup
            return this.basicFormat(source);
        }
    }

    // ตรวจสอบ - Check if formatting is needed
    truatSob(source: string): { needsFormat: boolean; diff: string[] } {
        const formatted = this.chatRoop(source);
        const originalLines = source.split('\n');
        const formattedLines = formatted.split('\n');
        const diff: string[] = [];

        let needsFormat = false;
        const maxLen = Math.max(originalLines.length, formattedLines.length);

        for (let i = 0; i < maxLen; i++) {
            if (originalLines[i] !== formattedLines[i]) {
                needsFormat = true;
                diff.push(`Line ${i + 1}: "${originalLines[i] || ''}" -> "${formattedLines[i] || ''}"`);
            }
        }

        return { needsFormat, diff };
    }

    private formatProgram(program: AST.Program): string {
        return program.body.map(stmt => this.formatStatement(stmt)).join('\n');
    }

    private formatStatement(stmt: AST.Statement): string {
        switch (stmt.type) {
            case 'VarStmt':
                return this.formatVarStmt(stmt as AST.VarStmt);
            case 'AssignStmt':
                return this.formatAssignStmt(stmt as AST.AssignStmt);
            case 'PrintStmt':
                return this.formatPrintStmt(stmt as AST.PrintStmt);
            case 'ExprStmt':
                return this.formatExprStmt(stmt as AST.ExprStmt);
            case 'IfStmt':
                return this.formatIfStmt(stmt as AST.IfStmt);
            case 'WhileStmt':
                return this.formatWhileStmt(stmt as AST.WhileStmt);
            case 'ForStmt':
                return this.formatForStmt(stmt as AST.ForStmt);
            case 'FunctionStmt':
                return this.formatFunctionStmt(stmt as AST.FunctionStmt);
            case 'ClassStmt':
                return this.formatClassStmt(stmt as AST.ClassStmt);
            case 'ReturnStmt':
                return this.formatReturnStmt(stmt as AST.ReturnStmt);
            case 'BreakStmt':
                return this.indent() + 'yut';
            case 'ContinueStmt':
                return this.indent() + 'toor';
            case 'BlockStmt':
                return this.formatBlock(stmt as AST.BlockStmt);
            case 'TryStmt':
                return this.formatTryStmt(stmt as AST.TryStmt);
            case 'SwitchStmt':
                return this.formatSwitchStmt(stmt as AST.SwitchStmt);
            case 'ImportStmt':
                return this.formatImportStmt(stmt as AST.ImportStmt);
            default:
                return this.indent() + '// Unknown statement';
        }
    }

    private formatVarStmt(stmt: AST.VarStmt): string {
        let result = this.indent() + 'ao ' + stmt.name;

        if (stmt.typeAnnotation) {
            result += ': ' + stmt.typeAnnotation;
        }

        if (stmt.value) {
            result += ' = ' + this.formatExpr(stmt.value);
        }

        return result;
    }

    private formatAssignStmt(stmt: AST.AssignStmt): string {
        return this.indent() + this.formatExpr(stmt.target) + ' = ' + this.formatExpr(stmt.value);
    }

    private formatPrintStmt(stmt: AST.PrintStmt): string {
        const exprs = stmt.expressions.map(e => this.formatExpr(e)).join(', ');
        return this.indent() + 'da(' + exprs + ')';
    }

    private formatExprStmt(stmt: AST.ExprStmt): string {
        return this.indent() + this.formatExpr(stmt.expression);
    }

    private formatIfStmt(stmt: AST.IfStmt): string {
        let result = this.indent() + 'tha ' + this.formatExpr(stmt.condition) + '\n';

        this.indentLevel++;
        result += this.formatBlock(stmt.thenBranch);
        this.indentLevel--;

        if (stmt.elseBranch) {
            if (stmt.elseBranch.type === 'IfStmt') {
                result += '\n' + this.indent() + 'maichai ' + this.formatIfStmt(stmt.elseBranch as AST.IfStmt).trim().substring(4);
            } else {
                result += '\n' + this.indent() + 'maichai\n';
                this.indentLevel++;
                result += this.formatBlock(stmt.elseBranch as AST.BlockStmt);
                this.indentLevel--;
            }
        }

        result += '\n' + this.indent() + 'job';
        return result;
    }

    private formatWhileStmt(stmt: AST.WhileStmt): string {
        let result = this.indent() + 'wonn ' + this.formatExpr(stmt.condition) + '\n';

        this.indentLevel++;
        result += this.formatBlock(stmt.body);
        this.indentLevel--;

        result += '\n' + this.indent() + 'job';
        return result;
    }

    private formatForStmt(stmt: AST.ForStmt): string {
        let result = this.indent() + 'wonntak ' + stmt.variable;
        result += ' = ' + this.formatExpr(stmt.start);
        result += ' tueng ' + this.formatExpr(stmt.end);

        if (stmt.step) {
            result += ' la ' + this.formatExpr(stmt.step);
        }

        result += '\n';

        this.indentLevel++;
        result += this.formatBlock(stmt.body);
        this.indentLevel--;

        result += '\n' + this.indent() + 'job';
        return result;
    }

    private formatFunctionStmt(stmt: AST.FunctionStmt): string {
        let result = this.indent() + 'kian ' + stmt.name + '(';
        result += stmt.params.map(p => {
            let param = p.name;
            if (p.type) param += ': ' + p.type;
            return param;
        }).join(', ');
        result += ')';

        if (stmt.returnType) {
            result += ': ' + stmt.returnType;
        }

        result += '\n';

        this.indentLevel++;
        result += this.formatBlock(stmt.body);
        this.indentLevel--;

        result += '\n' + this.indent() + 'job';
        return result;
    }

    private formatClassStmt(stmt: AST.ClassStmt): string {
        let result = this.indent() + 'klum ' + stmt.name;

        if (stmt.superclass) {
            result += ' khai ' + stmt.superclass;
        }

        result += '\n';

        this.indentLevel++;

        // Properties
        for (const prop of stmt.body.properties) {
            result += this.formatVarStmt(prop as AST.VarStmt) + '\n';
        }

        if (stmt.body.properties.length > 0 && stmt.body.methods.length > 0) {
            result += '\n';
        }

        // Methods
        for (const method of stmt.body.methods) {
            result += this.formatFunctionStmt(method) + '\n\n';
        }

        this.indentLevel--;

        result += this.indent() + 'job';
        return result;
    }

    private formatReturnStmt(stmt: AST.ReturnStmt): string {
        if (stmt.value) {
            return this.indent() + 'kuun ' + this.formatExpr(stmt.value);
        }
        return this.indent() + 'kuun';
    }

    private formatBlock(block: AST.BlockStmt): string {
        return block.statements.map(s => this.formatStatement(s)).join('\n');
    }

    private formatTryStmt(stmt: AST.TryStmt): string {
        let result = this.indent() + 'long\n';

        this.indentLevel++;
        result += this.formatBlock(stmt.tryBlock);
        this.indentLevel--;

        result += '\n' + this.indent() + 'jab';
        if (stmt.catchParam) {
            result += ' ' + stmt.catchParam;
        }
        result += '\n';

        this.indentLevel++;
        result += this.formatBlock(stmt.catchBlock);
        this.indentLevel--;

        result += '\n' + this.indent() + 'job';
        return result;
    }

    private formatSwitchStmt(stmt: AST.SwitchStmt): string {
        let result = this.indent() + 'cheek ' + this.formatExpr(stmt.discriminant) + '\n';

        this.indentLevel++;

        for (const caseItem of stmt.cases) {
            result += this.indent() + 'karani ' + this.formatExpr(caseItem.value) + '\n';
            this.indentLevel++;
            result += this.formatBlock(caseItem.body) + '\n';
            this.indentLevel--;
        }

        if (stmt.defaultCase) {
            result += this.indent() + 'machangnan\n';
            this.indentLevel++;
            result += this.formatBlock(stmt.defaultCase) + '\n';
            this.indentLevel--;
        }

        this.indentLevel--;

        result += this.indent() + 'job';
        return result;
    }

    private formatImportStmt(stmt: AST.ImportStmt): string {
        return this.indent() + 'nam "' + stmt.path + '"';
    }

    private formatExpr(expr: AST.Expression): string {
        switch (expr.type) {
            case 'Literal':
                return this.formatLiteral(expr as AST.Literal);
            case 'Variable':
                return (expr as AST.Variable).name;
            case 'BinaryExpr':
                return this.formatBinaryExpr(expr as AST.BinaryExpr);
            case 'UnaryExpr':
                return this.formatUnaryExpr(expr as AST.UnaryExpr);
            case 'LogicalExpr':
                return this.formatLogicalExpr(expr as AST.LogicalExpr);
            case 'CallExpr':
                return this.formatCallExpr(expr as AST.CallExpr);
            case 'MemberExpr':
                return this.formatMemberExpr(expr as AST.MemberExpr);
            case 'IndexExpr':
                return this.formatIndexExpr(expr as AST.IndexExpr);
            case 'ArrayExpr':
                return this.formatArrayExpr(expr as AST.ArrayExpr);
            case 'ObjectExpr':
                return this.formatObjectExpr(expr as AST.ObjectExpr);
            case 'AssignExpr':
                return this.formatExpr((expr as AST.AssignExpr).target) + ' = ' +
                    this.formatExpr((expr as AST.AssignExpr).value);
            case 'TernaryExpr':
                return this.formatTernaryExpr(expr as AST.TernaryExpr);
            case 'FunctionExpr':
                return this.formatFunctionExpr(expr as AST.FunctionExpr);
            case 'ThisExpr':
                return 'ni';
            case 'NewExpr':
                return this.formatNewExpr(expr as AST.NewExpr);
            default:
                return '/* unknown */';
        }
    }

    private formatLiteral(lit: AST.Literal): string {
        if (lit.value === null) return 'wang';
        if (lit.value === true) return 'jing';
        if (lit.value === false) return 'tej';
        if (typeof lit.value === 'string') return `"${lit.value}"`;
        return String(lit.value);
    }

    private formatBinaryExpr(expr: AST.BinaryExpr): string {
        const left = this.formatExpr(expr.left);
        const right = this.formatExpr(expr.right);
        const op = this.options.wangRawangOperator ? ` ${expr.operator} ` : expr.operator;
        return `${left}${op}${right}`;
    }

    private formatUnaryExpr(expr: AST.UnaryExpr): string {
        return expr.operator + this.formatExpr(expr.operand);
    }

    private formatLogicalExpr(expr: AST.LogicalExpr): string {
        const left = this.formatExpr(expr.left);
        const right = this.formatExpr(expr.right);
        const op = expr.operator === '&&' ? 'lae' : 'rue';
        return `${left} ${op} ${right}`;
    }

    private formatCallExpr(expr: AST.CallExpr): string {
        const callee = this.formatExpr(expr.callee);
        const args = expr.args.map(a => this.formatExpr(a)).join(', ');
        return `${callee}(${args})`;
    }

    private formatMemberExpr(expr: AST.MemberExpr): string {
        return this.formatExpr(expr.object) + '.' + expr.property;
    }

    private formatIndexExpr(expr: AST.IndexExpr): string {
        return this.formatExpr(expr.object) + '[' + this.formatExpr(expr.index) + ']';
    }

    private formatArrayExpr(expr: AST.ArrayExpr): string {
        const elements = expr.elements.map(e => this.formatExpr(e)).join(', ');
        return `[${elements}]`;
    }

    private formatObjectExpr(expr: AST.ObjectExpr): string {
        if (expr.properties.length === 0) return '{}';

        const props = expr.properties.map(p => {
            const key = typeof p.key === 'string' ? p.key : this.formatExpr(p.key);
            return `${key}: ${this.formatExpr(p.value)}`;
        }).join(', ');

        return `{ ${props} }`;
    }

    private formatTernaryExpr(expr: AST.TernaryExpr): string {
        return `${this.formatExpr(expr.condition)} ? ${this.formatExpr(expr.consequent)} : ${this.formatExpr(expr.alternate)}`;
    }

    private formatFunctionExpr(expr: AST.FunctionExpr): string {
        const params = expr.params.map(p => p.name).join(', ');

        if (expr.body.type === 'BlockStmt') {
            return `kian(${params}) => { ... }`;
        }

        return `kian(${params}) => ${this.formatExpr(expr.body as AST.Expression)}`;
    }

    private formatNewExpr(expr: AST.NewExpr): string {
        const args = expr.args.map(a => this.formatExpr(a)).join(', ');
        return `mai ${expr.className}(${args})`;
    }

    private indent(): string {
        if (this.options.chaiTab) {
            return '\t'.repeat(this.indentLevel);
        }
        return ' '.repeat(this.indentLevel * this.options.yoNai);
    }

    private basicFormat(source: string): string {
        // Basic formatting when AST parsing fails
        return source
            .split('\n')
            .map(line => line.trimEnd())
            .join('\n');
    }
}

// Helper function for CLI use
export function format(source: string, options?: Partial<FormatOptions>): string {
    const formatter = new IJeFormatter(options);
    return formatter.chatRoop(source);
}

export function checkFormat(source: string, options?: Partial<FormatOptions>): { needsFormat: boolean; diff: string[] } {
    const formatter = new IJeFormatter(options);
    return formatter.truatSob(source);
}
