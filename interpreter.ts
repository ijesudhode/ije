
import * as AST from './ast';
import { Environment } from './environment';
import { checkType, createType, TypeName, typeToString, inferType, TYPE_ROASTS } from './types';

// ============================================
// IJe Interpreter - Executes AST
// ============================================

export interface IJeContext {
    output: (msg: any) => void;
    input?: () => Promise<string>;
    term?: (cmd: string) => Promise<void>;
    vibrate?: () => void;
    setTheme?: (color: string) => void;
}

export type NativeFunction = (args: any[]) => Promise<any> | any;

// Rude Thai error messages 🔥
const ROAST_MESSAGES = {
    shadowInLoop: "ไอ้ควาย! มึงประกาศ 'ao' ซ้ำในลูปทำไม? มันจะวนไม่จบ! ใช้แค่ชื่อตัวแปร = ค่าใหม่ พอ",
    undefinedVar: "ตัวแปรนี้มึงไม่เคยสร้างเลย! ใช้ 'ao' ประกาศก่อนสิ โง่ชิปหาย",
    notAFunction: "นี่มันไม่ใช่ฟังก์ชัน! เรียกเหี้ยไรของมึงนิ",
    infiniteLoop: "วนลูปไม่จบ! มึงลืม update ตัวนับหรือเปล่า?",
    divideByZero: "หาร 0? มึงเรียนคณิตมาจากไหน!",
    indexOutOfBounds: "ดัชนีเกินขอบเขต! นับเลขเป็นมั้ย?",
    notAnArray: "นี่ไม่ใช่ array! อย่ามาเข้าถึง index",
    notAnObject: "นี่ไม่ใช่ object! มึงเรียก property ไม่ได้",
    typeError: "ประเภทข้อมูลไม่ตรง! เช็คให้ดีก่อนสิ",
};

// Return value wrapper
class ReturnValue {
    value: any;
    constructor(value: any) {
        this.value = value;
    }
}

// Break signal
class BreakSignal { }

// Continue signal
class ContinueSignal { }

// IJe runtime values
export interface IJeFunction {
    type: 'function';
    declaration: AST.FunctionStmt | AST.FunctionExpr;
    closure: Environment;
    isNative: false;
    isAsync?: boolean;
}

export interface IJeClass {
    type: 'class';
    name: string;
    superclass?: IJeClass;
    methods: Map<string, IJeFunction>;
    properties: Map<string, any>;
}

export interface IJeInstance {
    type: 'instance';
    klass: IJeClass;
    fields: Map<string, any>;
}

export class Interpreter {
    private globalEnv = new Environment();
    private context: IJeContext;
    private loopDepth = 0;
    private loopVars = new Set<string>();

    // Module system support
    private moduleExports: Map<string, any> = new Map();
    private moduleLoader?: import('./modules').ModuleLoader;

    constructor(context: IJeContext) {
        this.context = context;
    }

    // Set module loader for import support
    setModuleLoader(loader: import('./modules').ModuleLoader): void {
        this.moduleLoader = loader;
    }

    // Get exports from this module
    getExports(): Map<string, any> {
        return this.moduleExports;
    }

    registerNative(name: string, fn: NativeFunction) {
        this.globalEnv.define(name, {
            type: 'native',
            call: fn,
            toString: () => `<native fn ${name}>`
        });
    }

    defineVar(name: string, value: any) {
        this.globalEnv.define(name, value);
    }

    async interpret(program: AST.Program): Promise<any> {
        try {
            let result: any = null;
            for (const stmt of program.body) {
                result = await this.execute(stmt, this.globalEnv);
            }
            return result;
        } catch (error) {
            if (error instanceof ReturnValue) {
                return error.value;
            }

            const errMsg = (error as Error).message;

            // Roast mode 🔥
            if (errMsg.includes("Undefined variable")) {
                this.context.output(`🔥 ${ROAST_MESSAGES.undefinedVar}`);
            } else if (errMsg.includes("not a function")) {
                this.context.output(`🔥 ${ROAST_MESSAGES.notAFunction}`);
            } else if (errMsg.includes("index out of bounds")) {
                this.context.output(`🔥 ${ROAST_MESSAGES.indexOutOfBounds}`);
            }

            this.context.output(`Runtime Error: ${errMsg}`);
            throw error;
        }
    }

