// ============================================
// IJe Package Manager (pak) - จัดการแพ็คเกจ
// Package Manager with Thai-style naming
// ============================================

// @ts-nocheck

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ==========================================
// TYPES
// ==========================================

export interface PakManifest {
    chue: string;               // name - ชื่อ
    ruun: string;               // version - รุ่น
    athiBai?: string;           // description - อธิบาย
    phooKhian?: string;         // author - ผู้เขียน
    license?: string;
    main?: string;
    phuengPha?: Record<string, string>;     // dependencies - พึ่งพา
    phuengPhaDev?: Record<string, string>;  // devDependencies
    script?: Record<string, string>;        // scripts
    keywords?: string[];
    repository?: string;
}

export interface PakLock {
    ruun: string;               // version
    phuengPha: Record<string, {
        ruun: string;
        resolved: string;
        integrity?: string;
    }>;
}

export interface PakSearchResult {
    chue: string;
    ruun: string;
    athiBai: string;
    downloads: number;
}

// ==========================================
// SEMVER UTILITIES
// ==========================================

export class SemVer {
    major: number;
    minor: number;
    patch: number;

    constructor(version: string) {
        const match = version.match(/^(\^|~)?(\d+)\.(\d+)\.(\d+)$/);
        if (!match) throw new Error(`Invalid version: ${version}`);
        this.major = parseInt(match[2]);
        this.minor = parseInt(match[3]);
        this.patch = parseInt(match[4]);
    }

    toString(): string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }

    compare(other: SemVer): number {
        if (this.major !== other.major) return this.major - other.major;
        if (this.minor !== other.minor) return this.minor - other.minor;
        return this.patch - other.patch;
    }

    satisfies(range: string): boolean {
        if (range === '*') return true;
        const prefix = range.match(/^(\^|~)/)?.[1] || '';
        const target = new SemVer(range.replace(/^(\^|~)/, ''));

        if (prefix === '^') {
            // Compatible with local (same major)
            return this.major === target.major && this.compare(target) >= 0;
        } else if (prefix === '~') {
            // Approx (same major and minor)
            return this.major === target.major && this.minor === target.minor && this.compare(target) >= 0;
        } else {
            // Exact
            return this.compare(target) === 0;
        }
    }
}

// ==========================================
// PACKAGE MANAGER
// ==========================================

export class IJePakManager {
    private rootDir: string;
    private registry: string;
    private modulesDir: string;

    constructor(rootDir: string = process.cwd()) {
        this.rootDir = rootDir;
        this.registry = 'https://registry.ije-lang.com'; // Future registry
        this.modulesDir = path.join(rootDir, 'pak_modules');
    }

    // ==========================================
    // เริ่มต้น - Initialize new package
    // ==========================================
    async roemTon(options: Partial<PakManifest> = {}): Promise<void> {
        const manifestPath = path.join(this.rootDir, 'pak.json');

        if (fs.existsSync(manifestPath)) {
            throw new Error('pak.json already exists');
        }

        const manifest: PakManifest = {
            chue: options.chue || path.basename(this.rootDir),
            ruun: options.ruun || '1.0.0',
            athiBai: options.athiBai || 'IJe package',
            phooKhian: options.phooKhian || '',
            license: options.license || 'MIT',
            main: options.main || 'index.ije',
            phuengPha: {},
            phuengPhaDev: {},
            script: {
                'wing': 'ije index.ije',      // run
                'thod': 'ije test',            // test
                'sang': 'ije build'            // build
            }
        };

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
        console.log('✅ สร้าง pak.json แล้ว');

        // Create pak_modules directory
        if (!fs.existsSync(this.modulesDir)) {
            fs.mkdirSync(this.modulesDir, { recursive: true });
        }

        // Create .gitignore for pak_modules
        const gitignorePath = path.join(this.modulesDir, '.gitignore');
        fs.writeFileSync(gitignorePath, '*\n!.gitignore\n');
    }

    // ==========================================
    // ติดตั้ง - Install package
    // ==========================================
    async titTang(packageName: string, saveType: 'save' | 'save-dev' = 'save'): Promise<void> {
        console.log(`📦 กำลังติดตั้ง ${packageName}...`);

        // Parse package name and version
        const [name, version] = this.parsePackageName(packageName);

        // For now, implement local/git installation
        if (name.startsWith('./') || name.startsWith('../')) {
            await this.installLocal(name);
        } else if (name.startsWith('github:') || name.startsWith('git:')) {
            await this.installFromGit(name);
        } else {
            // Future: fetch from registry
            await this.installFromRegistry(name, version);
        }

        // Update pak.json
        this.updateManifest(name, version || '*', saveType);

        console.log(`✅ ติดตั้ง ${name} สำเร็จ`);
    }

