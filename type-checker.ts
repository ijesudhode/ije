// ============================================
// IJe Type Checker - ระบบตรวจสอบประเภท
// Static Type Analysis System
// ============================================

// @ts-nocheck

import * as AST from './ast';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type IJeTypeName =
    | 'lek'      // number
    | 'kum'      // string (also 'kaw')
    | 'bool'     // boolean
    | 'wang'     // null/void
    | 'list'     // array
    | 'kong'     // object
    | 'kian'     // function
    | 'klum'     // class
    | 'any'      // any type
    | 'unknown'; // unknown

export interface IJeType {
    praped: IJeTypeName;    // type name - ประเภท
    elementType?: IJeType;   // for arrays
    keyType?: IJeType;       // for maps
    valueType?: IJeType;     // for maps
    paramTypes?: IJeType[];  // for functions
    returnType?: IJeType;    // for functions
    properties?: Map<string, IJeType>; // for objects/classes
    className?: string;      // for class instances
}

export interface TypeError {
    praped: 'TypeError';     // type
    khwam: string;           // message - ข้อความ
    borthat: number;         // line - บรรทัด
    salaek: number;          // column - สลัก
    kumnaenam?: string;      // suggestion - คำแนะนำ
    code: string;            // error code
}

// ==========================================
// TYPE SCOPE
// ==========================================

class TypeScope {
    private types: Map<string, IJeType> = new Map();
    private parent: TypeScope | null;

    constructor(parent: TypeScope | null = null) {
        this.parent = parent;
    }

    // กำหนด - Define type
    kamNot(name: string, type: IJeType): void {
        this.types.set(name, type);
    }

    // หา - Lookup type
    ha(name: string): IJeType | undefined {
        const type = this.types.get(name);
        if (type) return type;
        if (this.parent) return this.parent.ha(name);
        return undefined;
    }

    // สร้าง scope ลูก
    sangLuk(): TypeScope {
        return new TypeScope(this);
    }
}

// ==========================================
// TYPE CHECKER
// ==========================================

export class IJeTypeChecker {
    private errors: TypeError[] = [];
    private scope: TypeScope;
    private currentFunction: IJeType | null = null;
    private currentClass: string | null = null;

    constructor() {
        this.scope = new TypeScope();
        this.registerBuiltins();
    }

    // ตรวจ - Check program
    truat(program: AST.Program): TypeError[] {
        this.errors = [];

        for (const stmt of program.body) {
            this.checkStatement(stmt);
        }

        return this.errors;
    }

    // ตรวจแบบเข้มงวด - Strict check (stops on first error)
    truatKhemNguad(program: AST.Program): TypeError | null {
        const errors = this.truat(program);
        return errors.length > 0 ? errors[0] : null;
    }

    // ==========================================
    // STATEMENT CHECKING
    // ==========================================

    private checkStatement(stmt: AST.Statement): void {
        switch (stmt.type) {
            case 'VarStmt':
                this.checkVarStmt(stmt as AST.VarStmt);
                break;
            case 'AssignStmt':
                this.checkAssignStmt(stmt as AST.AssignStmt);
                break;
            case 'IfStmt':
                this.checkIfStmt(stmt as AST.IfStmt);
                break;
            case 'WhileStmt':
                this.checkWhileStmt(stmt as AST.WhileStmt);
                break;
            case 'ForStmt':
                this.checkForStmt(stmt as AST.ForStmt);
                break;
            case 'FunctionStmt':
                this.checkFunctionStmt(stmt as AST.FunctionStmt);
                break;
            case 'ClassStmt':
                this.checkClassStmt(stmt as AST.ClassStmt);
                break;
            case 'ReturnStmt':
                this.checkReturnStmt(stmt as AST.ReturnStmt);
                break;
            case 'BlockStmt':
                this.checkBlock(stmt as AST.BlockStmt);
                break;
            case 'ExprStmt':
                this.inferType((stmt as AST.ExprStmt).expression);
                break;
            case 'PrintStmt':
                for (const expr of (stmt as AST.PrintStmt).expressions) {
                    this.inferType(expr);
                }
                break;
        }
    }

