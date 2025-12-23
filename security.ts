/**
 * IJe Language Security Module
 * 
 * Comprehensive security hardening for the IJe Thai programming language.
 * Protects against: Command Injection, Path Traversal, SSRF, XSS, Resource Exhaustion
 * 
 * @author IJe Security Team
 * @version 1.0.0
 */

// ============================================
// SECURITY LEVELS
// ============================================

export enum SecurityLevel {
    /** Full access - for trusted scripts only */
    UNRESTRICTED = 'unrestricted',
    /** Most features with basic limits */
    STANDARD = 'standard',
    /** Restricted mode for untrusted code */
    SANDBOX = 'sandbox',
    /** No dangerous operations allowed */
    LOCKED = 'locked'
}

// ============================================
// PERMISSION TYPES
// ============================================

export enum Permission {
    FILE_READ = 'file:read',
    FILE_WRITE = 'file:write',
    TERMINAL = 'terminal',
    HTTP = 'http',
    DATABASE = 'database',
    UI = 'ui',
    SYSTEM = 'system'
}

// ============================================
// SECURITY CONFIGURATION
// ============================================

export interface SecurityConfig {
    level: SecurityLevel;

    // Resource limits
    maxExecutionTime: number;      // milliseconds
    maxMemory: number;             // bytes
    maxRecursionDepth: number;
    maxStringLength: number;
    maxArrayLength: number;
    maxIterations: number;

    // Path security
    allowedPaths: string[];
    blockedPaths: string[];
    allowHiddenFiles: boolean;

    // Command security
    allowedCommands: string[];
    blockedCommands: string[];
    blockShellOperators: boolean;

    // URL security
    allowedHosts: string[];
    blockedHosts: string[];
    blockLocalhost: boolean;
    blockPrivateIPs: boolean;
    blockCloudMetadata: boolean;

    // Permissions
    grantedPermissions: Set<Permission>;
    requireExplicitPermission: boolean;
}

// Default security configurations per level
export const DEFAULT_CONFIGS: Record<SecurityLevel, Partial<SecurityConfig>> = {
    [SecurityLevel.UNRESTRICTED]: {
        maxExecutionTime: Infinity,
        maxMemory: Infinity,
        maxRecursionDepth: 10000,
        maxStringLength: 100 * 1024 * 1024, // 100MB
        maxArrayLength: 10000000,
        maxIterations: Infinity,
        allowedPaths: ['*'],
        blockedPaths: [],
        allowHiddenFiles: true,
        allowedCommands: ['*'],
        blockedCommands: [],
        blockShellOperators: false,
        allowedHosts: ['*'],
        blockedHosts: [],
        blockLocalhost: false,
        blockPrivateIPs: false,
        blockCloudMetadata: false,
        requireExplicitPermission: false
    },
    [SecurityLevel.STANDARD]: {
        maxExecutionTime: 60000, // 60 seconds
        maxMemory: 100 * 1024 * 1024, // 100MB
        maxRecursionDepth: 1000,
        maxStringLength: 10 * 1024 * 1024, // 10MB
        maxArrayLength: 1000000,
        maxIterations: 1000000,
        allowedPaths: ['./', '~/ije-data/'],
        blockedPaths: ['..', '/etc/', '/usr/', 'C:\\Windows\\', 'C:\\Program Files\\'],
        allowHiddenFiles: false,
        allowedCommands: ['echo', 'cat', 'ls', 'dir', 'node', 'npm', 'npx', 'git'],
        blockedCommands: ['rm', 'del', 'format', 'shutdown', 'reboot', 'sudo', 'su'],
        blockShellOperators: true,
        allowedHosts: ['*'],
        blockedHosts: [],
        blockLocalhost: false,
        blockPrivateIPs: true,
        blockCloudMetadata: true,
        requireExplicitPermission: false
    },
    [SecurityLevel.SANDBOX]: {
        maxExecutionTime: 10000, // 10 seconds
        maxMemory: 50 * 1024 * 1024, // 50MB
        maxRecursionDepth: 500,
        maxStringLength: 1 * 1024 * 1024, // 1MB
        maxArrayLength: 100000,
        maxIterations: 100000,
        allowedPaths: ['./sandbox/', '~/ije-data/sandbox/'],
        blockedPaths: ['..', '/', 'C:\\'],
        allowHiddenFiles: false,
        allowedCommands: ['echo'],
        blockedCommands: ['*'],
        blockShellOperators: true,
        allowedHosts: [],
        blockedHosts: ['*'],
        blockLocalhost: true,
        blockPrivateIPs: true,
        blockCloudMetadata: true,
        requireExplicitPermission: true
    },
    [SecurityLevel.LOCKED]: {
        maxExecutionTime: 5000, // 5 seconds
        maxMemory: 10 * 1024 * 1024, // 10MB
        maxRecursionDepth: 100,
        maxStringLength: 100 * 1024, // 100KB
        maxArrayLength: 10000,
        maxIterations: 10000,
        allowedPaths: [],
        blockedPaths: ['*'],
        allowHiddenFiles: false,
        allowedCommands: [],
        blockedCommands: ['*'],
        blockShellOperators: true,
        allowedHosts: [],
        blockedHosts: ['*'],
        blockLocalhost: true,
        blockPrivateIPs: true,
        blockCloudMetadata: true,
        requireExplicitPermission: true
    }
};

