
// ============================================
// IJe Abstract Syntax Tree (AST) Definitions
// ============================================

export interface Node {
    type: string;
    line?: number;      // Source location for error messages
    column?: number;
}

// ============================================
// STATEMENTS
// ============================================

export type Statement =
    | VarStmt
    | AssignStmt
    | PrintStmt
    | BlockStmt
    | IfStmt
    | WhileStmt
    | ForStmt
    | FunctionStmt
    | ReturnStmt
    | ClassStmt
    | TryStmt
    | ThrowStmt
    | SwitchStmt
    | BreakStmt
    | ContinueStmt
    | ImportStmt
    | ExportStmt
    | ExprStmt;

// ============================================
// EXPRESSIONS
// ============================================

export type Expression =
    | BinaryExpr
    | UnaryExpr
    | LogicalExpr
    | TernaryExpr
    | CallExpr
    | MemberExpr
    | IndexExpr
    | AssignExpr
    | Literal
    | Variable
    | ArrayExpr
    | ObjectExpr
    | FunctionExpr
    | NewExpr
    | ThisExpr
    | AwaitExpr
    | SpreadExpr;

// ============================================
// PROGRAM (Root Node)
// ============================================

export interface Program extends Node {
    type: 'Program';
    body: Statement[];
}

// ============================================
// STATEMENT NODES
// ============================================

// ao name = value OR ao name: type = value
export interface VarStmt extends Node {
    type: 'VarStmt';
    name: string;
    value: Expression;
    typeAnnotation?: string; // Type annotation like 'lek', 'kum', 'list[lek]'
    isConst?: boolean;       // For future 'constant' support
}

// name = value (without ao)
export interface AssignStmt extends Node {
    type: 'AssignStmt';
    name: string;
    value: Expression;
    operator?: string;      // For +=, -=, etc.
}

// da expression, expression, ...
export interface PrintStmt extends Node {
    type: 'PrintStmt';
    expressions: Expression[];
}

// { statements }
export interface BlockStmt extends Node {
    type: 'BlockStmt';
    statements: Statement[];
}

// tha condition ... maichai ... job
export interface IfStmt extends Node {
    type: 'IfStmt';
    condition: Expression;
    thenBranch: BlockStmt;
    elseBranch?: BlockStmt | IfStmt;    // Support else-if chains
}

// wonn condition ... job
export interface WhileStmt extends Node {
    type: 'WhileStmt';
    condition: Expression;
    body: BlockStmt;
}

// wonntak i = 0 tueng 10 ... job
export interface ForStmt extends Node {
    type: 'ForStmt';
    variable: string;
    start: Expression;
    end: Expression;
    step?: Expression;      // Optional step value
    body: BlockStmt;
}

// kian name(params) ... job OR prom kian name(params) ... job
export interface FunctionStmt extends Node {
    type: 'FunctionStmt';
    name: string;
    params: Parameter[];
    body: BlockStmt;
    isAsync?: boolean;      // prom keyword
    returnType?: string;    // For optional type annotations
}

export interface Parameter {
    name: string;
    type?: string;          // Optional type annotation
    defaultValue?: Expression;  // Default parameter value
}

// kuun value
export interface ReturnStmt extends Node {
    type: 'ReturnStmt';
    value?: Expression;
}

// klum ClassName (extends Parent)? ... job
export interface ClassStmt extends Node {
    type: 'ClassStmt';
    name: string;
    superclass?: string;
    body: ClassBody;
}

export interface ClassBody {
    properties: ClassProperty[];
    methods: FunctionStmt[];
    constructor?: FunctionStmt;
}

export interface ClassProperty {
    name: string;
    value?: Expression;
    isPrivate?: boolean;    // # prefix
    isStatic?: boolean;
}

// long ... jab error ... job
export interface TryStmt extends Node {
    type: 'TryStmt';
    tryBlock: BlockStmt;
    catchParam?: string;
    catchBlock?: BlockStmt;
    finallyBlock?: BlockStmt;
}

// throw expression (future)
export interface ThrowStmt extends Node {
    type: 'ThrowStmt';
    value: Expression;
}

// cheek expression ... karani value: ... machangnan: ... job
export interface SwitchStmt extends Node {
    type: 'SwitchStmt';
    discriminant: Expression;
    cases: SwitchCase[];
    defaultCase?: BlockStmt;
}

export interface SwitchCase {
    value: Expression;
    body: BlockStmt;
}

// yut (break)
export interface BreakStmt extends Node {
    type: 'BreakStmt';
}

// toor (continue)
export interface ContinueStmt extends Node {
    type: 'ContinueStmt';
}

