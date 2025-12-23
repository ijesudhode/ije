// ============================================
// IJe Testing Framework - ระบบทดสอบ
// Built-in Testing with Thai-style naming
// ============================================

// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Interpreter, type IJeContext } from './interpreter';
import { registerStdLib, type StdLibContext } from './stdlib';

// ==========================================
// TYPES
// ==========================================

export interface TestCase {
    chue: string;           // name - ชื่อ
    kian: () => Promise<void>;  // function - เขียน
    failMessage?: string;
}

export interface TestResult {
    chue: string;           // name
    phaan: boolean;         // passed - ผ่าน
    weyla: number;          // time in ms - เวลา
    khwamPhid?: string;     // error message - ความผิด
}

export interface TestSuiteResult {
    ruamPhaan: number;      // total passed - รวมผ่าน
    ruamMaiPhaan: number;   // total failed - รวมไม่ผ่าน
    ruamWeyla: number;      // total time - รวมเวลา
    phonLap: TestResult[];  // results - ผลลัพธ์
}

// ==========================================
// ASSERTION FUNCTIONS
// ==========================================

export class AssertionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AssertionError';
    }
}

// ยืนยัน - Assert (generic)
export function yuenyan(condition: boolean, message?: string): void {
    if (!condition) {
        throw new AssertionError(message || 'การยืนยันล้มเหลว (Assertion failed)');
    }
}

// เท่ากัน - Assert equals
export function thaoKan(actual: any, expected: any, message?: string): void {
    if (!deepEqual(actual, expected)) {
        throw new AssertionError(
            message || `คาดหวัง ${JSON.stringify(expected)} แต่ได้ ${JSON.stringify(actual)}`
        );
    }
}

// ไม่เท่ากัน - Assert not equals
export function maiThaoKan(actual: any, expected: any, message?: string): void {
    if (deepEqual(actual, expected)) {
        throw new AssertionError(
            message || `ไม่คาดหวังว่าจะเท่ากับ ${JSON.stringify(expected)}`
        );
    }
}

// จริง - Assert true
export function jing(actual: any, message?: string): void {
    if (actual !== true) {
        throw new AssertionError(message || `คาดหวัง jing (true) แต่ได้ ${actual}`);
    }
}

// เท็จ - Assert false
export function tej(actual: any, message?: string): void {
    if (actual !== false) {
        throw new AssertionError(message || `คาดหวัง tej (false) แต่ได้ ${actual}`);
    }
}

// ว่าง - Assert null/undefined
export function wang(actual: any, message?: string): void {
    if (actual !== null && actual !== undefined) {
        throw new AssertionError(message || `คาดหวัง wang (null) แต่ได้ ${actual}`);
    }
}

// ไม่ว่าง - Assert not null
export function maiWang(actual: any, message?: string): void {
    if (actual === null || actual === undefined) {
        throw new AssertionError(message || `ไม่คาดหวัง wang (null)`);
    }
}

// มากกว่า - Assert greater than
export function makKwa(actual: number, expected: number, message?: string): void {
    if (actual <= expected) {
        throw new AssertionError(
            message || `คาดหวัง ${actual} > ${expected}`
        );
    }
}

// น้อยกว่า - Assert less than
export function noiKwa(actual: number, expected: number, message?: string): void {
    if (actual >= expected) {
        throw new AssertionError(
            message || `คาดหวัง ${actual} < ${expected}`
        );
    }
}

// มี - Assert contains
export function mi(haystack: any[] | string, needle: any, message?: string): void {
    const contains = Array.isArray(haystack)
        ? haystack.includes(needle)
        : haystack.includes(needle);

    if (!contains) {
        throw new AssertionError(
            message || `คาดหวังว่ามี ${JSON.stringify(needle)}`
        );
    }
}

// โยน - Assert throws
export async function yon(fn: () => any | Promise<any>, message?: string): Promise<void> {
    try {
        await fn();
        throw new AssertionError(message || 'คาดหวังว่าจะโยน error แต่ไม่โยน');
    } catch (e) {
        if (e instanceof AssertionError) throw e;
        // Error was thrown as expected
    }
}

// ==========================================
// TEST RUNNER
// ==========================================

export class IJeTestRunner {
    private tests: TestCase[] = [];
    private beforeEach: (() => Promise<void>) | null = null;
    private afterEach: (() => Promise<void>) | null = null;
    private output: (msg: string) => void;

    constructor(output: (msg: string) => void = console.log) {
        this.output = output;
    }

    // ทดสอบ - Define a test
    thod(name: string, fn: () => Promise<void> | void): void {
        this.tests.push({
            chue: name,
            kian: async () => { await fn(); }
        });
    }

    // ก่อนแต่ละ - Before each test
    konTaela(fn: () => Promise<void> | void): void {
        this.beforeEach = async () => { await fn(); };
    }