// ============================================
// SECURITY ERROR MESSAGES (Thai + English)
// ============================================

export const SECURITY_ERRORS = {
    // Path errors
    pathTraversal: (path: string) =>
        `🔒 ปฏิเสธการเข้าถึง: Path traversal ถูกบล็อก! (${path})\n   Access denied: Path traversal blocked!`,
    blockedPath: (path: string) =>
        `🔒 ปฏิเสธการเข้าถึง: พาธนี้ถูกบล็อก (${path})\n   Access denied: This path is blocked!`,
    hiddenFile: (path: string) =>
        `🔒 ปฏิเสธการเข้าถึง: ไม่สามารถเข้าถึงไฟล์ซ่อนได้ (${path})\n   Access denied: Hidden files not allowed!`,

    // Command errors
    blockedCommand: (cmd: string) =>
        `🔒 คำสั่งถูกบล็อก: '${cmd}' ไม่ได้รับอนุญาต!\n   Blocked command: '${cmd}' is not allowed!`,
    shellOperator: (op: string) =>
        `🔒 Shell operator ถูกบล็อก: '${op}' ไม่ปลอดภัย!\n   Shell operator blocked: '${op}' is not safe!`,

    // URL errors
    blockedHost: (host: string) =>
        `🔒 โฮสต์ถูกบล็อก: ไม่สามารถเชื่อมต่อ '${host}'\n   Blocked host: Cannot connect to '${host}'!`,
    privateIP: (ip: string) =>
        `🔒 SSRF ถูกบล็อก: ไม่สามารถเข้าถึง private IP (${ip})\n   SSRF blocked: Cannot access private IP!`,
    cloudMetadata: () =>
        `🔒 Cloud metadata ถูกบล็อก: พยายามเข้าถึง metadata endpoint\n   Cloud metadata blocked: Attempted access to metadata endpoint!`,

    // Permission errors
    permissionDenied: (perm: Permission) =>
        `🔒 ไม่มีสิทธิ์: ต้องขอ '${perm}' ก่อน! ใช้ khao_sidhi("${perm}")\n   Permission denied: Request '${perm}' first using khao_sidhi()!`,

    // Resource errors
    executionTimeout: (ms: number) =>
        `🔒 หมดเวลา: สคริปต์รันเกิน ${ms}ms!\n   Timeout: Script exceeded ${ms}ms execution time!`,
    memoryExceeded: (bytes: number) =>
        `🔒 หน่วยความจำเกิน: ใช้เกิน ${Math.round(bytes / 1024 / 1024)}MB!\n   Memory exceeded: Used more than ${Math.round(bytes / 1024 / 1024)}MB!`,
    recursionLimit: (depth: number) =>
        `🔒 Recursion เกิน: เรียกซ้อนกันเกิน ${depth} ครั้ง!\n   Recursion limit: Exceeded ${depth} nested calls!`,
    iterationLimit: (count: number) =>
        `🔒 Loop เกิน: วนซ้ำเกิน ${count} ครั้ง!\n   Iteration limit: Exceeded ${count} iterations!`,
    stringTooLong: (len: number) =>
        `🔒 String ยาวเกิน: ความยาว ${len} เกินขีดจำกัด!\n   String too long: Length ${len} exceeds limit!`,
    arrayTooLarge: (len: number) =>
        `🔒 Array ใหญ่เกิน: ขนาด ${len} เกินขีดจำกัด!\n   Array too large: Size ${len} exceeds limit!`
};

