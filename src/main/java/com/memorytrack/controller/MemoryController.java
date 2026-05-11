package com.memorytrack.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.ArrayDeque;
import java.util.Deque;
import com.memorytrack.model.*;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.*;

@RestController
@CrossOrigin(origins = "*")
public class MemoryController {

    @PostMapping(value = "/run", consumes = "text/plain")
    public List<Map<String, String>> run(@RequestBody String code) {

        List<Map<String, String>> steps = new ArrayList<>();
        Map<String, ClassInfo> classMap = new HashMap<>();
        Map<String, HeapObject> heapObjects = new HashMap<>();
        Deque<Map<String, Object>> frameStack = new ArrayDeque<>();

        // ========== 1. Parse all classes with JavaParser ==========
        try {
            CompilationUnit cu = StaticJavaParser.parse(code);
            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(cls -> {
                String className = cls.getNameAsString();
                ClassInfo ci = new ClassInfo();
                ci.name = className;

                cls.getExtendedTypes().stream().findFirst()
                    .ifPresent(ext -> ci.parentClassName = ext.getNameAsString());

                // Fields
                cls.getFields().forEach(field -> {
                    field.getVariables().forEach(var -> {
                        FieldInfo fi = new FieldInfo();
                        fi.type = field.getElementType().asString();
                        fi.isStatic = field.isStatic();
                        var.getInitializer().ifPresent(init -> fi.value = init.toString());
                        ci.fields.put(var.getNameAsString(), fi);
                        if (fi.isStatic) {
                            ci.staticFields.put(var.getNameAsString(),
                                    fi.value != null ? fi.value.toString() : null);
                        }
                    });
                });

                // Methods
                cls.getMethods().forEach(method -> {
                    MethodInfo mi = new MethodInfo();
                    mi.name = method.getNameAsString();
                    mi.isStatic = method.isStatic();
                    mi.returnType = method.getType().asString();
                    method.getParameters().forEach(p -> mi.parameters.add(p.getNameAsString()));

                    // Compatibility for getBody return type
                    Object body = method.getBody();
                    if (body instanceof Optional) {
                        ((Optional<?>) body).ifPresent(b -> mi.bodyLines = Arrays.asList(b.toString().split("\n")));
                    } else if (body != null) {
                        mi.bodyLines = Arrays.asList(body.toString().split("\n"));
                    }
                    ci.methods.put(mi.name, mi);
                    if (mi.isStatic) ci.staticMethods.add(mi.name);
                });

                // Constructors
                cls.getConstructors().forEach(ctor -> {
                    MethodInfo mi = new MethodInfo();
                    mi.name = className;
                    mi.isStatic = false;
                    mi.returnType = "void";
                    ctor.getParameters().forEach(p -> mi.parameters.add(p.getNameAsString()));

                    Object body = ctor.getBody();
                    if (body instanceof Optional) {
                        ((Optional<?>) body).ifPresent(b -> mi.bodyLines = Arrays.asList(b.toString().split("\n")));
                    } else if (body != null) {
                        mi.bodyLines = Arrays.asList(body.toString().split("\n"));
                    }
                    ci.methods.put(ctor.getNameAsString(), mi);
                });

                classMap.put(className, ci);
            });
        } catch (Exception e) {
            addStep(steps, "error", "Parse error: " + e.getMessage(), null);
            return steps;
        }

        // ========== 2. Generate class load steps ==========
        for (ClassInfo ci : classMap.values()) {
            addStep(steps, "classload", "Loading " + ci.name, null);
            addStep(steps, "classload", ci.name + " Loaded", null);
        }

        // ========== 3. Static members ==========
        for (ClassInfo ci : classMap.values()) {
            for (Map.Entry<String, String> entry : ci.staticFields.entrySet()) {
                addStep(steps, "static_var", "static " + ci.name + "." + entry.getKey() + " = " + entry.getValue(), null);
            }
            for (String sm : ci.staticMethods) {
                if (!sm.equals("main")) {
                    addStep(steps, "static_method", ci.name + "." + sm + "()", null);
                }
            }
        }

        // ========== 4. Find main class ==========
        ClassInfo mainClass = null;
        for (ClassInfo ci : classMap.values()) {
            if (ci.methods.containsKey("main") && ci.methods.get("main").isStatic) {
                mainClass = ci;
                break;
            }
        }
        if (mainClass == null) {
            addStep(steps, "error", "No public static void main(String[]) found.", null);
            return steps;
        }

        // ========== 5. Execute main ==========
        addStep(steps, "static_main", "main()", "static method");
        addStep(steps, "stack_push", "main()", null);
        Map<String, Object> mainFrame = new HashMap<>();
        frameStack.push(mainFrame);

        MethodInfo mainMethod = mainClass.methods.get("main");
        if (mainMethod.bodyLines != null) {
            for (String line : mainMethod.bodyLines) {
                simulateLine(line, steps, classMap, heapObjects, frameStack);
            }
        }

        addStep(steps, "stack_pop", "main()", null);
        return steps;
    }

