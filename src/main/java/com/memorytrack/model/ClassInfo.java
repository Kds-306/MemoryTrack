package com.memorytrack.model;

import java.util.*;

public class ClassInfo {
    public String name;
    public String parentClassName; // for inheritance
    public Map<String, FieldInfo> fields = new HashMap<>();
    public Map<String, MethodInfo> methods = new HashMap<>();
    public Map<String, String> staticFields = new HashMap<>();
    public Set<String> staticMethods = new HashSet<>();
}