import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_start = """      homeDepotId: 'mod_depot_1',
      autoHarvest: true,
      tireHistory: [],"""

new_start = """      homeDepotId: 'mod_depot_1',
      autoHarvest: true,
      miningTarget: 'spice',
      tireHistory: [],"""

code = code.replace(old_start, new_start)

with open('src/App.tsx', 'w') as f:
    f.write(code)