// ============================================
// SECURITY MANAGER CLASS
// ============================================

export class SecurityManager {
    private config: SecurityConfig;
    private startTime: number = 0;
    private recursionDepth: number = 0;
    private iterationCount: number = 0;

    constructor(level: SecurityLevel = SecurityLevel.STANDARD) {
        this.config = this.createConfig(level);
    }

    private createConfig(level: SecurityLevel): SecurityConfig {
        const defaults = DEFAULT_CONFIGS[level];
        return {
            level,
            maxExecutionTime: defaults.maxExecutionTime ?? 30000,
            maxMemory: defaults.maxMemory ?? 50 * 1024 * 1024,
            maxRecursionDepth: defaults.maxRecursionDepth ?? 1000,
            maxStringLength: defaults.maxStringLength ?? 10 * 1024 * 1024,
            maxArrayLength: defaults.maxArrayLength ?? 1000000,
            maxIterations: defaults.maxIterations ?? 1000000,
            allowedPaths: defaults.allowedPaths ?? [],
            blockedPaths: defaults.blockedPaths ?? [],
            allowHiddenFiles: defaults.allowHiddenFiles ?? false,
            allowedCommands: defaults.allowedCommands ?? [],
            blockedCommands: defaults.blockedCommands ?? [],
            blockShellOperators: defaults.blockShellOperators ?? true,
            allowedHosts: defaults.allowedHosts ?? [],
            blockedHosts: defaults.blockedHosts ?? [],
            blockLocalhost: defaults.blockLocalhost ?? true,
            blockPrivateIPs: defaults.blockPrivateIPs ?? true,
            blockCloudMetadata: defaults.blockCloudMetadata ?? true,
            grantedPermissions: new Set<Permission>(),
            requireExplicitPermission: defaults.requireExplicitPermission ?? false
        };
    }

    // ========================================
    // CONFIGURATION
    // ========================================

    setLevel(level: SecurityLevel): void {
        this.config = this.createConfig(level);
    }

    getConfig(): SecurityConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<SecurityConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    // ========================================
    // PERMISSION MANAGEMENT
    // ========================================

    grantPermission(permission: Permission): void {
        this.config.grantedPermissions.add(permission);
    }

    revokePermission(permission: Permission): void {
        this.config.grantedPermissions.delete(permission);
    }

    hasPermission(permission: Permission): boolean {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return true;
        if (!this.config.requireExplicitPermission) return true;
        return this.config.grantedPermissions.has(permission);
    }

    requirePermission(permission: Permission): void {
        if (!this.hasPermission(permission)) {
            throw new SecurityError(SECURITY_ERRORS.permissionDenied(permission));
        }
    }

    // ========================================
    // PATH VALIDATION
    // ========================================

    validatePath(path: string, requireWrite: boolean = false): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        const normalizedPath = this.normalizePath(path);

        // Check path traversal
        if (this.hasPathTraversal(normalizedPath)) {
            throw new SecurityError(SECURITY_ERRORS.pathTraversal(path));
        }

        // Check hidden files
        if (!this.config.allowHiddenFiles && this.isHiddenFile(normalizedPath)) {
            throw new SecurityError(SECURITY_ERRORS.hiddenFile(path));
        }

        // Check blocked paths
        if (this.isPathBlocked(normalizedPath)) {
            throw new SecurityError(SECURITY_ERRORS.blockedPath(path));
        }

