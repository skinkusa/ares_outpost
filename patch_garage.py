import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Replace all occurrences of depot fallback chain
old_chain = "|| modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'command') || modules[0]"
new_chain = "|| modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'garage') || modules.find((m) => m.type === 'command') || modules[0]"

code = code.replace(old_chain, new_chain)

with open('src/App.tsx', 'w') as f:
    f.write(code)

