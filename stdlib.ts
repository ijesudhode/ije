
// Polyfill for localStorage in Node.js environment
if (typeof localStorage === "undefined" || localStorage === null) {
    (global as any).localStorage = new class {
        store: Record<string, string> = {};
        getItem(key: string) { return this.store[key] || null; }
        setItem(key: string, value: string) { this.store[key] = value; }
        removeItem(key: string) { delete this.store[key]; }
        clear() { this.store = {}; }
    }();
}

import { Interpreter } from './interpreter';
import {
    SecurityManager, SecurityLevel, Permission, SecurityError,
    globalSecurity, cryptoManager, rateLimiter, securityLogger,
    cspGenerator, sandboxRunner
} from './security';

// ============================================
// IJe Standard Library
// ============================================

// Security manager instance (can be overridden)
let security: SecurityManager = globalSecurity;

export interface StdLibContext {
    output: (content: any) => void;
    clear: () => void;
    vibrate: () => void;
    setTheme: (color: string) => void;
    execCommand: (cmd: string) => Promise<void>;
    openFile: (path: string) => Promise<void>;
    readFile?: (path: string) => Promise<string>;
    writeFile?: (path: string, content: string) => Promise<void>;
    exists?: (path: string) => boolean;
    remove?: (path: string) => boolean;
    list?: (path: string) => string[];
    stat?: (path: string) => any;
    input?: () => Promise<string>;
    http?: {
        get: (url: string) => Promise<any>;
        post: (url: string, data: any) => Promise<any>;
    };
    securityLevel?: SecurityLevel;
}

