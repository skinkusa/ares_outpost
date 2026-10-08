import re

with open('src/types/colony.ts', 'r') as f:
    code = f.read()

code = code.replace("  autoHarvest: boolean;", "  autoHarvest: boolean;\n  miningTarget: 'spice' | 'ore';")

with open('src/types/colony.ts', 'w') as f:
    f.write(code)

