import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_power = """                  {/* Power Line */}
                  {(selectedResource === 'all' || selectedResource === 'power') && ("""

new_power = """                  {/* Power Line */}
                  {(category === 'vitals' && (selectedResource === 'all' || selectedResource === 'power')) && ("""

code = code.replace(old_power, new_power)

old_water = """                  {/* Water Line */}
                  {(selectedResource === 'all' || selectedResource === 'water') && ("""

new_water = """                  {/* Water Line */}
                  {(category === 'vitals' && (selectedResource === 'all' || selectedResource === 'water')) && ("""

code = code.replace(old_water, new_water)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

