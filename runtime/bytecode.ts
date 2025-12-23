// ============================================
// IJe Bytecode Definitions
// ============================================

// Opcode definitions for the IJe VM
export const OpCode = {
    // ==========================================
    // STACK OPERATIONS
    // ==========================================
    OP_CONSTANT: 0,          // Push constant onto stack
    OP_POP: 1,               // Pop value from stack
    OP_DUP: 2,               // Duplicate top of stack
    OP_SWAP: 3,              // Swap top two stack values

    // ==========================================
    // LITERALS
    // ==========================================
    OP_TRUE: 4,              // Push true
    OP_FALSE: 5,             // Push false
    OP_NULL: 6,              // Push null

    // ==========================================
    // ARITHMETIC
    // ==========================================
    OP_ADD: 7,               // a + b
    OP_SUBTRACT: 8,          // a - b
    OP_MULTIPLY: 9,          // a * b
    OP_DIVIDE: 10,           // a / b
    OP_MODULO: 11,           // a % b
    OP_POWER: 12,            // a ** b
    OP_NEGATE: 13,           // -a

    // ==========================================
    // COMPARISON
    // ==========================================
    OP_EQUAL: 14,            // a == b
    OP_NOT_EQUAL: 15,        // a != b
    OP_GREATER: 16,          // a > b
    OP_GREATER_EQUAL: 17,    // a >= b
    OP_LESS: 18,             // a < b
    OP_LESS_EQUAL: 19,       // a <= b

    // ==========================================
    // LOGICAL
    // ==========================================
    OP_NOT: 20,              // !a
    OP_AND: 21,              // a && b (short-circuit)
    OP_OR: 22,               // a || b (short-circuit)

    // ==========================================
    // BITWISE
    // ==========================================
    OP_BIT_AND: 23,          // a & b
    OP_BIT_OR: 24,           // a | b
    OP_BIT_XOR: 25,          // a ^ b
    OP_BIT_NOT: 26,          // ~a
    OP_LSHIFT: 27,           // a << b
    OP_RSHIFT: 28,           // a >> b

    // ==========================================
    // VARIABLES
    // ==========================================
    OP_DEFINE_GLOBAL: 29,    // Define global variable
    OP_GET_GLOBAL: 30,       // Get global variable
    OP_SET_GLOBAL: 31,       // Set global variable
    OP_GET_LOCAL: 32,        // Get local variable by slot
    OP_SET_LOCAL: 33,        // Set local variable by slot
    OP_GET_UPVALUE: 34,      // Get closed-over variable
    OP_SET_UPVALUE: 35,      // Set closed-over variable
    OP_CLOSE_UPVALUE: 36,    // Close upvalue when leaving scope

    // ==========================================
    // CONTROL FLOW
    // ==========================================
    OP_JUMP: 37,             // Unconditional jump
    OP_JUMP_IF_FALSE: 38,    // Jump if top of stack is falsy
    OP_JUMP_IF_TRUE: 39,     // Jump if top of stack is truthy
    OP_LOOP: 40,             // Jump backwards (for loops)

    // ==========================================
    // FUNCTIONS
    // ==========================================
    OP_CALL: 41,             // Call function with N args
    OP_RETURN: 42,           // Return from function
    OP_CLOSURE: 43,          // Create closure

    // ==========================================
    // CLASSES
    // ==========================================
    OP_CLASS: 44,            // Define class
    OP_GET_PROPERTY: 45,     // obj.prop
    OP_SET_PROPERTY: 46,     // obj.prop = value
    OP_METHOD: 47,           // Define method
    OP_INVOKE: 48,           // Optimized method call
    OP_INHERIT: 49,          // Setup inheritance
    OP_GET_SUPER: 50,        // Access superclass method

    // ==========================================
    // COLLECTIONS
    // ==========================================
    OP_ARRAY: 51,            // Create array with N elements
    OP_OBJECT: 52,           // Create object with N key-value pairs
    OP_GET_INDEX: 53,        // arr[i]
    OP_SET_INDEX: 54,        // arr[i] = value

    // ==========================================
    // BUILT-INS
    // ==========================================
    OP_PRINT: 55,            // Print value
    OP_NATIVE_CALL: 56,      // Call native function

    // ==========================================
    // DEBUG
    // ==========================================
    OP_DEBUG_BREAK: 57,      // Debugger breakpoint

    // ==========================================
    // OPTIMIZATIONS (Superinstructions)
    // ==========================================
    OP_LOAD_ZERO: 58,        // Push 0
    OP_LOAD_ONE: 59,         // Push 1
    OP_INC_LOCAL: 60,        // Increment local variable (i = i + 1)
} as const;

