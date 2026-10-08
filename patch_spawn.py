import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_spawn = """            angle: Math.random() * Math.PI * 2,
            state: 'idle',
            timer: Math.random() * 5 + 2,
          });"""

new_spawn = """            angle: Math.random() * Math.PI * 2,
            state: 'idle',
            timer: Math.random() * 5 + 2,
            transport: Math.random() > 0.8 ? 'rover' : 'walking',
          });"""

code = code.replace(old_spawn, new_spawn)

with open('src/App.tsx', 'w') as f:
    f.write(code)

