import re

with open('src/components/TopBar.tsx', 'r') as f:
    code = f.read()

old_tooltip = """          title={`Colonists: ${stats.population}/${stats.maxPopulation} | Morale: ${Math.round(stats.morale)}%`}"""
new_tooltip = """          title={`Colonists: ${stats.population}/${stats.maxPopulation} | Morale: ${Math.round(stats.morale)}%\\n(Import new Specialist Crew via the Earth Trade Shuttle)`}"""

code = code.replace(old_tooltip, new_tooltip)

with open('src/components/TopBar.tsx', 'w') as f:
    f.write(code)

