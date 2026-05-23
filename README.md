# 🧠 MemoryTrack — JVM Memory Visualizer


![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

**A browser-based JVM Memory Visualizer that simulates Stack, Heap, Class Loader, and Static Pool regions in real time.**

🔗 [**Live Demo →**](https://memorytrack.onrender.com)


---

## 📌 What is MemoryTrack?

MemoryTrack is a **developer education tool** that makes Java's internal memory model visible and interactive.

Most Java developers write code — but very few truly *see* what happens inside the JVM when that code runs.

MemoryTrack solves that.

You paste Java source code → MemoryTrack parses it into an **Abstract Syntax Tree (AST)** → simulates execution **line by line** → and visualizes every memory event (object creation, stack frame push/pop, reference linking) in real time using animated SVG graphics in the browser.

> **Think of it as an X-ray machine for your Java code — you see exactly what JVM does, step by step.**

---

## 📸 Screenshots

### 🖥️ Initial State — Code Ready to Run
> Code editor loaded, Memory Arena empty — ready for simulation

![MemoryTrack Initial State](Screenshot%202026-05-23%20132311.png)

---

### ⚡ Mid Execution — Stack & Heap Live
> `main()` frame on Stack, `Test` object allocated on Heap, Class Loader active, SVG reference arrow connecting Stack → Heap

![MemoryTrack Mid Execution](Screenshot%202026-05-23%20132333.png)

---

### ✅ Final State — Full Simulation Complete
> All frames popped (`Test()`, `m1()`, `t`), Console Output showing result, Static Pool visible — complete JVM lifecycle in one view!

![MemoryTrack Final State](Screenshot%202026-05-23%20132341.png)

---

## ✨ Features

### 🔷 1. Real-Time JVM Memory Simulation
- Simulates all four major JVM memory regions:
  - **Stack** — method call frames, local variables
  - **Heap** — object instances and their fields
  - **Class Loader Area** — loaded class metadata
  - **Static Pool** — static variables and constants
- Each region updates live as code is executed step by step

### 🔷 2. AST-Based Code Parsing (JavaParser)
- Parses raw Java source code into a full **Abstract Syntax Tree**
- Custom execution engine `simulateLine()` walks the AST
- Generates a structured list of typed **memory events** returned as JSON via REST API
- Handles variable declarations, object instantiation, method calls, and more

### 🔷 3. Step-by-Step Execution Engine
- Execute code **one line at a time** — like a debugger but visual
- Each step highlights the current line and shows exactly which memory region changes
- Useful for understanding **execution flow** without a traditional debugger

### 🔷 4. SVG-Animated Object Reference Visualization
- **Reference arrows** drawn using SVG — connecting Stack frame variables to Heap objects
- Arrows animate when objects are created, assigned, or garbage collected
- Visually distinguishes between **primitive values** (stored directly) and **object references** (stored as pointer)

### 🔷 5. Inheritance-Aware Method Resolution
- Custom recursive `findMethod()` helper
- Traverses parent class hierarchy to resolve method calls correctly
- Handles **overriding** and **inherited methods** accurately — just like real JVM

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot, REST API |
| Code Parsing | JavaParser (AST Analysis) |
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Animation | SVG (inline, animated) |
| Build Tool | Maven |
| Deployment | Docker + Render |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────┐
│              Browser (Frontend)             │
│  ┌─────────────┐     ┌────────────────────┐ │
│  │  Code Input │────▶│  SVG Memory Canvas │ │
│  │  (Textarea) │     │  Stack | Heap      │ │
│  └─────────────┘     │  ClassLoader|Static│ │
│         │            └────────────────────┘ │
│         │ Fetch API (JSON)                  │
└─────────┼───────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│           Spring Boot Backend               │
│                                             │
│  ┌──────────────┐    ┌───────────────────┐  │
│  │  REST API    │───▶│  JavaParser       │  │
│  │  Controller  │    │  (AST Builder)    │  │
│  └──────────────┘    └───────────────────┘  │
│                               │             │
│                      ┌────────▼──────────┐  │
│                      │ simulateLine()    │  │
│                      │ Execution Engine  │  │
│                      └────────┬──────────┘  │
│                               │             │
│                      ┌────────▼──────────┐  │
│                      │ Memory Event List │  │
│                      │ (JSON Response)   │  │
│                      └───────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🚀 Getting Started (Local Setup)

### ✅ Prerequisites

Make sure you have the following installed:

```bash
java -version     # Java 17 or higher required
mvn -version      # Maven 3.6+ required
git --version     # Git for cloning
```

### 📥 Step 1 — Clone the Repository

```bash
git clone https://github.com/Kds-306/MemoryTrack.git
cd MemoryTrack
```

### ⚙️ Step 2 — Build the Project

```bash
mvn clean install
```

### ▶️ Step 3 — Run the Application

```bash
mvn spring-boot:run
```

### 🌐 Step 4 — Open in Browser

```
http://localhost:8080
```

That's it! MemoryTrack is now running locally. 🎉

---

## 🔌 REST API Reference

### `POST /api/simulate`

Accepts Java source code and returns a list of memory events.

**Request:**
```json
{
  "code": "public class Main { public static void main(String[] args) { int x = 10; } }"
}
```

**Response:**
```json
[
  {
    "type": "STACK_PUSH",
    "method": "main",
    "variable": "x",
    "value": "10",
    "region": "STACK"
  },
  ...
]
```

### `GET /api/health`

Health check endpoint — returns `200 OK` if server is running.

---

## 📁 Project Structure

```
MemoryTrack/
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/memorytrack/
│   │   │       ├── controller/       # REST API Controllers
│   │   │       ├── engine/           # simulateLine() Execution Engine
│   │   │       ├── parser/           # JavaParser AST Integration
│   │   │       └── model/            # Memory Event Models
│   │   │
│   │   └── resources/
│   │       └── static/               # Frontend (HTML, CSS, JS, SVG)
│   │
├── Dockerfile                        # Docker config for deployment
├── pom.xml                           # Maven dependencies
└── README.md
```

---

## 💡 How It Works — Under the Hood

```
1. User pastes Java code in browser
         │
         ▼
2. Frontend sends POST request to /api/simulate
         │
         ▼
3. JavaParser builds Abstract Syntax Tree (AST)
         │
         ▼
4. simulateLine() walks AST node by node
         │
         ▼
5. Each node generates a typed MemoryEvent
   (STACK_PUSH, HEAP_ALLOC, REF_LINK, etc.)
         │
         ▼
6. Events returned as JSON array to frontend
         │
         ▼
7. Frontend plays events as animation steps
   - SVG arrows drawn between Stack ↔ Heap
   - Each region updates with correct values
         │
         ▼
8. Developer sees JVM memory — step by step! 🎉
```

---

## 🧪 Example — What You Can Visualize

Paste this code into MemoryTrack and watch it simulate:

```java
public class Dog {
    String name;
    int age;

    public Dog(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public static void main(String[] args) {
        Dog d1 = new Dog("Bruno", 3);
        Dog d2 = new Dog("Max", 5);
    }
}
```

**What you'll see:**
- `main` method frame pushed onto Stack
- Two `Dog` objects allocated on Heap
- SVG reference arrows from `d1`, `d2` → their Heap objects
- Field values `name` and `age` shown inside Heap blocks

---

## 🌐 Live Deployment

MemoryTrack is deployed on **Render** using Docker.

🔗 [https://memorytrack.onrender.com](https://memorytrack.onrender.com)

> **Note:** Render free tier servers sleep after 15 minutes of inactivity.
> If the site loads slowly the first time — wait 20–30 seconds for the server to wake up. It will load! ☕

---

## 🔮 Future Improvements

- [ ] Support for multi-class Java programs
- [ ] Garbage Collection simulation (GC events)
- [ ] Exception handling visualization (try-catch flow)
- [ ] User accounts to save and share code snippets
- [ ] Dark mode UI

---

## 👨‍💻 Author

**Karan Dilip Salunkhe**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/karan-salunkhe-kds)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Kds-306)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:karan2003salunkhe1477@gmail.com)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---


**⭐ If you found this project helpful or interesting, please give it a star! It helps a lot! ⭐**

*Made with ☕ Java and a lot of curiosity about how JVM works*