export type OpCode = typeof OpCode[keyof typeof OpCode];

// ==========================================
// VALUE TYPES
// ==========================================

export type IJeValue =
    | number
    | string
    | boolean
    | null
    | IJeArray
    | IJeObject
    | IJeFunction
    | IJeClosure
    | IJeClass
    | IJeInstance
    | IJeNative
    | IJeBoundMethod;

export interface IJeArray {
    type: 'array';
    elements: IJeValue[];
}

export interface IJeObject {
    type: 'object';
    properties: Map<string, IJeValue>;
}

export interface IJeFunction {
    type: 'function';
    name: string;
    arity: number;          // Number of required parameters
    chunk: Chunk;           // Compiled bytecode
    upvalueCount: number;   // Number of upvalues
}

export interface IJeClosure {
    type: 'closure';
    function: IJeFunction;
    upvalues: Upvalue[];
}

export interface IJeUpvalue {
    location: number;       // Stack slot or closed value
    closed: boolean;
    value?: IJeValue;       // Closed-over value
}

export interface Upvalue {
    index: number;
    isLocal: boolean;
    location: number;
    closed: boolean;
    value?: IJeValue;
}

export interface IJeClass {
    type: 'class';
    name: string;
    methods: Map<string, IJeClosure>;
    superclass?: IJeClass;
}

export interface IJeInstance {
    type: 'instance';
    klass: IJeClass;
    fields: Map<string, IJeValue>;
}

export interface IJeNative {
    type: 'native';
    name: string;
    arity: number;
    fn: (...args: IJeValue[]) => IJeValue | Promise<IJeValue>;
}

export interface IJeBoundMethod {
    type: 'bound_method';
    receiver: IJeInstance;
    method: IJeClosure;
}

// ==========================================
// BYTECODE CHUNK
// ==========================================

export interface Chunk {
    code: number[];         // Bytecode instructions
    constants: IJeValue[];  // Constant pool
    lines: number[];        // Line numbers for each byte (debugging)
    name: string;           // Function/module name
}

export function createChunk(name: string = '<script>'): Chunk {
    return {
        code: [],
        constants: [],
        lines: [],
        name
    };
}

// ==========================================
// CHUNK OPERATIONS
// ==========================================

export function writeChunk(chunk: Chunk, byte: number, line: number): void {
    chunk.code.push(byte);
    chunk.lines.push(line);
}

export function addConstant(chunk: Chunk, value: IJeValue): number {
    // Check if constant already exists
    for (let i = 0; i < chunk.constants.length; i++) {
        if (valuesEqual(chunk.constants[i], value)) {
            return i;
        }
    }

    chunk.constants.push(value);
    return chunk.constants.length - 1;
}

export function valuesEqual(a: IJeValue, b: IJeValue): boolean {
    if (typeof a !== typeof b) return false;

    if (a === null) return b === null;
    if (typeof a === 'number') return a === b;
    if (typeof a === 'string') return a === b;
    if (typeof a === 'boolean') return a === b;

    // For objects, only check reference equality
    return a === b;
}

// ==========================================
// DISASSEMBLER (Debug)
// ==========================================

export function disassembleChunk(chunk: Chunk): string {
    let output = `== ${chunk.name} ==\n`;
    let offset = 0;

    while (offset < chunk.code.length) {
        const result = disassembleInstruction(chunk, offset);
        output += result.text + '\n';
        offset = result.nextOffset;
    }

    return output;
}

