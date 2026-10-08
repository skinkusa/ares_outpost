import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

old_loop = """      // =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits)
      // =====================================================================
      const workerTime = performance.now();
      workers.forEach((w) => {
        drawColonistRover(ctx, w, workerTime);
      });"""

new_loop = """      // =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits & Rovers)
      // =====================================================================
      const workerTime = performance.now();
      workers.forEach((w) => {
        if (w.transport === 'rover') {
          drawColonistRover(ctx, w, workerTime);
        } else {
          drawColonist(ctx, w, workerTime);
        }
      });"""

code = code.replace(old_loop, new_loop)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