    // ==========================================
    // ถอนการติดตั้ง - Uninstall package
    // ==========================================
    async thon(packageName: string): Promise<void> {
        console.log(`🗑️ กำลังถอน ${packageName}...`);

        const packageDir = path.join(this.modulesDir, packageName);

        if (fs.existsSync(packageDir)) {
            fs.rmSync(packageDir, { recursive: true, force: true });
        }

        // Update pak.json
        this.removeFromManifest(packageName);

        console.log(`✅ ถอน ${packageName} สำเร็จ`);
    }

    // ==========================================
    // ติดตั้งทั้งหมด - Install all dependencies
    // ==========================================
    // ==========================================
    // ติดตั้งทั้งหมด - Install all dependencies
    // ==========================================
    async titTangMot(): Promise<void> {
        const manifest = this.loadManifest();

        if (!manifest) {
            throw new Error('ไม่พบ pak.json');
        }

        const rootDeps = { ...manifest.phuengPha, ...manifest.phuengPhaDev };
        const total = Object.keys(rootDeps).length;

        if (total === 0) {
            console.log('📭 ไม่มี dependencies ที่ต้องติดตั้ง');
            return;
        }

        console.log(`📦 กำลังตรวจสอบ dependencies...`);

        try {
            const resolved = await this.resolveDependencies(rootDeps);
            console.log(`📦 พบ ${Object.keys(resolved).length} packages ที่ต้องติดตั้ง`);

            // Save lockfile
            this.saveLockfile(manifest.ruun, resolved);

            for (const [name, info] of Object.entries(resolved)) {
                try {
                    await this.installFromRegistry(name, info.version);
                    console.log(`  ✅ ${name}@${info.version}`);
                } catch (e: any) {
                    console.log(`  ❌ ${name}: ${e.message}`);
                }
            }
            console.log('\n✅ ติดตั้งทั้งหมดสำเร็จ');
        } catch (e: any) {
            console.log(`❌ ล้มเหลว: ${e.message}`);
        }
    }

    // ==========================================
    // RESOLVER
    // ==========================================

    private async resolveDependencies(rootDeps: Record<string, string>): Promise<Record<string, { version: string, resolved: string }>> {
        const resolved: Record<string, { version: string, resolved: string }> = {};
        const queue: { name: string, range: string }[] = [];

        // Add root deps to queue
        for (const [name, range] of Object.entries(rootDeps)) {
            queue.push({ name, range });
        }

        while (queue.length > 0) {
            const dep = queue.shift()!;

            // Check if already resolved
            if (resolved[dep.name]) {
                const existing = new SemVer(resolved[dep.name].version);
                if (!existing.satisfies(dep.range)) {
                    throw new Error(`Version conflict for ${dep.name}: required ${dep.range} but blocked by ${existing}`);
                }
                continue;
            }

            // Resolve version (Mock registry lookup)
            const version = this.resolveBestVersion(dep.name, dep.range);
            resolved[dep.name] = { version, resolved: 'registry' };

            // Fetch manifest of dependency to get sub-dependencies
            // Mocking sub-deps for demonstration
            // In real world: await fetchManifest(dep.name, version);
            const subDeps = {};

            for (const [subName, subRange] of Object.entries(subDeps)) {
                queue.push({ name: subName, range: subRange as string });
            }
        }

        return resolved;
    }

    private resolveBestVersion(name: string, range: string): string {
        // Mock: Always return strict version if exact, or 1.0.0 if generic
        if (range.match(/^\d+\.\d+\.\d+$/)) return range;
        const base = range.replace(/^(\^|~)/, '');
        return base;
    }

    private saveLockfile(appVersion: string, resolved: Record<string, { version: string, resolved: string }>): void {
        const lock: PakLock = {
            ruun: appVersion,
            phuengPha: {}
        };
        for (const [name, info] of Object.entries(resolved)) {
            lock.phuengPha[name] = {
                ruun: info.version,
                resolved: info.resolved
            };
        }
        const lockPath = path.join(this.rootDir, 'pak.lock');
        fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
    }


    // ==========================================
    // อัปเดต - Update packages
    // ==========================================
    async apDet(packageName?: string): Promise<void> {
        if (packageName) {
            console.log(`🔄 กำลังอัปเดต ${packageName}...`);
            await this.thon(packageName);
            await this.titTang(packageName);
        } else {
            console.log('🔄 กำลังอัปเดตทั้งหมด...');
            await this.titTangMot();
        }

        console.log('✅ อัปเดตสำเร็จ');
    }

