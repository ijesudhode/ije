#!/usr/bin/env node
// ============================================
// IJe CLI v2.0 - Command Line Interface
// World-Class Thai Programming Language
// ============================================

// @ts-nocheck - This file uses Node.js APIs
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Interpreter, type IJeContext } from './interpreter';
import { registerStdLib, type StdLibContext } from './stdlib';

// Config interface
interface IJeConfig {
    keywords?: Record<string, string>; // User mapping: "myvar" -> "AO"
}

// Helper to load config
function loadConfig(): IJeConfig | null {
    const configPath = path.resolve('ije.config.json');
    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, '');
            return JSON.parse(content);
        } catch (e: any) {
            console.warn(`⚠️ Failed to load ije.config.json: ${e.message} at ${configPath}`);
        }
    }
    return null;
}

// Helper to convert config keywords to valid TokenType map
function resolveKeywords(config: IJeConfig | null): Record<string, any> | undefined {
    if (!config || !config.keywords) return undefined;
    const { TokenType } = require('./tokens'); // Dynamic require to avoid circular dep issues in some bundlers, though standard import is fine
    const customKeywords: Record<string, any> = {};

    for (const [alias, tokenName] of Object.entries(config.keywords)) {
        // user provides "myvar": "AO"
        // we map "myvar" -> TokenType.AO
        if (TokenType[tokenName]) {
            customKeywords[alias] = TokenType[tokenName];
        }
    }
    return customKeywords;
}

