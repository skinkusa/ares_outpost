import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """      targetSpiceId: null,
      homeDepotId: depot.id,
      autoHarvest: true,"""

new_code = """      targetSpiceId: null,
      homeDepotId: depot.id,
      autoHarvest: true,
      miningTarget: isOre ? 'ore' : 'spice',"""

code = code.replace(old_code, new_code)

with open('src/App.tsx', 'w') as f:
    f.write(code)

