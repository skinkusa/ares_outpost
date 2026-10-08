import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_speed = "const speed = 14; // Slow walk speed"
new_speed = "const speed = updated.transport === 'rover' ? 38 : 14;"

code = code.replace(old_speed, new_speed)

with open('src/App.tsx', 'w') as f:
    f.write(code)

