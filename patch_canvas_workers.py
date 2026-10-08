import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# 1. Add workers to props interface
old_props = """  harvesters: Harvester[];
  spicePatches: SpicePatch[];"""
new_props = """  workers: ColonistWorker[];
  harvesters: Harvester[];
  spicePatches: SpicePatch[];"""
code = code.replace(old_props, new_props)

# 2. Add workers to component args
old_args = """  modules,
  harvesters,
  spicePatches,
  oreDeposits,"""
new_args = """  modules,
  workers,
  harvesters,
  spicePatches,
  oreDeposits,"""
code = code.replace(old_args, new_args)

# 3. Add rendering logic. Put it after harvesters are rendered so they can walk over rovers? No, maybe before rovers but after buildings.
# Or after rovers (rovers are 8a, make workers 8b)
old_render = """      // 9. BUILD MODE PREVIEW / GRID HIGHLIGHTS"""
new_render = """      // 8b. COLONIST WORKERS (EVA Suits)
      workers.forEach((w) => {
        const vx = w.x - viewport.x;
        const vy = w.y - viewport.y;

        if (vx < -10 || vx > canvas.width / zoom + 10 || vy < -10 || vy > canvas.height / zoom + 10) return;

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

      // 9. BUILD MODE PREVIEW / GRID HIGHLIGHTS"""
code = code.replace(old_render, new_render)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

