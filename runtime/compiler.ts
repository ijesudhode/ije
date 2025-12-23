// ============================================
// IJe Bytecode Compiler
// Converts AST to bytecode for the VM
// ============================================

import type * as AST from '../ast';
import {
    OpCode,
    createChunk,
    writeChunk,
    addConstant
} from './bytecode';
import type {
    Chunk,
    IJeValue,
    IJeFunction
} from './bytecode';

// ==========================================
// LOCAL VARIABLE
// ==========================================

interface Local {
    name: string;
    depth: number;      // Scope depth
    isCaptured: boolean; // Captured by closure?
}

interface UpvalueInfo {
    index: number;
    isLocal: boolean;
}

// ==========================================
// COMPILER STATE
// ==========================================

const FunctionType = {
    SCRIPT: 0,
    FUNCTION: 1,
    METHOD: 2,
    INITIALIZER: 3
} as const;

type FunctionType = typeof FunctionType[keyof typeof FunctionType];

interface CompilerState {
    enclosing: CompilerState | null;
    function: IJeFunction;
    type: FunctionType;
    locals: Local[];
    upvalues: UpvalueInfo[];
    scopeDepth: number;
    loopStart: number;      // For continue
    loopEnd: number;        // For break
    breakJumps: number[];   // Patch locations for break
}

// ==========================================
// COMPILER
// ==========================================

export class Compiler {
    private current: CompilerState;
    private hadError: boolean = false;

    constructor() {
        this.current = this.createCompilerState(FunctionType.SCRIPT, '<script>');
    }

    compile(program: AST.Program): IJeFunction | null {
        for (const stmt of program.body) {
            this.compileStatement(stmt);
        }

        this.emitReturn();

        if (this.hadError) return null;
        return this.current.function;
    }

    // ==========================================
    // COMPILER STATE MANAGEMENT
    // ==========================================

    private createCompilerState(type: FunctionType, name: string): CompilerState {
        const func: IJeFunction = {
            type: 'function',
            name,
            arity: 0,
            chunk: createChunk(name),
            upvalueCount: 0
        };

        const state: CompilerState = {
            enclosing: null,
            function: func,
            type,
            locals: [],
            upvalues: [],
            scopeDepth: 0,
            loopStart: -1,
            loopEnd: -1,
            breakJumps: []
        };

        // Reserve slot 0 for 'this' in methods
        if (type !== FunctionType.SCRIPT) {
            state.locals.push({
                name: type === FunctionType.FUNCTION ? '' : 'ni',
                depth: 0,
                isCaptured: false
            });
        }

        return state;
    }

    private beginScope(): void {
        this.current.scopeDepth++;
    }

    private endScope(): void {
        this.current.scopeDepth--;

        // Pop locals that are going out of scope
        while (
            this.current.locals.length > 0 &&
            this.current.locals[this.current.locals.length - 1].depth > this.current.scopeDepth
        ) {
            const local = this.current.locals.pop()!;
            if (local.isCaptured) {
                this.emitByte(OpCode.OP_CLOSE_UPVALUE);
            } else {
                this.emitByte(OpCode.OP_POP);
            }
        }
    }

    // ==========================================
    // STATEMENT COMPILATION
    // ==========================================

    private compileStatement(stmt: AST.Statement): void {
        switch (stmt.type) {
            case 'VarStmt':
                this.compileVarStmt(stmt as AST.VarStmt);
                break;
            case 'PrintStmt':
                this.compilePrintStmt(stmt as AST.PrintStmt);
                break;
            case 'ExprStmt':
                this.compileExpression((stmt as AST.ExprStmt).expression);
                this.emitByte(OpCode.OP_POP);
                break;
            case 'BlockStmt':
                this.beginScope();
                for (const s of (stmt as AST.BlockStmt).statements) {
                    this.compileStatement(s);
                }
                this.endScope();
                break;
            case 'IfStmt':
                this.compileIfStmt(stmt as AST.IfStmt);
                break;
            case 'WhileStmt':
                this.compileWhileStmt(stmt as AST.WhileStmt);
                break;
            case 'ForStmt':
                this.compileForStmt(stmt as AST.ForStmt);
                break;
            case 'FunctionStmt':
                this.compileFunctionStmt(stmt as AST.FunctionStmt);
                break;
            case 'ReturnStmt':
                this.compileReturnStmt(stmt as AST.ReturnStmt);
                break;
            case 'ClassStmt':
                this.compileClassStmt(stmt as AST.ClassStmt);
                break;
            case 'BreakStmt':
                this.compileBreakStmt();
                break;
            case 'ContinueStmt':
                this.compileContinueStmt();
                break;
            case 'TryStmt':
                // Try/catch requires VM support - emit as-is for now
                console.warn('Try/catch not yet supported in bytecode');
                break;
            case 'SwitchStmt':
                this.compileSwitchStmt(stmt as AST.SwitchStmt);
                break;
            default:
                // Import/Export handled at module level
                break;
        }
    }

