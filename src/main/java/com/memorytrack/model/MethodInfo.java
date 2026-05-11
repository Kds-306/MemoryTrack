package com.memorytrack.model;

import java.util.*;

public class MethodInfo {
    public String name;
    public List<String> parameters = new ArrayList<>();  // param names
    public List<String> bodyLines = new ArrayList<>();   // method body as lines of code
    public boolean isStatic;
    public String returnType;
}