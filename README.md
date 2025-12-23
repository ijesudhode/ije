```
    ██╗     ██╗███████╗
    ██║     ██║██╔════╝
    ██║     ██║█████╗  
    ██║██   ██║██╔══╝  
    ██║╚█████╔╝███████╗
    ╚═╝ ╚════╝ ╚══════╝
    The Future of Programming
    🌏 Universal • 🚀 Fast • 💡 Intuitive
```

<p align="center">
  <strong>A Revolutionary Programming Language for Everyone</strong>
</p>

<p align="center">
  <a href="#installation"><img src="https://img.shields.io/badge/npm-ije--cli-red?style=for-the-badge&logo=npm" alt="npm"></a>
  <a href="./ije-extension/"><img src="https://img.shields.io/badge/VS%20Code-Extension-blue?style=for-the-badge&logo=visualstudiocode" alt="VS Code"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-purple?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/⭐-Star%20us!-yellow?style=flat-square" alt="Star">
</p>

---

## 🎯 Why IJE?

> **"Programming should be accessible to everyone, in any language."**

IJE breaks the barrier of English-only programming. Write code in your native language while maintaining the power of modern programming paradigms.

| 🌍 Language Agnostic | ⚡ Blazing Fast | 🧩 Modern Features |
|---------------------|-----------------|-------------------|
| Use intuitive keywords | Bytecode VM compilation | Classes, closures, modules |
| Easy to read & write | Async/await support | Package manager built-in |
| Perfect for beginners | Optimized runtime | Testing framework included |

---

## 🎬 See It In Action

```
┌──────────────────────────────────────────────────────────────┐
│  📁 hello.ije                                         × ─ □  │
├──────────────────────────────────────────────────────────────┤
│  1 │ // Define a greeting function                           │
│  2 │ kian greet(name)                                        │
│  3 │     da("Hello, " + name + "! 👋")                       │
│  4 │ job                                                     │
│  5 │                                                         │
│  6 │ // Call it                                              │
│  7 │ greet("World")                                          │
├──────────────────────────────────────────────────────────────┤
│  ⚡ Terminal                                                 │
│  $ ije hello.ije                                             │
│  Hello, World! 👋                                            │
│  ✅ Done in 2ms                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🆚 Familiar Syntax Comparison

| Concept | IJE | JavaScript | Python |
|---------|-----|------------|--------|
| Variable | `ao x = 5` | `let x = 5` | `x = 5` |
| Print | `da("Hi")` | `console.log("Hi")` | `print("Hi")` |
| Function | `kian add(a, b)` | `function add(a,b)` | `def add(a,b):` |
| Return | `kuun result` | `return result` | `return result` |
| If | `tha x > 0` | `if (x > 0)` | `if x > 0:` |
| Else | `maichai` | `else` | `else:` |
| While | `wonn active` | `while (active)` | `while active:` |
| For | `wonntak i = 1 tueng 10` | `for(i=1;i<=10;i++)` | `for i in range(1,11):` |
| Class | `klum Person` | `class Person` | `class Person:` |
| True/False | `jing` / `tej` | `true` / `false` | `True` / `False` |
| Null | `wang` | `null` | `None` |
| End block | `job` | `}` | _(indent)_ |

---

## ✨ Features at a Glance

```
╔═══════════════════════════════════════════════════════════════╗
║  🗣️  INTUITIVE KEYWORDS     │  Short, memorable commands     ║
║  ⚡  BYTECODE VM            │  Compiled for speed            ║
║  📦  PACKAGE MANAGER        │  npm-style dependency mgmt     ║
║  🧪  TESTING FRAMEWORK      │  Built-in assertions           ║
║  🎨  VS CODE EXTENSION      │  Full IDE experience           ║
║  🔧  INTERACTIVE REPL       │  Try code instantly            ║
║  📚  RICH STDLIB            │  Math, File, HTTP, NLP         ║
║  🎯  TYPE HINTS             │  Optional type checking        ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🚀 Quick Start

