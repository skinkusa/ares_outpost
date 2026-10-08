import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

old_render = """      // =====================================================================
      // 11. ATMOSPHERIC DRIFT PARTICLES (Swirling Martian Dust)
      // =====================================================================
"""

new_render = """      // =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits)
      // =====================================================================
      workers.forEach((w) => {
        // Position relative to viewport
        const vx = w.x;
        const vy = w.y;

        // Skip if outside viewport (using world coords vs viewport coords)
        // Wait, the canvas context is ALREADY translated by viewport.x, viewport.y!
        // We just draw at w.x, w.y directly!
        
        ctx.save();
        ctx.translate(vx, vy);
        ctx.rotate(w.angle);

        // Cast tiny shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(-1, 2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // EVA Suit Body (White/Light Gray)
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Life Support Backpack
        ctx.fillStyle = '#d1d5db';
        ctx.fillRect(-3, -1.5, 2, 3);

        // Helmet Visor (Gold reflective)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(1, 0, 1.5, -Math.PI / 2.2, Math.PI / 2.2);
        ctx.fill();

        ctx.restore();
      });

      // =====================================================================
      // 11. ATMOSPHERIC DRIFT PARTICLES (Swirling Martian Dust)
      // =====================================================================
"""

code = code.replace(old_render, new_render)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