    private compileVarStmt(stmt: AST.VarStmt): void {
        const global = this.parseVariable(stmt.name);

        if (stmt.value) {
            this.compileExpression(stmt.value);
        } else {
            this.emitByte(OpCode.OP_NULL);
        }

        this.defineVariable(global);
    }

    private compilePrintStmt(stmt: AST.PrintStmt): void {
        for (const expr of stmt.expressions) {
            this.compileExpression(expr);
            this.emitByte(OpCode.OP_PRINT);
        }
    }

    private compileIfStmt(stmt: AST.IfStmt): void {
        // Compile condition
        this.compileExpression(stmt.condition);

        // Jump over then branch if false
        const thenJump = this.emitJump(OpCode.OP_JUMP_IF_FALSE);
        this.emitByte(OpCode.OP_POP); // Pop condition

        // Compile then branch
        this.beginScope();
        for (const s of stmt.thenBranch.statements) {
            this.compileStatement(s);
        }
        this.endScope();

        // Jump over else branch
        const elseJump = this.emitJump(OpCode.OP_JUMP);

        this.patchJump(thenJump);
        this.emitByte(OpCode.OP_POP); // Pop condition for else

        // Compile else branch
        if (stmt.elseBranch) {
            if (stmt.elseBranch.type === 'IfStmt') {
                this.compileIfStmt(stmt.elseBranch as AST.IfStmt);
            } else {
                this.beginScope();
                for (const s of (stmt.elseBranch as AST.BlockStmt).statements) {
                    this.compileStatement(s);
                }
                this.endScope();
            }
        }

        this.patchJump(elseJump);
    }

    private compileWhileStmt(stmt: AST.WhileStmt): void {
        const loopStart = this.currentChunk().code.length;

        // Save loop state for break/continue
        const prevLoopStart = this.current.loopStart;
        const prevBreakJumps = this.current.breakJumps;
        this.current.loopStart = loopStart;
        this.current.breakJumps = [];

        // Compile condition
        this.compileExpression(stmt.condition);

        const exitJump = this.emitJump(OpCode.OP_JUMP_IF_FALSE);
        this.emitByte(OpCode.OP_POP);

        // Compile body
        this.beginScope();
        for (const s of stmt.body.statements) {
            this.compileStatement(s);
        }
        this.endScope();

        // Loop back
        this.emitLoop(loopStart);

        this.patchJump(exitJump);
        this.emitByte(OpCode.OP_POP);

        // Patch break jumps
        for (const jump of this.current.breakJumps) {
            this.patchJump(jump);
        }

        // Restore loop state
        this.current.loopStart = prevLoopStart;
        this.current.breakJumps = prevBreakJumps;
    }