export function registerStdLib(interpreter: Interpreter, context: StdLibContext) {
    // Initialize security with context level
    if (context.securityLevel) {
        security = new SecurityManager(context.securityLevel);
    }
    // ==========================================
    // SYSTEM FUNCTIONS
    // ==========================================

    // klea() - Clear terminal
    interpreter.registerNative('klea', () => {
        context.clear();
        return null;
    });

    // print() - Print to output (alias for da)
    interpreter.registerNative('print', (args: any[]) => {
        const output = args.map(arg => String(arg)).join(' ');
        context.output(output);
        return null;
    });

    // sann() - Vibrate device
    interpreter.registerNative('sann', () => {
        context.vibrate();
        return null;
    });

    // si(hexColor) - Change theme accent color
    interpreter.registerNative('si', (args: any[]) => {
        if (args.length > 0) {
            context.setTheme(String(args[0]));
        }
        return null;
    });

    // term(command) - Execute system command [SECURED]
    interpreter.registerNative('term', async (args: any[]) => {
        if (args.length > 0) {
            const cmd = String(args[0]);
            try {
                security.validateCommand(cmd);
                await context.execCommand(cmd);
            } catch (e) {
                if (e instanceof SecurityError) {
                    context.output({ type: 'error', content: e.message });
                    return { error: e.message, blocked: true };
                }
                throw e;
            }
        }
        return null;
    });

    // open(filePath) - Open file in editor
    interpreter.registerNative('open', async (args: any[]) => {
        if (args.length > 0) {
            await context.openFile(String(args[0]));
        }
        return null;
    });

    // ==========================================
    // I/O FUNCTIONS
    // ==========================================

    // tang(prompt?) - Get user input with optional prompt
    interpreter.registerNative('tang', async (args: any[]) => {
        const prompt = args.length > 0 ? String(args[0]) : '';
        if (prompt) {
            // Print prompt without newline
            process.stdout?.write?.(prompt);
        }
        if (context.input) {
            return await context.input();
        }
        return '';
    });

    // an(path) - Read file contents [SECURED]
    interpreter.registerNative('an', async (args: any[]) => {
        if (context.readFile && args.length > 0) {
            const path = String(args[0]);
            try {
                security.validatePath(path, false);
                return await context.readFile(path);
            } catch (e) {
                if (e instanceof SecurityError) {
                    context.output({ type: 'error', content: e.message });
                    return { error: e.message, blocked: true };
                }
                throw e;
            }
        }
        return '';
    });

    // kian(path, content) - Write to file [SECURED]
    interpreter.registerNative('kiann', async (args: any[]) => {
        if (context.writeFile && args.length >= 2) {
            const path = String(args[0]);
            const content = String(args[1]);
            try {
                security.validatePath(path, true);
                security.validateStringLength(content);
                await context.writeFile(path, content);
            } catch (e) {
                if (e instanceof SecurityError) {
                    context.output({ type: 'error', content: e.message });
                    return { error: e.message, blocked: true };
                }
                throw e;
            }
        }
        return null;
    });

    // ==========================================
    // FILE MODULE (New)
    // ==========================================

    const fileObj = {
        read: {
            call: async (args: any[]) => {
                if (context.readFile && args.length > 0) {
                    try {
                        const path = String(args[0]);
                        security.validatePath(path, false);
                        return await context.readFile(path);
                    } catch (e: any) {
                        return null; // Return null on error
                    }
                }
                return null;
            }
        },
        write: {
            call: async (args: any[]) => {
                if (context.writeFile && args.length > 1) {
                    try {
                        const path = String(args[0]);
                        const content = String(args[1]);
                        security.validatePath(path, true);
                        await context.writeFile(path, content);
                        return true;
                    } catch (e: any) {
                        return false;
                    }
                }
                return false;
            }
        },
        exists: {
            call: (args: any[]) => {
                if (context.exists && args.length > 0) {
                    try {
                        const path = String(args[0]);
                        security.validatePath(path, false);
                        return context.exists(path);
                    } catch (e) {
                        return false;
                    }
                }
                return false;
            }
        },
        remove: {
            call: (args: any[]) => {
                if (context.remove && args.length > 0) {
                    try {
                        const path = String(args[0]);
                        security.validatePath(path, true);
                        return context.remove(path);
                    } catch (e) {
                        return false;
                    }
                }
                return false;
            }
        },
        list: {
            call: (args: any[]) => {
                if (context.list && args.length > 0) {
                    try {
                        const path = String(args[0]);
                        security.validatePath(path, false);
                        return context.list(path);
                    } catch (e) {
                        return [];
                    }
                }
                return [];
            }
        }
    };
    interpreter.defineVar('file', fileObj);

    // ==========================================
    // TYPE FUNCTIONS
    // ==========================================

    // praped(value) - Get type of value
    interpreter.registerNative('praped', (args: any[]) => {
        const val = args[0];
        if (val === null || val === undefined) return 'wang';
        if (typeof val === 'number') return 'lek';
        if (typeof val === 'string') return 'kaw';
        if (typeof val === 'boolean') return 'bool';
        if (Array.isArray(val)) return 'list';
        if (val.type === 'instance') return 'kong';
        if (val.type === 'class') return 'klum';
        if (val.type === 'function') return 'kab';
        if (typeof val === 'object') return 'kong';
        return 'unknown';
    });

    // now() - Get current timestamp in milliseconds
    interpreter.registerNative('now', () => {
        return Date.now();
    });

    // time() - Get current time as ISO string
    interpreter.registerNative('time', () => {
        return new Date().toISOString();
    });

    // len(value) - Get length of array or string
    interpreter.registerNative('len', (args: any[]) => {
        const val = args[0];
        if (val === null || val === undefined) return 0;
        if (Array.isArray(val)) return val.length;
        if (typeof val === 'string') return val.length;
        if (typeof val === 'object') return Object.keys(val).length;
        return 0;
    });

    // push(arr, ...items) - Add items to array
    interpreter.registerNative('push', (args: any[]) => {
        const arr = args[0];
        if (!Array.isArray(arr)) return 0;
        arr.push(...args.slice(1));
        return arr.length;
    });

    // pop(arr) - Remove last item from array
    interpreter.registerNative('pop', (args: any[]) => {
        const arr = args[0];
        if (!Array.isArray(arr)) return null;
        return arr.pop();
    });

    // shift(arr) - Remove first item from array
    interpreter.registerNative('shift', (args: any[]) => {
        const arr = args[0];
        if (!Array.isArray(arr)) return null;
        return arr.shift();
    });

    // lek(value) - Convert to number
    const lekFunc = (args: any[]) => {
        const val = args[0];
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        if (typeof val === 'boolean') return val ? 1 : 0;
        return 0;
    };

    // kaw(value) - Convert to string
    const kawFunc = (args: any[]) => {
        const val = args[0];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) return JSON.stringify(val);
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    // ==========================================
    // MATH FUNCTIONS
    // ==========================================

    // Register math namespace
    const mathObj = {
        type: 'native',
        call: lekFunc,
        toString: () => '<native fn lek>',
        pi: { call: () => Math.PI },
        e: { call: () => Math.E },
        sum: { call: (args: any[]) => args[0]?.reduce((a: number, b: number) => a + b, 0) ?? 0 },
        round: { call: (args: any[]) => Math.round(args[0] ?? 0) },
        floor: { call: (args: any[]) => Math.floor(args[0] ?? 0) },
        ceil: { call: (args: any[]) => Math.ceil(args[0] ?? 0) },
        abs: { call: (args: any[]) => Math.abs(args[0] ?? 0) },
        min: { call: (args: any[]) => Math.min(...(Array.isArray(args[0]) ? args[0] : args)) },
        max: { call: (args: any[]) => Math.max(...(Array.isArray(args[0]) ? args[0] : args)) },
        pow: { call: (args: any[]) => Math.pow(args[0] ?? 0, args[1] ?? 1) },
        sqrt: { call: (args: any[]) => Math.sqrt(args[0] ?? 0) },
        sin: { call: (args: any[]) => Math.sin(args[0] ?? 0) },
        cos: { call: (args: any[]) => Math.cos(args[0] ?? 0) },
        tan: { call: (args: any[]) => Math.tan(args[0] ?? 0) },
        log: { call: (args: any[]) => Math.log(args[0] ?? 1) },
        random: { call: () => Math.random() },
        randomInt: {
            call: (args: any[]) => {
                const min = args[0] ?? 0;
                const max = args[1] ?? 100;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
        }
    };
    interpreter.defineVar('lek', mathObj);

    // ==========================================
    // STRING FUNCTIONS
    // ==========================================

    const stringObj = {
        type: 'native',
        call: kawFunc,
        toString: () => '<native fn kaw>',
        len: { call: (args: any[]) => String(args[0] ?? '').length },
        upper: { call: (args: any[]) => String(args[0] ?? '').toUpperCase() },
        lower: { call: (args: any[]) => String(args[0] ?? '').toLowerCase() },
        trim: { call: (args: any[]) => String(args[0] ?? '').trim() },
        split: { call: (args: any[]) => String(args[0] ?? '').split(args[1] ?? '') },
        join: { call: (args: any[]) => (args[0] ?? []).join(args[1] ?? '') },
        replace: { call: (args: any[]) => String(args[0] ?? '').replace(args[1] ?? '', args[2] ?? '') },
        includes: { call: (args: any[]) => String(args[0] ?? '').includes(args[1] ?? '') },
        startsWith: { call: (args: any[]) => String(args[0] ?? '').startsWith(args[1] ?? '') },
        endsWith: { call: (args: any[]) => String(args[0] ?? '').endsWith(args[1] ?? '') },
        slice: { call: (args: any[]) => String(args[0] ?? '').slice(args[1] ?? 0, args[2]) },
        repeat: { call: (args: any[]) => String(args[0] ?? '').repeat(args[1] ?? 1) },
        charAt: { call: (args: any[]) => String(args[0] ?? '').charAt(args[1] ?? 0) },
        charCode: { call: (args: any[]) => String(args[0] ?? '').charCodeAt(args[1] ?? 0) },
        fromCharCode: { call: (args: any[]) => String.fromCharCode(args[0] ?? 0) }
    };
    interpreter.defineVar('kaw', stringObj);

    // ==========================================
    // ARRAY FUNCTIONS
    // ==========================================

    const arrayObj = {
        len: { call: (args: any[]) => (args[0] ?? []).length },
        push: {
            call: (args: any[]) => {
                const arr = args[0] ?? [];
                arr.push(...args.slice(1));
                return arr.length;
            }
        },
        pop: { call: (args: any[]) => (args[0] ?? []).pop() },
        shift: { call: (args: any[]) => (args[0] ?? []).shift() },
        unshift: {
            call: (args: any[]) => {
                const arr = args[0] ?? [];
                arr.unshift(...args.slice(1));
                return arr.length;
            }
        },
        slice: { call: (args: any[]) => (args[0] ?? []).slice(args[1] ?? 0, args[2]) },
        concat: { call: (args: any[]) => (args[0] ?? []).concat(...args.slice(1)) },
        indexOf: { call: (args: any[]) => (args[0] ?? []).indexOf(args[1]) },
        includes: { call: (args: any[]) => (args[0] ?? []).includes(args[1]) },
        reverse: { call: (args: any[]) => [...(args[0] ?? [])].reverse() },
        sort: { call: (args: any[]) => [...(args[0] ?? [])].sort((a, b) => a - b) },
        sortDesc: { call: (args: any[]) => [...(args[0] ?? [])].sort((a, b) => b - a) },
        filter: {
            call: async (args: any[]) => {
                const arr = args[0] ?? [];
                const fn = args[1];
                if (!fn || typeof fn.call !== 'function') return arr;
                const result = [];
                for (let i = 0; i < arr.length; i++) {
                    if (await fn.call([arr[i], i])) {
                        result.push(arr[i]);
                    }
                }
                return result;
            }
        },
        map: {
            call: async (args: any[]) => {
                const arr = args[0] ?? [];
                const fn = args[1];
                if (!fn || typeof fn.call !== 'function') return arr;
                const result = [];
                for (let i = 0; i < arr.length; i++) {
                    result.push(await fn.call([arr[i], i]));
                }
                return result;
            }
        },
        reduce: {
            call: async (args: any[]) => {
                const arr = args[0] ?? [];
                const fn = args[1];
                let acc = args[2] ?? arr[0];
                const startIdx = args[2] !== undefined ? 0 : 1;
                if (!fn || typeof fn.call !== 'function') return acc;
                for (let i = startIdx; i < arr.length; i++) {
                    acc = await fn.call([acc, arr[i], i]);
                }
                return acc;
            }
        },
        find: {
            call: async (args: any[]) => {
                const arr = args[0] ?? [];
                const fn = args[1];
                if (!fn || typeof fn.call !== 'function') return null;
                for (let i = 0; i < arr.length; i++) {
                    if (await fn.call([arr[i], i])) {
                        return arr[i];
                    }
                }
                return null;
            }
        },
        every: {
            call: async (args: any[]) => {
                const arr = args[0] ?? [];
                const fn = args[1];
                if (!fn || typeof fn.call !== 'function') return true;
                for (let i = 0; i < arr.length; i++) {
                    if (!(await fn.call([arr[i], i]))) {
                        return false;
                    }
                }
                return true;
            }
        },
        some: {
            call: async (args: any[]) => {
                const arr = args[0] ?? [];
                const fn = args[1];
                if (!fn || typeof fn.call !== 'function') return false;
                for (let i = 0; i < arr.length; i++) {
                    if (await fn.call([arr[i], i])) {
                        return true;
                    }
                }
                return false;
            }
        },
        range: {
            call: (args: any[]) => {
                const start = args[0] ?? 0;
                const end = args[1] ?? 10;
                const step = args[2] ?? 1;
                const result = [];
                for (let i = start; step > 0 ? i < end : i > end; i += step) {
                    result.push(i);
                }
                return result;
            }
        }
    };
    interpreter.defineVar('list', arrayObj);

    // ==========================================
    // OBJECT FUNCTIONS
    // ==========================================

    const objectObj = {
        keys: { call: (args: any[]) => Object.keys(args[0] ?? {}) },
        values: { call: (args: any[]) => Object.values(args[0] ?? {}) },
        entries: { call: (args: any[]) => Object.entries(args[0] ?? {}) },
        has: { call: (args: any[]) => (args[0] ?? {}).hasOwnProperty?.(args[1]) ?? false },
        merge: { call: (args: any[]) => Object.assign({}, ...args) },
        clone: { call: (args: any[]) => JSON.parse(JSON.stringify(args[0] ?? {})) }
    };
    interpreter.defineVar('kong', objectObj);

    // ==========================================
    // JSON FUNCTIONS
    // ==========================================

    const jsonObj = {
        parse: {
            call: (args: any[]) => {
                try {
                    return JSON.parse(args[0] ?? '{}');
                } catch {
                    return null;
                }
            }
        },
        stringify: { call: (args: any[]) => JSON.stringify(args[0], null, args[1] ?? 0) }
    };
    interpreter.defineVar('json', jsonObj);

    // ==========================================
    // TIME FUNCTIONS
    // ==========================================

    const timeObj = {
        now: { call: () => Date.now() },
        date: { call: () => new Date().toISOString() },
        year: { call: () => new Date().getFullYear() },
        month: { call: () => new Date().getMonth() + 1 },
        day: { call: () => new Date().getDate() },
        hour: { call: () => new Date().getHours() },
        minute: { call: () => new Date().getMinutes() },
        second: { call: () => new Date().getSeconds() },
        sleep: { call: (args: any[]) => new Promise(resolve => setTimeout(resolve, args[0] ?? 1000)) },
        format: {
            call: (args: any[]) => {
                const date = args[0] ? new Date(args[0]) : new Date();
                return date.toLocaleString('th-TH');
            }
        }
    };
    interpreter.defineVar('wela', timeObj);

    // ==========================================
    // HTTP FUNCTIONS
    // ==========================================

    if (context.http) {
        const httpObj = {
            get: {
                call: async (args: any[]) => {
                    const url = String(args[0] ?? '');
                    try {
                        security.validateURL(url);
                        return await context.http!.get(url);
                    } catch (e) {
                        if (e instanceof SecurityError) {
                            context.output({ type: 'error', content: e.message });
                            return { error: e.message, blocked: true };
                        }
                        return { error: (e as Error).message };
                    }
                }
            },
            post: {
                call: async (args: any[]) => {
                    const url = String(args[0] ?? '');
                    try {
                        security.validateURL(url);
                        return await context.http!.post(url, args[1] ?? {});
                    } catch (e) {
                        if (e instanceof SecurityError) {
                            context.output({ type: 'error', content: e.message });
                            return { error: e.message, blocked: true };
                        }
                        return { error: (e as Error).message };
                    }
                }
            }
        };
        interpreter.defineVar('http', httpObj);
    }

    // ==========================================
    // CONSOLE/DEBUG FUNCTIONS
    // ==========================================

    interpreter.registerNative('log', (args: any[]) => {
        console.log(...args);
        return null;
    });

    interpreter.registerNative('warn', (args: any[]) => {
        console.warn(...args);
        return null;
    });

    interpreter.registerNative('error', (args: any[]) => {
        console.error(...args);
        return null;
    });

    // ==========================================
    // UI BUILDER (God Mode)
    // ==========================================

    const uiObj = {
        btn: {
            type: 'native',
            call: (args: any[]) => {
                const label = args[0] ? String(args[0]) : 'Button';
                const callback = args[1];

                context.output({
                    type: 'ui_button',
                    label: label,
                    onClick: async () => {
                        if (callback && typeof callback.call === 'function') {
                            await callback.call([]);
                        }
                    }
                });
                return null;
            },
            toString: () => '<native fn ui.btn>'
        },
        inp: {
            type: 'native',
            call: (args: any[]) => {
                const placeholder = args[0] ? String(args[0]) : '';
                const onChange = args[1];

                context.output({
                    type: 'ui_input',
                    placeholder: placeholder,
                    onChange: async (value: string) => {
                        if (onChange && typeof onChange.call === 'function') {
                            await onChange.call([value]);
                        }
                    }
                });
                return null;
            },
            toString: () => '<native fn ui.inp>'
        },
        text: {
            type: 'native',
            call: (args: any[]) => {
                context.output({
                    type: 'ui_text',
                    content: String(args[0] ?? '')
                });
                return null;
            }
        },
        box: {
            type: 'native',
            call: (args: any[]) => {
                context.output({
                    type: 'ui_box',
                    style: args[0] ?? {}
                });
                return null;
            }
        },
        clr: {
            type: 'native',
            call: () => {
                context.clear();
                return null;
            },
            toString: () => '<native fn ui.clr>'
        },
        toast: {
            type: 'native',
            call: (args: any[]) => {
                context.output({
                    type: 'ui_toast',
                    message: String(args[0] ?? ''),
                    duration: args[1] ?? 2000
                });
                return null;
            }
        },
        guan: {
            type: 'native',
            call: async (args: any[]) => {
                const prompt = args[0] ? String(args[0]) : 'พิมพ์มาดิ๊:';

                // Show prompt
                context.output({ type: 'output', content: `🧐 ${prompt}` });

                // Get input
                let val = '';
                if (context.input) {
                    val = await context.input();
                }

                // Random Thai Roast
                const roasts = [
                    'พิมพ์ภาษาอะไรเนี่ย อ่านไม่รู้เรื่อง!',
                    'แน่ใจนะว่าคิดดีแล้ว?',
                    'ตอบสั้นไปป่ะ? ขี้เกียจหรอ?',
                    'เห้อ... เหนื่อยใจกับคำตอบ',
                    'ไปเรียนพิมพ์ดีดใหม่มั้ย?',
                    'สุดยอด! (ประชดนะ)',
                    'เอิ่ม... ก็ด้ายยย',
                    'ถามจริง? ตอบงี้ดิ?'
                ];
                const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];

                context.output({ type: 'error', content: `🔥 AI: ${randomRoast}` });
                return val;
            },
            toString: () => '<native fn ui.guan>'
        }
    };
    interpreter.defineVar('ui', uiObj);

    // ==========================================
    // DATABASE MODULE (LocalStorage)
    // ==========================================

    const dbObj = {
        save: {
            type: 'native',
            call: (args: any[]) => {
                const collection = String(args[0] ?? 'default');
                const id = String(args[1] ?? Date.now());
                const data = args[2] ?? {};

                const key = `ije_db_${collection}`;
                const existing = localStorage.getItem(key);
                const db = existing ? JSON.parse(existing) : {};

                db[id] = data;
                localStorage.setItem(key, JSON.stringify(db));
                return id;
            }
        },
        load: {
            type: 'native',
            call: (args: any[]) => {
                const collection = String(args[0] ?? 'default');
                const id = String(args[1] ?? '');

                const key = `ije_db_${collection}`;
                const existing = localStorage.getItem(key);
                if (!existing) return null;

                const db = JSON.parse(existing);
                return db[id] ?? null;
            }
        },
        find: {
            type: 'native',
            call: (args: any[]) => {
                const collection = String(args[0] ?? 'default');
                const query = args[1]; // Optional filter function or object

                const key = `ije_db_${collection}`;
                const existing = localStorage.getItem(key);
                if (!existing) return [];

                const db = JSON.parse(existing);
                const allItems = Object.values(db);

                // Simple implementation: return all for now, or filter if simple query
                return allItems;
            }
        },
        remove: {
            type: 'native',
            call: (args: any[]) => {
                const collection = String(args[0] ?? 'default');
                const id = String(args[1] ?? '');

                const key = `ije_db_${collection}`;
                const existing = localStorage.getItem(key);
                if (!existing) return false;

                const db = JSON.parse(existing);
                if (id in db) {
                    delete db[id];
                    localStorage.setItem(key, JSON.stringify(db));
                    return true;
                }
                return false;
            }
        },
        clear: {
            type: 'native',
            call: (args: any[]) => {
                const collection = String(args[0] ?? 'default');
                localStorage.removeItem(`ije_db_${collection}`);
                return true;
            }
        }
    };
    interpreter.defineVar('db', dbObj);

    // ==========================================
    // NETWORK MODULE (Fetch)
    // ==========================================

    if (context.http) {
        const netObj = {
            get: {
                type: 'native',
                call: async (args: any[]) => {
                    const url = String(args[0] ?? '');
                    context.output({ type: 'info', content: `🌐 GET ${url}` });
                    try {
                        const res = await context.http!.get(url);
                        return res;
                    } catch (e: any) {
                        return { error: e.message };
                    }
                }
            },
            post: {
                type: 'native',
                call: async (args: any[]) => {
                    const url = String(args[0] ?? '');
                    const data = args[1] ?? {};
                    context.output({ type: 'info', content: `🌐 POST ${url}` });
                    try {
                        security.validateURL(url);
                        const res = await context.http!.post(url, data);
                        return res;
                    } catch (e: any) {
                        if (e instanceof SecurityError) {
                            context.output({ type: 'error', content: e.message });
                            return { error: e.message, blocked: true };
                        }
                        return { error: e.message };
                    }
                }
            }
        };
        interpreter.defineVar('net', netObj);
    }

    // ==========================================
    // REGEX MODULE 🔍
    // Thai-friendly regular expressions
    // ==========================================

    const regexObj = {
        // regex.test(pattern, text) - Test if pattern matches
        test: {
            type: 'native',
            call: (args: any[]) => {
                try {
                    const pattern = String(args[0] ?? '');
                    const text = String(args[1] ?? '');
                    const flags = String(args[2] ?? '');
                    const regex = new RegExp(pattern, flags);
                    return regex.test(text);
                } catch (e) {
                    return false;
                }
            }
        },
        // regex.match(pattern, text) - Find matches
        match: {
            type: 'native',
            call: (args: any[]) => {
                try {
                    const pattern = String(args[0] ?? '');
                    const text = String(args[1] ?? '');
                    const flags = String(args[2] ?? 'g');
                    const regex = new RegExp(pattern, flags);
                    const matches = text.match(regex);
                    return matches ?? [];
                } catch (e) {
                    return [];
                }
            }
        },
        // regex.replace(pattern, text, replacement) - Replace matches
        replace: {
            type: 'native',
            call: (args: any[]) => {
                const text = String(args[1] ?? '');
                try {
                    const pattern = String(args[0] ?? '');
                    const replacement = String(args[2] ?? '');
                    const flags = String(args[3] ?? 'g');
                    const regex = new RegExp(pattern, flags);
                    return text.replace(regex, replacement);
                } catch (e) {
                    return text;
                }
            }
        },
        // regex.split(pattern, text) - Split by pattern
        split: {
            type: 'native',
            call: (args: any[]) => {
                const text = String(args[1] ?? '');
                try {
                    const pattern = String(args[0] ?? '');
                    const regex = new RegExp(pattern);
                    return text.split(regex);
                } catch (e) {
                    return [text];
                }
            }
        },
        // regex.extract(pattern, text) - Extract capture groups
        extract: {
            type: 'native',
            call: (args: any[]) => {
                try {
                    const pattern = String(args[0] ?? '');
                    const text = String(args[1] ?? '');
                    const regex = new RegExp(pattern);
                    const match = text.match(regex);
                    if (match && match.length > 1) {
                        return match.slice(1); // Return capture groups only
                    }
                    return match ?? [];
                } catch (e) {
                    return [];
                }
            }
        },
        // regex.isValid(pattern) - Check if pattern is valid
        isValid: {
            type: 'native',
            call: (args: any[]) => {
                try {
                    new RegExp(String(args[0] ?? ''));
                    return true;
                } catch (e) {
                    return false;
                }
            }
        }
    };
    interpreter.defineVar('regex', regexObj);
    interpreter.defineVar('rubab', regexObj); // Thai alias: รูปแบบ

    // ==========================================
    // ENHANCED DATETIME MODULE 📅
    // Thai dates and formatting
    // ==========================================

    const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    const dateTimeObj = {
        // wan.now() - Current timestamp
        now: { call: () => Date.now() },

        // wan.today() - Today's date string (YYYY-MM-DD)
        today: {
            call: () => {
                const d = new Date();
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        },

        // wan.create(year, month, day, hour?, min?, sec?) - Create date
        create: {
            call: (args: any[]) => {
                const year = args[0] ?? new Date().getFullYear();
                const month = (args[1] ?? 1) - 1;
                const day = args[2] ?? 1;
                const hour = args[3] ?? 0;
                const min = args[4] ?? 0;
                const sec = args[5] ?? 0;
                return new Date(year, month, day, hour, min, sec).getTime();
            }
        },

        // wan.parse(dateString) - Parse date string
        parse: {
            call: (args: any[]) => {
                try {
                    return new Date(String(args[0] ?? '')).getTime();
                } catch {
                    return null;
                }
            }
        },

        // wan.format(timestamp, format) - Format date
        format: {
            call: (args: any[]) => {
                const ts = args[0] ?? Date.now();
                const fmt = String(args[1] ?? 'full');
                const d = new Date(ts);

                if (fmt === 'thai' || fmt === 'ไทย') {
                    const thaiYear = d.getFullYear() + 543;
                    return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} พ.ศ. ${thaiYear}`;
                }
                if (fmt === 'short') {
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                }
                if (fmt === 'time') {
                    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                }
                if (fmt === 'iso') {
                    return d.toISOString();
                }
                // Default full format
                return d.toLocaleString('th-TH');
            }
        },

        // wan.add(timestamp, amount, unit) - Add time
        add: {
            call: (args: any[]) => {
                const ts = args[0] ?? Date.now();
                const amount = args[1] ?? 0;
                const unit = String(args[2] ?? 'day').toLowerCase();

                const multipliers: Record<string, number> = {
                    'ms': 1,
                    'sec': 1000,
                    'min': 60000,
                    'hour': 3600000,
                    'day': 86400000,
                    'week': 604800000,
                    'wan': 86400000,      // Thai: วัน
                    'hua_mong': 3600000,  // Thai: ชั่วโมง
                    'nati': 60000,        // Thai: นาที
                };

                return ts + (amount * (multipliers[unit] ?? 86400000));
            }
        },

        // wan.diff(ts1, ts2, unit) - Difference between dates
        diff: {
            call: (args: any[]) => {
                const ts1 = args[0] ?? Date.now();
                const ts2 = args[1] ?? Date.now();
                const unit = String(args[2] ?? 'day').toLowerCase();

                const diff = Math.abs(ts1 - ts2);
                const divisors: Record<string, number> = {
                    'ms': 1,
                    'sec': 1000,
                    'min': 60000,
                    'hour': 3600000,
                    'day': 86400000,
                    'week': 604800000,
                };

                return Math.floor(diff / (divisors[unit] ?? 86400000));
            }
        },

        // wan.parts(timestamp) - Get date parts as object
        parts: {
            call: (args: any[]) => {
                const d = new Date(args[0] ?? Date.now());
                return {
                    year: d.getFullYear(),
                    month: d.getMonth() + 1,
                    day: d.getDate(),
                    weekday: d.getDay(),
                    hour: d.getHours(),
                    minute: d.getMinutes(),
                    second: d.getSeconds(),
                    // Thai aliases
                    pii: d.getFullYear(),
                    deuan: d.getMonth() + 1,
                    wan: d.getDate(),
                    hua_mong: d.getHours(),
                    nati: d.getMinutes(),
                    winati: d.getSeconds()
                };
            }
        },

        // wan.weekday(timestamp) - Get weekday name (Thai)
        weekday: {
            call: (args: any[]) => {
                const d = new Date(args[0] ?? Date.now());
                return THAI_DAYS[d.getDay()];
            }
        },

        // wan.month_name(monthNum) - Get month name (Thai)
        month_name: {
            call: (args: any[]) => {
                const monthIdx = ((args[0] ?? 1) - 1) % 12;
                return THAI_MONTHS[monthIdx];
            }
        },

        // wan.is_leap(year) - Check leap year
        is_leap: {
            call: (args: any[]) => {
                const year = args[0] ?? new Date().getFullYear();
                return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            }
        },

        // wan.days_in_month(year, month) - Days in month
        days_in_month: {
            call: (args: any[]) => {
                const year = args[0] ?? new Date().getFullYear();
                const month = args[1] ?? new Date().getMonth() + 1;
                return new Date(year, month, 0).getDate();
            }
        }
    };
    interpreter.defineVar('wan', dateTimeObj);     // Thai: วัน (day/date)
    interpreter.defineVar('datetime', dateTimeObj); // English alias

    // ==========================================
    // SECURITY MODULE 🔒
    // Thai-friendly security functions
    // ==========================================

    const securityObj = {
        // khao_sidhi(permissions...) - Request permissions
        khao: {
            type: 'native',
            call: (args: any[]) => {
                const permissionMap: Record<string, Permission> = {
                    'file': Permission.FILE_READ,
                    'file:read': Permission.FILE_READ,
                    'file:write': Permission.FILE_WRITE,
                    'term': Permission.TERMINAL,
                    'terminal': Permission.TERMINAL,
                    'http': Permission.HTTP,
                    'network': Permission.HTTP,
                    'db': Permission.DATABASE,
                    'database': Permission.DATABASE,
                    'ui': Permission.UI,
                    'system': Permission.SYSTEM
                };

                const granted: string[] = [];
                for (const arg of args) {
                    const perm = String(arg).toLowerCase();
                    if (permissionMap[perm]) {
                        security.grantPermission(permissionMap[perm]);
                        granted.push(perm);
                    }
                }

                if (granted.length > 0) {
                    context.output({
                        type: 'info',
                        content: `🔓 ให้สิทธิ์แล้ว: ${granted.join(', ')}\n   Permissions granted: ${granted.join(', ')}`
                    });
                }
                return granted.length > 0;
            },
            toString: () => '<native fn security.khao>'
        },

        // sidhi_mii(permission) - Check if permission granted
        mii: {
            type: 'native',
            call: (args: any[]) => {
                const permissionMap: Record<string, Permission> = {
                    'file': Permission.FILE_READ,
                    'file:read': Permission.FILE_READ,
                    'file:write': Permission.FILE_WRITE,
                    'term': Permission.TERMINAL,
                    'http': Permission.HTTP,
                    'db': Permission.DATABASE,
                    'ui': Permission.UI,
                    'system': Permission.SYSTEM
                };
                const perm = String(args[0] ?? '').toLowerCase();
                return permissionMap[perm] ? security.hasPermission(permissionMap[perm]) : false;
            }
        },

        // Set security level
        level: {
            type: 'native',
            call: (args: any[]) => {
                const levelMap: Record<string, SecurityLevel> = {
                    'unrestricted': SecurityLevel.UNRESTRICTED,
                    'standard': SecurityLevel.STANDARD,
                    'sandbox': SecurityLevel.SANDBOX,
                    'locked': SecurityLevel.LOCKED
                };
                const level = String(args[0] ?? 'standard').toLowerCase();
                if (levelMap[level]) {
                    security.setLevel(levelMap[level]);
                    context.output({
                        type: 'info',
                        content: `🔐 ตั้งค่าระดับความปลอดภัย: ${level}\n   Security level set to: ${level}`
                    });
                    return true;
                }
                return false;
            }
        },

        // sanitize(str) - Remove dangerous characters
        sanitize: {
            type: 'native',
            call: (args: any[]) => {
                return security.sanitizeString(String(args[0] ?? ''));
            }
        },

        // escape_html(str) - Escape HTML special characters
        escape_html: {
            type: 'native',
            call: (args: any[]) => {
                return security.escapeHTML(String(args[0] ?? ''));
            }
        },

        // escape_sql(str) - Escape SQL special characters
        escape_sql: {
            type: 'native',
            call: (args: any[]) => {
                return security.escapeSQL(String(args[0] ?? ''));
            }
        },

        // validate_email(str) - Check if valid email format
        validate_email: {
            type: 'native',
            call: (args: any[]) => {
                return security.validateEmail(String(args[0] ?? ''));
            }
        },

        // validate_url(str) - Check if valid URL format
        validate_url: {
            type: 'native',
            call: (args: any[]) => {
                return security.validateURLFormat(String(args[0] ?? ''));
            }
        },

        // Get current security info
        info: {
            type: 'native',
            call: () => {
                const config = security.getConfig();
                return {
                    level: config.level,
                    maxExecutionTime: config.maxExecutionTime,
                    maxMemory: config.maxMemory,
                    blockLocalhost: config.blockLocalhost,
                    blockPrivateIPs: config.blockPrivateIPs
                };
            }
        },

        // ========================================
        // PHASE 2: CRYPTOGRAPHY
        // ========================================

        // sec.hash(data, algorithm) - Hash data
        hash: {
            type: 'native',
            call: (args: any[]) => {
                rateLimiter.checkOrThrow('crypto');
                const data = String(args[0] ?? '');
                const algo = String(args[1] ?? 'sha256') as 'sha256' | 'sha512' | 'md5';
                return cryptoManager.hash(data, algo);
            }
        },

        // sec.hash_password(password) - Hash password with salt
        hash_password: {
            type: 'native',
            call: (args: any[]) => {
                rateLimiter.checkOrThrow('crypto');
                return cryptoManager.hashPassword(String(args[0] ?? ''));
            }
        },

        // sec.verify_password(password, hash, salt) - Verify password
        verify_password: {
            type: 'native',
            call: (args: any[]) => {
                rateLimiter.checkOrThrow('crypto');
                return cryptoManager.verifyPassword(
                    String(args[0] ?? ''),
                    String(args[1] ?? ''),
                    String(args[2] ?? '')
                );
            }
        },

        // sec.encrypt(data, key) - Encrypt data
        encrypt: {
            type: 'native',
            call: (args: any[]) => {
                rateLimiter.checkOrThrow('crypto');
                return cryptoManager.encrypt(
                    String(args[0] ?? ''),
                    String(args[1] ?? '')
                );
            }
        },

        // sec.decrypt(ciphertext, key, iv) - Decrypt data
        decrypt: {
            type: 'native',
            call: (args: any[]) => {
                rateLimiter.checkOrThrow('crypto');
                return cryptoManager.decrypt(
                    String(args[0] ?? ''),
                    String(args[1] ?? ''),
                    String(args[2] ?? '')
                );
            }
        },

        // sec.random_token(length) - Generate random token
        random_token: {
            type: 'native',
            call: (args: any[]) => {
                return cryptoManager.randomToken(args[0] ?? 32);
            }
        },

        // sec.random_bytes(length) - Generate random bytes
        random_bytes: {
            type: 'native',
            call: (args: any[]) => {
                return cryptoManager.randomBytes(args[0] ?? 16);
            }
        },

        // sec.uuid() - Generate UUID v4
        uuid: {
            type: 'native',
            call: () => cryptoManager.uuid()
        },

        // ========================================
        // PHASE 2: RATE LIMITING
        // ========================================

        // sec.rate_check(key) - Check if rate limit allows
        rate_check: {
            type: 'native',
            call: (args: any[]) => {
                return rateLimiter.check(String(args[0] ?? 'default'));
            }
        },

        // sec.rate_remaining(key) - Get remaining requests
        rate_remaining: {
            type: 'native',
            call: (args: any[]) => {
                return rateLimiter.getRemaining(String(args[0] ?? 'default'));
            }
        },

        // sec.rate_reset(key) - Reset rate limit
        rate_reset: {
            type: 'native',
            call: (args: any[]) => {
                rateLimiter.reset(String(args[0] ?? 'default'));
                return true;
            }
        },

        // ========================================
        // PHASE 2: SECURITY LOGGING
        // ========================================

        // sec.log(type, details, severity) - Log security event
        log: {
            type: 'native',
            call: (args: any[]) => {
                const type = String(args[0] ?? 'SUSPICIOUS_INPUT') as any;
                const details = String(args[1] ?? '');
                const severity = String(args[2] ?? 'medium') as 'low' | 'medium' | 'high' | 'critical';
                securityLogger.log(type, details, severity, true);
                return true;
            }
        },

        // sec.report() - Generate security report
        report: {
            type: 'native',
            call: () => {
                return securityLogger.generateReport();
            }
        },

        // sec.events(filter?) - Get security events
        events: {
            type: 'native',
            call: (args: any[]) => {
                const filter = args[0] ?? {};
                return securityLogger.getEvents(filter);
            }
        },

        // ========================================
        // PHASE 2: CONTENT SECURITY POLICY
        // ========================================

        // sec.csp(directives) - Generate CSP header
        csp: {
            type: 'native',
            call: (args: any[]) => {
                const directives = args[0] ?? {};
                return cspGenerator.generate(directives);
            }
        },

        // sec.csp_strict() - Generate strict CSP
        csp_strict: {
            type: 'native',
            call: () => cspGenerator.strict()
        },

        // sec.strip_scripts(html) - Remove scripts from HTML
        strip_scripts: {
            type: 'native',
            call: (args: any[]) => {
                return cspGenerator.stripScripts(String(args[0] ?? ''));
            }
        },

        // sec.safe_html(html) - Make HTML safe
        safe_html: {
            type: 'native',
            call: (args: any[]) => {
                return cspGenerator.safeHtml(String(args[0] ?? ''));
            }
        }
    };
    interpreter.defineVar('sec', securityObj);

    // Thai alias for security
    interpreter.defineVar('khuam_plod_phai', securityObj);

    // Direct permission function aliases
    interpreter.registerNative('khao_sidhi', securityObj.khao.call);
    interpreter.registerNative('sidhi_mii', securityObj.mii.call);
}