    // หลังแต่ละ - After each test  
    langTaela(fn: () => Promise<void> | void): void {
        this.afterEach = async () => { await fn(); };
    }

    // วิ่ง - Run all tests
    async wing(): Promise<TestSuiteResult> {
        const results: TestResult[] = [];
        let passed = 0;
        let failed = 0;
        const startTime = Date.now();

        this.output('\n╔══════════════════════════════════════════╗');
        this.output('║       🧪 IJe Test Runner - ทดสอบ          ║');
        this.output('╚══════════════════════════════════════════╝\n');
        this.output(`  Running ${this.tests.length} tests...\n`);

        for (const test of this.tests) {
            const testStart = Date.now();

            try {
                if (this.beforeEach) await this.beforeEach();
                await test.kian();
                if (this.afterEach) await this.afterEach();

                const duration = Date.now() - testStart;
                results.push({
                    chue: test.chue,
                    phaan: true,
                    weyla: duration
                });
                passed++;
                this.output(`  ✅ ${test.chue} (${duration}ms)`);
            } catch (error: any) {
                const duration = Date.now() - testStart;
                results.push({
                    chue: test.chue,
                    phaan: false,
                    weyla: duration,
                    khwamPhid: error.message
                });
                failed++;
                this.output(`  ❌ ${test.chue} (${duration}ms)`);
                this.output(`     └─ ${error.message}`);
            }
        }

        const totalTime = Date.now() - startTime;

        this.output('\n' + '─'.repeat(44));
        this.output(`  📊 Results: ${passed} passed, ${failed} failed`);
        this.output(`  ⏱️  Total time: ${totalTime}ms`);
        this.output('─'.repeat(44) + '\n');

        if (failed === 0) {
            this.output('  🎉 All tests passed! ผ่านทั้งหมด!\n');
        } else {
            this.output(`  😢 ${failed} tests failed\n`);
        }

        return {
            ruamPhaan: passed,
            ruamMaiPhaan: failed,
            ruamWeyla: totalTime,
            phonLap: results
        };
    }

    // รีเซ็ต - Reset tests
    reset(): void {
        this.tests = [];
        this.beforeEach = null;
        this.afterEach = null;
    }
}

// ==========================================
// IJE FILE TEST RUNNER
// ==========================================

export class IJeFileTestRunner {
    private output: (msg: string) => void;

    constructor(output: (msg: string) => void = console.log) {
        this.output = output;
    }

    // วิ่งไฟล์ - Run tests from IJe file
    async wingFile(filePath: string): Promise<TestSuiteResult> {
        const absolutePath = path.resolve(filePath);
        const source = fs.readFileSync(absolutePath, 'utf-8');

        return this.wingSource(source, absolutePath);
    }

    // วิ่งโค้ด - Run tests from source code
    async wingSource(source: string, filename: string = '<test>'): Promise<TestSuiteResult> {
        const tests: TestCase[] = [];
        const results: TestResult[] = [];

        // Create context that captures tests
        const context = this.createTestContext(tests);

        const lexer = new Lexer(source);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const interpreter = new Interpreter(context);
        this.registerTestStdLib(interpreter, tests);
        registerStdLib(interpreter, context);

        // Run the file to collect tests
        await interpreter.interpret(ast);

        // Now run collected tests
        this.output('\n╔══════════════════════════════════════════╗');
        this.output('║       🧪 IJe Test Runner - ทดสอบ          ║');
        this.output('╚══════════════════════════════════════════╝\n');
        this.output(`  File: ${filename}`);
        this.output(`  Running ${tests.length} tests...\n`);

        let passed = 0;
        let failed = 0;
        const startTime = Date.now();

        for (const test of tests) {
            const testStart = Date.now();

            try {
                await test.kian();
                const duration = Date.now() - testStart;
                results.push({ chue: test.chue, phaan: true, weyla: duration });
                passed++;
                this.output(`  ✅ ${test.chue} (${duration}ms)`);
            } catch (error: any) {
                const duration = Date.now() - testStart;
                results.push({ chue: test.chue, phaan: false, weyla: duration, khwamPhid: error.message });
                failed++;
                this.output(`  ❌ ${test.chue} (${duration}ms)`);
                this.output(`     └─ ${error.message}`);
            }
        }

        const totalTime = Date.now() - startTime;

        this.output('\n' + '─'.repeat(44));
        this.output(`  📊 Results: ${passed} passed, ${failed} failed`);
        this.output(`  ⏱️  Total time: ${totalTime}ms`);
        this.output('─'.repeat(44) + '\n');

        return {
            ruamPhaan: passed,
            ruamMaiPhaan: failed,
            ruamWeyla: totalTime,
            phonLap: results
        };
    }

