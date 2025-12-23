
export const TokenType = {
    // ==========================================
    // KEYWORDS (Thai)
    // ==========================================
    AO: 'AO',               // ao = var (เอา)
    DA: 'DA',               // da = print (ดา/พูด)
    THA: 'THA',             // tha = if (ถ้า)
    MAICHAI: 'MAICHAI',     // maichai = else (ไม่ใช่)
    WONN: 'WONN',           // wonn = while (วน)
    JOB: 'JOB',             // job = end block (จบ)
    KIAN: 'KIAN',           // kian = function (เขียน)

    // New keywords for enhanced features
    KUUN: 'KUUN',           // kuun = return (คืน)
    NAM: 'NAM',             // nam = import (นำ)
    SONG: 'SONG',           // song = export (ส่ง)
    KLUM: 'KLUM',           // klum = class (กลุ่ม)
    MAI: 'MAI',             // mai = new (ใหม่)
    NI: 'NI',               // ni = this (นี้)
    LONG: 'LONG',           // long = try (ลอง)
    JAB: 'JAB',             // jab = catch (จับ)
    WONNTAK: 'WONNTAK',     // wonntak = for loop (วนซ้ำ)
    TUENG: 'TUENG',         // tueng = to (ถึง)
    ROR: 'ROR',             // ror = await (รอ)
    PROM: 'PROM',           // prom = async (สัญญา)
    CHEEK: 'CHEEK',         // cheek = switch (เช็ค)
    KARANI: 'KARANI',       // karani = case (กรณี)
    MACHANGNAN: 'MACHANGNAN', // machangnan = default (มิฉะนั้น)
    YUT: 'YUT',             // yut = break (หยุด)
    TOOR: 'TOOR',           // toor = continue (ต่อ)

    // Literals & Booleans
    TRUE: 'TRUE',           // jing = true (จริง)
    FALSE: 'FALSE',         // tej = false (เท็จ)
    NULL: 'NULL',           // wang = null (ว่าง)

    // ==========================================
    // TYPE ANNOTATIONS (Thai)
    // ==========================================
    TYPE_LEK: 'TYPE_LEK',       // lek = number (เลข)
    TYPE_KUM: 'TYPE_KUM',       // kum = string (คำ)
    TYPE_BOOL: 'TYPE_BOOL',     // bool = boolean
    TYPE_WANG: 'TYPE_WANG',     // wang = null (ว่าง)
    TYPE_ANY: 'TYPE_ANY',       // any = any type
    TYPE_LIST: 'TYPE_LIST',     // list = array
    TYPE_KONG: 'TYPE_KONG',     // kong = object (ของ)

    // ==========================================
    // IDENTIFIERS & LITERALS
    // ==========================================
    IDENTIFIER: 'IDENTIFIER',
    NUMBER: 'NUMBER',
    STRING: 'STRING',

    // ==========================================
    // OPERATORS
    // ==========================================
    // Assignment
    ASSIGN: 'ASSIGN',       // =
    PLUS_ASSIGN: 'PLUS_ASSIGN',     // +=
    MINUS_ASSIGN: 'MINUS_ASSIGN',   // -=
    MULT_ASSIGN: 'MULT_ASSIGN',     // *=
    DIV_ASSIGN: 'DIV_ASSIGN',       // /=

    // Arithmetic
    PLUS: 'PLUS',           // +
    MINUS: 'MINUS',         // -
    MULTIPLY: 'MULTIPLY',   // *
    DIVIDE: 'DIVIDE',       // /
    MODULO: 'MODULO',       // %
    POWER: 'POWER',         // **

    // Increment/Decrement
    INCREMENT: 'INCREMENT', // ++
    DECREMENT: 'DECREMENT', // --

    // Comparison
    EQ: 'EQ',               // ==
    NEQ: 'NEQ',             // !=
    GT: 'GT',               // >
    GTE: 'GTE',             // >=
    LT: 'LT',               // <
    LTE: 'LTE',             // <=

    // Logical
    AND: 'AND',             // &&
    OR: 'OR',               // ||
    NOT: 'NOT',             // !

    // Bitwise (for advanced users)
    BIT_AND: 'BIT_AND',     // &
    BIT_OR: 'BIT_OR',       // |
    BIT_XOR: 'BIT_XOR',     // ^
    BIT_NOT: 'BIT_NOT',     // ~
    LSHIFT: 'LSHIFT',       // <<
    RSHIFT: 'RSHIFT',       // >>

    // ==========================================
    // PUNCTUATION
    // ==========================================
    LPAREN: 'LPAREN',       // (
    RPAREN: 'RPAREN',       // )
    LBRACKET: 'LBRACKET',   // [
    RBRACKET: 'RBRACKET',   // ]
    LBRACE: 'LBRACE',       // {
    RBRACE: 'RBRACE',       // }
    COMMA: 'COMMA',         // ,
    DOT: 'DOT',             // .
    COLON: 'COLON',         // :
    SEMICOLON: 'SEMICOLON', // ;
    ARROW: 'ARROW',         // ->
    FAT_ARROW: 'FAT_ARROW', // =>
    QUESTION: 'QUESTION',   // ? (ternary)
    AT: 'AT',               // @ (decorators)
    HASH: 'HASH',           // # (private fields)
    SPREAD: 'SPREAD',       // ... (spread operator)

    // ==========================================
    // SPECIAL
    // ==========================================
    EOF: 'EOF',
    NEWLINE: 'NEWLINE',     // For statement separation
} as const;

export type TokenType = typeof TokenType[keyof typeof TokenType];

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column?: number;         // For better error messages
}

// Helper to check if a token is a keyword
export function isKeyword(type: string): boolean {
    const keywords = [
        TokenType.AO, TokenType.DA, TokenType.THA, TokenType.MAICHAI,
        TokenType.WONN, TokenType.JOB, TokenType.KIAN, TokenType.KUUN,
        TokenType.NAM, TokenType.SONG, TokenType.KLUM, TokenType.MAI,
        TokenType.NI, TokenType.LONG, TokenType.JAB, TokenType.WONNTAK,
        TokenType.TUENG, TokenType.ROR, TokenType.PROM, TokenType.CHEEK,
        TokenType.KARANI, TokenType.MACHANGNAN, TokenType.YUT, TokenType.TOOR,
        TokenType.TRUE, TokenType.FALSE, TokenType.NULL
    ] as string[];
    return keywords.includes(type);
}

