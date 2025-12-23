// ============================================
// IJe Diagnostics - ระบบวินิจฉัย
// Beautiful Error Formatting
// ============================================

// @ts-nocheck

// ==========================================
// TYPES
// ==========================================

export interface IJeError {
    rak: 'error' | 'warning' | 'info';  // severity - รัก
    rahat: string;                       // code - รหัส
    khwam: string;                       // message - ข้อความ
    borthat: number;                     // line - บรรทัด
    salaek: number;                      // column - สลัก (column)
    khwamYao?: number;                   // length - ความยาว
    file?: string;                       // filename
    kumnaenam?: string;                  // suggestion - คำแนะนำ
    khwamPhid?: string;                  // underline message - ความผิด
}

export interface DiagnosticOptions {
    siColor: boolean;        // colors - สี
    showSuggestions: boolean;
    showCode: boolean;
    contextLines: number;
}

const DEFAULT_OPTIONS: DiagnosticOptions = {
    siColor: true,
    showSuggestions: true,
    showCode: true,
    contextLines: 2
};

// ==========================================
// COLORS (Terminal)
// ==========================================

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m'
};

// ==========================================
// THAI ERROR MESSAGES
// ==========================================

const ERROR_TITLES: Record<string, string> = {
    // Type errors
    'E0308': 'ประเภทไม่ตรง (Type mismatch)',
    'E0309': 'ไม่สามารถกำหนดค่า (Cannot assign)',
    'E0310': 'ค่าเริ่มต้น for ผิด (Invalid for loop start)',
    'E0311': 'ค่าสิ้นสุด for ผิด (Invalid for loop end)',
    'E0312': 'kuun นอกฟังก์ชัน (Return outside function)',
    'E0313': 'ประเภทค่าคืนไม่ตรง (Return type mismatch)',
    'E0314': 'ตัวแปรไม่ได้ประกาศ (Undeclared variable)',
    'E0315': 'ต้องใช้ตัวเลข (Number required)',
    'E0316': 'ต้องเป็นตัวเลข (Must be number)',
    'E0317': 'เรียกสิ่งที่ไม่ใช่ฟังก์ชัน (Calling non-function)',
    'E0318': 'จำนวน arguments ไม่ตรง (Wrong argument count)',
    'E0319': 'ดัชนีต้องเป็นตัวเลข (Index must be number)',
    'E0320': 'ไม่สามารถเข้าถึง property (Cannot access property)',
    'E0321': 'คลาสไม่พบ (Class not found)',
    'E0322': 'เมธอดไม่พบ (Method not found)',
    'E0323': 'ตัวแปรซ้ำ (Duplicate variable)',
    'E0324': 'ฟังก์ชันซ้ำ (Duplicate function)',
    // Warnings
    'W0101': 'เงื่อนไขควรเป็น bool (Condition should be boolean)',
    'W0102': 'เงื่อนไข while ควรเป็น bool (While condition should be boolean)',
    'W0103': 'เงื่อนไข ternary ควรเป็น bool (Ternary condition should be boolean)',
    'W0104': 'ตัวแปรไม่ได้ใช้ (Unused variable)',
    'W0105': 'ฟังก์ชันไม่ได้ใช้ (Unused function)',
    'W0106': 'โค้ดไม่ถึง (Unreachable code)',
    // Parser errors
    'P0001': 'Syntax Error - ไวยากรณ์ผิดพลาด',
    'P0002': 'Unexpected Token - พบ token ที่ไม่คาดหวัง',
    'P0003': 'Missing Token - ขาด token',
    'P0004': 'วงเล็บไม่ครบ (Unmatched parentheses)',
    'P0005': 'ขาด job ปิดท้าย (Missing job keyword)',
    'P0006': 'คำสั่งไม่สมบูรณ์ (Incomplete statement)',
    // Runtime errors
    'R0001': 'Runtime Error - ข้อผิดพลาดขณะทำงาน',
    'R0002': 'Division by Zero - หารด้วยศูนย์',
    'R0003': 'Stack Overflow - Stack ล้น',
    'R0004': 'Index out of bounds - ดัชนีเกินขอบเขต',
    'R0005': 'Null reference - อ้างอิงค่าว่าง',
    'R0006': 'File not found - ไม่พบไฟล์',
    'R0007': 'Permission denied - ไม่มีสิทธิ์',
    'R0008': 'Network error - ข้อผิดพลาดเครือข่าย',
    // Security errors
    'S0001': 'Security violation -ละเมิดความปลอดภัย',
    'S0002': 'Blocked command - คำสั่งถูกบล็อก',
    'S0003': 'Invalid path - path ไม่ถูกต้อง'
};