```bash
# Install
npm install -g ije-cli

# Create your first program
echo 'da("Hello, IJE!")' > hello.ije

# Run it!
ije hello.ije
```

---

## 📖 Code Examples

### Variables & Data Types
```ije
ao name = "Alice"         // String
ao count = 42             // Number  
ao items = [1, 2, 3]      // Array
ao config = {             // Object
    "debug": jing,
    "version": 2
}
```

### Functions & Closures
```ije
kian createCounter()
    ao count = 0
    kuun kian()
        count = count + 1
        kuun count
    job
job

ao counter = createCounter()
da(counter())    // 1
da(counter())    // 2
```

### Object-Oriented Programming
```ije
klum Shape
    kian sang(name)
        ni.name = name
    job
    
    kian describe()
        da("I am a " + ni.name)
    job
job

klum Circle dueng Shape
    kian sang(radius)
        dueng.sang("Circle")
        ni.radius = radius
    job
    
    kian area()
        kuun 3.14159 * ni.radius ** 2
    job
job

ao circle = mai Circle(5)
circle.describe()    // I am a Circle
da(circle.area())    // 78.54
```

### Async Operations
```ije
ao data = http.get("https://api.example.com/users")
da(data)

file.write("output.json", data)
da("Saved!")
```

---

## 🎮 Interactive Demos

```bash
# 🎯 Number Guessing Game
ije guess_game.ije

# 🧮 Calculator App  
ije calculator.ije

# 📋 Todo Manager
ije todo_app.ije
```

---

## 📦 Built-in Modules

### Math
```ije
math.sqrt(16)           // 4
math.pow(2, 10)         // 1024
math.randomInt(1, 100)  // Random number
```

### File System
```ije
ao content = file.read("data.txt")
file.write("output.txt", "Hello!")
ao exists = file.exists("config.json")
```

### HTTP
```ije
ao response = http.get("https://api.github.com")
ao result = http.post(url, { "key": "value" })
```

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `ije <file>` | Run IJE file |
| `ije repl` | Start interactive REPL |
| `ije fmt <file>` | Format code |
| `ije check <file>` | Type check |
| `ije test` | Run tests |
| `ije pak init` | Initialize package |
| `ije pak install` | Install dependencies |
| `ije pak publish` | Publish to registry |

---

## 🎨 VS Code Extension

```bash
code --install-extension ije-extension/ije-language-2.0.0.vsix
```

**Includes:**
- ✅ Syntax highlighting
- ✅ Custom file icons
- ✅ IntelliSense
- ✅ Snippets
- ✅ One-click run
- ✅ Debugger integration

---

## 🗂️ Keyword Reference

```
┌─────────────┬──────────────────────────────────────────┐
│ Category    │ Keywords                                 │
├─────────────┼──────────────────────────────────────────┤
│ Variables   │ ao                                       │
│ Functions   │ kian, kuun, job                          │
│ Control     │ tha, maichai, wonn, wonntak, tueng       │
│ Loop Ctrl   │ yut (break), pratana (continue)          │
│ Classes     │ klum, mai, ni, dueng                     │
│ Values      │ jing (true), tej (false), wang (null)    │
│ I/O         │ da (print), tang (input)                 │
│ Modules     │ nam (import)                             │
└─────────────┴──────────────────────────────────────────┘
```

---

## 📚 Documentation

- 📖 [Syntax Guide](./docs/syntax.md)
- 📚 [Standard Library](./docs/stdlib.md)  
- 🛠️ [CLI Reference](./docs/cli.md)

---

## 🤝 Contributing

Contributions are welcome! See our [Contributing Guide](./CONTRIBUTING.md).

```bash
git clone https://github.com/ije-lang/ije
cd ije
npm install
npm test
```

---

## 🌟 Star History

If you find IJE useful, please consider giving it a ⭐!

---

## 📄 License

MIT License - feel free to use in personal and commercial projects.

---

<p align="center">
  <strong>🚀 Start coding with IJE today!</strong><br>
  <code>npm install -g ije-cli</code>
</p>