    // ============================================
    // STATEMENT EXECUTION
    // ============================================

    private async execute(stmt: AST.Statement, env: Environment): Promise<any> {
        switch (stmt.type) {
            case 'VarStmt':
                return this.executeVarStmt(stmt as AST.VarStmt, env);
            case 'AssignStmt':
                return this.executeAssignStmt(stmt as AST.AssignStmt, env);
            case 'PrintStmt':
                return this.executePrintStmt(stmt as AST.PrintStmt, env);
            case 'BlockStmt':
                return this.executeBlock(stmt as AST.BlockStmt, new Environment(env));
            case 'IfStmt':
                return this.executeIfStmt(stmt as AST.IfStmt, env);
            case 'WhileStmt':
                return this.executeWhileStmt(stmt as AST.WhileStmt, env);
            case 'ForStmt':
                return this.executeForStmt(stmt as AST.ForStmt, env);
            case 'FunctionStmt':
                return this.executeFunctionStmt(stmt as AST.FunctionStmt, env);
            case 'ReturnStmt':
                return this.executeReturnStmt(stmt as AST.ReturnStmt, env);
            case 'ClassStmt':
                return this.executeClassStmt(stmt as AST.ClassStmt, env);
            case 'TryStmt':
                return this.executeTryStmt(stmt as AST.TryStmt, env);
            case 'SwitchStmt':
                return this.executeSwitchStmt(stmt as AST.SwitchStmt, env);
            case 'BreakStmt':
                throw new BreakSignal();
            case 'ContinueStmt':
                throw new ContinueSignal();
            case 'ExprStmt':
                return this.evaluate((stmt as AST.ExprStmt).expression, env);
            case 'ImportStmt':
                return this.executeImportStmt(stmt as AST.ImportStmt, env);
            case 'ExportStmt':
                return this.executeExportStmt(stmt as AST.ExportStmt, env);
            default:
                return null;
        }
    }

    private async executeVarStmt(stmt: AST.VarStmt, env: Environment): Promise<void> {
        // ROAST: Detect variable shadowing inside a loop
        if (this.loopDepth > 0 && this.loopVars.has(stmt.name)) {
            this.context.output(`🔥 ${ROAST_MESSAGES.shadowInLoop}`);
            this.context.output(`   ตัวแปร '${stmt.name}' ถูกประกาศซ้ำในลูป!`);
            throw new Error(`Variable '${stmt.name}' shadowed inside loop`);
        }

        const value = await this.evaluate(stmt.value, env);

        // Type checking if annotation present
        if (stmt.typeAnnotation) {
            const expectedType = this.parseTypeAnnotation(stmt.typeAnnotation);
            if (!checkType(value, expectedType)) {
                const actualType = typeToString(inferType(value));
                this.context.output(TYPE_ROASTS.wrongType(stmt.typeAnnotation, actualType, stmt.name));
                throw new Error(`Type error: expected ${stmt.typeAnnotation}, got ${actualType}`);
            }
        }

        env.define(stmt.name, value);

        if (this.loopDepth > 0) {
            this.loopVars.add(stmt.name);
        }
    }

    // Parse type annotation string to TypeAnnotation
    private parseTypeAnnotation(typeStr: string): import('./types').TypeAnnotation {
        // Handle array types: list[lek], list[kum], etc.
        const arrayMatch = typeStr.match(/^list\[(.+)\]$/);
        if (arrayMatch) {
            const elementType = this.parseTypeAnnotation(arrayMatch[1]);
            return { name: TypeName.LIST, elementType };
        }

        // Basic types
        switch (typeStr) {
            case 'lek': return createType(TypeName.LEK);
            case 'kum': return createType(TypeName.KUM);
            case 'bool': return createType(TypeName.BOOL);
            case 'wang': return createType(TypeName.WANG);
            case 'any': return createType(TypeName.ANY);
            case 'list': return createType(TypeName.LIST);
            case 'kong': return createType(TypeName.KONG);
            default: return createType(TypeName.ANY); // Custom types default to any
        }
    }

    private async executeAssignStmt(stmt: AST.AssignStmt, env: Environment): Promise<void> {
        const value = await this.evaluate(stmt.value, env);

        if (stmt.operator) {
            const current = env.get(stmt.name);
            let newValue: any;

            switch (stmt.operator) {
                case '+=': newValue = current + value; break;
                case '-=': newValue = current - value; break;
                case '*=': newValue = current * value; break;
                case '/=': newValue = current / value; break;
                default: newValue = value;
            }

            env.assign(stmt.name, newValue);
        } else {
            env.assign(stmt.name, value);
        }
    }