    private compileForStmt(stmt: AST.ForStmt): void {
        this.beginScope();

        // Initialize loop variable
        this.compileExpression(stmt.start);
        this.addLocal(stmt.variable);
        this.markInitialized();

        const loopStart = this.currentChunk().code.length;

        // Save loop state
        const prevLoopStart = this.current.loopStart;
        const prevBreakJumps = this.current.breakJumps;
        this.current.loopStart = loopStart;
        this.current.breakJumps = [];

        // Condition: i < end
        const slot = this.resolveLocal(stmt.variable);
        this.emitBytes(OpCode.OP_GET_LOCAL, slot);
        this.compileExpression(stmt.end);
        this.emitByte(OpCode.OP_LESS);

        const exitJump = this.emitJump(OpCode.OP_JUMP_IF_FALSE);
        this.emitByte(OpCode.OP_POP);

        // Body
        this.beginScope();
        for (const s of stmt.body.statements) {
            this.compileStatement(s);
        }
        this.endScope();

        // Increment: i = i + step
        if (!stmt.step || (stmt.step.type === 'Literal' && (stmt.step as AST.Literal).value === 1)) {
            this.emitBytes(OpCode.OP_INC_LOCAL, slot);
        } else {
            this.emitBytes(OpCode.OP_GET_LOCAL, slot);
            this.compileExpression(stmt.step);
            this.emitByte(OpCode.OP_ADD);
            this.emitBytes(OpCode.OP_SET_LOCAL, slot);
            this.emitByte(OpCode.OP_POP);
        }

        // Loop back
        this.emitLoop(loopStart);

        this.patchJump(exitJump);
        this.emitByte(OpCode.OP_POP);

        // Patch breaks
        for (const jump of this.current.breakJumps) {
            this.patchJump(jump);
        }

        this.current.loopStart = prevLoopStart;
        this.current.breakJumps = prevBreakJumps;

        this.endScope();
    }

    private compileFunctionStmt(stmt: AST.FunctionStmt): void {
        const global = this.parseVariable(stmt.name);
        this.markInitialized();

        this.compileFunction(stmt, FunctionType.FUNCTION);

        this.defineVariable(global);
    }

    private compileFunction(stmt: AST.FunctionStmt, type: FunctionType): void {
        const enclosing = this.current;
        this.current = this.createCompilerState(type, stmt.name);
        this.current.enclosing = enclosing;

        this.beginScope();

        // Parameters
        for (const param of stmt.params) {
            this.current.function.arity++;
            const constant = this.parseVariable(param.name);
            this.defineVariable(constant);
        }

        // Body
        for (const s of stmt.body.statements) {
            this.compileStatement(s);
        }

        const func = this.endCompiler();

        // Emit closure
        const constant = this.makeConstant(func);
        this.emitBytes(OpCode.OP_CLOSURE, constant);

        // Emit upvalue info
        for (const upvalue of this.current.upvalues) {
            this.emitByte(upvalue.isLocal ? 1 : 0);
            this.emitByte(upvalue.index);
        }

        this.current = enclosing;
    }

    private compileReturnStmt(stmt: AST.ReturnStmt): void {
        if (this.current.type === FunctionType.SCRIPT) {
            this.error("Can't return from top-level code.");
        }

        if (stmt.value) {
            this.compileExpression(stmt.value);
            this.emitByte(OpCode.OP_RETURN);
        } else {
            this.emitReturn();
        }
    }

    private compileClassStmt(stmt: AST.ClassStmt): void {
        const nameConstant = this.identifierConstant(stmt.name);
        this.declareVariable(stmt.name);

        this.emitBytes(OpCode.OP_CLASS, nameConstant);
        this.defineVariable(nameConstant);

        // Load class for method definitions
        this.namedVariable(stmt.name, false);

        // Compile methods
        for (const method of stmt.body.methods) {
            const constant = this.identifierConstant(method.name);
            const type = method.name === 'sang' ? FunctionType.INITIALIZER : FunctionType.METHOD;
            this.compileFunction(method, type);
            this.emitBytes(OpCode.OP_METHOD, constant);
        }

        this.emitByte(OpCode.OP_POP); // Pop class
    }

    private compileBreakStmt(): void {
        if (this.current.loopStart === -1) {
            this.error("Can't use 'yut' outside of a loop.");
            return;
        }

        // Pop locals up to loop scope
        // ... (simplified - would need scope tracking)

        const jump = this.emitJump(OpCode.OP_JUMP);
        this.current.breakJumps.push(jump);
    }

    private compileContinueStmt(): void {
        if (this.current.loopStart === -1) {
            this.error("Can't use 'toor' outside of a loop.");
            return;
        }

        this.emitLoop(this.current.loopStart);
    }