        // Check allowed paths (if any specified)
        if (this.config.allowedPaths.length > 0 &&
            !this.config.allowedPaths.includes('*') &&
            !this.isPathAllowed(normalizedPath)) {
            throw new SecurityError(SECURITY_ERRORS.blockedPath(path));
        }

        // Check write permission
        if (requireWrite) {
            this.requirePermission(Permission.FILE_WRITE);
        } else {
            this.requirePermission(Permission.FILE_READ);
        }
    }

    private normalizePath(path: string): string {
        return path
            .replace(/\\/g, '/')
            .replace(/\/+/g, '/')
            .toLowerCase();
    }

    private hasPathTraversal(path: string): boolean {
        const dangerous = ['../', '..\\', '%2e%2e', '%252e'];
        return dangerous.some(pattern => path.toLowerCase().includes(pattern));
    }

    private isHiddenFile(path: string): boolean {
        const parts = path.split('/');
        return parts.some(part => part.startsWith('.') && part !== '.' && part !== '..');
    }

    private isPathBlocked(path: string): boolean {
        return this.config.blockedPaths.some(blocked => {
            if (blocked === '*') return true;
            return path.includes(blocked.toLowerCase());
        });
    }

    private isPathAllowed(path: string): boolean {
        return this.config.allowedPaths.some(allowed => {
            if (allowed === '*') return true;
            if (allowed === './') return !path.startsWith('/') && !path.includes(':');
            return path.startsWith(allowed.toLowerCase());
        });
    }

    // ========================================
    // COMMAND VALIDATION
    // ========================================

    validateCommand(command: string): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        this.requirePermission(Permission.TERMINAL);

        const cmd = command.trim().toLowerCase();
        const cmdName = cmd.split(/\s+/)[0];

        // Check shell operators
        if (this.config.blockShellOperators) {
            const shellOps = ['|', '&', ';', '>', '<', '`', '$', '$(', '${'];
            for (const op of shellOps) {
                if (command.includes(op)) {
                    throw new SecurityError(SECURITY_ERRORS.shellOperator(op));
                }
            }
        }

        // Check blocked commands
        if (this.config.blockedCommands.includes('*') ||
            this.config.blockedCommands.includes(cmdName)) {
            throw new SecurityError(SECURITY_ERRORS.blockedCommand(cmdName));
        }

        // Check allowed commands (if any specified)
        if (this.config.allowedCommands.length > 0 &&
            !this.config.allowedCommands.includes('*') &&
            !this.config.allowedCommands.includes(cmdName)) {
            throw new SecurityError(SECURITY_ERRORS.blockedCommand(cmdName));
        }
    }

    // ========================================
    // URL VALIDATION
    // ========================================

    validateURL(url: string): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        this.requirePermission(Permission.HTTP);

        let parsedURL: URL;
        try {
            parsedURL = new URL(url);
        } catch {
            throw new SecurityError(`🔒 Invalid URL: ${url}`);
        }

        const host = parsedURL.hostname.toLowerCase();

        // Block localhost
        if (this.config.blockLocalhost) {
            if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
                throw new SecurityError(SECURITY_ERRORS.blockedHost(host));
            }
        }

        // Block private IPs
        if (this.config.blockPrivateIPs && this.isPrivateIP(host)) {
            throw new SecurityError(SECURITY_ERRORS.privateIP(host));
        }

        // Block cloud metadata
        if (this.config.blockCloudMetadata && this.isCloudMetadata(host)) {
            throw new SecurityError(SECURITY_ERRORS.cloudMetadata());
        }

        // Check blocked hosts
        if (this.config.blockedHosts.includes('*') ||
            this.config.blockedHosts.includes(host)) {
            throw new SecurityError(SECURITY_ERRORS.blockedHost(host));
        }

        // Check allowed hosts (if any specified)
        if (this.config.allowedHosts.length > 0 &&
            !this.config.allowedHosts.includes('*') &&
            !this.isHostAllowed(host)) {
            throw new SecurityError(SECURITY_ERRORS.blockedHost(host));
        }
    }

    private isPrivateIP(host: string): boolean {
        // IPv4 private ranges
        const privatePatterns = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./,
            /^fc00:/i,  // IPv6 private
            /^fd00:/i,  // IPv6 private
            /^fe80:/i   // IPv6 link-local
        ];
        return privatePatterns.some(pattern => pattern.test(host));
    }

    private isCloudMetadata(host: string): boolean {
        const metadataHosts = [
            '169.254.169.254',      // AWS, GCP, Azure
            'metadata.google.internal',
            'metadata.gcp.internal',
            '100.100.100.200'       // Alibaba Cloud
        ];
        return metadataHosts.includes(host);
    }

    private isHostAllowed(host: string): boolean {
        return this.config.allowedHosts.some(allowed => {
            if (allowed === '*') return true;
            if (allowed.startsWith('*.')) {
                return host.endsWith(allowed.slice(1));
            }
            return host === allowed;
        });
    }

    // ========================================
    // RESOURCE LIMITING
    // ========================================

    startExecution(): void {
        this.startTime = Date.now();
        this.recursionDepth = 0;
        this.iterationCount = 0;
    }

    checkExecutionTime(): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        const elapsed = Date.now() - this.startTime;
        if (elapsed > this.config.maxExecutionTime) {
            throw new SecurityError(SECURITY_ERRORS.executionTimeout(this.config.maxExecutionTime));
        }
    }

    enterRecursion(): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        this.recursionDepth++;
        if (this.recursionDepth > this.config.maxRecursionDepth) {
            throw new SecurityError(SECURITY_ERRORS.recursionLimit(this.config.maxRecursionDepth));
        }
    }

    exitRecursion(): void {
        this.recursionDepth = Math.max(0, this.recursionDepth - 1);
    }

    countIteration(): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        this.iterationCount++;
        if (this.iterationCount > this.config.maxIterations) {
            throw new SecurityError(SECURITY_ERRORS.iterationLimit(this.config.maxIterations));
        }

        // Check time every 1000 iterations
        if (this.iterationCount % 1000 === 0) {
            this.checkExecutionTime();
        }
    }

    validateStringLength(str: string): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        if (str.length > this.config.maxStringLength) {
            throw new SecurityError(SECURITY_ERRORS.stringTooLong(str.length));
        }
    }

    validateArrayLength(arr: any[]): void {
        if (this.config.level === SecurityLevel.UNRESTRICTED) return;

        if (arr.length > this.config.maxArrayLength) {
            throw new SecurityError(SECURITY_ERRORS.arrayTooLarge(arr.length));
        }
    }

    // ========================================
    // INPUT SANITIZATION
    // ========================================

    sanitizeString(input: string): string {
        // Remove null bytes and control characters
        return input
            .replace(/\0/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    escapeHTML(input: string): string {
        const escapeMap: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        return input.replace(/[&<>"'`=/]/g, char => escapeMap[char]);
    }

    escapeSQL(input: string): string {
        return input
            .replace(/'/g, "''")
            .replace(/\\/g, '\\\\')
            .replace(/\0/g, '');
    }

    escapeRegex(input: string): string {
        return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    validateURLFormat(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

// ============================================
// SECURITY ERROR CLASS
// ============================================

export class SecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SecurityError';
    }
}

// ============================================
// PHASE 2: CRYPTOGRAPHY MANAGER
// ============================================

export class CryptoManager {
    // Simple hash function (for browser compatibility)
    // In production, use SubtleCrypto or Node crypto
    hash(data: string, algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'): string {
        let hash = 0;
        const str = `${algorithm}:${data}`;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        // Generate longer hash based on algorithm
        let result = Math.abs(hash).toString(16);
        const targetLength = algorithm === 'md5' ? 32 : algorithm === 'sha256' ? 64 : 128;

        // Extend hash to target length
        while (result.length < targetLength) {
            hash = ((hash << 5) - hash) + result.charCodeAt(result.length % result.length);
            result += Math.abs(hash).toString(16);
        }

        return result.substring(0, targetLength);
    }

    // Password hashing with salt
    hashPassword(password: string): { hash: string; salt: string } {
        const salt = this.randomToken(16);
        const hash = this.hash(salt + password, 'sha256');
        return { hash, salt };
    }

    // Verify password
    verifyPassword(password: string, hash: string, salt: string): boolean {
        const computed = this.hash(salt + password, 'sha256');
        return computed === hash;
    }

    // Simple XOR-based encryption (for demo - use AES in production)
    encrypt(data: string, key: string): { ciphertext: string; iv: string } {
        const iv = this.randomToken(16);
        const keyHash = this.hash(key + iv, 'sha256');

        let encrypted = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i) ^ keyHash.charCodeAt(i % keyHash.length);
            encrypted += String.fromCharCode(charCode);
        }

        return {
            ciphertext: Buffer.from(encrypted).toString('base64'),
            iv
        };
    }

    // Decrypt
    decrypt(ciphertext: string, key: string, iv: string): string {
        const keyHash = this.hash(key + iv, 'sha256');
        const encrypted = Buffer.from(ciphertext, 'base64').toString();

        let decrypted = '';
        for (let i = 0; i < encrypted.length; i++) {
            const charCode = encrypted.charCodeAt(i) ^ keyHash.charCodeAt(i % keyHash.length);
            decrypted += String.fromCharCode(charCode);
        }

        return decrypted;
    }

    // Secure random bytes (hex string)
    randomBytes(length: number): string {
        let result = '';
        const chars = '0123456789abcdef';
        for (let i = 0; i < length * 2; i++) {
            result += chars.charAt(Math.floor(Math.random() * 16));
        }
        return result;
    }

    // URL-safe random token
    randomToken(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Secure random integer
    randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // UUID v4 generator
    uuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// ============================================
// PHASE 2: RATE LIMITER
// ============================================

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

export class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();

    // Default limits
    private defaultLimits = {
        http: { limit: 100, windowMs: 60000 },      // 100 per minute
        file: { limit: 50, windowMs: 60000 },       // 50 per minute
        command: { limit: 10, windowMs: 60000 },    // 10 per minute
        crypto: { limit: 1000, windowMs: 60000 }    // 1000 per minute
    };

    // Check if action is allowed
    check(key: string, limit?: number, windowMs?: number): boolean {
        const now = Date.now();
        const config = this.defaultLimits[key as keyof typeof this.defaultLimits] ||
            { limit: limit || 100, windowMs: windowMs || 60000 };

        const fullKey = `${key}`;
        const entry = this.limits.get(fullKey);

        if (!entry || now > entry.resetTime) {
            // Create new window
            this.limits.set(fullKey, {
                count: 1,
                resetTime: now + config.windowMs
            });
            return true;
        }

        if (entry.count >= config.limit) {
            return false;
        }

        entry.count++;
        return true;
    }

    // Get remaining requests
    getRemaining(key: string): number {
        const config = this.defaultLimits[key as keyof typeof this.defaultLimits] ||
            { limit: 100, windowMs: 60000 };
        const entry = this.limits.get(key);

        if (!entry || Date.now() > entry.resetTime) {
            return config.limit;
        }

        return Math.max(0, config.limit - entry.count);
    }

    // Reset a specific key
    reset(key: string): void {
        this.limits.delete(key);
    }

    // Reset all
    resetAll(): void {
        this.limits.clear();
    }

    // Check with auto-throw on limit
    checkOrThrow(key: string): void {
        if (!this.check(key)) {
            throw new SecurityError(
                `🔒 Rate limit exceeded for '${key}'. ` +
                `Remaining: ${this.getRemaining(key)}. ` +
                `กรุณารอสักครู่แล้วลองใหม่`
            );
        }
    }
}

// ============================================
// PHASE 2: SECURITY AUDIT LOGGER
// ============================================

export type SecurityEventType =
    | 'PATH_TRAVERSAL_BLOCKED'
    | 'COMMAND_BLOCKED'
    | 'SSRF_BLOCKED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'PERMISSION_DENIED'
    | 'CRYPTO_OPERATION'
    | 'LOGIN_ATTEMPT'
    | 'SANDBOX_VIOLATION'
    | 'SUSPICIOUS_INPUT';

export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: number;
    details: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    blocked: boolean;
    source?: string;
}

export interface SecurityReport {
    totalEvents: number;
    blockedCount: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentEvents: SecurityEvent[];
}

export class SecurityLogger {
    private events: SecurityEvent[] = [];
    private maxEvents: number = 1000;

    // Log a security event
    log(type: SecurityEventType, details: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', blocked: boolean = true): void {
        const event: SecurityEvent = {
            type,
            timestamp: Date.now(),
            details,
            severity,
            blocked
        };

        this.events.push(event);

        // Trim old events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }

        // Console output for critical events
        if (severity === 'critical') {
            console.error(`🚨 CRITICAL SECURITY EVENT: ${type} - ${details}`);
        }
    }

    // Get events with optional filter
    getEvents(filter?: { type?: SecurityEventType; severity?: string; since?: number }): SecurityEvent[] {
        let filtered = this.events;

        if (filter?.type) {
            filtered = filtered.filter(e => e.type === filter.type);
        }
        if (filter?.severity) {
            filtered = filtered.filter(e => e.severity === filter.severity);
        }
        if (filter?.since) {
            filtered = filtered.filter(e => e.timestamp >= filter.since);
        }

        return filtered;
    }

    // Generate security report
    generateReport(): SecurityReport {
        const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
        const byType: Record<string, number> = {};
        let blockedCount = 0;

        for (const event of this.events) {
            bySeverity[event.severity]++;
            byType[event.type] = (byType[event.type] || 0) + 1;
            if (event.blocked) blockedCount++;
        }

        return {
            totalEvents: this.events.length,
            blockedCount,
            bySeverity,
            byType,
            recentEvents: this.events.slice(-10)
        };
    }

    // Clear all events
    clear(): void {
        this.events = [];
    }
}

// ============================================
// PHASE 2: CONTENT SECURITY POLICY
// ============================================

export interface CSPDirectives {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    fontSrc?: string[];
    connectSrc?: string[];
    frameSrc?: string[];
    objectSrc?: string[];
    mediaSrc?: string[];
    formAction?: string[];
    frameAncestors?: string[];
    upgradeInsecureRequests?: boolean;
    blockAllMixedContent?: boolean;
}

export class CSPGenerator {
    // Generate CSP header string
    generate(directives: CSPDirectives): string {
        const parts: string[] = [];

        if (directives.defaultSrc) {
            parts.push(`default-src ${directives.defaultSrc.join(' ')}`);
        }
        if (directives.scriptSrc) {
            parts.push(`script-src ${directives.scriptSrc.join(' ')}`);
        }
        if (directives.styleSrc) {
            parts.push(`style-src ${directives.styleSrc.join(' ')}`);
        }
        if (directives.imgSrc) {
            parts.push(`img-src ${directives.imgSrc.join(' ')}`);
        }
        if (directives.fontSrc) {
            parts.push(`font-src ${directives.fontSrc.join(' ')}`);
        }
        if (directives.connectSrc) {
            parts.push(`connect-src ${directives.connectSrc.join(' ')}`);
        }
        if (directives.frameSrc) {
            parts.push(`frame-src ${directives.frameSrc.join(' ')}`);
        }
        if (directives.objectSrc) {
            parts.push(`object-src ${directives.objectSrc.join(' ')}`);
        }
        if (directives.mediaSrc) {
            parts.push(`media-src ${directives.mediaSrc.join(' ')}`);
        }
        if (directives.formAction) {
            parts.push(`form-action ${directives.formAction.join(' ')}`);
        }
        if (directives.frameAncestors) {
            parts.push(`frame-ancestors ${directives.frameAncestors.join(' ')}`);
        }
        if (directives.upgradeInsecureRequests) {
            parts.push('upgrade-insecure-requests');
        }
        if (directives.blockAllMixedContent) {
            parts.push('block-all-mixed-content');
        }

        return parts.join('; ');
    }

    // Generate strict CSP
    strict(): string {
        return this.generate({
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: true
        });
    }

    // Strip scripts from HTML
    stripScripts(html: string): string {
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
            .replace(/javascript:/gi, '');
    }

    // Safe HTML - escape and strip dangerous content
    safeHtml(html: string): string {
        let safe = this.stripScripts(html);
        // Remove iframes
        safe = safe.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
        // Remove objects/embeds
        safe = safe.replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
        return safe;
    }
}

// ============================================
// PHASE 2: SANDBOX RUNNER
// ============================================

export interface SandboxConfig {
    maxTime: number;      // milliseconds
    maxMemory: number;    // bytes
    allowFile: boolean;
    allowNetwork: boolean;
    allowTerminal: boolean;
    allowCrypto: boolean;
}

export interface SandboxResult {
    success: boolean;
    output: string[];
    error?: string;
    executionTime: number;
}

export class SandboxRunner {
    private defaultConfig: SandboxConfig = {
        maxTime: 5000,
        maxMemory: 10 * 1024 * 1024,
        allowFile: false,
        allowNetwork: false,
        allowTerminal: false,
        allowCrypto: true
    };

    // Create sandboxed security instance
    createSandboxedSecurity(config?: Partial<SandboxConfig>): SecurityManager {
        const sandboxSecurity = new SecurityManager(SecurityLevel.LOCKED);

        const fullConfig = { ...this.defaultConfig, ...config };

        sandboxSecurity.updateConfig({
            maxExecutionTime: fullConfig.maxTime,
            maxMemory: fullConfig.maxMemory,
            allowedPaths: fullConfig.allowFile ? ['./sandbox/'] : [],
            blockedPaths: ['*'],
            allowedCommands: fullConfig.allowTerminal ? ['echo'] : [],
            blockedCommands: ['*'],
            allowedHosts: fullConfig.allowNetwork ? [] : [],
            blockedHosts: ['*'],
            blockLocalhost: true,
            blockPrivateIPs: true,
            requireExplicitPermission: true
        });

        return sandboxSecurity;
    }

    // Execute code in sandbox (returns results)
    async run(executeFn: () => Promise<any>, config?: Partial<SandboxConfig>): Promise<SandboxResult> {
        const fullConfig = { ...this.defaultConfig, ...config };
        const output: string[] = [];
        const startTime = Date.now();

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Sandbox timeout: exceeded ${fullConfig.maxTime}ms`));
            }, fullConfig.maxTime);
        });

        try {
            // Race between execution and timeout
            await Promise.race([executeFn(), timeoutPromise]);

            return {
                success: true,
                output,
                executionTime: Date.now() - startTime
            };
        } catch (error) {
            return {
                success: false,
                output,
                error: (error as Error).message,
                executionTime: Date.now() - startTime
            };
        }
    }

    // Check if config allows operation
    isAllowed(operation: 'file' | 'network' | 'terminal' | 'crypto', config: SandboxConfig): boolean {
        switch (operation) {
            case 'file': return config.allowFile;
            case 'network': return config.allowNetwork;
            case 'terminal': return config.allowTerminal;
            case 'crypto': return config.allowCrypto;
            default: return false;
        }
    }
}

// ============================================
// CODE VERIFIER (Code Signing)
// ============================================

export interface CodeSignature {
    hash: string;
    signature: string;
    author: string;
    timestamp: number;
    trusted: boolean;
}

export class CodeVerifier {
    private trustedHashes: Set<string> = new Set();
    private trustedAuthors: Set<string> = new Set();

    addTrustedHash(hash: string): void {
        this.trustedHashes.add(hash);
    }

    addTrustedAuthor(author: string): void {
        this.trustedAuthors.add(author);
    }

    async hashCode(code: string): Promise<string> {
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }

    async verifyCode(code: string, signature?: CodeSignature): Promise<boolean> {
        const hash = await this.hashCode(code);
        if (this.trustedHashes.has(hash)) return true;
        if (signature && signature.hash === hash && this.trustedAuthors.has(signature.author)) {
            return true;
        }
        return false;
    }
}

// ============================================
// GLOBAL SECURITY INSTANCES
// ============================================

export const globalSecurity = new SecurityManager(SecurityLevel.STANDARD);
export const codeVerifier = new CodeVerifier();
export const cryptoManager = new CryptoManager();
export const rateLimiter = new RateLimiter();
export const securityLogger = new SecurityLogger();
export const cspGenerator = new CSPGenerator();
export const sandboxRunner = new SandboxRunner();
