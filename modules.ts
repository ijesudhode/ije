// ============================================
// IJe Module System
// Import/Export resolution for IJe files
// ============================================

import * as AST from './ast';

// ==========================================
// MODULE INTERFACE
// ==========================================

export interface IJeModule {
    path: string;
    exports: Map<string, any>;
    isLoaded: boolean;
}

// ==========================================
// MODULE CONTEXT (for browser environment)
// ==========================================

export interface ModuleContext {
    // Read file content - must be provided by host environment
    readFile: (path: string) => Promise<string>;
    // Resolve relative path
    resolvePath: (from: string, to: string) => string;
    // Current file path
    currentPath: string;
}

// ==========================================
// MODULE LOADER
// ==========================================

export class ModuleLoader {
    private cache: Map<string, IJeModule> = new Map();
    private context: ModuleContext;
    private parseAndExecute: (code: string, exports: Map<string, any>) => Promise<void>;

    constructor(
        context: ModuleContext,
        parseAndExecute: (code: string, exports: Map<string, any>) => Promise<void>
    ) {
        this.context = context;
        this.parseAndExecute = parseAndExecute;
    }

    // Load a module by path
    async loadModule(modulePath: string): Promise<IJeModule> {
        // Resolve relative path
        const resolvedPath = this.resolvePath(modulePath);

        // Check cache
        if (this.cache.has(resolvedPath)) {
            const cached = this.cache.get(resolvedPath)!;
            if (cached.isLoaded) {
                return cached;
            }
        }

        // Create module entry (to detect circular imports)
        const module: IJeModule = {
            path: resolvedPath,
            exports: new Map(),
            isLoaded: false
        };
        this.cache.set(resolvedPath, module);

        try {
            // Read file content
            const code = await this.context.readFile(resolvedPath);

            // Parse and execute, collecting exports
            await this.parseAndExecute(code, module.exports);

            module.isLoaded = true;
            return module;
        } catch (error) {
            // Remove failed module from cache
            this.cache.delete(resolvedPath);
            throw new Error(`Failed to load module '${modulePath}': ${error}`);
        }
    }

    // Resolve module path
    private resolvePath(modulePath: string): string {
        // If absolute path, use as-is
        if (modulePath.startsWith('/')) {
            return modulePath;
        }

        // If starts with ./ or ../, resolve relative to current file
        if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
            return this.context.resolvePath(this.context.currentPath, modulePath);
        }

        // Otherwise, treat as relative path
        return this.context.resolvePath(this.context.currentPath, './' + modulePath);
    }

    // Get cached module
    getModule(path: string): IJeModule | undefined {
        const resolvedPath = this.resolvePath(path);
        return this.cache.get(resolvedPath);
    }

    // Clear cache
    clearCache(): void {
        this.cache.clear();
    }
}

// ==========================================
// EXPORT COLLECTOR
// ==========================================

export class ExportCollector {
    private exports: Map<string, any> = new Map();

    // Register an export
    registerExport(name: string, value: any): void {
        this.exports.set(name, value);
    }

    // Get all exports
    getExports(): Map<string, any> {
        return new Map(this.exports);
    }

    // Get single export
    getExport(name: string): any {
        if (!this.exports.has(name)) {
            throw new Error(`Export '${name}' not found`);
        }
        return this.exports.get(name);
    }

    // Check if export exists
    hasExport(name: string): boolean {
        return this.exports.has(name);
    }
}

// ==========================================
// IMPORT SPECIFIER HELPERS
// ==========================================

export function resolveImport(
    module: IJeModule,
    specifiers: AST.ImportSpecifier[]
): Map<string, any> {
    const imports = new Map<string, any>();

    for (const spec of specifiers) {
        if (spec.name === '*') {
            // Import all: nam "module" ao *
            for (const [key, value] of module.exports) {
                imports.set(key, value);
            }
        } else {
            // Named import
            if (!module.exports.has(spec.name)) {
                throw new Error(`Module does not export '${spec.name}'`);
            }
            const localName = spec.alias || spec.name;
            imports.set(localName, module.exports.get(spec.name));
        }
    }

    return imports;
}

// ==========================================
// BROWSER MODULE CONTEXT
// ==========================================

// Default context for browser/IDE environment
export function createBrowserModuleContext(
    vfs: { readFile: (path: string) => Promise<string> },
    currentPath: string
): ModuleContext {
    return {
        readFile: async (path: string) => {
            try {
                return await vfs.readFile(path);
            } catch {
                throw new Error(`File not found: ${path}`);
            }
        },
        resolvePath: (from: string, to: string) => {
            // Simple path resolution
            const fromDir = from.substring(0, from.lastIndexOf('/'));

            if (to.startsWith('/')) {
                return to;
            }

            const parts = (fromDir + '/' + to).split('/');
            const resolved: string[] = [];

            for (const part of parts) {
                if (part === '.' || part === '') continue;
                if (part === '..') {
                    resolved.pop();
                } else {
                    resolved.push(part);
                }
            }

            return '/' + resolved.join('/');
        },
        currentPath
    };
}
