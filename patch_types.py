import re

# App.tsx
with open('src/App.tsx', 'r') as f:
    code = f.read()

old_state = "const [resourceMonitorFilter, setResourceMonitorFilter] = useState<'all' | 'power' | 'water' | 'oxygen'>('all');"
new_state = "const [resourceMonitorFilter, setResourceMonitorFilter] = useState<'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'crew' | 'health'>('all');"
code = code.replace(old_state, new_state)

with open('src/App.tsx', 'w') as f:
    f.write(code)

# TopBar.tsx
with open('src/components/TopBar.tsx', 'r') as f:
    code = f.read()

old_prop = "onOpenResourceMonitor: (filter?: 'all' | 'power' | 'water' | 'oxygen') => void;"
new_prop = "onOpenResourceMonitor: (filter?: 'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'crew' | 'health') => void;"
code = code.replace(old_prop, new_prop)

# Replace 'all' clicks in TopBar
code = code.replace("onClick={() => onOpenResourceMonitor('all')} // Food", "onClick={() => onOpenResourceMonitor('food')}") # wait, it doesn't have comments
with open('src/components/TopBar.tsx', 'w') as f:
    f.write(code)

