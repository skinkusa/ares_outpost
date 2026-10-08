import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# Patch 1: Remove x, y from phase
old_phase = """  const moving = w.state === 'walking';
  const phase = timeMs * 0.009 + w.x * 0.13 + w.y * 0.17;
  const stride = moving ? Math.sin(phase) * 0.65 : 0;"""

new_phase = """  const moving = w.state === 'walking';
  const phase = timeMs * 0.009;
  const stride = moving ? Math.sin(phase) * 0.65 : 0;"""

code = code.replace(old_phase, new_phase)

# Patch 2: Move shoulder accents
old_accents = """  // Orange shoulder accents.
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-0.65, -2.5, 0.7, 0.5);
  ctx.fillRect(-0.65, 2, 0.7, 0.5);"""

new_accents = """  // Orange shoulder accents.
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-0.65 - stride * 0.4, -2.95, 0.7, 0.5);
  ctx.fillRect(-0.65 + stride * 0.4, 2.45, 0.7, 0.5);"""

code = code.replace(old_accents, new_accents)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