    // วิ่งโฟลเดอร์ - Run all test files in folder
    async wingFolder(folderPath: string, pattern: string = '*.test.ije'): Promise<TestSuiteResult> {
        const absolutePath = path.resolve(folderPath);
        const files = this.findTestFiles(absolutePath, pattern);

        let totalPassed = 0;
        let totalFailed = 0;
        let totalTime = 0;
        const allResults: TestResult[] = [];

        for (const file of files) {
            this.output(`\n📁 ${path.relative(folderPath, file)}`);
            const result = await this.wingFile(file);
            totalPassed += result.ruamPhaan;
            totalFailed += result.ruamMaiPhaan;
            totalTime += result.ruamWeyla;
            allResults.push(...result.phonLap);
        }

        this.output('\n════════════════════════════════════════════');
        this.output(`  📊 TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
        this.output(`  ⏱️  Total time: ${totalTime}ms`);
        this.output('════════════════════════════════════════════\n');

        return {
            ruamPhaan: totalPassed,
            ruamMaiPhaan: totalFailed,
            ruamWeyla: totalTime,
            phonLap: allResults
        };
    }

    private createTestContext(tests: TestCase[]): IJeContext & StdLibContext {
        return {
            output: (msg: any) => {
                // Suppress output during test collection
            },
            clear: () => { },
            vibrate: () => { },
            setTheme: () => { },
            execCommand: async () => { },
            openFile: async () => { },
            input: async () => ''
        };
    }

    private registerTestStdLib(interpreter: Interpreter, tests: TestCase[]): void {
        // thod(name, fn) - Define test
        interpreter.registerNative('thod', async (args: any[]) => {
            const name = String(args[0] || 'Unnamed test');
            const fn = args[1];

            if (fn && typeof fn.call === 'function') {
                tests.push({
                    chue: name,
                    kian: async () => { await fn.call([]); }
                });
            }
            return null;
        });

        // test(name, fn) - Alias
        interpreter.registerNative('test', async (args: any[]) => {
            const name = String(args[0] || 'Unnamed test');
            const fn = args[1];

            if (fn && typeof fn.call === 'function') {
                tests.push({
                    chue: name,
                    kian: async () => { await fn.call([]); }
                });
            }
            return null;
        });

        // Assertions
        interpreter.registerNative('yuenyan', (args: any[]) => {
            yuenyan(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assert', (args: any[]) => {
            yuenyan(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('thaoKan', (args: any[]) => {
            thaoKan(args[0], args[1], args[2]);
            return null;
        });

        interpreter.registerNative('assertEqual', (args: any[]) => {
            thaoKan(args[0], args[1], args[2]);
            return null;
        });

        interpreter.registerNative('maiThaoKan', (args: any[]) => {
            maiThaoKan(args[0], args[1], args[2]);
            return null;
        });

        interpreter.registerNative('assertNotEqual', (args: any[]) => {
            maiThaoKan(args[0], args[1], args[2]);
            return null;
        });

        interpreter.registerNative('assertJing', (args: any[]) => {
            jing(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assertTrue', (args: any[]) => {
            jing(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assertTej', (args: any[]) => {
            tej(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assertFalse', (args: any[]) => {
            tej(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assertWang', (args: any[]) => {
            wang(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assertNull', (args: any[]) => {
            wang(args[0], args[1]);
            return null;
        });

        interpreter.registerNative('assertMi', (args: any[]) => {
            mi(args[0], args[1], args[2]);
            return null;
        });

        interpreter.registerNative('assertContains', (args: any[]) => {
            mi(args[0], args[1], args[2]);
            return null;
        });
    }

    private findTestFiles(dir: string, pattern: string): string[] {
        const files: string[] = [];
        const regex = new RegExp(pattern.replace('*', '.*'));

        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                files.push(...this.findTestFiles(fullPath, pattern));
            } else if (regex.test(entry.name) || entry.name.endsWith('.test.ije')) {
                files.push(fullPath);
            }
        }

        return files;
    }
}

// ==========================================
// HELPERS
// ==========================================

function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, i) => deepEqual(val, b[i]));
    }

    if (typeof a === 'object' && a !== null && b !== null) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => deepEqual(a[key], b[key]));
    }

    return false;
}

// ==========================================
// EXPORTS
// ==========================================

export const assertions = {
    yuenyan, assert: yuenyan,
    thaoKan, assertEqual: thaoKan,
    maiThaoKan, assertNotEqual: maiThaoKan,
    jing, assertTrue: jing,
    tej, assertFalse: tej,
    wang, assertNull: wang,
    maiWang, assertNotNull: maiWang,
    makKwa, assertGreater: makKwa,
    noiKwa, assertLess: noiKwa,
    mi, assertContains: mi,
    yon, assertThrows: yon
};
