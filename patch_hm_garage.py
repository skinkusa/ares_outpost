import re

with open('src/components/HarvesterManager.tsx', 'r') as f:
    code = f.read()

old_code = """  const depots = modules.filter((m) => m.type === 'depot');
  const oreRefineries = modules.filter((m) => m.type === 'refinery');
  const commandOutposts = modules.filter((m) => m.type === 'command');
  const hasBase = depots.length > 0 || commandOutposts.length > 0;"""

new_code = """  const depots = modules.filter((m) => m.type === 'depot');
  const oreRefineries = modules.filter((m) => m.type === 'refinery');
  const commandOutposts = modules.filter((m) => m.type === 'command');
  const garages = modules.filter((m) => m.type === 'garage');
  const hasBase = depots.length > 0 || commandOutposts.length > 0 || garages.length > 0;"""

code = code.replace(old_code, new_code)

with open('src/components/HarvesterManager.tsx', 'w') as f:
    f.write(code)