    private async executePrintStmt(stmt: AST.PrintStmt, env: Environment): Promise<void> {
        const values = await Promise.all(
            stmt.expressions.map(expr => this.evaluate(expr, env))
        );
        this.context.output(values.map(v => this.stringify(v)).join(' '));
    }

    private async executeBlock(block: AST.BlockStmt, env: Environment): Promise<any> {
        for (const stmt of block.statements) {
            await this.execute(stmt, env);
        }
    }

    private async executeIfStmt(stmt: AST.IfStmt, env: Environment): Promise<void> {
        if (this.isTruthy(await this.evaluate(stmt.condition, env))) {
            await this.executeBlock(stmt.thenBranch, new Environment(env));
        } else if (stmt.elseBranch) {
            if (stmt.elseBranch.type === 'IfStmt') {
                await this.executeIfStmt(stmt.elseBranch as AST.IfStmt, env);
            } else {
                await this.executeBlock(stmt.elseBranch as AST.BlockStmt, new Environment(env));
            }
        }
    }

    private async executeWhileStmt(stmt: AST.WhileStmt, env: Environment): Promise<void> {
        this.loopDepth++;
        const prevLoopVars = new Set(this.loopVars);
        let iterations = 0;
        const MAX_ITERATIONS = 10000000;

        try {
            while (this.isTruthy(await this.evaluate(stmt.condition, env))) {
                iterations++;
                if (iterations > MAX_ITERATIONS) {
                    this.context.output(`🔥 ${ROAST_MESSAGES.infiniteLoop}`);
                    throw new Error(`Infinite loop detected after ${MAX_ITERATIONS} iterations`);
                }

                try {
                    await this.executeBlock(stmt.body, new Environment(env));
                } catch (signal) {
                    if (signal instanceof BreakSignal) break;
                    if (signal instanceof ContinueSignal) continue;
                    throw signal;
                }
            }
        } finally {
            this.loopVars = prevLoopVars;
            this.loopDepth--;
        }
    }

    private async executeForStmt(stmt: AST.ForStmt, env: Environment): Promise<void> {
        this.loopDepth++;
        const loopEnv = new Environment(env);

        const start = await this.evaluate(stmt.start, env);
        const end = await this.evaluate(stmt.end, env);
        const step = stmt.step ? await this.evaluate(stmt.step, env) : 1;

        loopEnv.define(stmt.variable, start);

        try {
            let iterations = 0;
            const MAX_ITERATIONS = 10000000;

            while (true) {
                const current = loopEnv.get(stmt.variable);
                if (step > 0 && current >= end) break;
                if (step < 0 && current <= end) break;

                iterations++;
                if (iterations > MAX_ITERATIONS) {
                    this.context.output(`🔥 ${ROAST_MESSAGES.infiniteLoop}`);
                    throw new Error(`Infinite loop detected after ${MAX_ITERATIONS} iterations`);
                }

                try {
                    await this.executeBlock(stmt.body, new Environment(loopEnv));
                } catch (signal) {
                    if (signal instanceof BreakSignal) break;
                    if (signal instanceof ContinueSignal) {
                        loopEnv.assign(stmt.variable, current + step);
                        continue;
                    }
                    throw signal;
                }

                loopEnv.assign(stmt.variable, current + step);
            }
        } finally {
            this.loopDepth--;
        }
    }

    private async executeFunctionStmt(stmt: AST.FunctionStmt, env: Environment): Promise<void> {
        const func: IJeFunction = {
            type: 'function',
            declaration: stmt,
            closure: env,
            isNative: false,
            isAsync: stmt.isAsync
        };
        env.define(stmt.name, func);
    }

    private async executeReturnStmt(stmt: AST.ReturnStmt, env: Environment): Promise<never> {
        const value = stmt.value ? await this.evaluate(stmt.value, env) : null;
        throw new ReturnValue(value);
    }