    private checkVarStmt(stmt: AST.VarStmt): void {
        let declaredType: IJeType | null = null;

        if (stmt.typeAnnotation) {
            declaredType = this.parseType(stmt.typeAnnotation);
        }

        if (stmt.value) {
            const inferredType = this.inferType(stmt.value);

            if (declaredType && !this.typesCompatible(declaredType, inferredType)) {
                this.addError({
                    praped: 'TypeError',
                    khwam: `ประเภท '${this.typeToString(inferredType)}' ไม่สามารถกำหนดให้ '${this.typeToString(declaredType)}' ได้`,
                    borthat: stmt.line || 0,
                    salaek: 0,
                    code: 'E0308',
                    kumnaenam: this.getSuggestion(declaredType, inferredType)
                });
            }

            this.scope.kamNot(stmt.name, declaredType || inferredType);
        } else {
            this.scope.kamNot(stmt.name, declaredType || { praped: 'any' });
        }
    }

    private checkAssignStmt(stmt: AST.AssignStmt): void {
        const targetType = this.inferType(stmt.target);
        const valueType = this.inferType(stmt.value);

        if (!this.typesCompatible(targetType, valueType)) {
            this.addError({
                praped: 'TypeError',
                khwam: `ไม่สามารถกำหนดค่าประเภท '${this.typeToString(valueType)}' ให้ตัวแปรประเภท '${this.typeToString(targetType)}'`,
                borthat: stmt.line || 0,
                salaek: 0,
                code: 'E0309',
                kumnaenam: this.getSuggestion(targetType, valueType)
            });
        }
    }

    private checkIfStmt(stmt: AST.IfStmt): void {
        const condType = this.inferType(stmt.condition);

        if (condType.praped !== 'bool' && condType.praped !== 'any') {
            this.addWarning({
                praped: 'TypeError',
                khwam: `เงื่อนไขควรเป็นประเภท 'bool' แต่ได้รับ '${this.typeToString(condType)}'`,
                borthat: stmt.line || 0,
                salaek: 0,
                code: 'W0101',
                kumnaenam: 'ใช้การเปรียบเทียบ เช่น x > 0 หรือ x == jing'
            });
        }

        this.scope = this.scope.sangLuk();
        this.checkBlock(stmt.thenBranch);
        this.scope = (this.scope as any).parent || this.scope;

        if (stmt.elseBranch) {
            this.scope = this.scope.sangLuk();
            if (stmt.elseBranch.type === 'IfStmt') {
                this.checkIfStmt(stmt.elseBranch as AST.IfStmt);
            } else {
                this.checkBlock(stmt.elseBranch as AST.BlockStmt);
            }
            this.scope = (this.scope as any).parent || this.scope;
        }
    }

    private checkWhileStmt(stmt: AST.WhileStmt): void {
        const condType = this.inferType(stmt.condition);

        if (condType.praped !== 'bool' && condType.praped !== 'any') {
            this.addWarning({
                praped: 'TypeError',
                khwam: `เงื่อนไข while ควรเป็น 'bool'`,
                borthat: stmt.line || 0,
                salaek: 0,
                code: 'W0102'
            });
        }

        this.scope = this.scope.sangLuk();
        this.checkBlock(stmt.body);
        this.scope = (this.scope as any).parent || this.scope;
    }

    private checkForStmt(stmt: AST.ForStmt): void {
        this.scope = this.scope.sangLuk();

        const startType = this.inferType(stmt.start);
        const endType = this.inferType(stmt.end);

        if (startType.praped !== 'lek') {
            this.addError({
                praped: 'TypeError',
                khwam: `ค่าเริ่มต้น for ต้องเป็นตัวเลข`,
                borthat: stmt.line || 0,
                salaek: 0,
                code: 'E0310'
            });
        }

        if (endType.praped !== 'lek') {
            this.addError({
                praped: 'TypeError',
                khwam: `ค่าสิ้นสุด for ต้องเป็นตัวเลข`,
                borthat: stmt.line || 0,
                salaek: 0,
                code: 'E0311'
            });
        }

        this.scope.kamNot(stmt.variable, { praped: 'lek' });
        this.checkBlock(stmt.body);

        this.scope = (this.scope as any).parent || this.scope;
    }