const VERSION = '1.0.1';
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║         🇹🇭 IJe v${VERSION} - Thai Programming Language         ║
║              ภาษาโปรแกรมไทย - World Class                 ║
╚══════════════════════════════════════════════════════════╝
`;

// ==========================================
// CLI CONTEXT
// ==========================================

function createCLIContext(): IJeContext & StdLibContext {
    return {
        output: (msg: any) => {
            if (typeof msg === 'object' && msg !== null) {
                if (msg.type === 'ui_toast') {
                    console.log(`\x1b[33m[TOAST] ${msg.message}\x1b[0m`);
                    return;
                }
                if (msg.type === 'error') {
                    console.log(`\x1b[31m${msg.content}\x1b[0m`);
                    return;
                }
                if (msg.content) {
                    console.log(msg.content);
                    return;
                }
            }
            console.log(msg);
        },
        clear: () => console.clear(),
        vibrate: () => console.log('[VIBRATE]'),
        setTheme: (color: string) => console.log(`[THEME] ${color}`),
        execCommand: async (cmd: string) => {
            const { exec } = await import('child_process');
            return new Promise((resolve, reject) => {
                exec(cmd, (error, stdout, stderr) => {
                    if (stdout) console.log(stdout);
                    if (stderr) console.error(stderr);
                    if (error) reject(error);
                    else resolve();
                });
            });
        },
        openFile: async (path: string) => console.log(`[OPEN] ${path}`),
        readFile: async (pathStr: string) => {
            if (fs.existsSync(pathStr)) {
                return fs.readFileSync(pathStr, 'utf-8');
            }
            throw new Error('File not found');
        },
        writeFile: async (pathStr: string, content: string) => {
            fs.writeFileSync(pathStr, content, 'utf-8');
        },
        exists: (pathStr: string) => fs.existsSync(pathStr),
        remove: (pathStr: string) => {
            if (fs.existsSync(pathStr)) {
                fs.rmSync(pathStr, { recursive: true, force: true });
                return true;
            }
            return false;
        },
        list: (pathStr: string) => {
            if (fs.existsSync(pathStr) && fs.statSync(pathStr).isDirectory()) {
                return fs.readdirSync(pathStr);
            }
            return [];
        },
        input: async () => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            return new Promise<string>((resolve) => {
                rl.question('', (answer: string) => {
                    rl.close();
                    resolve(answer);
                });
            });
        },
        term: async (cmd: string) => console.log(`[TERM] ${cmd}`),
        http: {
            get: async (url: string) => {
                const res = await fetch(url);
                return await res.json();
            },
            post: async (url: string, data: any) => {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                return await res.json();
            }
        }
    };
}

// ==========================================
// RUN FILE
// ==========================================

async function runFile(filePath: string, useVM: boolean = true): Promise<void> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ ไม่พบไฟล์: ${filePath}`);
        process.exit(1);
    }

    const code = fs.readFileSync(absolutePath, 'utf-8');

    console.log(`🚀 Running ${path.basename(filePath)}...`);
    if (useVM) console.log('⚡ VM Mode\n');
    else console.log('\n');


    // Load config
    const config = loadConfig();
    const customKeywords = resolveKeywords(config);

    const lexer = new Lexer(code, customKeywords);
    const tokens = lexer.tokenize();

    // console.log('DEBUG TOKENS:', tokens.map(t => `${t.value} (${t.type})`).join(', '));

    const parser = new Parser(tokens);
    const ast = parser.parse();

    if (useVM) {
        // Use bytecode VM for faster execution
        try {
            const { Compiler } = await import('./runtime/compiler');
            const { VM } = await import('./runtime/vm');
            const { createVMNatives } = await import('./runtime/natives');

            const compiler = new Compiler();
            const func = compiler.compile(ast);

            if (func) {
                const context = createCLIContext();
                const natives = createVMNatives(context);
                const vm = new VM({
                    output: (msg) => console.log(msg),
                    natives: natives
                });
                await vm.run(func);
            } else {
                console.log('⚠️ Compilation failed, falling back to interpreter');
                await runWithInterpreter(ast, filePath);
            }
        } catch (e: any) {
            console.log(`❌ VM FAILED (${e.message}) - FALLBACK TO INTERPRETER`);
            await runWithInterpreter(ast, filePath);
        }
    } else {
        await runWithInterpreter(ast, filePath);
    }

    console.log('\n✅ Done');
    process.exit(0);
}

async function runWithInterpreter(ast: any, filePath?: string): Promise<void> {
    const context = createCLIContext();
    const interpreter = new Interpreter(context);

    // Setup module loader
    try {
        const { createModuleLoader, builtinModules } = await import('./module-loader');
        const basePath = filePath ? path.dirname(path.resolve(filePath)) : process.cwd();
        const moduleLoader = createModuleLoader(basePath);

        // Register built-in modules
        interpreter.defineVar('thai', builtinModules.thai);
        interpreter.defineVar('math', builtinModules.math);
        interpreter.defineVar('http', builtinModules.http);
        interpreter.defineVar('file', builtinModules.fs);

        // Register module loader function for 'nam' imports
        interpreter.registerNative('__loadModule', (args: any[]) => {
            const moduleName = String(args[0] || '');
            return moduleLoader.load(moduleName);
        });

        // Make modules available via globals
        context.moduleLoader = moduleLoader;
    } catch (e) {
        // Module loader not available, continue without it
    }

    registerStdLib(interpreter, context);
    await interpreter.interpret(ast);
}

// ==========================================
// REPL
// ==========================================

async function startREPL(): Promise<void> {
    try {
        const { IJeREPL } = await import('./repl');
        const context = createCLIContext();
        const repl = new IJeREPL({ context });
        await repl.roem();
    } catch (e) {
        // Fallback to simple REPL
        console.log('╔════════════════════════════════════════╗');
        console.log('║          IJe REPL v2.0                ║');
        console.log('║  พิมพ์โค้ด IJe, "help" เพื่อดูคำสั่ง     ║');
        console.log('║  พิมพ์ "exit" เพื่อออก                  ║');
        console.log('╚════════════════════════════════════════╝\n');

        const context = createCLIContext();
        const interpreter = new Interpreter(context);
        registerStdLib(interpreter, context);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'ije> '
        });

        rl.prompt();

        rl.on('line', async (line: string) => {
            const input = line.trim();

            if (input === 'exit' || input === 'quit' || input === 'ook') {
                console.log('👋 ลาก่อน!');
                process.exit(0);
            }

            if (input === 'help' || input === 'chui') {
                console.log(`
IJe Commands:
  help   - ดูคำสั่ง
  exit   - ออก
  clear  - ล้างหน้าจอ

IJe Keywords:
  ao     - สร้างตัวแปร
  da     - print
  kian   - สร้างฟังก์ชัน
  tha    - if
  wonn   - while
`);
                rl.prompt();
                return;
            }

            if (input === 'clear' || input === 'lop') {
                console.clear();
                rl.prompt();
                return;
            }

            if (!input) {
                rl.prompt();
                return;
            }

            try {
                const lexer = new Lexer(input);
                const tokens = lexer.tokenize();
                const parser = new Parser(tokens);
                const ast = parser.parse();

                const result = await interpreter.interpret(ast);
                if (result !== null && result !== undefined) {
                    console.log(`=> ${result}`);
                }
            } catch (error: any) {
                console.error(`🔥 ${error.message}`);
            }

            rl.prompt();
        });
    }
}

