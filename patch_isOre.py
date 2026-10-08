import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Replace h.model === 'ore_rover' with h.miningTarget === 'ore'
code = code.replace("const isOre = h.model === 'ore_rover';", "const isOre = h.miningTarget === 'ore';")

with open('src/App.tsx', 'w') as f:
    f.write(code)