    // ==========================================
    // ค้นหา - Search packages
    // ==========================================
    async khonHa(query: string): Promise<PakSearchResult[]> {
        console.log(`🔍 กำลังค้นหา '${query}'...`);

        // For now, return mock results
        // In future, query the registry
        return [
            { chue: 'thai-nlp', ruun: '1.0.0', athiBai: 'Thai NLP utilities', downloads: 1000 },
            { chue: 'ui-kit', ruun: '2.0.0', athiBai: 'UI components for IJe', downloads: 500 },
            { chue: 'http-client', ruun: '1.2.0', athiBai: 'HTTP client library', downloads: 800 }
        ].filter(p => p.chue.includes(query) || p.athiBai.includes(query));
    }

    // ==========================================
    // รายการ - List installed packages
    // ==========================================
    raiKan(): string[] {
        if (!fs.existsSync(this.modulesDir)) {
            return [];
        }

        return fs.readdirSync(this.modulesDir)
            .filter(f => {
                const fullPath = path.join(this.modulesDir, f);
                return fs.statSync(fullPath).isDirectory() && f !== '.gitignore';
            });
    }

    // ==========================================
    // ข้อมูล - Package info
    // ==========================================
    khoMun(packageName: string): PakManifest | null {
        const manifestPath = path.join(this.modulesDir, packageName, 'pak.json');

        if (!fs.existsSync(manifestPath)) {
            return null;
        }

        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }

