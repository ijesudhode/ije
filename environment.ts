
export class Environment {
    private values: Map<string, any> = new Map();
    private enclosing?: Environment;

    constructor(enclosing?: Environment) {
        this.enclosing = enclosing;
    }

    define(name: string, value: any) {
        this.values.set(name, value);
    }

    assign(name: string, value: any) {
        if (this.values.has(name)) {
            this.values.set(name, value);
            return;
        }

        if (this.enclosing) {
            this.enclosing.assign(name, value);
            return;
        }

        throw new Error(`Undefined variable '${name}'.`);
    }

    get(name: string): any {
        if (this.values.has(name)) {
            return this.values.get(name);
        }

        if (this.enclosing) {
            return this.enclosing.get(name);
        }

        throw new Error(`Undefined variable '${name}'.`);
    }
}