    private checkFunctionStmt(stmt: AST.FunctionStmt): void {
        const paramTypes: IJeType[] = stmt.params.map(p =>
            p.type ? this.parseType(p.type) : { praped: 'any' as IJeTypeName }
        );

        const returnType: IJeType = stmt.returnType
            ? this.parseType(stmt.returnType)
            : { praped: 'any' };

        const funcType: IJeType = {
            praped: 'kian',
            paramTypes,
            returnType
        };

        this.scope.kamNot(stmt.name, funcType);

        // Check function body
        const prevFunction = this.currentFunction;
        this.currentFunction = funcType;

        this.scope = this.scope.sangLuk();

        for (let i = 0; i < stmt.params.length; i++) {
            this.scope.kamNot(stmt.params[i].name, paramTypes[i]);
        }

        this.checkBlock(stmt.body);

        this.scope = (this.scope as any).parent || this.scope;
        this.currentFunction = prevFunction;
    }

    private checkClassStmt(stmt: AST.ClassStmt): void {
        const classType: IJeType = {
            praped: 'klum',
            className: stmt.name,
            properties: new Map()
        };

        this.scope.kamNot(stmt.name, classType);

        const prevClass = this.currentClass;
        this.currentClass = stmt.name;

        this.scope = this.scope.sangLuk();

        // Check properties
        for (const prop of stmt.body.properties) {
            this.checkVarStmt(prop);
        }

        // Check methods
        for (const method of stmt.body.methods) {
            this.checkFunctionStmt(method);
        }

        this.scope = (this.scope as any).parent || this.scope;
        this.currentClass = prevClass;
    }

    private checkReturnStmt(stmt: AST.ReturnStmt): void {
        if (!this.currentFunction) {
            this.addError({
                praped: 'TypeError',
                khwam: `'kuun' ต้องอยู่ในฟังก์ชัน`,
                borthat: stmt.line || 0,
                salaek: 0,
                code: 'E0312'
            });
            return;
        }

        if (stmt.value) {
            const returnType = this.inferType(stmt.value);
            const expected = this.currentFunction.returnType || { praped: 'any' };

            if (!this.typesCompatible(expected, returnType)) {
                this.addError({
                    praped: 'TypeError',
                    khwam: `ฟังก์ชันคืนค่าประเภท '${this.typeToString(returnType)}' แต่คาดหวัง '${this.typeToString(expected)}'`,
                    borthat: stmt.line || 0,
                    salaek: 0,
                    code: 'E0313'
                });
            }
        }
    }

    private checkBlock(block: AST.BlockStmt): void {
        for (const stmt of block.statements) {
            this.checkStatement(stmt);
        }
    }

    // ==========================================
    // TYPE INFERENCE
    // ==========================================

    private inferType(expr: AST.Expression): IJeType {
        switch (expr.type) {
            case 'Literal':
                return this.inferLiteralType(expr as AST.Literal);
            case 'Variable':
                return this.inferVariableType(expr as AST.Variable);
            case 'BinaryExpr':
                return this.inferBinaryType(expr as AST.BinaryExpr);
            case 'UnaryExpr':
                return this.inferUnaryType(expr as AST.UnaryExpr);
            case 'LogicalExpr':
                return { praped: 'bool' };
            case 'CallExpr':
                return this.inferCallType(expr as AST.CallExpr);
            case 'MemberExpr':
                return this.inferMemberType(expr as AST.MemberExpr);
            case 'IndexExpr':
                return this.inferIndexType(expr as AST.IndexExpr);
            case 'ArrayExpr':
                return this.inferArrayType(expr as AST.ArrayExpr);
            case 'ObjectExpr':
                return { praped: 'kong' };
            case 'FunctionExpr':
                return { praped: 'kian' };
            case 'ThisExpr':
                return this.currentClass
                    ? { praped: 'kong', className: this.currentClass }
                    : { praped: 'any' };
            case 'NewExpr':
                return { praped: 'kong', className: (expr as AST.NewExpr).className };
            case 'TernaryExpr':
                return this.inferTernaryType(expr as AST.TernaryExpr);
            default:
                return { praped: 'any' };
        }
    }