    private compileSwitchStmt(stmt: AST.SwitchStmt): void {
        // Compile discriminant
        this.compileExpression(stmt.discriminant);

        const endJumps: number[] = [];

        for (const caseItem of stmt.cases) {
            // Duplicate discriminant for comparison
            this.emitByte(OpCode.OP_DUP);
            this.compileExpression(caseItem.value);
            this.emitByte(OpCode.OP_EQUAL);

            const skipJump = this.emitJump(OpCode.OP_JUMP_IF_FALSE);
            this.emitByte(OpCode.OP_POP); // Pop comparison result
            this.emitByte(OpCode.OP_POP); // Pop discriminant

            // Compile case body
            this.beginScope();
            for (const s of caseItem.body.statements) {
                this.compileStatement(s);
            }
            this.endScope();

            endJumps.push(this.emitJump(OpCode.OP_JUMP));

            this.patchJump(skipJump);
            this.emitByte(OpCode.OP_POP); // Pop comparison result
        }

        // Default case
        this.emitByte(OpCode.OP_POP); // Pop discriminant
        if (stmt.defaultCase) {
            this.beginScope();
            for (const s of stmt.defaultCase.statements) {
                this.compileStatement(s);
            }
            this.endScope();
        }

        // Patch all end jumps
        for (const jump of endJumps) {
            this.patchJump(jump);
        }
    }

    // ==========================================
    // EXPRESSION COMPILATION
    // ==========================================

    private compileExpression(expr: AST.Expression): void {
        switch (expr.type) {
            case 'Literal':
                this.compileLiteral(expr as AST.Literal);
                break;
            case 'Variable':
                this.namedVariable((expr as AST.Variable).name, false);
                break;
            case 'BinaryExpr':
                this.compileBinaryExpr(expr as AST.BinaryExpr);
                break;
            case 'UnaryExpr':
                this.compileUnaryExpr(expr as AST.UnaryExpr);
                break;
            case 'LogicalExpr':
                this.compileLogicalExpr(expr as AST.LogicalExpr);
                break;
            case 'TernaryExpr':
                this.compileTernaryExpr(expr as AST.TernaryExpr);
                break;
            case 'CallExpr':
                this.compileCallExpr(expr as AST.CallExpr);
                break;
            case 'MemberExpr':
                this.compileMemberExpr(expr as AST.MemberExpr);
                break;
            case 'IndexExpr':
                this.compileIndexExpr(expr as AST.IndexExpr);
                break;
            case 'AssignExpr':
                this.compileAssignExpr(expr as AST.AssignExpr);
                break;
            case 'ArrayExpr':
                this.compileArrayExpr(expr as AST.ArrayExpr);
                break;
            case 'ObjectExpr':
                this.compileObjectExpr(expr as AST.ObjectExpr);
                break;
            case 'FunctionExpr':
                this.compileFunctionExpr(expr as AST.FunctionExpr);
                break;
            case 'ThisExpr':
                this.namedVariable('ni', false);
                break;
            case 'NewExpr':
                this.compileNewExpr(expr as AST.NewExpr);
                break;
            default:
                this.error(`Unknown expression type: ${expr.type}`);
        }
    }

    private compileLiteral(expr: AST.Literal): void {
        switch (expr.value) {
            case true:
                this.emitByte(OpCode.OP_TRUE);
                break;
            case false:
                this.emitByte(OpCode.OP_FALSE);
                break;
            case null:
                this.emitByte(OpCode.OP_NULL);
                break;
            case 0:
                this.emitByte(OpCode.OP_LOAD_ZERO);
                break;
            case 1:
                this.emitByte(OpCode.OP_LOAD_ONE);
                break;
            default:
                this.emitConstant(expr.value);
        }
    }

