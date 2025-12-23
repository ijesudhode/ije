// ============================================
// IJe Module Loader - ระบบโหลดโมดูล
// Enables 'nam' imports in IJE
// ============================================

// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';

// ==========================================
// TYPES
// ==========================================

export interface ModuleExports {
    [key: string]: any;
}

export interface ModuleCache {
    [path: string]: ModuleExports;
}

export interface ModuleLoaderOptions {
    basePath: string;
    builtinModules?: Map<string, ModuleExports>;
}

// ==========================================
// BUILT-IN MODULES
// ==========================================

// Helper to create a callable function object
function callable(fn: Function) {
    return {
        type: 'native',
        call: (args: any[]) => fn(...args),
        toString: () => `<native function>`
    };
}

// Thai NLP Module
const thaiModule: ModuleExports = {
    // Word segmentation (basic)
    tat: callable((text: string): string[] => {
        // Simple max-matching algorithm
        const words: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            let matched = false;
            // Try to match longest word first (simplified)
            for (let len = Math.min(10, remaining.length); len > 0; len--) {
                const substr = remaining.substring(0, len);
                // Simple heuristic: split on spaces or every 3-4 chars
                if (substr.includes(' ') || len <= 4) {
                    words.push(substr.trim() || substr);
                    remaining = remaining.substring(len);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                words.push(remaining.charAt(0));
                remaining = remaining.substring(1);
            }
        }

        return words.filter(w => w.length > 0);
    }),

    // Romanization
    roman: callable((text: string): string => {
        const romanMap: Record<string, string> = {
            'ก': 'k', 'ข': 'kh', 'ค': 'kh', 'ฆ': 'kh', 'ง': 'ng',
            'จ': 'ch', 'ฉ': 'ch', 'ช': 'ch', 'ซ': 's', 'ญ': 'y',
            'ด': 'd', 'ต': 't', 'ถ': 'th', 'ท': 'th', 'ธ': 'th',
            'น': 'n', 'บ': 'b', 'ป': 'p', 'ผ': 'ph', 'ฝ': 'f',
            'พ': 'ph', 'ฟ': 'f', 'ภ': 'ph', 'ม': 'm', 'ย': 'y',
            'ร': 'r', 'ล': 'l', 'ว': 'w', 'ศ': 's', 'ษ': 's',
            'ส': 's', 'ห': 'h', 'ฬ': 'l', 'อ': '', 'ฮ': 'h',
            'า': 'a', 'ิ': 'i', 'ี': 'ii', 'ึ': 'ue', 'ื': 'uue',
            'ุ': 'u', 'ู': 'uu', 'เ': 'e', 'แ': 'ae', 'โ': 'o',
            'ใ': 'ai', 'ไ': 'ai', 'ะ': 'a', 'ำ': 'am',
            '่': '', '้': '', '๊': '', '๋': ''
        };

        let result = '';
        for (const char of text) {
            result += romanMap[char] || char;
        }
        return result;
    }),

    // Number to Thai text
    lekPenKum: callable((num: number): string => {
        if (num === 0) return 'ศูนย์';

        const units = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
        const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

        if (num < 10) return units[num];

        if (num < 100) {
            const tens = Math.floor(num / 10);
            const ones = num % 10;
            let result = '';

            if (tens === 1) result = 'สิบ';
            else if (tens === 2) result = 'ยี่สิบ';
            else result = units[tens] + 'สิบ';

            if (ones === 1) result += 'เอ็ด';
            else if (ones > 0) result += units[ones];

            return result;
        }

        return String(num);
    }),

    // Convert to Thai digits
    penLekThai: callable((numStr: string): string => {
        const thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
        let result = '';
        for (const char of String(numStr)) {
            const digit = parseInt(char);
            if (!isNaN(digit) && digit >= 0 && digit <= 9) {
                result += thaiDigits[digit];
            } else {
                result += char;
            }
        }
        return result;
    }),

    // Check if Thai consonant
    phaYanChaNa: callable((char: string): boolean => {
        const code = char.charCodeAt(0);
        return code >= 0x0E01 && code <= 0x0E2E;
    }),

    // Check if Thai vowel
    sara: callable((char: string): boolean => {
        const vowels = 'ะาำิีึืุูเแโใไๅ';
        return vowels.includes(char);
    }),

    // Check if tone mark
    wanYuk: callable((char: string): boolean => {
        const tones = '่้๊๋';
        return tones.includes(char);
    }),

    // Check if Thai text
    penThai: callable((text: string): boolean => {
        for (const char of text) {
            const code = char.charCodeAt(0);
            if (code >= 0x0E00 && code <= 0x0E7F) {
                return true;
            }
        }
        return false;
    })
};

