// ============================================
// IJe Debug Adapter - ระบบดีบัก
// VS Code Debug Adapter Protocol Implementation
// ============================================

// @ts-nocheck
import {
    DebugSession,
    InitializedEvent,
    StoppedEvent,
    BreakpointEvent,
    OutputEvent,
    TerminatedEvent,
    Thread,
    StackFrame,
    Scope,
    Source,
    Variable,
    Breakpoint
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import * as path from 'path';
import * as fs from 'fs';
import { Lexer } from '../lexer';
import { Parser } from '../parser';

// ==========================================
// LAUNCH ARGUMENTS
// ==========================================

interface IJeLaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    program: string;
    stopOnEntry?: boolean;
    trace?: boolean;
}

// ==========================================
// DEBUG RUNTIME
// ==========================================

interface IJeBreakpoint {
    id: number;
    line: number;
    verified: boolean;
}

class IJeRuntime {
    private _sourceFile: string = '';
    private _sourceLines: string[] = [];
    private _breakpoints = new Map<string, IJeBreakpoint[]>();
    private _currentLine: number = 0;
    private _stopOnEntry: boolean = false;
    private _breakpointId: number = 1;

    // Event callbacks
    private _stopCallback: ((reason: string) => void) | undefined;
    private _endCallback: (() => void) | undefined;
    private _outputCallback: ((text: string, type: string) => void) | undefined;

    get sourceFile(): string {
        return this._sourceFile;
    }

    get currentLine(): number {
        return this._currentLine;
    }

    // Start debugging
    public start(program: string, stopOnEntry: boolean): void {
        this._sourceFile = program;
        this._sourceLines = fs.readFileSync(program, 'utf-8').split('\n');
        this._currentLine = 0;
        this._stopOnEntry = stopOnEntry;

        if (stopOnEntry) {
            this.sendStop('entry');
        } else {
            this.continue();
        }
    }

    // Continue execution
    public continue(): void {
        this.run();
    }

    // Step to next line
    public step(): void {
        this._currentLine++;
        if (this._currentLine < this._sourceLines.length) {
            this.sendStop('step');
        } else {
            this.sendEnd();
        }
    }

    // Run until breakpoint or end
    private run(): void {
        for (let ln = this._currentLine; ln < this._sourceLines.length; ln++) {
            // Check for breakpoint
            const breakpoints = this._breakpoints.get(this._sourceFile);
            if (breakpoints) {
                const bp = breakpoints.find(bp => bp.line === ln && bp.verified);
                if (bp) {
                    this._currentLine = ln;
                    this.sendStop('breakpoint');
                    return;
                }
            }
        }

        // No breakpoint hit, program ends
        this.sendEnd();
    }

    // Set breakpoints
    public setBreakPoints(path: string, lines: number[]): IJeBreakpoint[] {
        const bps: IJeBreakpoint[] = [];

        for (const line of lines) {
            const bp: IJeBreakpoint = {
                id: this._breakpointId++,
                line,
                verified: line < (this._sourceLines?.length || 1000)
            };
            bps.push(bp);
        }

        this._breakpoints.set(path, bps);
        return bps;
    }

    // Clear breakpoints
    public clearBreakPoints(path: string): void {
        this._breakpoints.delete(path);
    }

    // Get stack trace
    public getStack(): { name: string; file: string; line: number }[] {
        return [{
            name: 'main',
            file: this._sourceFile,
            line: this._currentLine
        }];
    }

    // Get variables (simplified for now)
    public getVariables(): { name: string; value: string }[] {
        // TODO: Integrate with interpreter to get actual variables
        return [
            { name: 'currentLine', value: String(this._currentLine) },
            { name: 'file', value: path.basename(this._sourceFile) }
        ];
    }

    // Event handlers
    public onStop(callback: (reason: string) => void): void {
        this._stopCallback = callback;
    }

    public onEnd(callback: () => void): void {
        this._endCallback = callback;
    }

    public onOutput(callback: (text: string, type: string) => void): void {
        this._outputCallback = callback;
    }

    private sendStop(reason: string): void {
        this._stopCallback?.(reason);
    }

    private sendEnd(): void {
        this._endCallback?.();
    }

    private sendOutput(text: string, type: string = 'console'): void {
        this._outputCallback?.(text, type);
    }
}

// ==========================================
// DEBUG SESSION
// ==========================================

export class IJeDebugSession extends DebugSession {
    private static THREAD_ID = 1;
    private _runtime: IJeRuntime;
    private _variableHandles = new Map<number, string>();

    constructor() {
        super();

        this._runtime = new IJeRuntime();

        // Runtime event handlers
        this._runtime.onStop((reason) => {
            this.sendEvent(new StoppedEvent(reason, IJeDebugSession.THREAD_ID));
        });

        this._runtime.onEnd(() => {
            this.sendEvent(new TerminatedEvent());
        });

        this._runtime.onOutput((text, type) => {
            this.sendEvent(new OutputEvent(`${text}\n`, type));
        });
    }