    private compileBinaryExpr(expr: AST.BinaryExpr): void {
        // Constant folding
        if (expr.left.type === 'Literal' && expr.right.type === 'Literal') {
            const left = (expr.left as AST.Literal).value;
            const right = (expr.right as AST.Literal).value;

            if (typeof left === 'number' && typeof right === 'number') {
                let result: any;
                switch (expr.operator) {
                    case '+': result = left + right; break;
                    case '-': result = left - right; break;
                    case '*': result = left * right; break;
                    case '/':
                        if (right !== 0) result = left / right;
                        break;
                    case '%': result = left % right; break;
                    case '**': result = Math.pow(left, right); break;
                    case '>': result = left > right; break;
                    case '>=': result = left >= right; break;
                    case '<': result = left < right; break;
                    case '<=': result = left <= right; break;
                    case '==': result = left == right; break;
                    case '!=': result = left != right; break;
                }

                if (result !== undefined) {
                    // Reuse compileLiteral to get optimizations
                    this.compileLiteral({ type: 'Literal', value: result, raw: String(result) });
                    return;
                }
            }
        }

        this.compileExpression(expr.left);
        this.compileExpression(expr.right);

        switch (expr.operator) {
            case '+': this.emitByte(OpCode.OP_ADD); break;
            case '-': this.emitByte(OpCode.OP_SUBTRACT); break;
            case '*': this.emitByte(OpCode.OP_MULTIPLY); break;
            case '/': this.emitByte(OpCode.OP_DIVIDE); break;
            case '%': this.emitByte(OpCode.OP_MODULO); break;
            case '**': this.emitByte(OpCode.OP_POWER); break;
            case '>': this.emitByte(OpCode.OP_GREATER); break;
            case '>=': this.emitByte(OpCode.OP_GREATER_EQUAL); break;
            case '<': this.emitByte(OpCode.OP_LESS); break;
            case '<=': this.emitByte(OpCode.OP_LESS_EQUAL); break;
            case '==': this.emitByte(OpCode.OP_EQUAL); break;
            case '!=':
                this.emitByte(OpCode.OP_EQUAL);
                this.emitByte(OpCode.OP_NOT);
                break;
            case '&': this.emitByte(OpCode.OP_BIT_AND); break;
            case '|': this.emitByte(OpCode.OP_BIT_OR); break;
            case '^': this.emitByte(OpCode.OP_BIT_XOR); break;
            case '<<': this.emitByte(OpCode.OP_LSHIFT); break;
            case '>>': this.emitByte(OpCode.OP_RSHIFT); break;
        }
    }

    private compileUnaryExpr(expr: AST.UnaryExpr): void {
        this.compileExpression(expr.operand);

        switch (expr.operator) {
            case '-': this.emitByte(OpCode.OP_NEGATE); break;
            case '!': this.emitByte(OpCode.OP_NOT); break;
            case '~': this.emitByte(OpCode.OP_BIT_NOT); break;
        }
    }

    private compileLogicalExpr(expr: AST.LogicalExpr): void {
        this.compileExpression(expr.left);

        if (expr.operator === '||') {
            const jump = this.emitJump(OpCode.OP_JUMP_IF_TRUE);
            this.emitByte(OpCode.OP_POP);
            this.compileExpression(expr.right);
            this.patchJump(jump);
        } else {
            const jump = this.emitJump(OpCode.OP_JUMP_IF_FALSE);
            this.emitByte(OpCode.OP_POP);
            this.compileExpression(expr.right);
            this.patchJump(jump);
        }
    }

    private compileTernaryExpr(expr: AST.TernaryExpr): void {
        this.compileExpression(expr.condition);
        const thenJump = this.emitJump(OpCode.OP_JUMP_IF_FALSE);
        this.emitByte(OpCode.OP_POP);
        this.compileExpression(expr.consequent);
        const elseJump = this.emitJump(OpCode.OP_JUMP);
        this.patchJump(thenJump);
        this.emitByte(OpCode.OP_POP);
        this.compileExpression(expr.alternate);
        this.patchJump(elseJump);
    }

    private compileCallExpr(expr: AST.CallExpr): void {
        this.compileExpression(expr.callee);

        for (const arg of expr.args) {
            this.compileExpression(arg);
        }

        this.emitBytes(OpCode.OP_CALL, expr.args.length);
    }

    private compileMemberExpr(expr: AST.MemberExpr): void {
        this.compileExpression(expr.object);
        const name = this.identifierConstant(expr.property);
        this.emitBytes(OpCode.OP_GET_PROPERTY, name);
    }

    private compileIndexExpr(expr: AST.IndexExpr): void {
        this.compileExpression(expr.object);
        this.compileExpression(expr.index);
        this.emitByte(OpCode.OP_GET_INDEX);
    }

