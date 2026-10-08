import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_init = """    spice: 45,
    spiceCapacity: 600,
    ore: 0,"""

new_init = """    spice: 45,
    spiceCapacity: 600,
    autoExportSpice: false,
    autoExportThreshold: 100,
    ore: 0,"""

code = code.replace(old_init, new_init)

with open('src/App.tsx', 'w') as f:
    f.write(code)