    private async executeClassStmt(stmt: AST.ClassStmt, env: Environment): Promise<void> {
        const methods = new Map<string, IJeFunction>();
        const properties = new Map<string, any>();

        // Evaluate default property values
        for (const prop of stmt.body.properties) {
            if (prop.value) {
                properties.set(prop.name, await this.evaluate(prop.value, env));
            } else {
                properties.set(prop.name, null);
            }
        }

        // Register methods
        for (const method of stmt.body.methods) {
            methods.set(method.name, {
                type: 'function',
                declaration: method,
                closure: env,
                isNative: false,
                isAsync: method.isAsync
            });
        }

        // Register constructor
        if (stmt.body.constructor) {
            methods.set('sang', {
                type: 'function',
                declaration: stmt.body.constructor,
                closure: env,
                isNative: false
            });
        }

        const klass: IJeClass = {
            type: 'class',
            name: stmt.name,
            methods,
            properties
        };

        env.define(stmt.name, klass);
    }

    private async executeTryStmt(stmt: AST.TryStmt, env: Environment): Promise<void> {
        try {
            await this.executeBlock(stmt.tryBlock, new Environment(env));
        } catch (error) {
            if (error instanceof ReturnValue ||
                error instanceof BreakSignal ||
                error instanceof ContinueSignal) {
                throw error;
            }

            if (stmt.catchBlock) {
                const catchEnv = new Environment(env);
                if (stmt.catchParam) {
                    catchEnv.define(stmt.catchParam, (error as Error).message);
                }
                await this.executeBlock(stmt.catchBlock, catchEnv);
            }
        }
    }

    private async executeSwitchStmt(stmt: AST.SwitchStmt, env: Environment): Promise<void> {
        const value = await this.evaluate(stmt.discriminant, env);
        let matched = false;

        for (const caseItem of stmt.cases) {
            const caseValue = await this.evaluate(caseItem.value, env);
            if (value === caseValue) {
                matched = true;
                try {
                    await this.executeBlock(caseItem.body, new Environment(env));
                } catch (signal) {
                    if (signal instanceof BreakSignal) return;
                    throw signal;
                }
                break;
            }
        }

        if (!matched && stmt.defaultCase) {
            await this.executeBlock(stmt.defaultCase, new Environment(env));
        }
    }

    // Import: nam "module.ije" ao { name1, name2 }
    private async executeImportStmt(stmt: AST.ImportStmt, env: Environment): Promise<void> {
        if (!this.moduleLoader) {
            this.context.output("🔥 Module loader not available! Cannot import modules.");
            throw new Error("Module loader not configured");
        }

        try {
            // Load the module
            const module = await this.moduleLoader.loadModule(stmt.source);

            // Import the specified names into current environment
            for (const spec of stmt.imports) {
                if (spec.name === '*') {
                    // Import all exports: nam "module" ao *
                    for (const [key, value] of module.exports) {
                        env.define(key, value);
                    }
                } else {
                    // Named import
                    if (!module.exports.has(spec.name)) {
                        this.context.output(`🔥 Module '${stmt.source}' ไม่มี export ชื่อ '${spec.name}'!`);
                        throw new Error(`Export '${spec.name}' not found in module '${stmt.source}'`);
                    }
                    const localName = spec.alias || spec.name;
                    env.define(localName, module.exports.get(spec.name));
                }
            }
        } catch (error) {
            this.context.output(`🔥 นำเข้า module '${stmt.source}' ไม่สำเร็จ!`);
            throw error;
        }
    }

    // Export: song ao/kian/klum declaration
    private async executeExportStmt(stmt: AST.ExportStmt, env: Environment): Promise<void> {
        if (stmt.declaration) {
            // Execute the declaration first
            await this.execute(stmt.declaration, env);

            // Get the name from the declaration
            let exportName: string | undefined;
            if (stmt.declaration.type === 'VarStmt') {
                exportName = (stmt.declaration as AST.VarStmt).name;
            } else if (stmt.declaration.type === 'FunctionStmt') {
                exportName = (stmt.declaration as AST.FunctionStmt).name;
            } else if (stmt.declaration.type === 'ClassStmt') {
                exportName = (stmt.declaration as AST.ClassStmt).name;
            }

            if (exportName) {
                const value = env.get(exportName);
                this.moduleExports.set(exportName, value);
            }
        } else if (stmt.name) {
            // Export existing variable: song varName
            const value = env.get(stmt.name);
            this.moduleExports.set(stmt.name, value);
        }
    }