    private inferLiteralType(lit: AST.Literal): IJeType {
        if (lit.value === null) return { praped: 'wang' };
        if (typeof lit.value === 'boolean') return { praped: 'bool' };
        if (typeof lit.value === 'number') return { praped: 'lek' };
        if (typeof lit.value === 'string') return { praped: 'kum' };
        return { praped: 'any' };
    }

    private inferVariableType(variable: AST.Variable): IJeType {
        const type = this.scope.ha(variable.name);
        if (!type) {
            this.addError({
                praped: 'TypeError',
                khwam: `ตัวแปร '${variable.name}' ไม่ได้ถูกประกาศ`,
                borthat: variable.line || 0,
                salaek: 0,
                code: 'E0314',
                kumnaenam: `ประกาศตัวแปรด้วย: ao ${variable.name} = ...`
            });
            return { praped: 'any' };
        }
        return type;
    }

    private inferBinaryType(expr: AST.BinaryExpr): IJeType {
        const left = this.inferType(expr.left);
        const right = this.inferType(expr.right);

        // Comparison operators
        if (['==', '!=', '<', '>', '<=', '>='].includes(expr.operator)) {
            return { praped: 'bool' };
        }

        // String concatenation
        if (expr.operator === '+' && (left.praped === 'kum' || right.praped === 'kum')) {
            return { praped: 'kum' };
        }

        // Arithmetic
        if (['+', '-', '*', '/', '%', '**'].includes(expr.operator)) {
            if (left.praped !== 'lek' && left.praped !== 'any') {
                this.addError({
                    praped: 'TypeError',
                    khwam: `ตัวดำเนินการ '${expr.operator}' ต้องใช้กับตัวเลข`,
                    borthat: 0,
                    salaek: 0,
                    code: 'E0315'
                });
            }
            return { praped: 'lek' };
        }

        return { praped: 'any' };
    }

    private inferUnaryType(expr: AST.UnaryExpr): IJeType {
        const operandType = this.inferType(expr.operand);

        if (expr.operator === '!') {
            return { praped: 'bool' };
        }

        if (expr.operator === '-') {
            if (operandType.praped !== 'lek' && operandType.praped !== 'any') {
                this.addError({
                    praped: 'TypeError',
                    khwam: `ตัวดำเนินการ '-' ต้องใช้กับตัวเลข`,
                    borthat: 0,
                    salaek: 0,
                    code: 'E0316'
                });
            }
            return { praped: 'lek' };
        }

        return operandType;
    }

    private inferCallType(expr: AST.CallExpr): IJeType {
        const calleeType = this.inferType(expr.callee);

        if (calleeType.praped !== 'kian' && calleeType.praped !== 'any') {
            this.addError({
                praped: 'TypeError',
                khwam: `ประเภท '${this.typeToString(calleeType)}' ไม่สามารถเรียกเป็นฟังก์ชัน`,
                borthat: 0,
                salaek: 0,
                code: 'E0317'
            });
            return { praped: 'any' };
        }

        // Check argument count
        if (calleeType.paramTypes && expr.args.length !== calleeType.paramTypes.length) {
            this.addError({
                praped: 'TypeError',
                khwam: `ฟังก์ชันต้องการ ${calleeType.paramTypes.length} arguments แต่ได้รับ ${expr.args.length}`,
                borthat: 0,
                salaek: 0,
                code: 'E0318'
            });
        }

        return calleeType.returnType || { praped: 'any' };
    }