// ==========================================
// DIAGNOSTIC REPORTER
// ==========================================

export class IJeDiagnostics {
    private options: DiagnosticOptions;

    constructor(options: Partial<DiagnosticOptions> = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    // รายงาน - Report single error
    raiNgan(error: IJeError, source?: string): string {
        const lines = source ? source.split('\n') : [];
        let output = '';

        // Header
        output += this.formatHeader(error);

        // Location
        output += this.formatLocation(error);

        // Code snippet with context
        if (this.options.showCode && source && error.borthat > 0) {
            output += this.formatCodeSnippet(error, lines);
        }

        // Suggestion
        if (this.options.showSuggestions && error.kumnaenam) {
            output += this.formatSuggestion(error.kumnaenam);
        }

        output += '\n';
        return output;
    }

    // รายงานหลายข้อ - Report multiple errors
    raiNganMot(errors: IJeError[], source?: string): string {
        if (errors.length === 0) {
            return this.color(COLORS.green, '✅ ไม่พบ error\n');
        }

        let output = '';

        for (const error of errors) {
            output += this.raiNgan(error, source);
        }

        // Summary
        const errorCount = errors.filter(e => e.rak === 'error').length;
        const warningCount = errors.filter(e => e.rak === 'warning').length;

        output += this.formatSummary(errorCount, warningCount);

        return output;
    }

    // ==========================================
    // FORMATTING HELPERS
    // ==========================================

    private formatHeader(error: IJeError): string {
        const severity = this.formatSeverity(error.rak);
        const code = error.rahat;
        const title = ERROR_TITLES[code] || error.khwam;

        return `\n${severity}[${code}]: ${title}\n`;
    }

    private formatSeverity(rak: 'error' | 'warning' | 'info'): string {
        switch (rak) {
            case 'error':
                return this.color(COLORS.red + COLORS.bold, '🔥 error');
            case 'warning':
                return this.color(COLORS.yellow + COLORS.bold, '⚠️  warning');
            case 'info':
                return this.color(COLORS.blue + COLORS.bold, 'ℹ️  info');
        }
    }

    private formatLocation(error: IJeError): string {
        const file = error.file || '<source>';
        const location = `${file}:${error.borthat}:${error.salaek}`;

        return `   ${this.color(COLORS.cyan, '──▸')} ${location}\n`;
    }

    private formatCodeSnippet(error: IJeError, lines: string[]): string {
        let output = '    │\n';

        const startLine = Math.max(0, error.borthat - 1 - this.options.contextLines);
        const endLine = Math.min(lines.length, error.borthat + this.options.contextLines);

        for (let i = startLine; i < endLine; i++) {
            const lineNum = (i + 1).toString().padStart(4, ' ');
            const isErrorLine = (i + 1) === error.borthat;
            const line = lines[i] || '';

            if (isErrorLine) {
                // Error line
                output += this.color(COLORS.red, ` ${lineNum} │ `) + line + '\n';

                // Underline
                const padding = ' '.repeat(error.salaek > 0 ? error.salaek - 1 : 0);
                const underline = '^'.repeat(Math.max(1, error.khwamYao || 1));
                const message = error.khwamPhid || error.khwam;

                output += this.color(COLORS.dim, '      │ ');
                output += padding;
                output += this.color(COLORS.red, underline);
                output += ' ' + this.color(COLORS.red, message);
                output += '\n';
            } else {
                // Context line
                output += this.color(COLORS.dim, ` ${lineNum} │ `) + this.color(COLORS.dim, line) + '\n';
            }
        }

        output += '    │\n';
        return output;
    }

    private formatSuggestion(suggestion: string): string {
        return `   ${this.color(COLORS.green, '──▸ help:')} ${suggestion}\n`;
    }

    private formatSummary(errors: number, warnings: number): string {
        let output = '\n' + '─'.repeat(50) + '\n';

        if (errors > 0) {
            output += this.color(COLORS.red, `  ❌ ${errors} error${errors > 1 ? 's' : ''}`);
        }
        if (warnings > 0) {
            if (errors > 0) output += ', ';
            output += this.color(COLORS.yellow, `⚠️ ${warnings} warning${warnings > 1 ? 's' : ''}`);
        }

        output += '\n';
        return output;
    }

    private color(color: string, text: string): string {
        if (!this.options.siColor) return text;
        return color + text + COLORS.reset;
    }
}

// ==========================================
// PARSE ERROR HANDLER
// ==========================================

export class ParseErrorHandler {
    private diagnostics: IJeDiagnostics;
    private errors: IJeError[] = [];
    private source: string = '';

