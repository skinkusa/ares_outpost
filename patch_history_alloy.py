import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """            alloy: Math.round(prevStats.alloy * 10) / 10,
            ore: Math.round(prevStats.ore * 10) / 10,"""

new_code = """            alloy: Math.round(newAlloy * 10) / 10,
            ore: Math.round(newOre * 10) / 10,"""

code = code.replace(old_code, new_code)

with open('src/App.tsx', 'w') as f:
    f.write(code)