    // ============================================
    // EXPRESSION EVALUATION
    // ============================================

    private async evaluate(expr: AST.Expression, env: Environment): Promise<any> {
        switch (expr.type) {
            case 'Literal':
                return (expr as AST.Literal).value;

            case 'Variable':
                return env.get((expr as AST.Variable).name);

            case 'BinaryExpr':
                return this.evaluateBinaryExpr(expr as AST.BinaryExpr, env);

            case 'UnaryExpr':
                return this.evaluateUnaryExpr(expr as AST.UnaryExpr, env);

            case 'LogicalExpr':
                return this.evaluateLogicalExpr(expr as AST.LogicalExpr, env);

            case 'TernaryExpr':
                return this.evaluateTernaryExpr(expr as AST.TernaryExpr, env);

            case 'CallExpr':
                return this.evaluateCallExpr(expr as AST.CallExpr, env);

            case 'MemberExpr':
                return this.evaluateMemberExpr(expr as AST.MemberExpr, env);

            case 'IndexExpr':
                return this.evaluateIndexExpr(expr as AST.IndexExpr, env);

            case 'AssignExpr':
                return this.evaluateAssignExpr(expr as AST.AssignExpr, env);

            case 'ArrayExpr':
                return this.evaluateArrayExpr(expr as AST.ArrayExpr, env);

            case 'ObjectExpr':
                return this.evaluateObjectExpr(expr as AST.ObjectExpr, env);

            case 'FunctionExpr':
                return this.evaluateFunctionExpr(expr as AST.FunctionExpr, env);

            case 'NewExpr':
                return this.evaluateNewExpr(expr as AST.NewExpr, env);

            case 'ThisExpr':
                return env.get('ni');

            case 'AwaitExpr':
                return this.evaluate((expr as AST.AwaitExpr).argument, env);

            case 'SpreadExpr':
                return {
                    __spread: true,
                    value: await this.evaluate((expr as AST.SpreadExpr).argument, env)
                };

            default:
                return null;
        }
    }

    private async evaluateBinaryExpr(expr: AST.BinaryExpr, env: Environment): Promise<any> {
        const left = await this.evaluate(expr.left, env);
        const right = await this.evaluate(expr.right, env);

        switch (expr.operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/':
                if (right === 0) {
                    this.context.output(`🔥 ${ROAST_MESSAGES.divideByZero}`);
                    throw new Error("Division by zero");
                }
                return left / right;
            case '%': return left % right;
            case '**': return Math.pow(left, right);
            case '>': return left > right;
            case '>=': return left >= right;
            case '<': return left < right;
            case '<=': return left <= right;
            case '==': return left === right;
            case '!=': return left !== right;
            case '&': return left & right;
            case '|': return left | right;
            case '^': return left ^ right;
            case '<<': return left << right;
            case '>>': return left >> right;
            default: return null;
        }
    }

    private async evaluateUnaryExpr(expr: AST.UnaryExpr, env: Environment): Promise<any> {
        if (expr.prefix) {
            const operand = await this.evaluate(expr.operand, env);

            switch (expr.operator) {
                case '-': return -operand;
                case '!': return !this.isTruthy(operand);
                case '~': return ~operand;
                case '++':
                    if (expr.operand.type === 'Variable') {
                        const newVal = operand + 1;
                        env.assign((expr.operand as AST.Variable).name, newVal);
                        return newVal;
                    }
                    return operand + 1;
                case '--':
                    if (expr.operand.type === 'Variable') {
                        const newVal = operand - 1;
                        env.assign((expr.operand as AST.Variable).name, newVal);
                        return newVal;
                    }
                    return operand - 1;
            }
        } else {
            // Postfix
            const operand = await this.evaluate(expr.operand, env);

            if (expr.operand.type === 'Variable') {
                const varName = (expr.operand as AST.Variable).name;
                if (expr.operator === '++') {
                    env.assign(varName, operand + 1);
                } else if (expr.operator === '--') {
                    env.assign(varName, operand - 1);
                }
            }

            return operand; // Return original value for postfix
        }

        return null;
    }

    private async evaluateLogicalExpr(expr: AST.LogicalExpr, env: Environment): Promise<any> {
        const left = await this.evaluate(expr.left, env);

        // Short-circuit evaluation
        if (expr.operator === '||') {
            if (this.isTruthy(left)) return left;
        } else {
            if (!this.isTruthy(left)) return left;
        }

        return this.evaluate(expr.right, env);
    }

