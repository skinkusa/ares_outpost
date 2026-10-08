import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# 1. Starting harvester
old_start = """      homeDepotId: 'mod_depot_start',
      autoHarvest: true,
      tireHistory: [],"""

new_start = """      homeDepotId: 'mod_depot_start',
      autoHarvest: true,
      miningTarget: 'spice',
      tireHistory: [],"""

code = code.replace(old_start, new_start)

# 2. handleDeployHarvester
old_deploy = """      homeDepotId: depot?.id || '',
      autoHarvest: true,
      tireHistory: [],"""

new_deploy = """      homeDepotId: depot?.id || '',
      autoHarvest: true,
      miningTarget: isOre ? 'ore' : 'spice',
      tireHistory: [],"""

code = code.replace(old_deploy, new_deploy)

with open('src/App.tsx', 'w') as f:
    f.write(code)

