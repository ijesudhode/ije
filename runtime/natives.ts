// ============================================
// IJe VM Natives - Standard Library for VM
// ============================================

import type { IJeNative, IJeValue, IJeArray, IJeObject } from './bytecode';

// Helper to create a native function
function native(name: string, arity: number, fn: (...args: IJeValue[]) => IJeValue | Promise<IJeValue>): IJeNative {
    return { type: 'native', name, arity, fn };
}

// Helper to convert JS values to IJe values
function jsToIJe(value: any): IJeValue {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value;

    if (Array.isArray(value)) {
        return {
            type: 'array',
            elements: value.map(jsToIJe)
        } as IJeArray;
    }

    if (typeof value === 'object') {
        const properties = new Map<string, IJeValue>();
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                properties.set(key, jsToIJe(value[key]));
            }
        }
        return {
            type: 'object',
            properties
        } as IJeObject;
    }

    return String(value);
}

// ==========================================
// CORE NATIVES
// ==========================================

export function createVMNatives(context?: any): Map<string, IJeValue> {
    const natives = new Map<string, IJeValue>();

    // ==========================================
    // OUTPUT
    // ==========================================

    natives.set('da', native('da', 1, (value) => {
        console.log(stringifyValue(value));
        return null;
    }));

    natives.set('print', native('print', 1, (value) => {
        console.log(stringifyValue(value));
        return null;
    }));

    // ==========================================
    // TYPE CONVERSION
    // ==========================================

    natives.set('kaw', native('kaw', 1, (value) => {
        return String(value ?? '');
    }));

    natives.set('lek', native('lek', 1, (value) => {
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }));

    natives.set('type', native('type', 1, (value) => {
        if (value === null) return 'wang';
        if (typeof value === 'boolean') return 'bool';
        if (typeof value === 'number') return 'lek';
        if (typeof value === 'string') return 'kum';
        if ((value as any).type === 'array') return 'list';
        if ((value as any).type === 'object') return 'kong';
        if ((value as any).type === 'function' || (value as any).type === 'closure') return 'kian';
        if ((value as any).type === 'class') return 'klum';
        if ((value as any).type === 'instance') return 'kong';
        return 'unknown';
    }));

    // ==========================================
    // ARRAY FUNCTIONS
    // ==========================================

    natives.set('len', native('len', 1, (value) => {
        if (typeof value === 'string') return value.length;
        if ((value as any).type === 'array') return (value as IJeArray).elements.length;
        if ((value as any).type === 'object') return (value as IJeObject).properties.size;
        return 0;
    }));

    natives.set('push', native('push', 2, (arr, value) => {
        if ((arr as any).type === 'array') {
            (arr as IJeArray).elements.push(value);
            return (arr as IJeArray).elements.length;
        }
        return 0;
    }));

    natives.set('pop', native('pop', 1, (arr) => {
        if ((arr as any).type === 'array') {
            return (arr as IJeArray).elements.pop() ?? null;
        }
        return null;
    }));

    natives.set('shift', native('shift', 1, (arr) => {
        if ((arr as any).type === 'array') {
            return (arr as IJeArray).elements.shift() ?? null;
        }
        return null;
    }));

    natives.set('unshift', native('unshift', 2, (arr, value) => {
        if ((arr as any).type === 'array') {
            (arr as IJeArray).elements.unshift(value);
            return (arr as IJeArray).elements.length;
        }
        return 0;
    }));

    // ==========================================
    // MATH FUNCTIONS
    // ==========================================

    natives.set('floor', native('floor', 1, (n) => Math.floor(n as number)));
    natives.set('ceil', native('ceil', 1, (n) => Math.ceil(n as number)));
    natives.set('round', native('round', 1, (n) => Math.round(n as number)));
    natives.set('abs', native('abs', 1, (n) => Math.abs(n as number)));
    natives.set('sqrt', native('sqrt', 1, (n) => Math.sqrt(n as number)));
    natives.set('pow', native('pow', 2, (a, b) => Math.pow(a as number, b as number)));
    natives.set('sin', native('sin', 1, (n) => Math.sin(n as number)));
    natives.set('cos', native('cos', 1, (n) => Math.cos(n as number)));
    natives.set('tan', native('tan', 1, (n) => Math.tan(n as number)));
    natives.set('log', native('log', 1, (n) => Math.log(n as number)));
    natives.set('random', native('random', 0, () => Math.random()));
    natives.set('randomInt', native('randomInt', 2, (min, max) =>
        Math.floor(Math.random() * ((max as number) - (min as number) + 1)) + (min as number)
    ));

    // ==========================================
    // STRING FUNCTIONS
    // ==========================================

    natives.set('concat', native('concat', 2, (a, b) => String(a) + String(b)));
    natives.set('substring', native('substring', 3, (str, start, end) =>
        String(str).substring(start as number, end as number)
    ));
    natives.set('indexOf', native('indexOf', 2, (str, search) =>
        String(str).indexOf(String(search))
    ));
    natives.set('split', native('split', 2, (str, sep) => {
        const arr: IJeArray = {
            type: 'array',
            elements: String(str).split(String(sep))
        };
        return arr;
    }));
    natives.set('join', native('join', 2, (arr, sep) => {
        if ((arr as any).type === 'array') {
            return (arr as IJeArray).elements.map(e => stringifyValue(e)).join(String(sep));
        }
        return '';
    }));
    natives.set('trim', native('trim', 1, (str) => String(str).trim()));
    natives.set('upper', native('upper', 1, (str) => String(str).toUpperCase()));
    natives.set('lower', native('lower', 1, (str) => String(str).toLowerCase()));

    // ==========================================
    // TIME
    // ==========================================

    natives.set('now', native('now', 0, () => Date.now()));
    natives.set('time', native('time', 0, () => new Date().toISOString()));

    // ==========================================
    // OBJECT FUNCTIONS
    // ==========================================

    natives.set('keys', native('keys', 1, (obj) => {
        if ((obj as any).type === 'object') {
            const arr: IJeArray = {
                type: 'array',
                elements: Array.from((obj as IJeObject).properties.keys())
            };
            return arr;
        }
        return { type: 'array', elements: [] } as IJeArray;
    }));

    natives.set('values', native('values', 1, (obj) => {
        if ((obj as any).type === 'object') {
            const arr: IJeArray = {
                type: 'array',
                elements: Array.from((obj as IJeObject).properties.values())
            };
            return arr;
        }
        return { type: 'array', elements: [] } as IJeArray;
    }));

    natives.set('hasKey', native('hasKey', 2, (obj, key) => {
        if ((obj as any).type === 'object') {
            return (obj as IJeObject).properties.has(String(key));
        }
        return false;
    }));

    // ==========================================
    // ASSERTIONS (for testing)
    // ==========================================

    natives.set('assert', native('assert', 1, (condition) => {
        if (!isTruthy(condition)) {
            throw new Error('Assertion failed');
        }
        return true;
    }));

    natives.set('assertEqual', native('assertEqual', 2, (actual, expected) => {
        const eq = valueEquals(actual, expected);
        if (!eq) {
            throw new Error(`Assertion failed: expected ${stringifyValue(expected)}, got ${stringifyValue(actual)}`);
        }
        return true;
    }));

    // ==========================================
    // FILE MODULE
    // ==========================================

    if (context) {
        // Global aliases
        natives.set('an', native('an', 1, async (path) => {
            if (context.readFile) {
                try {
                    return await context.readFile(String(path));
                } catch { return null; }
            }
            return null;
        }));

        natives.set('kian', native('kian', 2, async (path, content) => {
            if (context.writeFile) {
                try {
                    await context.writeFile(String(path), String(content));
                    return null;
                } catch { return null; }
            }
            return null;
        }));

        natives.set('kiann', native('kiann', 2, async (path, content) => {
            if (context.writeFile) {
                try {
                    await context.writeFile(String(path), String(content));
                    return null;
                } catch { return null; }
            }
            return null;
        }));

        // File object
        const fileObj: IJeObject = {
            type: 'object',
            properties: new Map()
        };

        fileObj.properties.set('read', native('read', 1, async (path) => {
            return context.readFile ? await context.readFile(String(path)) : null;
        }));

        fileObj.properties.set('write', native('write', 2, async (path, content) => {
            if (context.writeFile) await context.writeFile(String(path), String(content));
            return null;
        }));

        fileObj.properties.set('exists', native('exists', 1, (path) => {
            return context.exists ? context.exists(String(path)) : false;
        }));

        fileObj.properties.set('remove', native('remove', 1, (path) => {
            return context.remove ? context.remove(String(path)) : false;
        }));

        fileObj.properties.set('list', native('list', 1, (path) => {
            if (context.list) {
                const files = context.list(String(path));
                const arr: IJeArray = {
                    type: 'array',
                    elements: files.map((f: string) => f) // Auto-converted to string values? No, need to wrap logic if typed? 
                    // Wait, IJeValue for string is just string primitive in TS
                };
                return arr;
            }
            return { type: 'array', elements: [] } as IJeArray;
        }));

        natives.set('file', fileObj);

        // HTTP/Net Object
        if (context.http) {
            const netObj: IJeObject = {
                type: 'object',
                properties: new Map()
            };

            netObj.properties.set('get', native('get', 1, async (url) => {
                try {
                    const res = await context.http.get(String(url));
                    return jsToIJe(res);
                } catch (e: any) {
                    const errObj: IJeObject = { type: 'object', properties: new Map() };
                    errObj.properties.set('error', String(e.message));
                    return errObj;
                }
            }));

            netObj.properties.set('post', native('post', 2, async (url, data) => {
                try {
                    const res = await context.http.post(String(url), data); // data might need conversion FROM IJe to JS if passed?
                    // Ideally check 'data' type if it's IJeObject, convert to JS object. 
                    // But for now, assuming 'data' passed from VM is IJeValue. 
                    // Wait, post(url, data). 'data' is IJeValue. JSON.stringify(data) in cli.ts might handle it?
                    // cli.ts: JSON.stringify(data). 
                    // IJeValue objects have internal structure, JSON.stringify(ijeValue) will NOT produce clean JSON.
                    // We need ijeToJs(data).
                    return jsToIJe(res);
                } catch (e: any) {
                    const errObj: IJeObject = { type: 'object', properties: new Map() };
                    errObj.properties.set('error', String(e.message));
                    return errObj;
                }
            }));

            natives.set('http', netObj);
            natives.set('net', netObj);
        }
    }

    // ==========================================
    // JSON MODULE
    // ==========================================

    const jsonObj: IJeObject = {
        type: 'object',
        properties: new Map()
    };

    jsonObj.properties.set('parse', native('parse', 1, (str) => {
        try {
            return JSON.parse(String(str));
        } catch { return null; }
    }));

    jsonObj.properties.set('stringify', native('stringify', 1, (val) => {
        return JSON.stringify(val);
    }));

    natives.set('json', jsonObj);

    return natives;
}

// ==========================================
// HELPERS
// ==========================================

function stringifyValue(value: IJeValue): string {
    if (value === null) return 'wang';
    if (typeof value === 'boolean') return value ? 'jing' : 'tej';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'string') return value;

    const type = (value as any).type;
    if (type === 'array') {
        return `[${(value as IJeArray).elements.map(e => stringifyValue(e)).join(', ')}]`;
    }
    if (type === 'object') {
        const pairs: string[] = [];
        for (const [k, v] of (value as IJeObject).properties) {
            pairs.push(`${k}: ${stringifyValue(v)}`);
        }
        return `{${pairs.join(', ')}}`;
    }

    return String(value);
}

function isTruthy(value: IJeValue): boolean {
    if (value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
}

function valueEquals(a: IJeValue, b: IJeValue): boolean {
    if (typeof a !== typeof b) return false;
    if (a === null) return b === null;
    if (typeof a === 'number' || typeof a === 'string' || typeof a === 'boolean') {
        return a === b;
    }
    return a === b;
}