    private async evaluateTernaryExpr(expr: AST.TernaryExpr, env: Environment): Promise<any> {
        const condition = await this.evaluate(expr.condition, env);

        if (this.isTruthy(condition)) {
            return this.evaluate(expr.consequent, env);
        } else {
            return this.evaluate(expr.alternate, env);
        }
    }

    private async evaluateCallExpr(expr: AST.CallExpr, env: Environment): Promise<any> {
        const callee = await this.evaluate(expr.callee, env);

        // Evaluate arguments (handle spread)
        const args: any[] = [];
        for (const arg of expr.args) {
            const value = await this.evaluate(arg, env);
            if (value && value.__spread && Array.isArray(value.value)) {
                args.push(...value.value);
            } else {
                args.push(value);
            }
        }

        // Native function (or Host Object with call method)
        if (callee && typeof callee.call === 'function') {
            return await callee.call(args);
        }

        // IJe function
        if (callee && callee.type === 'function') {
            return this.callFunction(callee as IJeFunction, args);
        }

        if (callee && callee.type === 'class') {
            return this.instantiateClass(callee as IJeClass, args);
        }

        this.context.output(`🔥 ${ROAST_MESSAGES.notAFunction}`);
        throw new Error("Can only call functions and classes.");
    }

    private async callFunction(func: IJeFunction, args: any[]): Promise<any> {
        const funcEnv = new Environment(func.closure);

        const params = func.declaration.params;
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            let value = args[i];

            // Use default value if argument not provided
            if (value === undefined && param.defaultValue) {
                value = await this.evaluate(param.defaultValue, func.closure);
            }

            funcEnv.define(param.name, value ?? null);
        }

        try {
            const body = func.declaration.body;
            if (body.type === 'BlockStmt') {
                await this.executeBlock(body, funcEnv);
            } else {
                // Arrow function with expression body
                return await this.evaluate(body as AST.Expression, funcEnv);
            }
        } catch (returnValue) {
            if (returnValue instanceof ReturnValue) {
                return returnValue.value;
            }
            throw returnValue;
        }

