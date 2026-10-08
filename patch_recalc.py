import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_recalc = """    // Invalidate cached waypoints so roaming vehicles immediately route around the newly constructed building
    setHarvesters((prev) => prev.map((h) => ({ ...h, waypoints: [] })));
    sound.playBuild();"""

new_recalc = """    // Invalidate cached waypoints so roaming vehicles immediately route around the newly constructed building
    setHarvesters((prev) => prev.map((h) => ({ ...h, waypoints: [] })));
    setWorkers((prev) => prev.map((w) => ({ ...w, waypoints: [] })));
    sound.playBuild();"""

code = code.replace(old_recalc, new_recalc)

with open('src/App.tsx', 'w') as f:
    f.write(code)