// ==========================================
// FORMAT
// ==========================================

async function formatFiles(files: string[], check: boolean = false): Promise<void> {
    try {
        const { IJeFormatter } = await import('./formatter');
        const formatter = new IJeFormatter();

        let hasIssues = false;

        for (const file of files) {
            const absolutePath = path.resolve(file);

            if (!fs.existsSync(absolutePath)) {
                console.error(`❌ ไม่พบไฟล์: ${file}`);
                continue;
            }

            const source = fs.readFileSync(absolutePath, 'utf-8');

            if (check) {
                const result = formatter.truatSob(source);
                if (result.needsFormat) {
                    console.log(`❌ ${file} ต้องการ format`);
                    hasIssues = true;
                } else {
                    console.log(`✅ ${file}`);
                }
            } else {
                const formatted = formatter.chatRoop(source);
                fs.writeFileSync(absolutePath, formatted, 'utf-8');
                console.log(`✨ Formatted: ${file}`);
            }
        }

        if (check && hasIssues) {
            process.exit(1);
        }
    } catch (e: any) {
        console.error(`❌ Format error: ${e.message}`);
        process.exit(1);
    }
}

// ==========================================
// TYPE CHECK
// ==========================================

async function typeCheck(files: string[]): Promise<void> {
    try {
        const { IJeTypeChecker } = await import('./type-checker');

        let hasErrors = false;

        for (const file of files) {
            const absolutePath = path.resolve(file);

            if (!fs.existsSync(absolutePath)) {
                console.error(`❌ ไม่พบไฟล์: ${file}`);
                continue;
            }

            const source = fs.readFileSync(absolutePath, 'utf-8');
            const lexer = new Lexer(source);
            const tokens = lexer.tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            const checker = new IJeTypeChecker();
            const errors = checker.truat(ast);

            if (errors.length > 0) {
                hasErrors = true;
                console.log(`\n📄 ${file}:`);

                for (const error of errors) {
                    const icon = error.code?.startsWith('W') ? '⚠️' : '❌';
                    console.log(`  ${icon} [${error.code}] Line ${error.borthat}: ${error.khwam}`);
                    if (error.kumnaenam) {
                        console.log(`     💡 ${error.kumnaenam}`);
                    }
                }
            } else {
                console.log(`✅ ${file} - ไม่พบ error`);
            }
        }

        if (hasErrors) {
            process.exit(1);
        }
    } catch (e: any) {
        console.error(`❌ Type check error: ${e.message}`);
        process.exit(1);
    }
}

// ==========================================
// RUN TESTS
// ==========================================

