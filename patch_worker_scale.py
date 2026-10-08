import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

old_rotate = """  ctx.rotate(w.angle);

  // Local +X is forward, matching your original visor.
  const outline = '#374151';"""

new_rotate = """  ctx.rotate(w.angle);
  ctx.scale(1.25, 1.25);

  // Local +X is forward, matching your original visor.
  const outline = '#1f2937'; // Darker outline"""

code = code.replace(old_rotate, new_rotate)

old_boots = """  // Boots: alternate forward/back while walking.
  oval(-1 + stride, -1.65, 1.1, 0.65, '#475569');
  oval(-1 - stride, 1.65, 1.1, 0.65, '#475569');"""

new_boots = """  // Boots: alternate forward/back while walking (more separated).
  oval(-1 + stride, -2.0, 1.1, 0.65, '#475569');
  oval(-1 - stride, 2.0, 1.1, 0.65, '#475569');"""

code = code.replace(old_boots, new_boots)

old_arms = """  // Arms and gloves.
  oval(-stride * 0.4, -2.25, 1.3, 0.65, suit);
  oval(stride * 0.4, 2.25, 1.3, 0.65, suit);
  oval(0.95 - stride * 0.4, -2.25, 0.45, 0.5, '#64748b');
  oval(0.95 + stride * 0.4, 2.25, 0.45, 0.5, '#64748b');"""

new_arms = """  // Arms and gloves (more separated).
  oval(-stride * 0.4, -2.7, 1.3, 0.65, suit);
  oval(stride * 0.4, 2.7, 1.3, 0.65, suit);
  oval(0.95 - stride * 0.4, -2.7, 0.45, 0.5, '#64748b');
  oval(0.95 + stride * 0.4, 2.7, 0.45, 0.5, '#64748b');"""

code = code.replace(old_arms, new_arms)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