    private inferMemberType(expr: AST.MemberExpr): IJeType {
        const objType = this.inferType(expr.object);

        // Built-in properties
        if (objType.praped === 'kum') {
            const stringProps: Record<string, IJeType> = {
                'len': { praped: 'lek' },
                'length': { praped: 'lek' }
            };
            return stringProps[expr.property] || { praped: 'any' };
        }

        if (objType.praped === 'list') {
            const arrayProps: Record<string, IJeType> = {
                'len': { praped: 'lek' },
                'length': { praped: 'lek' }
            };
            return arrayProps[expr.property] || objType.elementType || { praped: 'any' };
        }

        return { praped: 'any' };
    }

    private inferIndexType(expr: AST.IndexExpr): IJeType {
        const objType = this.inferType(expr.object);
        const indexType = this.inferType(expr.index);

        if (objType.praped === 'list') {
            if (indexType.praped !== 'lek') {
                this.addError({
                    praped: 'TypeError',
                    khwam: `ดัชนี array ต้องเป็นตัวเลข`,
                    borthat: 0,
                    salaek: 0,
                    code: 'E0319'
                });
            }
            return objType.elementType || { praped: 'any' };
        }

        if (objType.praped === 'kum') {
            return { praped: 'kum' };
        }

        return { praped: 'any' };
    }

    private inferArrayType(expr: AST.ArrayExpr): IJeType {
        if (expr.elements.length === 0) {
            return { praped: 'list' };
        }

        const elementType = this.inferType(expr.elements[0]);
        return { praped: 'list', elementType };
    }