// Math Module (extended)
const mathModule: ModuleExports = {
    PI: Math.PI,
    E: Math.E,
    abs: callable((x: number) => Math.abs(x)),
    floor: callable((x: number) => Math.floor(x)),
    ceil: callable((x: number) => Math.ceil(x)),
    round: callable((x: number) => Math.round(x)),
    sqrt: callable((x: number) => Math.sqrt(x)),
    pow: callable((x: number, y: number) => Math.pow(x, y)),
    sin: callable((x: number) => Math.sin(x)),
    cos: callable((x: number) => Math.cos(x)),
    tan: callable((x: number) => Math.tan(x)),
    log: callable((x: number) => Math.log(x)),
    log10: callable((x: number) => Math.log10(x)),
    exp: callable((x: number) => Math.exp(x)),
    min: callable((...args: number[]) => Math.min(...args)),
    max: callable((...args: number[]) => Math.max(...args)),
    random: callable(() => Math.random()),
    randomInt: callable((min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min)
};

// HTTP Module
const httpModule: ModuleExports = {
    get: callable(async (url: string): Promise<any> => {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (e: any) {
            return { error: e.message };
        }
    }),

    post: callable(async (url: string, data: any): Promise<any> => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (e: any) {
            return { error: e.message };
        }
    }),

    getText: callable(async (url: string): Promise<string> => {
        try {
            const response = await fetch(url);
            return await response.text();
        } catch (e: any) {
            return '';
        }
    })
};

// File System Module
const fsModule: ModuleExports = {
    read: callable((filePath: string): string => {
        try {
            return fs.readFileSync(filePath, 'utf-8');
        } catch {
            return '';
        }
    }),

    write: callable((filePath: string, content: string): boolean => {
        try {
            fs.writeFileSync(filePath, content, 'utf-8');
            return true;
        } catch {
            return false;
        }
    }),

    exists: callable((filePath: string): boolean => {
        return fs.existsSync(filePath);
    }),

    mkdir: callable((dirPath: string): boolean => {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
            return true;
        } catch {
            return false;
        }
    }),

    readdir: callable((dirPath: string): string[] => {
        try {
            return fs.readdirSync(dirPath);
        } catch {
            return [];
        }
    }),

    remove: callable((filePath: string): boolean => {
        try {
            fs.rmSync(filePath, { recursive: true, force: true });
            return true;
        } catch {
            return false;
        }
    })
};

// ==========================================
// MODULE LOADER CLASS
// ==========================================

export class IJeModuleLoader {
    private cache: ModuleCache = {};
    private basePath: string;
    private builtins: Map<string, ModuleExports>;

    constructor(options: ModuleLoaderOptions) {
        this.basePath = options.basePath;
        this.builtins = options.builtinModules || new Map();

        // Register default built-in modules
        this.builtins.set('thai', thaiModule);
        this.builtins.set('math', mathModule);
        this.builtins.set('http', httpModule);
        this.builtins.set('fs', fsModule);
    }

    // โหลด - Load module by name
    load(moduleName: string): ModuleExports | null {
        // Check cache first
        if (this.cache[moduleName]) {
            return this.cache[moduleName];
        }

        // Check built-in modules
        if (this.builtins.has(moduleName)) {
            const mod = this.builtins.get(moduleName)!;
            this.cache[moduleName] = mod;
            return mod;
        }

        // Handle relative imports
        if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
            return this.loadFile(moduleName);
        }

        // Check pak_modules
        const pakModulePath = path.join(this.basePath, 'pak_modules', moduleName);
        if (fs.existsSync(pakModulePath)) {
            const mainPath = path.join(pakModulePath, 'index.ije');
            if (fs.existsSync(mainPath)) {
                return this.loadFile(mainPath);
            }
        }

        console.error(`Module not found: ${moduleName}`);
        return null;
    }

    // Load IJE file as module
    private loadFile(filePath: string): ModuleExports | null {
        const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(this.basePath, filePath);

        // Add .ije extension if missing
        const finalPath = absolutePath.endsWith('.ije') ? absolutePath : absolutePath + '.ije';

        if (!fs.existsSync(finalPath)) {
            console.error(`File not found: ${finalPath}`);
            return null;
        }

        // TODO: Parse and execute the file, collecting exports
        // For now, return empty object
        console.log(`Loading module from: ${finalPath}`);

        this.cache[filePath] = {};
        return this.cache[filePath];
    }

    // Register a built-in module
    registerBuiltin(name: string, exports: ModuleExports): void {
        this.builtins.set(name, exports);
    }

    // Clear cache
    clearCache(): void {
        this.cache = {};
    }

    // Get list of available modules
    getAvailableModules(): string[] {
        const modules = Array.from(this.builtins.keys());

        // Check pak_modules
        const pakModulesPath = path.join(this.basePath, 'pak_modules');
        if (fs.existsSync(pakModulesPath)) {
            const dirs = fs.readdirSync(pakModulesPath, { withFileTypes: true });
            for (const dir of dirs) {
                if (dir.isDirectory() && !dir.name.startsWith('.')) {
                    modules.push(dir.name);
                }
            }
        }

        return modules;
    }
}

// ==========================================
// EXPORTS
// ==========================================

export const builtinModules = {
    thai: thaiModule,
    math: mathModule,
    http: httpModule,
    fs: fsModule
};

export function createModuleLoader(basePath: string): IJeModuleLoader {
    return new IJeModuleLoader({ basePath });
}
