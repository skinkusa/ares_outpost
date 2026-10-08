import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

code = code.replace("transport: Math.random() > 0.8 ? 'rover' : 'walking',", "transport: Math.random() > 0.5 ? 'rover' : 'walking',")

with open('src/App.tsx', 'w') as f:
    f.write(code)