    private compileAssignExpr(expr: AST.AssignExpr): void {
        this.compileExpression(expr.value);

        if (expr.target.type === 'Variable') {
            this.namedVariable((expr.target as AST.Variable).name, true);
        } else if (expr.target.type === 'MemberExpr') {
            const member = expr.target as AST.MemberExpr;
            this.compileExpression(member.object);
            const name = this.identifierConstant(member.property);
            this.emitBytes(OpCode.OP_SET_PROPERTY, name);
        } else if (expr.target.type === 'IndexExpr') {
            const index = expr.target as AST.IndexExpr;
            this.compileExpression(index.object);
            this.compileExpression(index.index);
            this.emitByte(OpCode.OP_SET_INDEX);
        }
    }

    private compileArrayExpr(expr: AST.ArrayExpr): void {
        for (const elem of expr.elements) {
            this.compileExpression(elem);
        }
        this.emitBytes(OpCode.OP_ARRAY, expr.elements.length);
    }

    private compileObjectExpr(expr: AST.ObjectExpr): void {
        for (const prop of expr.properties) {
            if (typeof prop.key === 'string') {
                this.emitConstant(prop.key);
            } else {
                this.compileExpression(prop.key);
            }
            this.compileExpression(prop.value);
        }
        this.emitBytes(OpCode.OP_OBJECT, expr.properties.length);
    }

    private compileFunctionExpr(expr: AST.FunctionExpr): void {
        const enclosing = this.current;
        this.current = this.createCompilerState(FunctionType.FUNCTION, '<anonymous>');
        this.current.enclosing = enclosing;

        this.beginScope();

        for (const param of expr.params) {
            this.current.function.arity++;
            const constant = this.parseVariable(param.name);
            this.defineVariable(constant);
        }

        if (expr.body.type === 'BlockStmt') {
            for (const s of (expr.body as AST.BlockStmt).statements) {
                this.compileStatement(s);
            }
        } else {
            this.compileExpression(expr.body as AST.Expression);
            this.emitByte(OpCode.OP_RETURN);
        }

        const func = this.endCompiler();
        const constant = this.makeConstant(func);
        this.emitBytes(OpCode.OP_CLOSURE, constant);

        for (const upvalue of this.current.upvalues) {
            this.emitByte(upvalue.isLocal ? 1 : 0);
            this.emitByte(upvalue.index);
        }

        this.current = enclosing;
    }

    private compileNewExpr(expr: AST.NewExpr): void {
        // Compile the class/callee
        this.compileExpression(expr.callee);

        // Compile arguments
        for (const arg of expr.args) {
            this.compileExpression(arg);
        }

        // Call with arg count - VM handles class instantiation
        this.emitBytes(OpCode.OP_CALL, expr.args.length);
    }

    // ==========================================
    // VARIABLE HELPERS
    // ==========================================

    private parseVariable(name: string): number {
        this.declareVariable(name);
        if (this.current.scopeDepth > 0) return 0;
        return this.identifierConstant(name);
    }

    private declareVariable(name: string): void {
        if (this.current.scopeDepth === 0) return;

        // Check for duplicate in current scope
        for (let i = this.current.locals.length - 1; i >= 0; i--) {
            const local = this.current.locals[i];
            if (local.depth !== -1 && local.depth < this.current.scopeDepth) {
                break;
            }
            if (local.name === name) {
                this.error(`Variable '${name}' already declared in this scope.`);
            }
        }

        this.addLocal(name);
    }

    private addLocal(name: string): void {
        this.current.locals.push({
            name,
            depth: -1, // Uninitialized
            isCaptured: false
        });
    }

    private markInitialized(): void {
        if (this.current.scopeDepth === 0) return;
        this.current.locals[this.current.locals.length - 1].depth = this.current.scopeDepth;
    }

    private defineVariable(global: number): void {
        if (this.current.scopeDepth > 0) {
            this.markInitialized();
            return;
        }
        this.emitBytes(OpCode.OP_DEFINE_GLOBAL, global);
    }

    private namedVariable(name: string, canAssign: boolean): void {
        let getOp: OpCode;
        let setOp: OpCode;
        let arg = this.resolveLocal(name);

        if (arg !== -1) {
            getOp = OpCode.OP_GET_LOCAL;
            setOp = OpCode.OP_SET_LOCAL;
        } else {
            arg = this.resolveUpvalue(name);
            if (arg !== -1) {
                getOp = OpCode.OP_GET_UPVALUE;
                setOp = OpCode.OP_SET_UPVALUE;
            } else {
                arg = this.identifierConstant(name);
                getOp = OpCode.OP_GET_GLOBAL;
                setOp = OpCode.OP_SET_GLOBAL;
            }
        }

        if (canAssign) {
            this.emitBytes(setOp, arg);
        } else {
            this.emitBytes(getOp, arg);
        }
    }