export function disassembleInstruction(chunk: Chunk, offset: number): { text: string; nextOffset: number } {
    let text = offset.toString().padStart(4, '0') + ' ';

    // Show line number or | for same line
    if (offset > 0 && chunk.lines[offset] === chunk.lines[offset - 1]) {
        text += '   | ';
    } else {
        text += chunk.lines[offset].toString().padStart(4, ' ') + ' ';
    }

    const instruction = chunk.code[offset];

    switch (instruction) {
        case OpCode.OP_CONSTANT:
            return constantInstruction('OP_CONSTANT', chunk, offset);
        case OpCode.OP_POP:
            return simpleInstruction('OP_POP', offset);
        case OpCode.OP_DUP:
            return simpleInstruction('OP_DUP', offset);
        case OpCode.OP_TRUE:
            return simpleInstruction('OP_TRUE', offset);
        case OpCode.OP_FALSE:
            return simpleInstruction('OP_FALSE', offset);
        case OpCode.OP_NULL:
            return simpleInstruction('OP_NULL', offset);
        case OpCode.OP_ADD:
            return simpleInstruction('OP_ADD', offset);
        case OpCode.OP_SUBTRACT:
            return simpleInstruction('OP_SUBTRACT', offset);
        case OpCode.OP_MULTIPLY:
            return simpleInstruction('OP_MULTIPLY', offset);
        case OpCode.OP_DIVIDE:
            return simpleInstruction('OP_DIVIDE', offset);
        case OpCode.OP_NEGATE:
            return simpleInstruction('OP_NEGATE', offset);
        case OpCode.OP_NOT:
            return simpleInstruction('OP_NOT', offset);
        case OpCode.OP_EQUAL:
            return simpleInstruction('OP_EQUAL', offset);
        case OpCode.OP_GREATER:
            return simpleInstruction('OP_GREATER', offset);
        case OpCode.OP_LESS:
            return simpleInstruction('OP_LESS', offset);
        case OpCode.OP_PRINT:
            return simpleInstruction('OP_PRINT', offset);
        case OpCode.OP_RETURN:
            return simpleInstruction('OP_RETURN', offset);
        case OpCode.OP_DEFINE_GLOBAL:
            return constantInstruction('OP_DEFINE_GLOBAL', chunk, offset);
        case OpCode.OP_GET_GLOBAL:
            return constantInstruction('OP_GET_GLOBAL', chunk, offset);
        case OpCode.OP_SET_GLOBAL:
            return constantInstruction('OP_SET_GLOBAL', chunk, offset);
        case OpCode.OP_GET_LOCAL:
            return byteInstruction('OP_GET_LOCAL', chunk, offset);
        case OpCode.OP_SET_LOCAL:
            return byteInstruction('OP_SET_LOCAL', chunk, offset);
        case OpCode.OP_JUMP:
            return jumpInstruction('OP_JUMP', 1, chunk, offset);
        case OpCode.OP_JUMP_IF_FALSE:
            return jumpInstruction('OP_JUMP_IF_FALSE', 1, chunk, offset);
        case OpCode.OP_LOOP:
            return jumpInstruction('OP_LOOP', -1, chunk, offset);
        case OpCode.OP_CALL:
            return byteInstruction('OP_CALL', chunk, offset);
        default:
            return { text: text + `Unknown opcode ${instruction}`, nextOffset: offset + 1 };
    }
}

function simpleInstruction(name: string, offset: number): { text: string; nextOffset: number } {
    return { text: `${offset.toString().padStart(4, '0')}      ${name}`, nextOffset: offset + 1 };
}

function constantInstruction(name: string, chunk: Chunk, offset: number): { text: string; nextOffset: number } {
    const constant = chunk.code[offset + 1];
    const value = chunk.constants[constant];
    return {
        text: `${offset.toString().padStart(4, '0')}      ${name.padEnd(20)} ${constant.toString().padStart(4)} '${stringifyValue(value)}'`,
        nextOffset: offset + 2
    };
}

function byteInstruction(name: string, chunk: Chunk, offset: number): { text: string; nextOffset: number } {
    const slot = chunk.code[offset + 1];
    return {
        text: `${offset.toString().padStart(4, '0')}      ${name.padEnd(20)} ${slot}`,
        nextOffset: offset + 2
    };
}

function jumpInstruction(name: string, sign: number, chunk: Chunk, offset: number): { text: string; nextOffset: number } {
    const jump = (chunk.code[offset + 1] << 8) | chunk.code[offset + 2];
    const target = offset + 3 + sign * jump;
    return {
        text: `${offset.toString().padStart(4, '0')}      ${name.padEnd(20)} ${offset} -> ${target}`,
        nextOffset: offset + 3
    };
}

function stringifyValue(value: IJeValue): string {
    if (value === null) return 'wang';
    if (typeof value === 'boolean') return value ? 'jing' : 'tej';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.type) {
        switch (value.type) {
            case 'function': return `<kian ${(value as IJeFunction).name}>`;
            case 'closure': return `<kian ${(value as IJeClosure).function.name}>`;
            case 'class': return `<klum ${(value as IJeClass).name}>`;
            case 'instance': return `<${(value as IJeInstance).klass.name} kong>`;
            case 'native': return `<native ${(value as IJeNative).name}>`;
            case 'array': return `[${(value as IJeArray).elements.length} items]`;
            case 'object': return `{${(value as IJeObject).properties.size} keys}`;
        }
    }
    return String(value);
}
