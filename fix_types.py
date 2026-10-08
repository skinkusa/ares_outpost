import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_prop = "initialFilter?: 'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'morale' | 'health';"
new_prop = "initialFilter?: 'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'morale' | 'health' | 'crew';"

code = code.replace(old_prop, new_prop)

old_state = "const [selectedResource, setSelectedResource] = useState<'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'morale' | 'health'>("
new_state = "const [selectedResource, setSelectedResource] = useState<'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'morale' | 'health' | 'crew'>("

code = code.replace(old_state, new_state)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

