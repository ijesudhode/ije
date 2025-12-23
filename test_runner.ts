
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Interpreter } from './interpreter';

const code = `
ao x = 10
da "Initial Value:"
da x

tha x > 5
  da "x is greater than 5"
maichai
  da "x is smaller or equal"
job

ao i = 0
da "Looping:"
wonn i < 3
  da i
  i = i + 1
job

da "Done"
`;

async function run() {
    console.log("--- Source Code ---");
    console.log(code);
    console.log("-------------------");

    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    // console.log("Tokens:", tokens);

    const parser = new Parser(tokens);
    const ast = parser.parse();
    // console.log("AST:", JSON.stringify(ast, null, 2));

    const interpreter = new Interpreter({
        output: (msg) => console.log("[IJe Output]:", msg),
        term: async (cmd) => console.log("[Term]:", cmd),
    });

    console.log("--- Execution ---");
    await interpreter.interpret(ast);
}

run().catch(console.error);