        return null;
    }

    private async instantiateClass(klass: IJeClass, args: any[]): Promise<IJeInstance> {
        const instance: IJeInstance = {
            type: 'instance',
            klass,
            fields: new Map(klass.properties)
        };

        // Call constructor if exists
        const constructor = klass.methods.get('sang');
        if (constructor) {
            const constructorEnv = new Environment(constructor.closure);
            constructorEnv.define('ni', instance);

            const params = constructor.declaration.params;
            for (let i = 0; i < params.length; i++) {
                constructorEnv.define(params[i].name, args[i] ?? null);
            }

            try {
                await this.executeBlock(constructor.declaration.body as AST.BlockStmt, constructorEnv);
            } catch (returnValue) {
                if (!(returnValue instanceof ReturnValue)) throw returnValue;
            }
        }

        return instance;
    }

    private async evaluateMemberExpr(expr: AST.MemberExpr, env: Environment): Promise<any> {
        const object = await this.evaluate(expr.object, env);

        if (object === null || object === undefined) {
            throw new Error(`Cannot read property '${expr.property}' of ${object}`);
        }

        // Instance property/method
        if (object.type === 'instance') {
            const instance = object as IJeInstance;

            // Check fields first
            if (instance.fields.has(expr.property)) {
                return instance.fields.get(expr.property);
            }

            // Check methods
            const method = instance.klass.methods.get(expr.property);
            if (method) {
                // Bind 'this' to instance
                return {
                    ...method,
                    closure: (() => {
                        const boundEnv = new Environment(method.closure);
                        boundEnv.define('ni', instance);
                        return boundEnv;
                    })()
                };
            }

            throw new Error(`Property '${expr.property}' not found`);
        }

        // Plain object or native object
        if (typeof object === 'object') {
            const value = object[expr.property];

            // Wrap functions to maintain 'call' structure
            if (value && typeof value.call === 'function') {
                return value;
            }

            return value;
        }

        throw new Error(`Cannot access property of ${typeof object}`);
    }

    private async evaluateIndexExpr(expr: AST.IndexExpr, env: Environment): Promise<any> {
        const object = await this.evaluate(expr.object, env);
        const index = await this.evaluate(expr.index, env);

        if (Array.isArray(object)) {
            if (index < 0 || index >= object.length) {
                this.context.output(`🔥 ${ROAST_MESSAGES.indexOutOfBounds}`);
            }
            return object[index];
        }

        if (typeof object === 'object' && object !== null) {
            return object[index];
        }

        if (typeof object === 'string') {
            return object[index];
        }

        this.context.output(`🔥 ${ROAST_MESSAGES.notAnArray}`);
        throw new Error("Can only index arrays, objects, and strings.");
    }

    private async evaluateAssignExpr(expr: AST.AssignExpr, env: Environment): Promise<any> {
        const value = await this.evaluate(expr.value, env);

        if (expr.target.type === 'Variable') {
            const name = (expr.target as AST.Variable).name;

            if (expr.operator === '=') {
                env.assign(name, value);
            } else {
                const current = env.get(name);
                let newValue: any;

                switch (expr.operator) {
                    case '+=': newValue = current + value; break;
                    case '-=': newValue = current - value; break;
                    case '*=': newValue = current * value; break;
                    case '/=': newValue = current / value; break;
                    default: newValue = value;
                }

                env.assign(name, newValue);
                return newValue;
            }

            return value;
        }

        if (expr.target.type === 'IndexExpr') {
            const indexExpr = expr.target as AST.IndexExpr;
            const object = await this.evaluate(indexExpr.object, env);
            const index = await this.evaluate(indexExpr.index, env);
            object[index] = value;
            return value;
        }

        if (expr.target.type === 'MemberExpr') {
            const memberExpr = expr.target as AST.MemberExpr;
            const object = await this.evaluate(memberExpr.object, env);

            if (object.type === 'instance') {
                (object as IJeInstance).fields.set(memberExpr.property, value);
            } else {
                object[memberExpr.property] = value;
            }

            return value;
        }

        throw new Error("Invalid assignment target.");
    }

    private async evaluateArrayExpr(expr: AST.ArrayExpr, env: Environment): Promise<any[]> {
        const elements: any[] = [];

        for (const elem of expr.elements) {
            const value = await this.evaluate(elem, env);

            if (value && value.__spread && Array.isArray(value.value)) {
                elements.push(...value.value);
            } else {
                elements.push(value);
            }
        }

        return elements;
    }

    private async evaluateObjectExpr(expr: AST.ObjectExpr, env: Environment): Promise<Record<string, any>> {
        const object: Record<string, any> = {};

        for (const prop of expr.properties) {
            let key: string;

            if (typeof prop.key === 'string') {
                key = prop.key;
            } else {
                key = String(await this.evaluate(prop.key, env));
            }

            object[key] = await this.evaluate(prop.value, env);
        }

        return object;
    }

    private evaluateFunctionExpr(expr: AST.FunctionExpr, env: Environment): IJeFunction {
        return {
            type: 'function',
            declaration: expr,
            closure: env,
            isNative: false,
            isAsync: expr.isAsync
        };
    }

    private async evaluateNewExpr(expr: AST.NewExpr, env: Environment): Promise<IJeInstance> {
        const klass = await this.evaluate(expr.callee, env);

        if (!klass || klass.type !== 'class') {
            throw new Error("Can only instantiate classes.");
        }

        const args: any[] = [];
        for (const arg of expr.args) {
            args.push(await this.evaluate(arg, env));
        }

        return this.instantiateClass(klass as IJeClass, args);
    }

    // ============================================
    // HELPERS
    // ============================================

    private isTruthy(val: any): boolean {
        if (val === null || val === undefined) return false;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'number') return val !== 0;
        if (typeof val === 'string') return val.length > 0;
        if (Array.isArray(val)) return val.length > 0;
        return true;
    }

    private stringify(val: any): string {
        if (val === null) return 'wang';
        if (val === undefined) return 'undefined';
        if (typeof val === 'boolean') return val ? 'jing' : 'tej';
        if (Array.isArray(val)) return `[${val.map(v => this.stringify(v)).join(', ')}]`;
        if (val.type === 'instance') return `<${val.klass.name} instance>`;
        if (val.type === 'class') return `<class ${val.name}>`;
        if (val.type === 'function') return `<function ${val.declaration.name || 'anonymous'}>`;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    }
}