    private resolveLocal(name: string): number {
        for (let i = this.current.locals.length - 1; i >= 0; i--) {
            const local = this.current.locals[i];
            if (local.name === name) {
                if (local.depth === -1) {
                    this.error("Can't read local variable in its own initializer.");
                }
                return i;
            }
        }
        return -1;
    }

    private resolveUpvalue(name: string): number {
        if (!this.current.enclosing) return -1;

        const local = this.resolveLocalInEnclosing(name);
        if (local !== -1) {
            this.current.enclosing.locals[local].isCaptured = true;
            return this.addUpvalue(local, true);
        }

        const upvalue = this.resolveUpvalueInEnclosing(name);
        if (upvalue !== -1) {
            return this.addUpvalue(upvalue, false);
        }

        return -1;
    }

    private resolveLocalInEnclosing(name: string): number {
        if (!this.current.enclosing) return -1;
        for (let i = this.current.enclosing.locals.length - 1; i >= 0; i--) {
            if (this.current.enclosing.locals[i].name === name) {
                return i;
            }
        }
        return -1;
    }

    private resolveUpvalueInEnclosing(_name: string): number {
        if (!this.current.enclosing) return -1;
        // Recursive upvalue resolution would go here
        return -1;
    }

    private addUpvalue(index: number, isLocal: boolean): number {
        const upvalueCount = this.current.function.upvalueCount;

        for (let i = 0; i < upvalueCount; i++) {
            const upvalue = this.current.upvalues[i];
            if (upvalue.index === index && upvalue.isLocal === isLocal) {
                return i;
            }
        }

        this.current.upvalues.push({ index, isLocal });
        return this.current.function.upvalueCount++;
    }

    private identifierConstant(name: string): number {
        return this.makeConstant(name);
    }

    // ==========================================
    // EMIT HELPERS
    // ==========================================

    private emitByte(byte: number): void {
        writeChunk(this.currentChunk(), byte, 0); // Line 0 for now
    }

    private emitBytes(byte1: number, byte2: number): void {
        this.emitByte(byte1);
        this.emitByte(byte2);
    }

    private emitConstant(value: IJeValue): void {
        this.emitBytes(OpCode.OP_CONSTANT, this.makeConstant(value));
    }

    private makeConstant(value: IJeValue): number {
        return addConstant(this.currentChunk(), value);
    }

    private emitJump(instruction: OpCode): number {
        this.emitByte(instruction);
        this.emitByte(0xff);
        this.emitByte(0xff);
        return this.currentChunk().code.length - 2;
    }

    private patchJump(offset: number): void {
        const jump = this.currentChunk().code.length - offset - 2;

        if (jump > 0xFFFF) {
            this.error("Too much code to jump over.");
        }

        this.currentChunk().code[offset] = (jump >> 8) & 0xff;
        this.currentChunk().code[offset + 1] = jump & 0xff;
    }

    private emitLoop(loopStart: number): void {
        this.emitByte(OpCode.OP_LOOP);

        const offset = this.currentChunk().code.length - loopStart + 2;
        if (offset > 0xFFFF) {
            this.error("Loop body too large.");
        }

        this.emitByte((offset >> 8) & 0xff);
        this.emitByte(offset & 0xff);
    }

    private emitReturn(): void {
        if (this.current.type === FunctionType.INITIALIZER) {
            this.emitBytes(OpCode.OP_GET_LOCAL, 0); // Return 'this'
        } else {
            this.emitByte(OpCode.OP_NULL);
        }
        this.emitByte(OpCode.OP_RETURN);
    }

    private endCompiler(): IJeFunction {
        this.emitReturn();
        return this.current.function;
    }

    private currentChunk(): Chunk {
        return this.current.function.chunk;
    }

    private error(message: string): void {
        console.error(`Compile Error: ${message}`);
        this.hadError = true;
    }
}