async function runTests(pattern?: string): Promise<void> {
    try {
        const { IJeFileTestRunner } = await import('./testing');
        const runner = new IJeFileTestRunner();

        if (pattern) {
            if (fs.statSync(pattern).isDirectory()) {
                const result = await runner.wingFolder(pattern);
                process.exit(result.ruamMaiPhaan > 0 ? 1 : 0);
            } else {
                const result = await runner.wingFile(pattern);
                process.exit(result.ruamMaiPhaan > 0 ? 1 : 0);
            }
        } else {
            // Find test files in current directory
            const testFiles = findTestFiles('.');

            if (testFiles.length === 0) {
                console.log('📭 ไม่พบไฟล์ test (*.test.ije)');
                return;
            }

            let totalPassed = 0;
            let totalFailed = 0;

            for (const file of testFiles) {
                const result = await runner.wingFile(file);
                totalPassed += result.ruamPhaan;
                totalFailed += result.ruamMaiPhaan;
            }

            process.exit(totalFailed > 0 ? 1 : 0);
        }
    } catch (e: any) {
        console.error(`❌ Test error: ${e.message}`);
        process.exit(1);
    }
}

function findTestFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            files.push(...findTestFiles(fullPath));
        } else if (entry.name.endsWith('.test.ije')) {
            files.push(fullPath);
        }
    }

    return files;
}

// ==========================================
// PACKAGE MANAGER
// ==========================================

async function runPak(args: string[]): Promise<void> {
    try {
        const { runPakCLI } = await import('./pak');
        await runPakCLI(args);
    } catch (e: any) {
        console.error(`❌ Pak error: ${e.message}`);
        process.exit(1);
    }
}

// ==========================================
// HELP
// ==========================================

function showHelp(): void {
    console.log(BANNER);
    console.log(`
Usage: ije <command> [options]

Commands:
  <file.ije>            รันไฟล์ IJe (Run file)
  repl                  เปิด REPL (Interactive shell)
  
  fmt <files...>        จัดรูปแบบโค้ด (Format code)
  fmt --check <files>   ตรวจสอบ format
  
  check <files...>      ตรวจสอบ types (Type check)
  
  test [pattern]        รัน tests (Run tests)
  
  pak/pkg <command>     จัดการ packages
    pak init            สร้างโปรเจค
    pak install [name]  ติดตั้ง package
    pak uninstall <n>   ถอน package
    pak list            รายการ packages

Options:
  --vm              ใช้ bytecode VM (faster)
  --help, -h        ดูคำสั่ง
  --version, -v     ดูเวอร์ชัน

Examples:
  ije app.ije           รันไฟล์
  ije app.ije --vm      รันด้วย VM
  ije repl              เปิด REPL
  ije fmt src/*.ije     format ไฟล์
  ije check app.ije     type check
  ije test              รัน tests
  ije pak install foo   ติดตั้ง package
`);
}

// ==========================================
// MAIN
// ==========================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        await startREPL();
        return;
    }

    const command = args[0];

    switch (command) {
        case '--help':
        case '-h':
        case 'help':
        case 'chui':
            showHelp();
            break;

        case '--version':
        case '-v':
        case 'version':
        case 'ruun':
            console.log(`IJe v${VERSION}`);
            break;

        case 'repl':
        case 'run':
            await startREPL();
            break;

        case 'fmt':
        case 'format':
        case 'chatRoop':
            {
                const check = args.includes('--check');
                const files = args.slice(1).filter(a => !a.startsWith('--'));
                if (files.length === 0) {
                    console.error('❌ ระบุไฟล์ที่ต้องการ format');
                    process.exit(1);
                }
                await formatFiles(files, check);
            }
            break;

        case 'check':
        case 'truat':
            {
                const files = args.slice(1).filter(a => !a.startsWith('--'));
                if (files.length === 0) {
                    console.error('❌ ระบุไฟล์ที่ต้องการตรวจสอบ');
                    process.exit(1);
                }
                await typeCheck(files);
            }
            break;

        case 'test':
        case 'thod':
            await runTests(args[1]);
            break;

        case 'pak':
        case 'pkg':
            await runPak(args.slice(1));
            break;

        default:
            // Check if it's a file
            if (command.endsWith('.ije') || fs.existsSync(command)) {
                const useInterpreter = args.includes('--no-vm') || args.includes('--interpret');
                await runFile(command, !useInterpreter);
            } else {
                console.error(`❌ Unknown command: ${command}`);
                console.log('Use "ije --help" for a list of commands');
                process.exit(1);
            }
    }
}

main().catch((err: Error) => {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
});