// nam "module.ije" ao { name1, name2 }
export interface ImportStmt extends Node {
    type: 'ImportStmt';
    source: string;
    imports: ImportSpecifier[];
    isDefault?: boolean;
}

export interface ImportSpecifier {
    name: string;
    alias?: string;         // nam { foo ao bar } from "module"
}

// song name
export interface ExportStmt extends Node {
    type: 'ExportStmt';
    declaration?: Statement;
    name?: string;
    isDefault?: boolean;
}

// Expression as statement
export interface ExprStmt extends Node {
    type: 'ExprStmt';
    expression: Expression;
}

// ============================================
// EXPRESSION NODES
// ============================================

// left op right (arithmetic, comparison)
export interface BinaryExpr extends Node {
    type: 'BinaryExpr';
    left: Expression;
    operator: string;
    right: Expression;
}

// op operand (!value, -value, ++value, --value)
export interface UnaryExpr extends Node {
    type: 'UnaryExpr';
    operator: string;
    operand: Expression;
    prefix?: boolean;       // ++x vs x++
}

// left && right, left || right
export interface LogicalExpr extends Node {
    type: 'LogicalExpr';
    left: Expression;
    operator: '&&' | '||';
    right: Expression;
}

// condition ? thenExpr : elseExpr
export interface TernaryExpr extends Node {
    type: 'TernaryExpr';
    condition: Expression;
    consequent: Expression;
    alternate: Expression;
}

// callee(args)
export interface CallExpr extends Node {
    type: 'CallExpr';
    callee: Expression;
    args: Expression[];
}

// object.property
export interface MemberExpr extends Node {
    type: 'MemberExpr';
    object: Expression;
    property: string;
    computed?: boolean;     // obj["prop"] vs obj.prop
}

// object[index]
export interface IndexExpr extends Node {
    type: 'IndexExpr';
    object: Expression;
    index: Expression;
}

// target = value (as expression, for chaining)
export interface AssignExpr extends Node {
    type: 'AssignExpr';
    target: Expression;
    operator: string;
    value: Expression;
}

// Primitive literals
export interface Literal extends Node {
    type: 'Literal';
    value: string | number | boolean | null;
    raw?: string;           // Original source text
}

// Variable reference
export interface Variable extends Node {
    type: 'Variable';
    name: string;
}

// [elem1, elem2, ...]
export interface ArrayExpr extends Node {
    type: 'ArrayExpr';
    elements: Expression[];
}

// { key1: value1, key2: value2, ... }
export interface ObjectExpr extends Node {
    type: 'ObjectExpr';
    properties: ObjectProperty[];
}

export interface ObjectProperty {
    key: string | Expression;
    value: Expression;
    computed?: boolean;     // { [expr]: value }
    shorthand?: boolean;    // { name } = { name: name }
}

// kian(params) => expression OR kian(params) ... job
export interface FunctionExpr extends Node {
    type: 'FunctionExpr';
    params: Parameter[];
    body: BlockStmt | Expression;
    isAsync?: boolean;
    isArrow?: boolean;
}

// mai ClassName(args)
export interface NewExpr extends Node {
    type: 'NewExpr';
    callee: Expression;
    args: Expression[];
}

// ni (this)
export interface ThisExpr extends Node {
    type: 'ThisExpr';
}

// ror expression
export interface AwaitExpr extends Node {
    type: 'AwaitExpr';
    argument: Expression;
}

// ...iterable
export interface SpreadExpr extends Node {
    type: 'SpreadExpr';
    argument: Expression;
}

// ============================================
// UTILITY TYPES
// ============================================

export type AnyNode = Program | Statement | Expression;

// Type guard helpers
export function isExpression(node: Node): node is Expression {
    return [
        'BinaryExpr', 'UnaryExpr', 'LogicalExpr', 'TernaryExpr',
        'CallExpr', 'MemberExpr', 'IndexExpr', 'AssignExpr',
        'Literal', 'Variable', 'ArrayExpr', 'ObjectExpr',
        'FunctionExpr', 'NewExpr', 'ThisExpr', 'AwaitExpr', 'SpreadExpr'
    ].includes(node.type);
}

export function isStatement(node: Node): node is Statement {
    return [
        'VarStmt', 'AssignStmt', 'PrintStmt', 'BlockStmt',
        'IfStmt', 'WhileStmt', 'ForStmt', 'FunctionStmt',
        'ReturnStmt', 'ClassStmt', 'TryStmt', 'ThrowStmt',
        'SwitchStmt', 'BreakStmt', 'ContinueStmt',
        'ImportStmt', 'ExportStmt', 'ExprStmt'
    ].includes(node.type);
}

