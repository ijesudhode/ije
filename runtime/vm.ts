// ============================================
// IJe Virtual Machine
// Stack-based VM for executing bytecode
// ============================================

import {
    OpCode,
    valuesEqual
} from './bytecode';
import type {
    IJeValue,
    IJeFunction,
    IJeClosure,
    IJeClass,
    IJeInstance,
    IJeNative,
    IJeArray,
    IJeObject,
    IJeBoundMethod,
    Upvalue
} from './bytecode';

// ==========================================
// VM CONFIGURATION
// ==========================================

const STACK_MAX = 4096;
const FRAMES_MAX = 256;

// ==========================================
// CALL FRAME
// ==========================================

interface CallFrame {
    closure: IJeClosure;
    ip: number;          // Instruction pointer
    slots: number;       // Starting slot in stack
}

// ==========================================
// VM CONTEXT
// ==========================================

export interface VMContext {
    output: (value: string) => void;
    input?: () => Promise<string>;
    natives: Map<string, IJeValue>;
}

// ==========================================
// VIRTUAL MACHINE
// ==========================================

export class VM {
    private stack: IJeValue[] = new Array(STACK_MAX);
    private stackTop: number = 0;
    private frames: CallFrame[] = [];
    private globals: Map<string, IJeValue> = new Map();
    private openUpvalues: Map<number, Upvalue> = new Map();
    private context: VMContext;

    constructor(context: VMContext) {
        this.context = context;
        this.registerNatives();
    }

    // ==========================================
    // EXECUTION
    // ==========================================

    async run(func: IJeFunction): Promise<IJeValue> {
        // Wrap in closure
        const closure: IJeClosure = {
            type: 'closure',
            function: func,
            upvalues: []
        };

        this.push(closure);
        this.callClosure(closure, 0);

        return await this.execute();
    }