    // -------------------------------------------------------------------------
    // simulateLine – process a single line of Java code
    // -------------------------------------------------------------------------
    private void simulateLine(String line, List<Map<String, String>> steps,
                              Map<String, ClassInfo> classMap,
                              Map<String, HeapObject> heapObjects,
                              Deque<Map<String, Object>> frameStack) {

        line = line.trim();
        if (line.isEmpty() || line.equals("{") || line.equals("}")) return;

        // ---- 1. PRINT (must come before method call) ----
        if (line.startsWith("System.out.println")) {
            String arg = line.substring(line.indexOf('(') + 1, line.lastIndexOf(')'));
            String output = evaluatePrintArgument(arg, frameStack.peek(), heapObjects);
            addStep(steps, "console", output, null);
            return;
        }

        // ---- 2. OBJECT CREATION (new) ----
        if (line.contains("new ") && line.contains("=")) {
            // e.g. Student s = new Student("Alice", 20);
            String[] parts = line.split("=", 2);
            String left = parts[0].trim();
            String right = parts[1].trim().replace(";", "");
            String varName = left.substring(left.lastIndexOf(' ') + 1);
            String objType = right.substring(right.indexOf("new") + 3).trim();
            objType = objType.replaceAll("\\(.*", "").trim();

            // Create heap object
            HeapObject heapObj = new HeapObject();
            heapObj.id = "obj_" + heapObjects.size();
            heapObj.className = objType;
            ClassInfo ci = classMap.get(objType);
            if (ci != null) {
                for (Map.Entry<String, FieldInfo> entry : ci.fields.entrySet()) {
                    if (!entry.getValue().isStatic) {
                        heapObj.fields.put(entry.getKey(), entry.getValue().value);
                    }
                }
            }
            heapObjects.put(varName, heapObj);
            frameStack.peek().put(varName, heapObj);

            addStep(steps, "stack_push", varName, null);
            addStep(steps, "heap_alloc", varName, objType);

            // Constructor arguments
            String argsStr = "";
            if (right.contains("(") && right.contains(")")) {
                argsStr = right.substring(right.indexOf('(') + 1, right.lastIndexOf(')')).trim();
            }
            List<Object> args = new ArrayList<>();
            if (!argsStr.isEmpty()) {
                String[] argTokens = argsStr.split(",");
                for (String a : argTokens) {
                    args.add(evaluateExpression(a.trim(), frameStack.peek(), heapObjects));
                }
            }

            // Push constructor frame
            MethodInfo ctor = ci != null ? ci.methods.get(objType) : null;
            Map<String, Object> ctorFrame = new HashMap<>();
            ctorFrame.put("this", heapObj);
            if (ctor != null && !ctor.parameters.isEmpty()) {
                for (int i = 0; i < ctor.parameters.size() && i < args.size(); i++) {
                    ctorFrame.put(ctor.parameters.get(i), args.get(i));
                }
            }
            frameStack.push(ctorFrame);
            addStep(steps, "constructor_call", objType + "(" + argsStr + ")", null);
            addStep(steps, "stack_push", objType + "()", null);

            // Execute constructor body
            if (ctor != null && ctor.bodyLines != null) {
                for (String cLine : ctor.bodyLines) {
                    String tline = cLine.trim();
                    if (tline.contains("=") && tline.contains("this.")) {
                        String[] assign = tline.split("=");
                        String leftSide = assign[0].trim();
                        String fieldName = leftSide.substring(leftSide.indexOf('.') + 1);
                        String rightSide = assign[1].trim().replace(";", "");
                        Object val = evaluateExpression(rightSide, ctorFrame, heapObjects);
                        heapObj.fields.put(fieldName, val);
                        addStep(steps, "field_assign", fieldName + " = " + val, null);
                    }
                }
            }

            addStep(steps, "stack_pop", objType + "()", null);
            frameStack.pop(); // pop constructor
            return;
        }

        // ---- 3. METHOD CALL (static or instance) ----
        if (line.endsWith(");") && line.contains("(")) {
            String methodName;
            Object target = null;
            boolean isStatic = false;

            if (line.contains(".")) {
                String beforeDot = line.substring(0, line.indexOf('.')).trim();
                methodName = line.substring(line.indexOf('.') + 1).replace("();", "").trim();

                if (classMap.containsKey(beforeDot)) {
                    isStatic = true;
                } else {
                    target = frameStack.peek().get(beforeDot);
                }
            } else {
                methodName = line.replace("();", "").trim();
                target = frameStack.peek().get("this");
            }

            MethodInfo mi = null;
            if (isStatic) {
                String className = line.substring(0, line.indexOf('.')).trim();
                mi = findMethod(className, methodName, classMap);
                if (mi == null) {
                    addStep(steps, "error", "Static method " + methodName + " not found in " + className, null);
                    return;
                }
            } else if (target instanceof HeapObject) {
                HeapObject obj = (HeapObject) target;
                mi = findMethod(obj.className, methodName, classMap);
                if (mi == null) {
                    addStep(steps, "error", "Method " + methodName + " not found in " + obj.className, null);
                    return;
                }
            } else {
                addStep(steps, "error", "Cannot resolve method call: " + line, null);
                return;
            }

            if (mi == null) return;

            // Push method frame
            addStep(steps, "stack_push", methodName + "()", null);
            Map<String, Object> methodFrame = new HashMap<>();
            if (!isStatic && target instanceof HeapObject) {
                methodFrame.put("this", target);
            }
            frameStack.push(methodFrame);

            // Simulate method body
            if (mi.bodyLines != null) {
                for (String ml : mi.bodyLines) {
                    simulateLine(ml, steps, classMap, heapObjects, frameStack);
                }
            }

            addStep(steps, "stack_pop", methodName, null);
            frameStack.pop();
        }
        // Other lines (return, etc.) are ignored
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    private MethodInfo findMethod(String className, String methodName, Map<String, ClassInfo> classMap) {
        ClassInfo ci = classMap.get(className);
        while (ci != null) {
            if (ci.methods.containsKey(methodName)) {
                return ci.methods.get(methodName);
            }
            ci = classMap.get(ci.parentClassName);
        }
        return null;
    }

    private Object evaluateExpression(String expr, Map<String, Object> frame, Map<String, HeapObject> heapObjects) {
        expr = expr.trim();
        if (expr.startsWith("\"") && expr.endsWith("\"")) {
            return expr.substring(1, expr.length() - 1);
        }
        return resolveValue(expr, frame, heapObjects);
    }

    private Object resolveValue(String name, Map<String, Object> frame, Map<String, HeapObject> heapObjects) {
        if (frame.containsKey(name)) {
            return frame.get(name);
        }
        if (frame.containsKey("this")) {
            Object thisObj = frame.get("this");
            if (thisObj instanceof HeapObject) {
                HeapObject obj = (HeapObject) thisObj;
                if (obj.fields.containsKey(name)) {
                    return obj.fields.get(name);
                }
            }
        }
        return name;
    }

    private String evaluatePrintArgument(String arg, Map<String, Object> frame, Map<String, HeapObject> heapObjects) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < arg.length(); i++) {
            char c = arg.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
                current.append(c);
            } else if (c == '+' && !inQuotes) {
                parts.add(current.toString().trim());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        parts.add(current.toString().trim());

        StringBuilder result = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (part.startsWith("\"") && part.endsWith("\"")) {
                result.append(part.substring(1, part.length() - 1));
            } else {
                Object val = resolveValue(part, frame, heapObjects);
                result.append(val != null ? val.toString() : "null");
            }
        }
        return result.toString();
    }

    private void addStep(List<Map<String, String>> steps, String type, String value, String extra) {
        Map<String, String> step = new LinkedHashMap<>();
        step.put("type", type);
        step.put("value", value != null ? value : "");
        if (extra != null) step.put("extra", extra);
        steps.add(step);
    }
}