    // ==========================================
    // เผยแพร่ - Publish package
    // ==========================================
    async phoeiPhrae(): Promise<void> {
        const manifest = this.loadManifest();

        if (!manifest) {
            throw new Error('ไม่พบ pak.json');
        }

        console.log(`📤 กำลังเผยแพร่ ${manifest.chue}@${manifest.ruun}...`);

        // Validate manifest
        if (!manifest.chue || !manifest.ruun) {
            throw new Error('pak.json ต้องมี chue และ ruun');
        }

        // Prepare package info for registry
        const packageInfo = {
            name: manifest.chue,
            version: manifest.ruun,
            description: manifest.athiBai || '',
            author: manifest.phooKhian || '',
            main: manifest.main || 'index.ije',
            dependencies: manifest.phuengPha || {}
        };

        try {
            // Try to publish to local registry
            const localRegistry = 'http://localhost:3456';
            const response = await fetch(`${localRegistry}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(packageInfo)
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ เผยแพร่ไปยัง registry สำเร็จ`);
                console.log(`📦 ${result.package.name}@${result.package.version}`);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Registry error');
            }
        } catch (e: any) {
            if (e.message.includes('fetch')) {
                console.log('⚠️ Registry ไม่ได้เปิดทำงาน - รัน: npx ts-node registry/server.ts');
            } else {
                throw e;
            }
        }
    }

    // ==========================================
    // วิ่งสคริปต์ - Run script
    // ==========================================
    async wingSaKrit(scriptName: string): Promise<void> {
        const manifest = this.loadManifest();

        if (!manifest || !manifest.script) {
            throw new Error('ไม่มี script ใน pak.json');
        }

        const script = manifest.script[scriptName];

        if (!script) {
            throw new Error(`ไม่พบ script '${scriptName}'`);
        }

        console.log(`▶️ วิ่ง: ${script}`);

        const { exec } = await import('child_process');

        return new Promise((resolve, reject) => {
            exec(script, { cwd: this.rootDir }, (error, stdout, stderr) => {
                if (stdout) console.log(stdout);
                if (stderr) console.error(stderr);
                if (error) reject(error);
                else resolve();
            });
        });
    }

    // ==========================================
    // HELPERS
    // ==========================================

    private loadManifest(): PakManifest | null {
        const manifestPath = path.join(this.rootDir, 'pak.json');

        if (!fs.existsSync(manifestPath)) {
            return null;
        }

        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }

    private saveManifest(manifest: PakManifest): void {
        const manifestPath = path.join(this.rootDir, 'pak.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }

    private parsePackageName(packageName: string): [string, string | undefined] {
        const match = packageName.match(/^(@?[^@]+)(?:@(.+))?$/);
        if (match) {
            return [match[1], match[2]];
        }
        return [packageName, undefined];
    }

    private async installFromRegistry(name: string, version?: string): Promise<void> {
        // For now, create a placeholder directory
        const packageDir = path.join(this.modulesDir, name);

        if (!fs.existsSync(this.modulesDir)) {
            fs.mkdirSync(this.modulesDir, { recursive: true });
        }

        if (!fs.existsSync(packageDir)) {
            fs.mkdirSync(packageDir, { recursive: true });

            // Create placeholder pak.json
            const pkgManifest: PakManifest = {
                chue: name,
                ruun: version || '1.0.0',
                athiBai: `Package ${name}`,
                main: 'index.ije'
            };

            fs.writeFileSync(
                path.join(packageDir, 'pak.json'),
                JSON.stringify(pkgManifest, null, 2)
            );

            // Create placeholder index.ije
            fs.writeFileSync(
                path.join(packageDir, 'index.ije'),
                `// ${name} module\nda("Package ${name} loaded")\n`
            );
        }
    }

    private async installLocal(localPath: string): Promise<void> {
        const sourcePath = path.resolve(this.rootDir, localPath);
        const packageName = path.basename(sourcePath);
        const targetPath = path.join(this.modulesDir, packageName);

        if (!fs.existsSync(this.modulesDir)) {
            fs.mkdirSync(this.modulesDir, { recursive: true });
        }

        // Copy directory
        this.copyDir(sourcePath, targetPath);
    }

    private async installFromGit(gitUrl: string): Promise<void> {
        // Remove git: or github: prefix
        const url = gitUrl.replace(/^(git:|github:)/, '');
        console.log(`⚠️ Git installation not yet implemented: ${url}`);
    }

    private updateManifest(name: string, version: string, saveType: 'save' | 'save-dev'): void {
        const manifest = this.loadManifest();

        if (!manifest) {
            return;
        }

        if (saveType === 'save-dev') {
            manifest.phuengPhaDev = manifest.phuengPhaDev || {};
            manifest.phuengPhaDev[name] = version;
        } else {
            manifest.phuengPha = manifest.phuengPha || {};
            manifest.phuengPha[name] = version;
        }

        this.saveManifest(manifest);
    }

    private removeFromManifest(name: string): void {
        const manifest = this.loadManifest();

        if (!manifest) {
            return;
        }

        if (manifest.phuengPha && manifest.phuengPha[name]) {
            delete manifest.phuengPha[name];
        }
        if (manifest.phuengPhaDev && manifest.phuengPhaDev[name]) {
            delete manifest.phuengPhaDev[name];
        }

        this.saveManifest(manifest);
    }

    private async createTarball(): Promise<Buffer> {
        // Simple implementation - in real version would use tar library
        return Buffer.from('tarball-placeholder');
    }

    private copyDir(src: string, dest: string): void {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                this.copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

// ==========================================
// CLI INTERFACE
// ==========================================

export async function runPakCLI(args: string[]): Promise<void> {
    const pak = new IJePakManager();
    const command = args[0];
    const params = args.slice(1);

    switch (command) {
        case 'init':
        case 'roem':  // เริ่ม
            await pak.roemTon();
            break;

        case 'install':
        case 'i':
        case 'titTang':  // ติดตั้ง
            if (params.length === 0) {
                await pak.titTangMot();
            } else {
                const saveType = params.includes('--save-dev') || params.includes('-D')
                    ? 'save-dev' : 'save';
                const packageName = params.find(p => !p.startsWith('-'));
                if (packageName) {
                    await pak.titTang(packageName, saveType);
                }
            }
            break;

        case 'uninstall':
        case 'remove':
        case 'thon':  // ถอน
            if (params[0]) {
                await pak.thon(params[0]);
            }
            break;

        case 'update':
        case 'apDet':  // อัปเดต
            await pak.apDet(params[0]);
            break;

        case 'search':
        case 'khonHa':  // ค้นหา
            if (params[0]) {
                const results = await pak.khonHa(params[0]);
                console.log('\n📦 ผลการค้นหา:');
                for (const pkg of results) {
                    console.log(`  ${pkg.chue}@${pkg.ruun} - ${pkg.athiBai}`);
                }
            }
            break;

        case 'list':
        case 'ls':
        case 'raiKan':  // รายการ
            const packages = pak.raiKan();
            console.log('\n📦 Packages ที่ติดตั้ง:');
            for (const pkg of packages) {
                const info = pak.khoMun(pkg);
                console.log(`  ${pkg}${info ? `@${info.ruun}` : ''}`);
            }
            break;

        case 'publish':
        case 'phoeiPhrae':  // เผยแพร่
            await pak.phoeiPhrae();
            break;

        case 'run':
        case 'wing':  // วิ่ง
            if (params[0]) {
                await pak.wingSaKrit(params[0]);
            }
            break;

        default:
            console.log(`
╔══════════════════════════════════════════════════════╗
║           📦 IJe Pak - Package Manager               ║
╚══════════════════════════════════════════════════════╝

คำสั่ง (Commands):
  pak init              เริ่มต้นโปรเจค (Initialize)
  pak install [name]    ติดตั้ง package
  pak uninstall <name>  ถอน package  
  pak update [name]     อัปเดต package
  pak search <query>    ค้นหา package
  pak list              รายการ packages ที่ติดตั้ง
  pak publish           เผยแพร่ package
  pak run <script>      วิ่ง script

ตัวอย่าง:
  pak init
  pak install thai-utils
  pak install thai-utils --save-dev
  pak run test
`);
    }
}
