import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# Insert drawColonistRover after drawColonist
new_func = """function drawColonistRover(
  ctx: CanvasRenderingContext2D,
  w: ColonistWorker,
  timeMs: number
) {
  const moving = w.state === 'walking';
  const wheelPhase = timeMs * 0.018;
  const vibration = moving ? Math.sin(timeMs * 0.025) * 0.08 : 0;

  ctx.save();
  ctx.translate(w.x, w.y);

  // Ground shadow stays aligned with the world.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 7.5, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(w.angle);
  ctx.scale(1.25, 1.25);

  const outline = '#1f2937';

  function oval(
    x: number,
    y: number,
    rx: number,
    ry: number,
    fill: string,
    border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
  }

  function box(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);

    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 0.45;
      ctx.strokeRect(x, y, width, height);
    }
  }

  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width = 0.5
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  // Axles beneath the chassis.
  line(-3.8, -4, -3.8, 4, '#64748b', 0.8);
  line(3.6, -4, 3.6, 4, '#64748b', 0.8);

  // Four chunky tires.
  for (const axleX of [-3.8, 3.6]) {
    for (const sideY of [-3.5, 3.5]) {
      box(axleX - 1.45, sideY - 0.85, 2.9, 1.7, '#111827');

      // Tire tread shifts while moving.
      const offset = moving
        ? ((wheelPhase % 1) + 1) % 1
        : 0;

      ctx.save();
      ctx.beginPath();
      ctx.rect(axleX - 1.25, sideY - 0.65, 2.5, 1.3);
      ctx.clip();

      for (let tread = -2; tread <= 2; tread++) {
        const x = axleX + tread * 0.85 + offset * 0.85;
        line(x, sideY - 0.6, x, sideY + 0.6, '#475569', 0.3);
      }

      ctx.restore();

      // Axle hub.
      box(axleX - 0.45, sideY - 0.35, 0.9, 0.7, '#94a3b8');
    }
  }

  ctx.save();
  ctx.translate(0, vibration);

  // Lower chassis and metal deck.
  box(-5.6, -2.7, 11.2, 5.4, '#334155');
  box(-5.2, -2.3, 10.4, 4.6, '#94a3b8');

  // Side rails and orange trim.
  box(-4.8, -2.6, 9.6, 0.55, '#cbd5e1');
  box(-4.8, 2.05, 9.6, 0.55, '#64748b');

  box(-3.5, -2.6, 2.2, 0.55, '#ea580c', false);
  box(-3.5, 2.05, 2.2, 0.55, '#ea580c', false);

  // Rear battery / equipment box.
  box(-5.2, -1.85, 2.1, 3.7, '#475569');
  box(-4.95, -1.55, 1.55, 3.1, '#64748b');

  line(-4.6, -1.1, -4.6, 1.1, '#334155', 0.35);
  line(-4.05, -1.1, -4.05, 1.1, '#334155', 0.35);

  box(-4.9, -1.35, 0.45, 0.65, '#22d3ee', false);

  // Seat cushion and rear backrest.
  box(-2.8, -1.6, 3.8, 3.2, '#334155');
  box(-2.5, -1.35, 3.2, 2.7, '#475569');
  box(-2.9, -1.65, 0.7, 3.3, '#1f2937');

  // Astronaut's bent legs and boots.
  oval(1.35, -0.95, 1.35, 0.55, '#e5e7eb');
  oval(1.35, 0.95, 1.35, 0.55, '#e5e7eb');

  oval(2.55, -0.95, 0.65, 0.5, '#475569');
  oval(2.55, 0.95, 0.65, 0.5, '#475569');

  // Compact life-support backpack.
  box(-2.8, -1.1, 1.1, 2.2, '#94a3b8');
  box(-2.65, -0.55, 0.35, 0.65, '#22d3ee', false);

  // Seated suit torso.
  oval(-0.95, 0, 1.55, 1.5, '#e5e7eb');
  oval(-1.25, -0.45, 0.85, 0.55, '#f8fafc', false);

  // Arms reach forward to the controls.
  oval(0.1, -1.6, 1.35, 0.5, '#e5e7eb');
  oval(0.1, 1.6, 1.35, 0.5, '#e5e7eb');

  box(-0.7, -1.95, 0.6, 0.45, '#ea580c', false);
  box(-0.7, 1.5, 0.6, 0.45, '#ea580c', false);

  // Handlebar and gloves.
  line(1.45, -1.65, 1.45, 1.65, '#1f2937', 0.55);
  line(1.45, 0, 2.4, 0, '#475569', 0.5);

  oval(1.35, -1.6, 0.45, 0.4, '#64748b');
  oval(1.35, 1.6, 0.45, 0.4, '#64748b');

  // Helmet and gold visor.
  oval(-0.1, 0, 1.55, 1.45, '#f8fafc');
  oval(0.55, 0, 0.8, 1.1, '#334155');
  oval(0.7, 0, 0.55, 0.85, '#fbbf24', false);
  oval(0.8, -0.35, 0.18, 0.32, '#fef3c7', false);

  // Front hood and small instrument display.
  box(3.15, -1.85, 2.1, 3.7, '#cbd5e1');
  box(3.45, -1.55, 1.5, 3.1, '#94a3b8');
  box(3.2, -0.65, 0.7, 1.3, '#334155');
  box(3.3, -0.45, 0.4, 0.9, '#22d3ee', false);

  // Front bumper and paired headlights.
  box(5.15, -2.2, 0.65, 4.4, '#475569');
  box(5.35, -1.85, 0.5, 0.8, '#a5f3fc');
  box(5.35, 1.05, 0.5, 0.8, '#a5f3fc');

  // Rear red marker lights.
  box(-5.65, -1.95, 0.35, 0.6, '#ef4444', false);
  box(-5.65, 1.35, 0.35, 0.6, '#ef4444', false);

  ctx.restore();
  ctx.restore();
}

export const MarsCanvas: React.FC<MarsCanvasProps> = ({"""

code = code.replace("export const MarsCanvas: React.FC<MarsCanvasProps> = ({", new_func)

# Replace the loop call
old_loop = """      const workerTime = performance.now();
      workers.forEach((w) => {
        drawColonist(ctx, w, workerTime);
      });"""

new_loop = """      const workerTime = performance.now();
      workers.forEach((w) => {
        drawColonistRover(ctx, w, workerTime);
      });"""

code = code.replace(old_loop, new_loop)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