    private async execute(): Promise<IJeValue> {
        let frame = this.currentFrame();

        while (true) {
            const instruction = this.readByte(frame);

            switch (instruction) {
                // ==========================================
                // CONSTANTS & LITERALS
                // ==========================================
                case OpCode.OP_CONSTANT: {
                    const constant = this.readConstant(frame);
                    this.push(constant);
                    break;
                }

                case OpCode.OP_TRUE:
                    this.push(true);
                    break;

                case OpCode.OP_FALSE:
                    this.push(false);
                    break;

                case OpCode.OP_NULL:
                    this.push(null);
                    break;

                case OpCode.OP_LOAD_ZERO:
                    this.push(0);
                    break;

                case OpCode.OP_LOAD_ONE:
                    this.push(1);
                    break;

                // ==========================================
                // STACK OPERATIONS
                // ==========================================
                case OpCode.OP_POP:
                    this.pop();
                    break;

                case OpCode.OP_DUP:
                    this.push(this.peek(0));
                    break;

                case OpCode.OP_SWAP: {
                    const a = this.pop();
                    const b = this.pop();
                    this.push(a);
                    this.push(b);
                    break;
                }

                // ==========================================
                // ARITHMETIC
                // ==========================================
                case OpCode.OP_ADD: {
                    const b = this.pop();
                    const a = this.pop();
                    if (typeof a === 'string' || typeof b === 'string') {
                        this.push(String(a) + String(b));
                    } else {
                        this.push((a as number) + (b as number));
                    }
                    break;
                }

                case OpCode.OP_SUBTRACT: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a - b);
                    break;
                }

                case OpCode.OP_MULTIPLY: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a * b);
                    break;
                }

                case OpCode.OP_DIVIDE: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    if (b === 0) {
                        this.runtimeError("หาร 0? มึงเรียนคณิตมาจากไหน!");
                    }
                    this.push(a / b);
                    break;
                }

                case OpCode.OP_MODULO: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a % b);
                    break;
                }

                case OpCode.OP_POWER: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(Math.pow(a, b));
                    break;
                }

                case OpCode.OP_NEGATE:
                    this.push(-(this.pop() as number));
                    break;

                // ==========================================
                // COMPARISON
                // ==========================================
                case OpCode.OP_EQUAL: {
                    const b = this.pop();
                    const a = this.pop();
                    this.push(valuesEqual(a, b));
                    break;
                }

                case OpCode.OP_NOT_EQUAL: {
                    const b = this.pop();
                    const a = this.pop();
                    this.push(!valuesEqual(a, b));
                    break;
                }

                case OpCode.OP_GREATER: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a > b);
                    break;
                }

                case OpCode.OP_GREATER_EQUAL: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a >= b);
                    break;
                }

                case OpCode.OP_LESS: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a < b);
                    break;
                }

                case OpCode.OP_LESS_EQUAL: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a <= b);
                    break;
                }

                // ==========================================
                // LOGICAL
                // ==========================================
                case OpCode.OP_NOT:
                    this.push(!this.isTruthy(this.pop()));
                    break;

                // ==========================================
                // BITWISE
                // ==========================================
                case OpCode.OP_BIT_AND: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a & b);
                    break;
                }

                case OpCode.OP_BIT_OR: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a | b);
                    break;
                }

                case OpCode.OP_BIT_XOR: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a ^ b);
                    break;
                }

                case OpCode.OP_BIT_NOT: {
                    const a = this.pop() as number;
                    this.push(~a);
                    break;
                }

                case OpCode.OP_LSHIFT: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a << b);
                    break;
                }

                case OpCode.OP_RSHIFT: {
                    const b = this.pop() as number;
                    const a = this.pop() as number;
                    this.push(a >> b);
                    break;
                }

                // ==========================================
                // VARIABLES
                // ==========================================
                case OpCode.OP_DEFINE_GLOBAL: {
                    const name = this.readConstant(frame) as string;
                    this.globals.set(name, this.peek(0));
                    this.pop();
                    break;
                }

                case OpCode.OP_GET_GLOBAL: {
                    const name = this.readConstant(frame) as string;
                    if (!this.globals.has(name)) {
                        this.runtimeError(`ตัวแปร '${name}' ไม่เคยถูกประกาศ!`);
                    }
                    this.push(this.globals.get(name)!);
                    break;
                }

                case OpCode.OP_SET_GLOBAL: {
                    const name = this.readConstant(frame) as string;
                    if (!this.globals.has(name)) {
                        this.runtimeError(`ตัวแปร '${name}' ไม่เคยถูกประกาศ!`);
                    }
                    this.globals.set(name, this.peek(0));
                    break;
                }

                case OpCode.OP_GET_LOCAL: {
                    const slot = this.readByte(frame);
                    this.push(this.stack[frame.slots + slot]);
                    break;
                }

                case OpCode.OP_SET_LOCAL: {
                    const slot = this.readByte(frame);
                    this.stack[frame.slots + slot] = this.peek(0);
                    break;
                }

                case OpCode.OP_INC_LOCAL: {
                    const slot = this.readByte(frame);
                    const val = this.stack[frame.slots + slot];
                    if (typeof val === 'number') {
                        this.stack[frame.slots + slot] = val + 1;
                    } else {
                        this.runtimeError("Can only increment numbers.");
                    }
                    break;
                }

                case OpCode.OP_GET_UPVALUE: {
                    const slot = this.readByte(frame);
                    const upvalue = frame.closure.upvalues[slot];
                    if (upvalue.closed) {
                        this.push(upvalue.value!);
                    } else {
                        this.push(this.stack[upvalue.location]);
                    }
                    break;
                }

                case OpCode.OP_SET_UPVALUE: {
                    const slot = this.readByte(frame);
                    const upvalue = frame.closure.upvalues[slot];
                    if (upvalue.closed) {
                        upvalue.value = this.peek(0);
                    } else {
                        this.stack[upvalue.location] = this.peek(0);
                    }
                    break;
                }

                case OpCode.OP_CLOSE_UPVALUE: {
                    this.closeUpvalues(this.stackTop - 1);
                    this.pop();
                    break;
                }

                // ==========================================
                // CONTROL FLOW
                // ==========================================
                case OpCode.OP_JUMP: {
                    const offset = this.readShort(frame);
                    frame.ip += offset;
                    break;
                }

                case OpCode.OP_JUMP_IF_FALSE: {
                    const offset = this.readShort(frame);
                    if (!this.isTruthy(this.peek(0))) {
                        frame.ip += offset;
                    }
                    break;
                }

                case OpCode.OP_JUMP_IF_TRUE: {
                    const offset = this.readShort(frame);
                    if (this.isTruthy(this.peek(0))) {
                        frame.ip += offset;
                    }
                    break;
                }

                case OpCode.OP_LOOP: {
                    const offset = this.readShort(frame);
                    frame.ip -= offset;
                    break;
                }

                // ==========================================
                // FUNCTIONS
                // ==========================================
                case OpCode.OP_CALL: {
                    const argCount = this.readByte(frame);
                    await this.callValue(this.peek(argCount), argCount);
                    frame = this.currentFrame();
                    break;
                }

                case OpCode.OP_CLOSURE: {
                    const func = this.readConstant(frame) as IJeFunction;
                    const closure: IJeClosure = {
                        type: 'closure',
                        function: func,
                        upvalues: []
                    };

                    for (let i = 0; i < func.upvalueCount; i++) {
                        const isLocal = this.readByte(frame) === 1;
                        const index = this.readByte(frame);

                        if (isLocal) {
                            closure.upvalues.push(this.captureUpvalue(frame.slots + index));
                        } else {
                            closure.upvalues.push(frame.closure.upvalues[index]);
                        }
                    }

                    this.push(closure);
                    break;
                }

                case OpCode.OP_RETURN: {
                    const result = this.pop();
                    this.closeUpvalues(frame.slots);
                    this.frames.pop();

                    if (this.frames.length === 0) {
                        this.pop();
                        return result;
                    }

                    this.stackTop = frame.slots;
                    this.push(result);
                    frame = this.currentFrame();
                    break;
                }

                // ==========================================
                // CLASSES
                // ==========================================
                case OpCode.OP_CLASS: {
                    const name = this.readConstant(frame) as string;
                    const klass: IJeClass = {
                        type: 'class',
                        name,
                        methods: new Map()
                    };
                    this.push(klass);
                    break;
                }

                case OpCode.OP_GET_PROPERTY: {
                    const instance = this.peek(0);
                    if (!instance || ((instance as any).type !== 'instance' && (instance as any).type !== 'object')) {
                        this.runtimeError("Only instances and objects have properties.");
                    }

                    const name = this.readConstant(frame) as string;

                    if ((instance as any).type === 'instance') {
                        const inst = instance as IJeInstance;
                        if (inst.fields.has(name)) {
                            this.pop();
                            this.push(inst.fields.get(name)!);
                            break;
                        }

                        const method = inst.klass.methods.get(name);
                        if (method) {
                            this.pop();
                            const bound: IJeBoundMethod = {
                                type: 'bound_method',
                                receiver: inst,
                                method
                            };
                            this.push(bound);
                            break;
                        }
                    } else {
                        // Plain object
                        const obj = instance as IJeObject;
                        if (obj.properties.has(name)) {
                            this.pop();
                            this.push(obj.properties.get(name)!);
                            break;
                        }
                    }

                    this.runtimeError(`Undefined property '${name}'.`);
                    break;
                }

                case OpCode.OP_SET_PROPERTY: {
                    const instance = this.peek(1);
                    if (!instance || ((instance as any).type !== 'instance' && (instance as any).type !== 'object')) {
                        this.runtimeError("Only instances and objects have fields.");
                    }

                    const name = this.readConstant(frame) as string;

                    if ((instance as any).type === 'instance') {
                        (instance as IJeInstance).fields.set(name, this.peek(0));
                    } else {
                        (instance as IJeObject).properties.set(name, this.peek(0));
                    }

                    const value = this.pop();
                    this.pop();
                    this.push(value);
                    break;
                }

                case OpCode.OP_METHOD: {
                    const name = this.readConstant(frame) as string;
                    const method = this.peek(0) as IJeClosure;
                    const klass = this.peek(1) as IJeClass;
                    klass.methods.set(name, method);
                    this.pop();
                    break;
                }

                // ==========================================
                // COLLECTIONS
                // ==========================================
                case OpCode.OP_ARRAY: {
                    const count = this.readByte(frame);
                    const elements: IJeValue[] = [];
                    for (let i = count - 1; i >= 0; i--) {
                        elements.unshift(this.peek(i));
                    }
                    for (let i = 0; i < count; i++) {
                        this.pop();
                    }
                    const arr: IJeArray = { type: 'array', elements };
                    this.push(arr);
                    break;
                }

                case OpCode.OP_OBJECT: {
                    const count = this.readByte(frame);
                    const properties = new Map<string, IJeValue>();
                    for (let i = count - 1; i >= 0; i--) {
                        const value = this.peek(i * 2);
                        const key = this.peek(i * 2 + 1) as string;
                        properties.set(key, value);
                    }
                    for (let i = 0; i < count * 2; i++) {
                        this.pop();
                    }
                    const obj: IJeObject = { type: 'object', properties };
                    this.push(obj);
                    break;
                }

                case OpCode.OP_GET_INDEX: {
                    const index = this.pop();
                    const object = this.pop();

                    if ((object as any).type === 'array') {
                        const arr = object as IJeArray;
                        this.push(arr.elements[index as number] ?? null);
                    } else if ((object as any).type === 'object') {
                        const obj = object as IJeObject;
                        this.push(obj.properties.get(String(index)) ?? null);
                    } else if (typeof object === 'string') {
                        this.push((object as string)[index as number] ?? '');
                    } else {
                        this.runtimeError("Can only index arrays, objects, and strings.");
                    }
                    break;
                }

                case OpCode.OP_SET_INDEX: {
                    const value = this.pop();
                    const index = this.pop();
                    const object = this.pop();

                    if ((object as any).type === 'array') {
                        const arr = object as IJeArray;
                        arr.elements[index as number] = value;
                    } else if ((object as any).type === 'object') {
                        const obj = object as IJeObject;
                        obj.properties.set(String(index), value);
                    } else {
                        this.runtimeError("Can only set index on arrays and objects.");
                    }
                    this.push(value);
                    break;
                }

                // ==========================================
                // BUILT-INS
                // ==========================================
                case OpCode.OP_PRINT: {
                    const value = this.pop();
                    this.context.output(this.stringify(value));
                    break;
                }

                default:
                    this.runtimeError(`Unknown opcode: ${instruction}`);
            }
        }
    }

    // ==========================================
    // FUNCTION CALLS
    // ==========================================

    private async callValue(callee: IJeValue, argCount: number): Promise<void> {
        if (callee === null || callee === undefined) {
            this.runtimeError("Can only call functions and classes.");
            return;
        }

        const type = (callee as any).type;

        if (type === 'closure') {
            this.callClosure(callee as IJeClosure, argCount);
            return;
        }

        if (type === 'native') {
            const native = callee as IJeNative;
            const args: IJeValue[] = [];
            for (let i = argCount - 1; i >= 0; i--) {
                args.unshift(this.peek(i));
            }
            for (let i = 0; i < argCount + 1; i++) {
                this.pop();
            }
            const result = await native.fn(...args);
            this.push(result);
            return;
        }

        if (type === 'class') {
            const klass = callee as IJeClass;
            const instance: IJeInstance = {
                type: 'instance',
                klass,
                fields: new Map()
            };
            this.stack[this.stackTop - argCount - 1] = instance;

            const initializer = klass.methods.get('sang');
            if (initializer) {
                this.callClosure(initializer, argCount);
            } else if (argCount !== 0) {
                this.runtimeError(`Expected 0 arguments but got ${argCount}.`);
            }
            return;
        }

        if (type === 'bound_method') {
            const bound = callee as IJeBoundMethod;
            this.stack[this.stackTop - argCount - 1] = bound.receiver;
            this.callClosure(bound.method, argCount);
            return;
        }

        this.runtimeError("Can only call functions and classes.");
    }

    private callClosure(closure: IJeClosure, argCount: number): void {
        if (argCount !== closure.function.arity) {
            this.runtimeError(
                `Expected ${closure.function.arity} arguments but got ${argCount}.`
            );
        }

        if (this.frames.length === FRAMES_MAX) {
            this.runtimeError("Stack overflow.");
        }

        const frame: CallFrame = {
            closure,
            ip: 0,
            slots: this.stackTop - argCount - 1
        };
        this.frames.push(frame);
    }

    // ==========================================
    // UPVALUES
    // ==========================================

    private captureUpvalue(local: number): Upvalue {
        if (this.openUpvalues.has(local)) {
            return this.openUpvalues.get(local)!;
        }

        const upvalue: Upvalue = {
            index: 0,
            isLocal: true,
            location: local,
            closed: false
        };
        this.openUpvalues.set(local, upvalue);
        return upvalue;
    }

    private closeUpvalues(last: number): void {
        for (const [location, upvalue] of this.openUpvalues.entries()) {
            if (location >= last) {
                upvalue.value = this.stack[location];
                upvalue.closed = true;
                this.openUpvalues.delete(location);
            }
        }
    }

    // ==========================================
    // NATIVES
    // ==========================================

    private registerNatives(): void {
        // Register natives from context
        for (const [name, native] of this.context.natives) {
            this.globals.set(name, native);
        }
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private currentFrame(): CallFrame {
        return this.frames[this.frames.length - 1];
    }

    private readByte(frame: CallFrame): number {
        return frame.closure.function.chunk.code[frame.ip++];
    }

    private readShort(frame: CallFrame): number {
        frame.ip += 2;
        const chunk = frame.closure.function.chunk;
        return (chunk.code[frame.ip - 2] << 8) | chunk.code[frame.ip - 1];
    }

    private readConstant(frame: CallFrame): IJeValue {
        return frame.closure.function.chunk.constants[this.readByte(frame)];
    }

    private push(value: IJeValue): void {
        if (this.stackTop >= STACK_MAX) {
            this.runtimeError("Stack overflow.");
        }
        this.stack[this.stackTop++] = value;
    }

    private pop(): IJeValue {
        if (this.stackTop === 0) {
            this.runtimeError("Stack underflow.");
        }
        return this.stack[--this.stackTop];
    }

    private peek(distance: number): IJeValue {
        return this.stack[this.stackTop - 1 - distance];
    }

    private isTruthy(value: IJeValue): boolean {
        if (value === null) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value.length > 0;
        return true;
    }

    private stringify(value: IJeValue): string {
        if (value === null) return 'wang';
        if (typeof value === 'boolean') return value ? 'jing' : 'tej';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'string') return value;

        const type = (value as any).type;
        if (type === 'array') {
            const arr = value as IJeArray;
            return `[${arr.elements.map(e => this.stringify(e)).join(', ')}]`;
        }
        if (type === 'object') {
            const obj = value as IJeObject;
            const pairs: string[] = [];
            for (const [k, v] of obj.properties) {
                pairs.push(`${k}: ${this.stringify(v)}`);
            }
            return `{${pairs.join(', ')}}`;
        }
        if (type === 'function' || type === 'closure') {
            return `<kian ${(value as any).function?.name || (value as any).name}>`;
        }
        if (type === 'class') {
            return `<klum ${(value as IJeClass).name}>`;
        }
        if (type === 'instance') {
            return `<${(value as IJeInstance).klass.name} kong>`;
        }
        if (type === 'native') {
            return `<native ${(value as IJeNative).name}>`;
        }

        return String(value);
    }

    private runtimeError(message: string): never {
        const frame = this.currentFrame();
        const line = frame.closure.function.chunk.lines[frame.ip - 1] || 0;
        this.context.output(`🔥 Runtime Error at line ${line}: ${message}`);
        throw new Error(message);
    }
}
