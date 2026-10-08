import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

start_marker = "      // =====================================================================\\n      // 7. HIGH-VOLTAGE POWER LINES WITH ENERGY BLOOM & STRUCTURAL PYLONS"
end_marker = "      // =====================================================================\\n      // 8. TIRE TRACKS WITH DYNAMIC FADING GLOW & DUST KICK PARTICLES"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

# We want to replace the whole block with the ground pass only
ground_pass = """      // =====================================================================
      // 7. HIGH-VOLTAGE POWER LINE TRENCHES (Ground Hazards)
      // =====================================================================
      const activePowerLines = powerLines || getPowerLines(modules);
      for (let i = 0; i < activePowerLines.length; i++) {
        const line = activePowerLines[i];
        const { x1, y1, x2, y2, length } = line;

        // 1. Ground safety hazard bed / conduit trench
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 2. High-voltage hazard border stripes (amber/slate)
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.18)';
        ctx.lineWidth = 11;
        ctx.stroke();
      }

"""

code = code[:start_idx] + ground_pass + code[end_idx:]

with open('elevated_pass.txt', 'r') as f:
    elevated_body = f.read()

elevated_pass = """      // =====================================================================
      // 10.8. ELEVATED HIGH-VOLTAGE POWER CABLES & PYLONS
      // =====================================================================
      for (let i = 0; i < activePowerLines.length; i++) {
        const line = activePowerLines[i];
        const { x1, y1, x2, y2, length } = line;

""" + elevated_body + "\n"

# Insert elevated pass right after colonist workers (before drift particles)
colonist_marker = "      // =====================================================================\\n      // 11. ATMOSPHERIC DRIFT PARTICLES"
colonist_idx = code.find(colonist_marker)

code = code[:colonist_idx] + elevated_pass + code[colonist_idx:]

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

