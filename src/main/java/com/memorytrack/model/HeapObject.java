package com.memorytrack.model;

import java.util.*;

public class HeapObject {
    public String id;                 // unique identifier (e.g., "obj_1")
    public String className;
    public Map<String, Object> fields = new HashMap<>(); // field name → current value
}