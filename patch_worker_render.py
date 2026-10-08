import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# Define drawColonist outside MarsCanvas
new_func = """function drawColonist(ctx: CanvasRenderingContext2D, w: ColonistWorker, timeMs: number) {
  const moving = w.state === 'walking';
  const phase = timeMs * 0.009 + w.x * 0.13 + w.y * 0.17;
  const stride = moving ? Math.sin(phase) * 0.65 : 0;

  ctx.save();
  ctx.translate(w.x, w.y);

  // Shadow stays aligned with the world.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-0.5, 1.5, 3.4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(w.angle);

  // Local +X is forward, matching your original visor.
  const outline = '#374151';
  const suit = '#e5e7eb';

  function oval(x: number, y: number, rx: number, ry: number, fill: string, border = true) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.35;
      ctx.stroke();
    }
  }

  // Boots: alternate forward/back while walking.
  oval(-1 + stride, -1.65, 1.1, 0.65, '#475569');
  oval(-1 - stride, 1.65, 1.1, 0.65, '#475569');

  // Life-support pack behind the body.
  ctx.fillStyle = outline;
  ctx.fillRect(-3.5, -1.65, 1.8, 3.3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-3.2, -1.35, 1.2, 2.7);

  // Small pack status light.
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(-3.1, -0.6, 0.5, 0.8);

  // Arms and gloves.
  oval(-stride * 0.4, -2.25, 1.3, 0.65, suit);
  oval(stride * 0.4, 2.25, 1.3, 0.65, suit);
  oval(0.95 - stride * 0.4, -2.25, 0.45, 0.5, '#64748b');
  oval(0.95 + stride * 0.4, 2.25, 0.45, 0.5, '#64748b');

  // Suit torso.
  oval(-0.65, 0, 1.9, 1.85, suit);
  oval(-0.9, -0.55, 1.1, 0.65, '#f8fafc', False);

  // Orange shoulder accents.
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-0.65, -2.5, 0.7, 0.5);
  ctx.fillRect(-0.65, 2, 0.7, 0.5);

  // Helmet shell and dark visor seal.
  oval(1, 0, 1.75, 1.65, '#f8fafc');
  oval(1.65, 0, 0.95, 1.25, '#334155');

  // Gold visor with a small reflective highlight.
  oval(1.8, 0, 0.65, 0.95, '#fbbf24', False);
  oval(1.9, -0.4, 0.22, 0.4, '#fef3c7', False);

  ctx.restore();
}

export const MarsCanvas: React.FC<MarsCanvasProps> = ({"""

new_func = new_func.replace('False', 'false')
code = code.replace("export const MarsCanvas: React.FC<MarsCanvasProps> = ({", new_func)

old_loop = """      // =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits)
      // =====================================================================
      workers.forEach((w) => {
        // We just draw at w.x, w.y directly!
        
        ctx.save();
        ctx.translate(w.x, w.y);
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
      });"""

new_loop = """      // =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits)
      // =====================================================================
      const workerTime = performance.now();
      workers.forEach((w) => {
        drawColonist(ctx, w, workerTime);
      });"""

code = code.replace(old_loop, new_loop)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