    // ==========================================
    // INITIALIZE
    // ==========================================

    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ): void {
        response.body = response.body || {};

        response.body.supportsConfigurationDoneRequest = true;
        response.body.supportsEvaluateForHovers = false;
        response.body.supportsStepBack = false;
        response.body.supportsSetVariable = false;
        response.body.supportsRestartFrame = false;
        response.body.supportsGotoTargetsRequest = false;
        response.body.supportsCompletionsRequest = false;
        response.body.supportsBreakpointLocationsRequest = false;

        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    protected configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments
    ): void {
        super.configurationDoneRequest(response, args);
    }

    // ==========================================
    // LAUNCH
    // ==========================================

    protected async launchRequest(
        response: DebugProtocol.LaunchResponse,
        args: IJeLaunchRequestArguments
    ): Promise<void> {
        // Start the runtime
        this._runtime.start(args.program, args.stopOnEntry || false);
        this.sendResponse(response);
    }

    // ==========================================
    // BREAKPOINTS
    // ==========================================

    protected setBreakPointsRequest(
        response: DebugProtocol.SetBreakpointsResponse,
        args: DebugProtocol.SetBreakpointsArguments
    ): void {
        const path = args.source.path || '';
        const clientLines = args.lines || [];

        // Clear existing breakpoints
        this._runtime.clearBreakPoints(path);

        // Set new breakpoints
        const actualBreakpoints = this._runtime.setBreakPoints(path, clientLines);

        // Return verified breakpoints
        const breakpoints = actualBreakpoints.map(bp => {
            return new Breakpoint(bp.verified, this.convertDebuggerLineToClient(bp.line));
        });

        response.body = {
            breakpoints: breakpoints
        };
        this.sendResponse(response);
    }

    // ==========================================
    // THREADS
    // ==========================================

    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
        response.body = {
            threads: [
                new Thread(IJeDebugSession.THREAD_ID, 'IJe Main Thread')
            ]
        };
        this.sendResponse(response);
    }

    // ==========================================
    // STACK TRACE
    // ==========================================

    protected stackTraceRequest(
        response: DebugProtocol.StackTraceResponse,
        args: DebugProtocol.StackTraceArguments
    ): void {
        const stack = this._runtime.getStack();

        response.body = {
            stackFrames: stack.map((frame, ix) => {
                const sf = new StackFrame(
                    ix,
                    frame.name,
                    new Source(path.basename(frame.file), frame.file),
                    this.convertDebuggerLineToClient(frame.line)
                );
                return sf;
            }),
            totalFrames: stack.length
        };
        this.sendResponse(response);
    }

    // ==========================================
    // SCOPES
    // ==========================================

    protected scopesRequest(
        response: DebugProtocol.ScopesResponse,
        args: DebugProtocol.ScopesArguments
    ): void {
        response.body = {
            scopes: [
                new Scope('Local', 1000, false),
                new Scope('Global', 1001, true)
            ]
        };
        this.sendResponse(response);
    }

    // ==========================================
    // VARIABLES
    // ==========================================

    protected variablesRequest(
        response: DebugProtocol.VariablesResponse,
        args: DebugProtocol.VariablesArguments
    ): void {
        const variables = this._runtime.getVariables();

        response.body = {
            variables: variables.map(v => ({
                name: v.name,
                type: 'string',
                value: v.value,
                variablesReference: 0
            }))
        };
        this.sendResponse(response);
    }

    // ==========================================
    // EXECUTION CONTROL
    // ==========================================

    protected continueRequest(
        response: DebugProtocol.ContinueResponse,
        args: DebugProtocol.ContinueArguments
    ): void {
        this._runtime.continue();
        this.sendResponse(response);
    }

    protected nextRequest(
        response: DebugProtocol.NextResponse,
        args: DebugProtocol.NextArguments
    ): void {
        this._runtime.step();
        this.sendResponse(response);
    }

    protected stepInRequest(
        response: DebugProtocol.StepInResponse,
        args: DebugProtocol.StepInArguments
    ): void {
        this._runtime.step();
        this.sendResponse(response);
    }

    protected stepOutRequest(
        response: DebugProtocol.StepOutResponse,
        args: DebugProtocol.StepOutArguments
    ): void {
        this._runtime.continue();
        this.sendResponse(response);
    }

    protected disconnectRequest(
        response: DebugProtocol.DisconnectResponse,
        args: DebugProtocol.DisconnectArguments
    ): void {
        this.sendResponse(response);
    }
}

// Start the debug session
export function runDebugSession(): void {
    IJeDebugSession.run(IJeDebugSession);
}
