// ============================================
// IJe REPL - ระบบโต้ตอบแบบ Interactive
// Thai-style Interactive Shell
// ============================================

// @ts-nocheck
import * as readline from 'readline';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Interpreter, type IJeContext } from './interpreter';
import { registerStdLib, type StdLibContext } from './stdlib';

// Thai command translations
const COMMANDS = {
    // Exit commands
    'ook': true, 'exit': true, 'quit': true, 'ออก': true,
    // Help commands
    'chui': 'help', 'help': 'help', 'ช่วย': 'help',
    // Clear commands
    'lop': 'clear', 'clear': 'clear', 'ล้าง': 'clear',
    // History
    'prawat': 'history', 'history': 'history', 'ประวัติ': 'history',
    // Variables
    'tuaplae': 'vars', 'vars': 'vars', 'ตัวแปร': 'vars',
    // Reset
    'reset': 'reset', 'mai': 'reset', 'ใหม่': 'reset'
};

export interface REPLOptions {
    context: IJeContext & StdLibContext;
    welcome?: boolean;
    prompt?: string;
}

export class IJeREPL {
    private interpreter: Interpreter;
    private context: IJeContext & StdLibContext;
    private history: string[] = [];
    private rl: readline.Interface | null = null;
    private prompt: string;
    private multilineBuffer: string = '';
    private inMultiline: boolean = false;

    constructor(options: REPLOptions) {
        this.context = options.context;
        this.interpreter = new Interpreter(options.context);
        registerStdLib(this.interpreter, options.context);
        this.prompt = options.prompt || 'ije>>> ';
    }

    // เริ่ม - Start REPL
    async roem(): Promise<void> {
        this.showWelcome();

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: this.prompt,
            historySize: 100
        });

        this.rl.prompt();

        this.rl.on('line', async (line: string) => {
            await this.processLine(line);
            if (this.rl) this.rl.prompt();
        });

        this.rl.on('close', () => {
            console.log('\n👋 ลาก่อน! (Goodbye!)');
            process.exit(0);
        });
    }

    private showWelcome(): void {
        console.log(`
╔══════════════════════════════════════════════════════╗
║           🇹🇭 IJe REPL v2.0 - ภาษาโปรแกรมไทย           ║
╠══════════════════════════════════════════════════════╣
║  พิมพ์ 'chui' หรือ 'help' เพื่อดูคำสั่ง                   ║
║  พิมพ์ 'ook' หรือ 'exit' เพื่อออก                        ║
╚══════════════════════════════════════════════════════╝
`);
    }

    private async processLine(line: string): Promise<void> {
        const input = line.trim();

        // Handle empty input
        if (!input && !this.inMultiline) {
            return;
        }

        // Check for multiline continuation
        if (this.inMultiline) {
            if (input === '' || input === 'job') {
                this.multilineBuffer += '\n' + input;
                if (input === 'job' || this.isComplete(this.multilineBuffer)) {
                    await this.evaluate(this.multilineBuffer);
                    this.multilineBuffer = '';
                    this.inMultiline = false;
                    if (this.rl) this.rl.setPrompt(this.prompt);
                }
            } else {
                this.multilineBuffer += '\n' + input;
            }
            return;
        }

        // Check for commands
        if (this.handleCommand(input)) {
            return;
        }

        // Check if this starts a multiline block
        if (this.startsBlock(input)) {
            this.multilineBuffer = input;
            this.inMultiline = true;
            if (this.rl) this.rl.setPrompt('... ');
            return;
        }

        // Single line evaluation
        await this.evaluate(input);
    }

    private handleCommand(input: string): boolean {
        const lower = input.toLowerCase();

        // Exit commands
        if (COMMANDS[lower] === true) {
            console.log('👋 ลาก่อน! (Goodbye!)');
            process.exit(0);
        }

        const cmd = COMMANDS[lower];
        if (cmd) {
            switch (cmd) {
                case 'help':
                    this.showHelp();
                    return true;
                case 'clear':
                    console.clear();
                    return true;
                case 'history':
                    this.showHistory();
                    return true;
                case 'vars':
                    this.showVariables();
                    return true;
                case 'reset':
                    this.reset();
                    return true;
            }
        }

        return false;
    }

    private showHelp(): void {
        console.log(`
╭─────────────────────────────────────────────────────────╮
│                    📚 คำสั่ง REPL                         │
├─────────────────────────────────────────────────────────┤
│  chui / help     ช่วยเหลือ (Show help)                   │
│  ook / exit      ออก (Exit)                              │
│  lop / clear     ล้างหน้าจอ (Clear screen)                │
│  prawat / history ประวัติคำสั่ง (Command history)         │
│  tuaplae / vars   ดูตัวแปร (Show variables)              │
│  mai / reset     รีเซ็ต (Reset interpreter)              │
├─────────────────────────────────────────────────────────┤
│                    📖 Keywords                           │
├─────────────────────────────────────────────────────────┤
│  ao x = 5        สร้างตัวแปร (Create variable)           │
│  da("สวัสดี")     พิมพ์ (Print)                          │
│  kian foo() job  สร้างฟังก์ชัน (Define function)         │
│  tha x > 0 job   เงื่อนไข (If statement)                 │
│  wonn x < 10 job วนลูป (While loop)                     │
│  klum Cat job    สร้างคลาส (Define class)               │
╰─────────────────────────────────────────────────────────╯
`);
    }

    private showHistory(): void {
        if (this.history.length === 0) {
            console.log('📜 ยังไม่มีประวัติ (No history yet)');
            return;
        }

        console.log('\n📜 ประวัติคำสั่ง (Command History):');
        console.log('─'.repeat(40));
        this.history.slice(-20).forEach((cmd, i) => {
            console.log(`  ${i + 1}. ${cmd}`);
        });
        console.log('─'.repeat(40));
    }

    private showVariables(): void {
        console.log('\n📦 ตัวแปร (Variables):');
        console.log('─'.repeat(40));
        // This would need access to interpreter's environment
        console.log('  (ฟีเจอร์นี้กำลังพัฒนา)');
        console.log('─'.repeat(40));
    }

    private reset(): void {
        this.interpreter = new Interpreter(this.context);
        registerStdLib(this.interpreter, this.context);
        this.history = [];
        console.log('🔄 รีเซ็ตแล้ว! (Reset complete!)');
    }

    private startsBlock(input: string): boolean {
        const blockStarters = ['kian', 'klum', 'tha', 'wonn', 'wonntak', 'long', 'cheek'];
        const firstWord = input.split(/\s+/)[0];
        return blockStarters.includes(firstWord) && !input.includes('job');
    }

    private isComplete(code: string): boolean {
        const opens = (code.match(/\b(kian|klum|tha|wonn|wonntak|long|cheek|karani)\b/g) || []).length;
        const closes = (code.match(/\bjob\b/g) || []).length;
        return opens <= closes;
    }

    private async evaluate(code: string): Promise<void> {
        this.history.push(code);

        try {
            const lexer = new Lexer(code);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            const result = await this.interpreter.interpret(ast);

            if (result !== null && result !== undefined) {
                console.log(`=> ${this.stringify(result)}`);
            }
        } catch (error: any) {
            console.log(`🔥 ${error.message}`);
        }
    }

    private stringify(value: any): string {
        if (value === null) return 'wang';
        if (typeof value === 'boolean') return value ? 'jing' : 'tej';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'string') return `"${value}"`;
        if (Array.isArray(value)) return `[${value.map(v => this.stringify(v)).join(', ')}]`;
        if (typeof value === 'object' && value.type === 'function') return `<kian ${value.declaration?.name || 'anonymous'}>`;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }
}