    private inferTernaryType(expr: AST.TernaryExpr): IJeType {
        const condType = this.inferType(expr.condition);
        if (condType.praped !== 'bool' && condType.praped !== 'any') {
            this.addWarning({
                praped: 'TypeError',
                khwam: `เงื่อนไข ternary ควรเป็น bool`,
                borthat: 0,
                salaek: 0,
                code: 'W0103'
            });
        }

        const thenType = this.inferType(expr.consequent);
        const elseType = this.inferType(expr.alternate);

        if (this.typesCompatible(thenType, elseType)) {
            return thenType;
        }

        return { praped: 'any' };
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private parseType(typeStr: string): IJeType {
        const normalized = typeStr.toLowerCase().trim();

        const typeMap: Record<string, IJeTypeName> = {
            'lek': 'lek',
            'number': 'lek',
            'kum': 'kum',
            'kaw': 'kum',
            'string': 'kum',
            'bool': 'bool',
            'boolean': 'bool',
            'wang': 'wang',
            'null': 'wang',
            'void': 'wang',
            'list': 'list',
            'array': 'list',
            'kong': 'kong',
            'object': 'kong',
            'any': 'any'
        };

        // Check for generic types like list<lek>
        const genericMatch = normalized.match(/^(list|array)\s*<\s*(\w+)\s*>$/);
        if (genericMatch) {
            const elementType = this.parseType(genericMatch[2]);
            return { praped: 'list', elementType };
        }

        return { praped: typeMap[normalized] || 'any' };
    }

    private typesCompatible(expected: IJeType, actual: IJeType): boolean {
        if (expected.praped === 'any' || actual.praped === 'any') return true;
        if (expected.praped === 'unknown' || actual.praped === 'unknown') return false;

        if (expected.praped !== actual.praped) return false;

        // Check array element types
        if (expected.praped === 'list' && expected.elementType && actual.elementType) {
            return this.typesCompatible(expected.elementType, actual.elementType);
        }

        return true;
    }

    private typeToString(type: IJeType): string {
        if (type.praped === 'list' && type.elementType) {
            return `list<${this.typeToString(type.elementType)}>`;
        }
        if (type.praped === 'kong' && type.className) {
            return type.className;
        }
        if (type.praped === 'kian') {
            const params = type.paramTypes?.map(t => this.typeToString(t)).join(', ') || '';
            const ret = type.returnType ? this.typeToString(type.returnType) : 'wang';
            return `kian(${params}): ${ret}`;
        }
        return type.praped;
    }

    private getSuggestion(expected: IJeType, actual: IJeType): string {
        if (expected.praped === 'lek' && actual.praped === 'kum') {
            return `ใช้ lek("...") เพื่อแปลงเป็นตัวเลข`;
        }
        if (expected.praped === 'kum' && actual.praped === 'lek') {
            return `ใช้ kaw(...) เพื่อแปลงเป็นข้อความ`;
        }
        if (expected.praped === 'bool') {
            return `ใช้การเปรียบเทียบ เช่น x > 0 หรือ x == jing`;
        }
        return `คาดหวัง '${this.typeToString(expected)}' แต่ได้รับ '${this.typeToString(actual)}'`;
    }

    private addError(error: TypeError): void {
        this.errors.push(error);
    }

    private addWarning(warning: TypeError): void {
        // Warnings are still added to errors but with different code prefix
        this.errors.push(warning);
    }

    private registerBuiltins(): void {
        // Built-in functions
        this.scope.kamNot('da', { praped: 'kian', paramTypes: [{ praped: 'any' }], returnType: { praped: 'wang' } });
        this.scope.kamNot('tang', { praped: 'kian', paramTypes: [], returnType: { praped: 'kum' } });
        this.scope.kamNot('lek', { praped: 'kian', paramTypes: [{ praped: 'any' }], returnType: { praped: 'lek' } });
        this.scope.kamNot('kaw', { praped: 'kian', paramTypes: [{ praped: 'any' }], returnType: { praped: 'kum' } });
        this.scope.kamNot('len', { praped: 'kian', paramTypes: [{ praped: 'any' }], returnType: { praped: 'lek' } });
        this.scope.kamNot('push', { praped: 'kian', paramTypes: [{ praped: 'list' }, { praped: 'any' }], returnType: { praped: 'lek' } });
        this.scope.kamNot('pop', { praped: 'kian', paramTypes: [{ praped: 'list' }], returnType: { praped: 'any' } });
        this.scope.kamNot('an', { praped: 'kian', paramTypes: [{ praped: 'kum' }], returnType: { praped: 'any' } });
        this.scope.kamNot('kiann', { praped: 'kian', paramTypes: [{ praped: 'kum' }, { praped: 'kum' }], returnType: { praped: 'wang' } });
        this.scope.kamNot('term', { praped: 'kian', paramTypes: [{ praped: 'kum' }], returnType: { praped: 'any' } });

        // Math module
        this.scope.kamNot('math', { praped: 'kong' });

        // Time module
        this.scope.kamNot('wela', { praped: 'kong' });

        // UI module
        this.scope.kamNot('ui', { praped: 'kong' });

        // HTTP module
        this.scope.kamNot('http', { praped: 'kong' });

        // Database module
        this.scope.kamNot('db', { praped: 'kong' });

        // Network module
        this.scope.kamNot('net', { praped: 'kong' });

        // List module
        this.scope.kamNot('list', { praped: 'kong' });

        // Object module
        this.scope.kamNot('kong', { praped: 'kong' });

        // JSON module
        this.scope.kamNot('json', { praped: 'kong' });

        // 🔒 SECURITY MODULE
        this.scope.kamNot('sec', { praped: 'kong' });
        this.scope.kamNot('khuam_plod_phai', { praped: 'kong' });

        // Security functions
        this.scope.kamNot('khao_sidhi', { praped: 'kian', paramTypes: [{ praped: 'any' }], returnType: { praped: 'bool' } });
        this.scope.kamNot('sidhi_mii', { praped: 'kian', paramTypes: [{ praped: 'kum' }], returnType: { praped: 'bool' } });
    }
}

// Export helper function
export function checkTypes(source: string): TypeError[] {
    const { Lexer } = require('./lexer');
    const { Parser } = require('./parser');

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const checker = new IJeTypeChecker();
    return checker.truat(ast);
}