    constructor(source: string, options?: Partial<DiagnosticOptions>) {
        this.source = source;
        this.diagnostics = new IJeDiagnostics(options);
    }

    // เพิ่ม error - Add error
    phuem(error: IJeError): void {
        this.errors.push(error);
    }

    // สร้างจาก parser error
    sangChakParser(message: string, line: number, column: number): void {
        // Parse common error patterns
        let code = 'P0001';
        let khwam = message;
        let kumnaenam: string | undefined;

        if (message.includes('Unexpected')) {
            code = 'P0002';
            kumnaenam = 'ตรวจสอบ syntax และ วงเล็บ';
        } else if (message.includes('Expected')) {
            code = 'P0003';
            const match = message.match(/Expected (.+)/);
            if (match) {
                kumnaenam = `เพิ่ม ${match[1]}`;
            }
        }

        this.phuem({
            rak: 'error',
            rahat: code,
            khwam,
            borthat: line,
            salaek: column,
            kumnaenam
        });
    }

    // แสดง errors ทั้งหมด
    sadaeng(): string {
        return this.diagnostics.raiNganMot(this.errors, this.source);
    }

    // มี error?
    miError(): boolean {
        return this.errors.some(e => e.rak === 'error');
    }

    // รีเซ็ต
    reset(): void {
        this.errors = [];
    }
}

// ==========================================
// RUNTIME ERROR HANDLER
// ==========================================

export class RuntimeErrorHandler {
    private diagnostics: IJeDiagnostics;
    private source: string;

    constructor(source: string, options?: Partial<DiagnosticOptions>) {
        this.source = source;
        this.diagnostics = new IJeDiagnostics(options);
    }

    // รายงาน runtime error
    runtimeError(message: string, line: number): string {
        const error: IJeError = {
            rak: 'error',
            rahat: 'R0001',
            khwam: message,
            borthat: line,
            salaek: 1,
            kumnaenam: this.getSuggestion(message)
        };

        return this.diagnostics.raiNgan(error, this.source);
    }

    private getSuggestion(message: string): string {
        if (message.includes('undefined') || message.includes('not defined')) {
            return 'ตรวจสอบว่าตัวแปรถูกประกาศด้วย ao ... แล้ว';
        }
        if (message.includes('null') || message.includes('wang')) {
            return 'ค่าเป็น wang (null) - ตรวจสอบข้อมูล';
        }
        if (message.includes('type') || message.includes('cannot')) {
            return 'ตรวจสอบประเภทข้อมูลให้ตรงกัน';
        }
        if (message.includes('divide') || message.includes('zero') || message.includes('0')) {
            return 'ไม่สามารถหารด้วย 0 ได้';
        }
        return 'ตรวจสอบโค้ดอีกครั้ง';
    }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function formatError(error: IJeError, source: string): string {
    const diagnostics = new IJeDiagnostics();
    return diagnostics.raiNgan(error, source);
}

export function formatErrors(errors: IJeError[], source: string): string {
    const diagnostics = new IJeDiagnostics();
    return diagnostics.raiNganMot(errors, source);
}

// Quick error creation helpers
export function syntaxError(message: string, line: number, column: number = 1): IJeError {
    return {
        rak: 'error',
        rahat: 'P0001',
        khwam: message,
        borthat: line,
        salaek: column
    };
}

export function typeError(message: string, line: number, column: number = 1, suggestion?: string): IJeError {
    return {
        rak: 'error',
        rahat: 'E0308',
        khwam: message,
        borthat: line,
        salaek: column,
        kumnaenam: suggestion
    };
}

export function runtimeError(message: string, line: number): IJeError {
    return {
        rak: 'error',
        rahat: 'R0001',
        khwam: message,
        borthat: line,
        salaek: 1
    };
}

export function warning(message: string, line: number, column: number = 1): IJeError {
    return {
        rak: 'warning',
        rahat: 'W0001',
        khwam: message,
        borthat: line,
        salaek: column
    };
}
