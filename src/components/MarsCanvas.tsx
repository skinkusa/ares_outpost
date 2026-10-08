import React, { useEffect, useRef, useState } from 'react';
import {
  ColonistWorker,
  ColonyModule,
  Harvester,
  HarvesterModel,
  ModuleBlueprint,
  ModuleType,
  SpicePatch,
  OreDeposit,
  WeatherCondition,
} from '../types/colony';
import {
  GRID_SIZE,
  MODULE_BLUEPRINTS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../utils/constants';
import { MarsTerrainData } from '../utils/terrain';
import { getPowerLines, PowerLine } from '../utils/navigation';
import { getBuildingSprite } from '../utils/assetLoader';

interface MarsCanvasProps {
  terrain: MarsTerrainData;
  modules: ColonyModule[];
  workers: ColonistWorker[];
  harvesters: Harvester[];
  spicePatches: SpicePatch[];
  oreDeposits: OreDeposit[];
  weather: WeatherCondition;
  timeOfDay: number; // 0 to 1
  selectedModule: ColonyModule | null;
  selectedHarvester: Harvester | null;
  buildPlacingType: ModuleType | null;
  canAffordPlacing: boolean;
  powerLines?: PowerLine[];
  onSelectModule: (module: ColonyModule | null) => void;
  onSelectHarvester: (harvester: Harvester | null) => void;
  onPlaceModule: (gridX: number, gridY: number) => void;
  onCancelPlacing: () => void;
  onManualHarvesterOrder: (harvesterId: string, worldX: number, worldY: number) => void;
  onCycleWeather?: () => void;
  solarTracking?: boolean;
  spiceCentrifuge?: boolean;
  hydroRecycler?: boolean;
  deepWellDrilling?: boolean;
  stormHardening?: boolean;
  terraformingGenesis?: boolean;
  rocketLaunchSeq?: number;
}

// Particle types for sci-fi rendering
interface AtmosphericParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

// High-speed storm grit & sand streaks for dust_storm
interface StormStreakParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  thickness: number;
  alpha: number;
  color: string;
}

// Swirling dust devil vortex in world space
interface DustDevilVortex {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
  spinSpeed: number;
}

// Cosmic ray ionization beam for solar_flare
interface CosmicRayStreak {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  thickness: number;
  alpha: number;
  color: string;
}

interface DustKickParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
  color: string;
}

interface MiningParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  spiralOffset: number;
  size: number;
  color: string;
  alpha: number;
  type: 'stream' | 'impact_spark' | 'vent_smoke';
  life: number;
  maxLife: number;
}

function drawColonist(ctx: CanvasRenderingContext2D, w: ColonistWorker, timeMs: number) {
  const moving = w.state === 'walking';
  const phase = timeMs * 0.009;
  const stride = moving ? Math.sin(phase) * 0.65 : 0;

  ctx.save();
  ctx.translate(w.x, w.y);

  // Shadow stays aligned with the world.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-0.5, 1.5, 3.4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(w.angle);
  ctx.scale(1.25, 1.25);

  // Local +X is forward, matching your original visor.
  const outline = '#1f2937'; // Darker outline
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

  // Boots: alternate forward/back while walking (more separated).
  oval(-1 + stride, -2.0, 1.1, 0.65, '#475569');
  oval(-1 - stride, 2.0, 1.1, 0.65, '#475569');

  // Life-support pack behind the body.
  ctx.fillStyle = outline;
  ctx.fillRect(-3.5, -1.65, 1.8, 3.3);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-3.2, -1.35, 1.2, 2.7);

  // Small pack status light.
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(-3.1, -0.6, 0.5, 0.8);

  // Arms and gloves (more separated).
  oval(-stride * 0.4, -2.7, 1.3, 0.65, suit);
  oval(stride * 0.4, 2.7, 1.3, 0.65, suit);
  oval(0.95 - stride * 0.4, -2.7, 0.45, 0.5, '#64748b');
  oval(0.95 + stride * 0.4, 2.7, 0.45, 0.5, '#64748b');

  // Suit torso.
  oval(-0.65, 0, 1.9, 1.85, suit);
  oval(-0.9, -0.55, 1.1, 0.65, '#f8fafc', false);

  // Orange shoulder accents.
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-0.65 - stride * 0.4, -2.95, 0.7, 0.5);
  ctx.fillRect(-0.65 + stride * 0.4, 2.45, 0.7, 0.5);

  // Helmet shell and dark visor seal.
  oval(1, 0, 1.75, 1.65, '#f8fafc');
  oval(1.65, 0, 0.95, 1.25, '#334155');

  // Gold visor with a small reflective highlight.
  oval(1.8, 0, 0.65, 0.95, '#fbbf24', false);
  oval(1.9, -0.4, 0.22, 0.4, '#fef3c7', false);

  ctx.restore();
}

function drawColonistRover(
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

export const MarsCanvas: React.FC<MarsCanvasProps> = ({
  terrain,
  modules,
  workers,
  harvesters,
  spicePatches,
  oreDeposits,
  weather,
  timeOfDay,
  selectedModule,
  selectedHarvester,
  buildPlacingType,
  canAffordPlacing,
  powerLines,
  onSelectModule,
  onSelectHarvester,
  onPlaceModule,
  onCancelPlacing,
  onManualHarvesterOrder,
  onCycleWeather,
  solarTracking = false,
  spiceCentrifuge = false,
  hydroRecycler = false,
  deepWellDrilling = false,
  stormHardening = false,
  terraformingGenesis = false,
  rocketLaunchSeq = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rocketLaunchesRef = useRef<Record<string, RocketLaunchState>>({});
  const seenRocketLaunchRef = useRef(rocketLaunchSeq);
  const rocketLaunchSeqRef = useRef(rocketLaunchSeq);
  rocketLaunchSeqRef.current = rocketLaunchSeq;

  // Camera viewport
  const [camera, setCamera] = useState({
    x: WORLD_WIDTH / 2 - 450,
    y: WORLD_HEIGHT / 2 - 350,
    zoom: 1,
  });

  const isDraggingRef = useRef(false);
  const isMinimapDraggingRef = useRef(false);
  const minimapDragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const mouseWorldPosRef = useRef({ x: 0, y: 0, gridX: 0, gridY: 0 });
  const [cursorGrid, setCursorGrid] = useState<{ x: number; y: number } | null>(null);

  // Global mouse up to reliably release minimap or world camera dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      isMinimapDraggingRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Particle systems & weather simulation refs
  const atmosphericParticlesRef = useRef<AtmosphericParticle[]>([]);
  const dustKickParticlesRef = useRef<DustKickParticle[]>([]);
  const miningParticlesRef = useRef<MiningParticle[]>([]);
  const stormStreaksRef = useRef<StormStreakParticle[]>([]);
  const dustDevilsRef = useRef<DustDevilVortex[]>([]);
  const cosmicRaysRef = useRef<CosmicRayStreak[]>([]);
  const lensDustFlecksRef = useRef<
    Array<{ x: number; y: number; size: number; alpha: number; life: number; maxLife: number }>
  >([]);
  const lastRoverPositionsRef = useRef<Record<string, { x: number; y: number; time: number }>>({});

  // Initialize weather & atmospheric particles
  useEffect(() => {
    // 1. Ambient atmospheric dust
    const p: AtmosphericParticle[] = [];
    for (let i = 0; i < 240; i++) {
      p.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        vx: (Math.random() - 0.4) * 1.5,
        vy: (Math.random() - 0.5) * 0.8,
        size: Math.random() * 2.8 + 1,
        alpha: Math.random() * 0.45 + 0.2,
        color: Math.random() > 0.45 ? '#ea580c' : '#d946ef',
      });
    }
    atmosphericParticlesRef.current = p;

    // 2. High-speed sandstorm streaks (screen-space)
    const ss: StormStreakParticle[] = [];
    const stormColors = ['#fde047', '#fb923c', '#ea580c', '#d97706', '#b45309', '#fed7aa', '#fef08a'];
    for (let i = 0; i < 190; i++) {
      const spd = Math.random() * 16 + 18;
      const angle = 0.31 + (Math.random() - 0.5) * 0.12; // ~18 degrees
      ss.push({
        x: Math.random() * 2600,
        y: Math.random() * 1800,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        length: Math.random() * 28 + 14,
        thickness: Math.random() * 2.2 + 0.7,
        alpha: Math.random() * 0.65 + 0.3,
        color: stormColors[Math.floor(Math.random() * stormColors.length)],
      });
    }
    stormStreaksRef.current = ss;

    // 3. Swirling dust devils in world space
    dustDevilsRef.current = [
      {
        x: WORLD_WIDTH * 0.25,
        y: WORLD_HEIGHT * 0.35,
        vx: 0.8,
        vy: 0.3,
        radius: 95,
        angle: 0,
        spinSpeed: 3.5,
      },
      {
        x: WORLD_WIDTH * 0.72,
        y: WORLD_HEIGHT * 0.62,
        vx: 0.6,
        vy: -0.4,
        radius: 120,
        angle: Math.PI,
        spinSpeed: -4.2,
      },
      {
        x: WORLD_WIDTH * 0.48,
        y: WORLD_HEIGHT * 0.78,
        vx: -0.7,
        vy: 0.5,
        radius: 80,
        angle: Math.PI * 0.5,
        spinSpeed: 3.8,
      },
    ];

    // 4. Cosmic ray ionization streaks for solar flare
    const cr: CosmicRayStreak[] = [];
    const ionColors = ['#67e8f9', '#a5f3fc', '#ffffff', '#38bdf8', '#c084fc', '#86efac'];
    for (let i = 0; i < 40; i++) {
      cr.push({
        x: Math.random() * 2400,
        y: Math.random() * 1600,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 22 + 18,
        length: Math.random() * 45 + 25,
        thickness: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.7 + 0.3,
        color: ionColors[Math.floor(Math.random() * ionColors.length)],
      });
    }
    cosmicRaysRef.current = cr;
  }, []);

  // Helper: check if tile is occupied by an existing module
  const isTileOccupied = (gx: number, gy: number, w: number, h: number) => {
    for (const mod of modules) {
      if (
        gx < mod.x + mod.width &&
        gx + w > mod.x &&
        gy < mod.y + mod.height &&
        gy + h > mod.y
      ) {
        return true;
      }
    }
    return false;
  };

  // Convert screen coordinates to world
  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: camera.x + screenX / camera.zoom,
      y: camera.y + screenY / camera.zoom,
    };
  };

  // Handle Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && !buildPlacingType && e.shiftKey)) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y };
      return;
    }

    if (e.button === 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Environmental sensor widget click (allows cycling weather)
      if (
        onCycleWeather &&
        screenX >= 18 &&
        screenX <= 268 &&
        screenY >= 18 &&
        screenY <= 86
      ) {
        onCycleWeather();
        return;
      }

      // Minimap click & drag navigation (allows dragging the camera square)
      const mmWidth = 190;
      const mmHeight = 190;
      const mmX = rect.width - mmWidth - 16;
      const mmY = rect.height - mmHeight - 16;
      if (
        screenX >= mmX &&
        screenX <= mmX + mmWidth &&
        screenY >= mmY &&
        screenY <= mmY + mmHeight
      ) {
        isMinimapDraggingRef.current = true;

        const camW = (rect.width / camera.zoom / WORLD_WIDTH) * mmWidth;
        const camH = (rect.height / camera.zoom / WORLD_HEIGHT) * mmHeight;
        const camX = mmX + (camera.x / WORLD_WIDTH) * mmWidth;
        const camY = mmY + (camera.y / WORLD_HEIGHT) * mmHeight;

        const isInsideCameraSquare =
          screenX >= camX &&
          screenX <= camX + camW &&
          screenY >= camY &&
          screenY <= camY + camH;

        if (isInsideCameraSquare) {
          // Grab exact position relative to square top-left
          minimapDragOffsetRef.current = {
            x: screenX - camX,
            y: screenY - camY,
          };
        } else {
          // Clicked anywhere else on minimap: center square on click
          minimapDragOffsetRef.current = {
            x: camW / 2,
            y: camH / 2,
          };
          const desiredCamXOnMinimap = screenX - mmX - camW / 2;
          const desiredCamYOnMinimap = screenY - mmY - camH / 2;
          const targetWorldX = (desiredCamXOnMinimap / mmWidth) * WORLD_WIDTH;
          const targetWorldY = (desiredCamYOnMinimap / mmHeight) * WORLD_HEIGHT;

          setCamera((prev) => ({
            ...prev,
            x: Math.max(-400, Math.min(WORLD_WIDTH - 200, targetWorldX)),
            y: Math.max(-400, Math.min(WORLD_HEIGHT - 200, targetWorldY)),
          }));
        }
        return;
      }

      const world = screenToWorld(screenX, screenY);
      const gx = Math.floor(world.x / TILE_SIZE);
      const gy = Math.floor(world.y / TILE_SIZE);

      if (buildPlacingType) {
        const bp = MODULE_BLUEPRINTS[buildPlacingType];
        if (
          bp &&
          gx >= 0 &&
          gy >= 0 &&
          gx + bp.width <= GRID_SIZE &&
          gy + bp.height <= GRID_SIZE &&
          !isTileOccupied(gx, gy, bp.width, bp.height)
        ) {
          onPlaceModule(gx, gy);
        }
        return;
      }

      // Check if clicked on a Harvester
      const clickedHarvester = harvesters.find((h) => {
        return Math.hypot(h.x - world.x, h.y - world.y) < 30;
      });
      if (clickedHarvester) {
        onSelectHarvester(clickedHarvester);
        onSelectModule(null);
        return;
      }

      // Check if clicked on a Module
      const clickedModule = modules.find((m) => {
        return (
          gx >= m.x &&
          gx < m.x + m.width &&
          gy >= m.y &&
          gy < m.y + m.height
        );
      });

      if (clickedModule) {
        onSelectModule(clickedModule);
        onSelectHarvester(null);
        return;
      }

      // Deselect or start camera drag if clicked empty ground
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY, camX: camera.x, camY: camera.y };
      onSelectModule(null);
      onSelectHarvester(null);
    }
  };

  // Handle Right Click (Context action or cancel)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (buildPlacingType) {
      onCancelPlacing();
      return;
    }

    if (selectedHarvester) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      onManualHarvesterOrder(selectedHarvester.id, world.x, world.y);
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 1. Dragging the minimap camera square or radar viewport
    if (isMinimapDraggingRef.current) {
      const mmWidth = 190;
      const mmHeight = 190;
      const mmX = rect.width - mmWidth - 16;
      const mmY = rect.height - mmHeight - 16;

      const desiredCamXOnMinimap = (screenX - mmX) - minimapDragOffsetRef.current.x;
      const desiredCamYOnMinimap = (screenY - mmY) - minimapDragOffsetRef.current.y;

      const targetWorldX = (desiredCamXOnMinimap / mmWidth) * WORLD_WIDTH;
      const targetWorldY = (desiredCamYOnMinimap / mmHeight) * WORLD_HEIGHT;

      setCamera((prev) => ({
        ...prev,
        x: Math.max(-400, Math.min(WORLD_WIDTH - 200, targetWorldX)),
        y: Math.max(-400, Math.min(WORLD_HEIGHT - 200, targetWorldY)),
      }));

      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    // Dynamic cursor styling based on minimap hover
    if (canvasRef.current) {
      const mmWidth = 190;
      const mmHeight = 190;
      const mmX = rect.width - mmWidth - 16;
      const mmY = rect.height - mmHeight - 16;

      const camW = (rect.width / camera.zoom / WORLD_WIDTH) * mmWidth;
      const camH = (rect.height / camera.zoom / WORLD_HEIGHT) * mmHeight;
      const camX = mmX + (camera.x / WORLD_WIDTH) * mmWidth;
      const camY = mmY + (camera.y / WORLD_HEIGHT) * mmHeight;

      if (
        screenX >= camX &&
        screenX <= camX + camW &&
        screenY >= camY &&
        screenY <= camY + camH
      ) {
        canvasRef.current.style.cursor = 'grab';
      } else if (
        screenX >= mmX &&
        screenX <= mmX + mmWidth &&
        screenY >= mmY &&
        screenY <= mmY + mmHeight
      ) {
        canvasRef.current.style.cursor = 'pointer';
      } else if (buildPlacingType) {
        canvasRef.current.style.cursor = 'crosshair';
      } else if (isDraggingRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }

    const world = screenToWorld(screenX, screenY);
    const gx = Math.floor(world.x / TILE_SIZE);
    const gy = Math.floor(world.y / TILE_SIZE);

    mouseWorldPosRef.current = { x: world.x, y: world.y, gridX: gx, gridY: gy };
    setCursorGrid({ x: gx, y: gy });

    if (isDraggingRef.current) {
      const dx = (e.clientX - dragStartRef.current.x) / camera.zoom;
      const dy = (e.clientY - dragStartRef.current.y) / camera.zoom;
      setCamera((prev) => ({
        ...prev,
        x: Math.max(-400, Math.min(WORLD_WIDTH - 200, dragStartRef.current.camX - dx)),
        y: Math.max(-400, Math.min(WORLD_HEIGHT - 200, dragStartRef.current.camY - dy)),
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isMinimapDraggingRef.current = false;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = buildPlacingType ? 'crosshair' : 'default';
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setCamera((prev) => {
      const newZoom = Math.min(2.0, Math.max(0.3, prev.zoom * zoomFactor));
      return { ...prev, zoom: newZoom };
    });
  };

  // Main Canvas Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;

    let time = 0;

    const render = () => {
      time += 0.02;

      // Match canvas internal resolution to client display
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      // =====================================================================
      // 0. UPDATE & SPAWN PARTICLE SYSTEMS
      // =====================================================================

      // A. Dust kicks when rovers move
      harvesters.forEach((h) => {
        const last = lastRoverPositionsRef.current[h.id];
        const distMoved = last ? Math.hypot(h.x - last.x, h.y - last.y) : 0;
        const isMoving = distMoved > 0.35 || h.state === 'moving_to_spice' || h.state === 'returning_to_depot';

        if (isMoving && Math.random() < 0.65) {
          const halfLen = h.model === 'titan' ? 18 : h.model === 'heavy' ? 14 : 10;
          const widthHalf = h.model === 'titan' ? 13 : h.model === 'heavy' ? 10 : 7;

          // Rear position where tires/treads kick dust
          const rearCenterX = h.x - Math.cos(h.angle) * halfLen;
          const rearCenterY = h.y - Math.sin(h.angle) * halfLen;

          // Left & right wheel emitter points
          const perpX = -Math.sin(h.angle);
          const perpY = Math.cos(h.angle);

          const kickCount = h.model === 'titan' ? 3 : 2;
          for (let k = 0; k < kickCount; k++) {
            const side = k % 2 === 0 ? 1 : -1;
            const px = rearCenterX + perpX * (widthHalf * 0.8 * side) + (Math.random() - 0.5) * 4;
            const py = rearCenterY + perpY * (widthHalf * 0.8 * side) + (Math.random() - 0.5) * 4;

            // Kick direction: slightly opposite to rover angle + random spread + wind
            const kickAngle = h.angle + Math.PI + (Math.random() - 0.5) * 1.2;
            const kickSpeed = Math.random() * 1.2 + 0.6;
            const windVx = weather.type === 'dust_storm' ? 2.5 : 0.4;
            const windVy = weather.type === 'dust_storm' ? 0.8 : 0.1;

            const dustColors = ['#9a3412', '#c2410c', '#ea580c', '#d97706', '#b45309'];
            const color = dustColors[Math.floor(Math.random() * dustColors.length)];

            dustKickParticlesRef.current.push({
              x: px,
              y: py,
              vx: Math.cos(kickAngle) * kickSpeed + windVx,
              vy: Math.sin(kickAngle) * kickSpeed + windVy,
              radius: Math.random() * 2.5 + 2,
              maxRadius: (h.model === 'titan' ? 18 : h.model === 'heavy' ? 13 : 9) + Math.random() * 4,
              alpha: Math.random() * 0.4 + 0.4,
              maxAlpha: Math.random() * 0.4 + 0.4,
              life: 0,
              maxLife: Math.floor(Math.random() * 16 + 22),
              color,
            });
          }
        }

        // Store last position
        lastRoverPositionsRef.current[h.id] = { x: h.x, y: h.y, time };
      });

      // B. Mining particles (laser spark shower, vortex suction, intake smoke)
      harvesters.forEach((h) => {
        if (h.state === 'harvesting' && h.targetSpiceId) {
          const targetSpice = spicePatches.find((sp) => sp.id === h.targetSpiceId);
          if (targetSpice) {
            // 1. Plasma impact sparks at contact point
            const sparkCount = h.model === 'titan' ? 4 : 2;
            for (let s = 0; s < sparkCount; s++) {
              const sparkAngle = Math.random() * Math.PI * 2;
              const sparkSpeed = Math.random() * 3.5 + 1.2;
              const sparkColors = ['#ffffff', '#f472b6', '#e879f9', '#c084fc', '#fef08a'];

              miningParticlesRef.current.push({
                x: targetSpice.x + (Math.random() - 0.5) * 8,
                y: targetSpice.y + (Math.random() - 0.5) * 8,
                vx: Math.cos(sparkAngle) * sparkSpeed,
                vy: Math.sin(sparkAngle) * sparkSpeed,
                startX: targetSpice.x,
                startY: targetSpice.y,
                targetX: h.x,
                targetY: h.y,
                progress: 0,
                speed: 0,
                spiralOffset: 0,
                size: Math.random() * 2.5 + 1.2,
                color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
                alpha: 1.0,
                type: 'impact_spark',
                life: 0,
                maxLife: Math.floor(Math.random() * 14 + 10),
              });
            }

            // 2. Stream vortex motes flowing from spice field towards rover scoop
            if (Math.random() < 0.8) {
              miningParticlesRef.current.push({
                x: targetSpice.x,
                y: targetSpice.y,
                vx: 0,
                vy: 0,
                startX: targetSpice.x + (Math.random() - 0.5) * 16,
                startY: targetSpice.y + (Math.random() - 0.5) * 16,
                targetX: h.x,
                targetY: h.y,
                progress: 0,
                speed: Math.random() * 0.03 + 0.025,
                spiralOffset: Math.random() * Math.PI * 2,
                size: Math.random() * 2.8 + 1.5,
                color: Math.random() > 0.4 ? '#f472b6' : '#d946ef',
                alpha: 0.9,
                type: 'stream',
                life: 0,
                maxLife: 50,
              });
            }

            // 3. Rover intake exhaust / vent vapor
            if (Math.random() < 0.4) {
              const ventX = h.x - Math.cos(h.angle) * 8 + (Math.random() - 0.5) * 6;
              const ventY = h.y - Math.sin(h.angle) * 8 + (Math.random() - 0.5) * 6;
              miningParticlesRef.current.push({
                x: ventX,
                y: ventY,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 1.5 - 0.6,
                startX: ventX,
                startY: ventY,
                targetX: 0,
                targetY: 0,
                progress: 0,
                speed: 0,
                spiralOffset: 0,
                size: Math.random() * 3 + 2,
                color: '#e879f9',
                alpha: 0.45,
                type: 'vent_smoke',
                life: 0,
                maxLife: Math.floor(Math.random() * 18 + 14),
              });
            }
          }
        }
      });

      // Update Dust Kick Particles
      dustKickParticlesRef.current.forEach((dp) => {
        dp.life++;
        dp.x += dp.vx;
        dp.y += dp.vy;
        dp.vx *= 0.94;
        dp.vy *= 0.94;
        const progress = dp.life / dp.maxLife;
        dp.radius = dp.radius + (dp.maxRadius - dp.radius) * 0.08;
        dp.alpha = dp.maxAlpha * (1 - progress);
      });
      dustKickParticlesRef.current = dustKickParticlesRef.current.filter((dp) => dp.life < dp.maxLife);

      // Update Mining Particles
      miningParticlesRef.current.forEach((mp) => {
        mp.life++;
        if (mp.type === 'impact_spark') {
          mp.x += mp.vx;
          mp.y += mp.vy;
          mp.vx *= 0.92;
          mp.vy *= 0.92;
          mp.alpha = 1 - mp.life / mp.maxLife;
        } else if (mp.type === 'stream') {
          mp.progress = Math.min(1, mp.progress + mp.speed);
          // Parametric vortex curve from start to rover
          const linearX = mp.startX + (mp.targetX - mp.startX) * mp.progress;
          const linearY = mp.startY + (mp.targetY - mp.startY) * mp.progress;
          // Spiral wobble around laser axis
          const perpAngle = Math.atan2(mp.targetY - mp.startY, mp.targetX - mp.startX) + Math.PI / 2;
          const spiralRad = Math.sin(mp.progress * Math.PI) * 16 * Math.sin(time * 12 + mp.spiralOffset);
          mp.x = linearX + Math.cos(perpAngle) * spiralRad;
          mp.y = linearY + Math.sin(perpAngle) * spiralRad;
          mp.alpha = Math.sin(mp.progress * Math.PI) * 0.95;
        } else if (mp.type === 'vent_smoke') {
          mp.x += mp.vx;
          mp.y += mp.vy;
          mp.size += 0.2;
          mp.alpha = 0.45 * (1 - mp.life / mp.maxLife);
        }
      });
      miningParticlesRef.current = miningParticlesRef.current.filter(
        (mp) => mp.life < mp.maxLife && (mp.type !== 'stream' || mp.progress < 0.98)
      );

      // =====================================================================
      // DRAW CANVAS IN WORLD SPACE
      // =====================================================================
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dynamic camera rumble & tectonic tremor shake
      let cameraShakeX = 0;
      let cameraShakeY = 0;

      if (weather.type === 'seismic_tremor') {
        const severity = Math.min(1, Math.max(0.3, weather.severity || 0.6));
        const rTime = time * 26;
        const wave1 = Math.sin(rTime) * Math.cos(rTime * 0.77);
        const wave2 = Math.sin(rTime * 1.73 + 2.1);
        const wave3 = Math.cos(rTime * 0.45);
        const envelope = Math.sin(time * 3.2) * 0.5 + 0.85;
        const shakeMag = severity * 3.8 * envelope;
        cameraShakeX = (wave1 * 0.7 + wave2 * 0.3) * shakeMag;
        cameraShakeY = (wave2 * 0.6 + wave3 * 0.4) * shakeMag;
      } else if (weather.type === 'dust_storm') {
        const gust = Math.sin(time * 8.5) * Math.sin(time * 3.2);
        cameraShakeX = gust * 1.0;
        cameraShakeY = Math.cos(time * 6.5) * 0.6;
      }

      // Camera transformation
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-camera.x + cameraShakeX, -camera.y + cameraShakeY);

      // =====================================================================
      // DIURNAL CYCLE & PLANETARY ILLUMINATION MODEL
      // 0 = dawn, 0.25 = noon, 0.5 = sunset, 0.75 = midnight
      // =====================================================================
      const sunAngle = timeOfDay * Math.PI * 2;
      const solarAltitude = Math.sin(sunAngle); // > 0 during day, < 0 during night

      // 1. Daylight & Night Intensity Curves
      const daylightFactor = Math.max(0, solarAltitude); // 0 to 1 during day, 0 at night
      const nightFactor = Math.max(0, -solarAltitude); // 0 to 1 during night, 0 during day

      // 2. Morning Phase Warmth Factor: active from pre-dawn (0.94) through early morning (0.22), peaking around 0.08 - 0.12
      let morningNorm = -1;
      if (timeOfDay >= 0.94) {
        morningNorm = (timeOfDay - 0.94) / 0.28;
      } else if (timeOfDay <= 0.22) {
        morningNorm = (timeOfDay + 0.06) / 0.28;
      }
      const morningFactor = morningNorm >= 0 && morningNorm <= 1 ? Math.sin(morningNorm * Math.PI) : 0;

      // 3. Evening Phase Warmth Factor: active from afternoon (0.36) to post-sunset (0.54), peaking around 0.47
      const eveningNorm = (timeOfDay - 0.36) / 0.18;
      const eveningFactor = eveningNorm >= 0 && eveningNorm <= 1 ? Math.sin(eveningNorm * Math.PI) : 0;

      // 1. Draw Martian Terrain Base (dynamically shaded by timeOfDay)
      // Base Day: oxidized iron ochre / Morning: radiant golden orange / Evening: deep amber sunset / Night: dark cool-blue basalt
      const r0 = Math.round(141 * daylightFactor * (1 - morningFactor * 0.25) + 168 * morningFactor + 152 * eveningFactor + 27 * nightFactor);
      const g0 = Math.round(53 * daylightFactor + 72 * morningFactor + 55 * eveningFactor + 34 * nightFactor);
      const b0 = Math.round(30 * daylightFactor + 32 * morningFactor + 25 * eveningFactor + 58 * nightFactor);

      const r1 = Math.round(122 * daylightFactor * (1 - morningFactor * 0.25) + 144 * morningFactor + 128 * eveningFactor + 21 * nightFactor);
      const g1 = Math.round(42 * daylightFactor + 54 * morningFactor + 41 * eveningFactor + 26 * nightFactor);
      const b1 = Math.round(22 * daylightFactor + 24 * morningFactor + 19 * eveningFactor + 46 * nightFactor);

      const r2 = Math.round(92 * daylightFactor * (1 - morningFactor * 0.25) + 110 * morningFactor + 95 * eveningFactor + 14 * nightFactor);
      const g2 = Math.round(30 * daylightFactor + 36 * morningFactor + 26 * eveningFactor + 18 * nightFactor);
      const b2 = Math.round(14 * daylightFactor + 14 * morningFactor + 10 * eveningFactor + 32 * nightFactor);

      const terrainGrad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      terrainGrad.addColorStop(0, `rgb(${r0}, ${g0}, ${b0})`);
      terrainGrad.addColorStop(0.5, `rgb(${r1}, ${g1}, ${b1})`);
      terrainGrad.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);
      ctx.fillStyle = terrainGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // 1b. Atmospheric Ambient Ground Sheen / Horizon Solar Radiance
      const sunCenterWorldX = WORLD_WIDTH / 2 + Math.cos(sunAngle) * (WORLD_WIDTH * 0.35);
      const sunCenterWorldY = WORLD_HEIGHT / 2 + Math.sin(sunAngle) * (WORLD_HEIGHT * 0.25);

      const atmoAura = ctx.createRadialGradient(
        sunCenterWorldX,
        sunCenterWorldY,
        150,
        WORLD_WIDTH / 2,
        WORLD_HEIGHT / 2,
        WORLD_WIDTH * 0.95
      );
      if (nightFactor > 0.08) {
        // Night twilight cool celestial starlight and Phobos/Deimos blue sheen
        atmoAura.addColorStop(0, `rgba(59, 130, 246, ${0.16 * nightFactor})`);
        atmoAura.addColorStop(0.4, `rgba(99, 102, 241, ${0.09 * nightFactor})`);
        atmoAura.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else if (morningFactor > 0.08) {
        // Morning warm golden-orange sunrise flare
        atmoAura.addColorStop(0, `rgba(251, 146, 60, ${0.34 * morningFactor})`);
        atmoAura.addColorStop(0.4, `rgba(249, 115, 22, ${0.18 * morningFactor})`);
        atmoAura.addColorStop(0.8, `rgba(234, 88, 12, ${0.08 * morningFactor})`);
        atmoAura.addColorStop(1, 'rgba(120, 45, 27, 0)');
      } else if (eveningFactor > 0.08) {
        // Evening warm fiery amber/orange sunset flare
        atmoAura.addColorStop(0, `rgba(249, 115, 22, ${0.35 * eveningFactor})`);
        atmoAura.addColorStop(0.4, `rgba(225, 29, 72, ${0.18 * eveningFactor})`);
        atmoAura.addColorStop(0.8, `rgba(180, 83, 9, ${0.09 * eveningFactor})`);
        atmoAura.addColorStop(1, 'rgba(60, 20, 10, 0)');
      } else {
        // High noon solar radiance
        atmoAura.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
        atmoAura.addColorStop(0.5, 'rgba(251, 146, 60, 0.10)');
        atmoAura.addColorStop(1, 'rgba(120, 45, 27, 0)');
      }
      ctx.fillStyle = atmoAura;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // 2. Dunes
      terrain.dunes.forEach((dune) => {
        ctx.beginPath();
        if (dune.points.length > 0) {
          ctx.moveTo(dune.points[0].x, dune.points[0].y);
          for (let i = 1; i < dune.points.length; i++) {
            const xc = (dune.points[i - 1].x + dune.points[i].x) / 2;
            const yc = (dune.points[i - 1].y + dune.points[i].y) / 2;
            ctx.quadraticCurveTo(dune.points[i - 1].x, dune.points[i - 1].y, xc, yc);
          }
        }
        ctx.strokeStyle = 'rgba(163, 64, 38, 0.45)';
        ctx.lineWidth = dune.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Shaded crest line with time-of-day dynamic highlights
        if (nightFactor > 0.1) {
          ctx.strokeStyle = `rgba(147, 197, 253, ${0.18 * nightFactor})`;
        } else if (morningFactor > 0.1) {
          ctx.strokeStyle = `rgba(253, 186, 116, ${0.35 * morningFactor + 0.15})`;
        } else if (eveningFactor > 0.1) {
          ctx.strokeStyle = `rgba(251, 146, 60, ${0.35 * eveningFactor + 0.15})`;
        } else {
          ctx.strokeStyle = 'rgba(230, 110, 75, 0.25)';
        }
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      // 3. Craters
      terrain.craters.forEach((crater) => {
        const cg = ctx.createRadialGradient(
          crater.x,
          crater.y,
          crater.radius * 0.2,
          crater.x,
          crater.y,
          crater.radius
        );
        cg.addColorStop(0, 'rgba(40, 12, 6, 0.85)');
        cg.addColorStop(0.8, 'rgba(75, 25, 12, 0.6)');
        cg.addColorStop(1, 'rgba(190, 80, 50, 0.3)');

        ctx.beginPath();
        ctx.arc(crater.x, crater.y, crater.radius, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();

        if (nightFactor > 0.1) {
          ctx.strokeStyle = `rgba(96, 165, 250, ${0.28 * nightFactor})`;
        } else if (morningFactor > 0.1) {
          ctx.strokeStyle = `rgba(251, 146, 60, ${0.45 * morningFactor + 0.15})`;
        } else if (eveningFactor > 0.1) {
          ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 * eveningFactor + 0.15})`;
        } else {
          ctx.strokeStyle = 'rgba(235, 120, 85, 0.4)';
        }
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // 4. Basalt Rocks
      terrain.rocks.forEach((rock) => {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.angle);
        ctx.fillStyle = '#2d1810';
        ctx.beginPath();
        ctx.ellipse(0, 0, rock.radius, rock.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#442217';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      // 5. Grid overlay
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
      }

      // =====================================================================
      // 6. SPICE VEIN ATMOSPHERIC GLOW & CRYSTALS
      // =====================================================================
      spicePatches.forEach((patch) => {
        if (patch.amount <= 0) return;
        const pulse = Math.sin(time * 2.5 + patch.pulseOffset) * 0.15 + 0.85;
        const patchRadius = patch.radius * (patch.amount / patch.maxAmount) * pulse;

        // Ground Luminescent Radiance (Atmospheric Bloom on the red sand)
        const bloomRadius = patchRadius * 3.2;
        const groundBloom = ctx.createRadialGradient(
          patch.x,
          patch.y,
          patchRadius * 0.2,
          patch.x,
          patch.y,
          bloomRadius
        );
        if (patch.richness === 'pure_vein') {
          groundBloom.addColorStop(0, 'rgba(244, 114, 182, 0.45)');
          groundBloom.addColorStop(0.4, 'rgba(192, 38, 211, 0.25)');
          groundBloom.addColorStop(0.8, 'rgba(147, 51, 234, 0.08)');
          groundBloom.addColorStop(1, 'rgba(147, 51, 234, 0)');
        } else {
          groundBloom.addColorStop(0, 'rgba(192, 38, 211, 0.38)');
          groundBloom.addColorStop(0.5, 'rgba(126, 34, 206, 0.18)');
          groundBloom.addColorStop(0.8, 'rgba(88, 28, 135, 0.05)');
          groundBloom.addColorStop(1, 'rgba(88, 28, 135, 0)');
        }
        ctx.beginPath();
        ctx.arc(patch.x, patch.y, bloomRadius, 0, Math.PI * 2);
        ctx.fillStyle = groundBloom;
        ctx.fill();

        // Glowing outer core aura
        const spiceGlow = ctx.createRadialGradient(
          patch.x,
          patch.y,
          patchRadius * 0.1,
          patch.x,
          patch.y,
          patchRadius * 1.5
        );
        if (patch.richness === 'pure_vein') {
          spiceGlow.addColorStop(0, 'rgba(236, 72, 153, 0.9)');
          spiceGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.6)');
          spiceGlow.addColorStop(1, 'rgba(147, 51, 234, 0)');
        } else {
          spiceGlow.addColorStop(0, 'rgba(192, 38, 211, 0.85)');
          spiceGlow.addColorStop(0.6, 'rgba(126, 34, 206, 0.5)');
          spiceGlow.addColorStop(1, 'rgba(88, 28, 135, 0)');
        }
        ctx.beginPath();
        ctx.arc(patch.x, patch.y, patchRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = spiceGlow;
        ctx.fill();

        // Shimmering crystalline core
        ctx.beginPath();
        ctx.arc(patch.x, patch.y, Math.max(8, patchRadius * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = patch.richness === 'pure_vein' ? '#f472b6' : '#c084fc';
        ctx.fill();

        // Floating crystalline motes drifting upward
        for (let sp = 0; sp < 7; sp++) {
          const spAngle = time * 2.0 + (sp * Math.PI) / 3.5;
          const spDist = Math.sin(time * 1.5 + sp) * patchRadius * 0.85;
          const spX = patch.x + Math.cos(spAngle) * spDist;
          const spY = patch.y + Math.sin(spAngle) * spDist - (time * 12 + sp * 8) % 25;
          ctx.beginPath();
          ctx.arc(spX, spY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Label above patch
        ctx.font = '600 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f5d0fe';
        ctx.fillText(`⚡ SPICE ${Math.round(patch.amount)}kg`, patch.x, patch.y - patchRadius - 10);
        ctx.font = '500 9px Chakra Petch, sans-serif';
        ctx.fillStyle = patch.richness === 'pure_vein' ? '#f472b6' : '#c084fc';
        ctx.fillText(patch.richness.toUpperCase().replace('_', ' '), patch.x, patch.y - patchRadius - 1);
      });

            // 6b. ORE DEPOSITS
      oreDeposits.forEach((deposit) => {
        if (deposit.depleted) return;
        const x = deposit.x * TILE_SIZE + TILE_SIZE / 2;
        const y = deposit.y * TILE_SIZE + TILE_SIZE / 2;
        const size = deposit.size === 'large' ? 28 : deposit.size === 'medium' ? 20 : 12;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        
        // Metallic sheen for ore
        const grad = ctx.createRadialGradient(x, y, size * 0.1, x, y, size);
        grad.addColorStop(0, '#f97316'); // Bright orange iron vein core
        grad.addColorStop(0.4, '#b45309'); // Rust
        grad.addColorStop(1, '#475569'); // Slate gray rocky exterior
        
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1'; // Highlight metallic edge
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Add a pulsing iron glow for visibility
        const pulse = Math.sin(time * 3 + deposit.x) * 0.2 + 0.8;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.15)'; // Orange glow
        ctx.fill();
        
        // Label the deposit
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f97316';
        ctx.fillText(`${deposit.size.toUpperCase()} ORE`, x, y - size - 12);
      });

      // =====================================================================
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



      // =====================================================================
      // 8. TIRE TRACKS WITH DYNAMIC FADING GLOW & DUST KICK PARTICLES
      // =====================================================================
      harvesters.forEach((h) => {
        if (h.tireHistory && h.tireHistory.length > 1) {
          const total = h.tireHistory.length;
          const baseWidth = h.model === 'titan' ? 6.0 : h.model === 'heavy' ? 4.2 : 2.6;
          const hasSpice = h.cargo > 5;

          // Render multi-layer segmented trail with smooth fading glow
          for (let ti = 1; ti < total; ti++) {
            const p1 = h.tireHistory[ti - 1];
            const p2 = h.tireHistory[ti];
            // t ranges from 0 (oldest tail point) to 1 (newest point at rover)
            const t = ti / (total - 1);

            // Pass 1: Outer diffuse ionized glow aura
            const outerGlowAlpha = Math.pow(t, 1.35) * (hasSpice ? 0.38 : 0.28);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = baseWidth * 3.4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = hasSpice
              ? `rgba(217, 70, 239, ${outerGlowAlpha})` // Ethereal violet spice static
              : `rgba(245, 158, 11, ${outerGlowAlpha})`; // Warm ionized amber dune glow
            ctx.stroke();

            // Pass 2: Middle energetic core ribbon
            const midGlowAlpha = Math.pow(t, 1.1) * (hasSpice ? 0.52 : 0.42);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = baseWidth * 1.8;
            ctx.strokeStyle = hasSpice
              ? `rgba(244, 114, 182, ${midGlowAlpha})`
              : `rgba(251, 146, 60, ${midGlowAlpha})`;
            ctx.stroke();

            // Pass 3: Indented ground tread trench (compressed basalt sand)
            const treadAlpha = Math.pow(t, 0.7) * 0.65;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineWidth = baseWidth;
            ctx.strokeStyle = `rgba(38, 12, 8, ${treadAlpha})`;
            ctx.stroke();
          }

          // Pass 4: Subtle lingering ionized static sparkles on freshest trail segments
          const sparkStart = Math.max(0, total - 12);
          for (let ti = sparkStart; ti < total; ti++) {
            const pt = h.tireHistory[ti];
            const t = (ti - sparkStart) / (total - sparkStart);
            if (Math.sin(ti * 5.7 + time * 3.5) > 0.35) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, (hasSpice ? 2.2 : 1.6) * t, 0, Math.PI * 2);
              ctx.fillStyle = hasSpice
                ? `rgba(253, 244, 255, ${t * 0.75})`
                : `rgba(254, 240, 138, ${t * 0.65})`;
              ctx.shadowColor = hasSpice ? '#d946ef' : '#f59e0b';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      });

      // Render expanding dust kick puffs from moving rovers
      dustKickParticlesRef.current.forEach((dp) => {
        const dustGlow = ctx.createRadialGradient(dp.x, dp.y, dp.radius * 0.15, dp.x, dp.y, dp.radius);
        dustGlow.addColorStop(0, dp.color);
        dustGlow.addColorStop(0.7, 'rgba(154, 52, 18, 0.6)');
        dustGlow.addColorStop(1, 'rgba(120, 45, 27, 0)');

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, dp.alpha));
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.radius, 0, Math.PI * 2);
        ctx.fillStyle = dustGlow;
        ctx.fill();
        ctx.restore();
      });

      // =====================================================================
      // 9. MODULES WITH SCI-FI ATMOSPHERIC EMISSIVE GLOWS
      // =====================================================================
      const nowMs = performance.now();
      if (rocketLaunchSeqRef.current !== seenRocketLaunchRef.current) {
        seenRocketLaunchRef.current = rocketLaunchSeqRef.current;
        const pad =
          modules.find((m) => m.type === 'launchpad' && m.isActive) ||
          modules.find((m) => m.type === 'launchpad');
        if (pad) {
          const state = rocketLaunchesRef.current[pad.id] ?? createRocketLaunchState();
          rocketLaunchesRef.current[pad.id] = state;
          triggerRocketLaunch(state, nowMs);
        }
      }

      modules.forEach((mod) => {
        const bp = MODULE_BLUEPRINTS[mod.type];
        const px = mod.x * TILE_SIZE;
        const py = mod.y * TILE_SIZE;
        const pw = mod.width * TILE_SIZE;
        const ph = mod.height * TILE_SIZE;
        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const isSelected = selectedModule?.id === mod.id;

        // Ground Glow Aura per building type
        if (mod.isActive) {
          const roleAura: Record<string, string> = {
            command: 'rgba(56, 189, 248, 0.25)',
            power: 'rgba(251, 191, 36, 0.28)',
            life_support: 'rgba(34, 211, 238, 0.25)',
            industry: 'rgba(249, 115, 22, 0.25)',
            research: 'rgba(167, 139, 250, 0.25)',
          };
          let auraColor = roleAura[bp?.category ?? ''] ?? 'rgba(56, 189, 248, 0.15)';
          let auraRadius = pw * 0.85;

          const moduleAura = ctx.createRadialGradient(cx, cy, pw * 0.2, cx, cy, auraRadius);
          moduleAura.addColorStop(0, auraColor);
          moduleAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.beginPath();
          ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
          ctx.fillStyle = moduleAura;
          ctx.fill();
        }

        // Base foundation pad
        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = isSelected ? '#f97316' : '#44403c';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
        ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);

        // Tech corner pads
        ctx.fillStyle = '#292524';
        ctx.fillRect(px + 4, py + 4, 10, 10);
        ctx.fillRect(px + pw - 14, py + 4, 10, 10);
        ctx.fillRect(px + 4, py + ph - 14, 10, 10);
        ctx.fillRect(px + pw - 14, py + ph - 14, 10, 10);

        // Specific Building Visuals (Procedural Vector Art)
        switch (mod.type) {
            case 'command': {
            drawCommandCenter(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'solar': {
            if (solarTracking) {
              drawSunTrackingGimbal(ctx, px, py, pw, ph, sunAngle, performance.now());
            } else {
              drawSolarArray(ctx, px, py, pw, ph, performance.now());
            }
            break;
          }

          case 'rtg': {
            drawNuclearGenerator(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'fusion': {
            drawFusionReactor(ctx, px, py, pw, ph, performance.now());
            break;
          }



          case 'battery': {
            drawBatterySubstation(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'scrubber': {
            if (terraformingGenesis) {
              drawAtmosphericGenesisEngine(ctx, px, py, pw, ph, performance.now());
            } else {
              drawScrubber(ctx, px, py, pw, ph, performance.now());
            }
            break;
          }

          case 'vaporator': {
            if (deepWellDrilling) {
              drawSubPermafrostThermalWells(ctx, px, py, pw, ph, performance.now());
            } else {
              drawVaporator(ctx, px, py, pw, ph, performance.now());
            }
            break;
          }

          case 'greenhouse': {
            if (hydroRecycler) {
              drawClosedLoopMoistureReclamation(ctx, px, py, pw, ph, performance.now());
            } else {
              drawHydroponicBioDome(ctx, px, py, pw, ph, performance.now());
            }
            break;
          }

          case 'habitat': {
            drawHabitat(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'depot': {
            if (spiceCentrifuge) {
              drawHighDensitySpiceRefinement(ctx, px, py, pw, ph, performance.now());
            } else {
              drawDepot(ctx, px, py, pw, ph);
            }
            break;
          }

          case 'refinery': {
            drawSpiceRefinery(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'garage': {
            drawHarvesterGarage(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'research': {
            drawScienceLab(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'launchpad': {
            const now = performance.now();
            const state = rocketLaunchesRef.current[mod.id] ?? createRocketLaunchState();
            rocketLaunchesRef.current[mod.id] = state;
            if (
              state.startedAt !== null &&
              (now - state.startedAt) / 1000 >= ROCKET_CYCLE_END
            ) {
              const again = state.queued;
              resetRocketLaunch(state);
              if (again) triggerRocketLaunch(state, now);
            }
            drawLaunchPad(ctx, px, py, pw, ph, now);
            drawLaunchPadRocket(ctx, px, py, pw, ph, state, now);
            break;
          }

          case 'radar': {
            if (stormHardening) {
              drawElectrostaticDustDeflectors(ctx, px, py, pw, ph, performance.now());
            } else {
              drawSeismicStormRadar(ctx, px, py, pw, ph, performance.now());
            }
            break;
          }

          case 'medbay': {
            drawMedicalBay(ctx, px, py, pw, ph, performance.now());
            break;
          }

          case 'storage': {
            drawStorageDepot(ctx, px, py, pw, ph, performance.now());
            break;
          }
      }

        // Module Label & Level
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fafaf9';
        ctx.fillText(bp.name.toUpperCase(), cx, py + ph + 13);

        const stars = '★'.repeat(mod.level);
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(stars, cx, py - 4);
      });

      // =====================================================================
      // 10. HARVESTER ROVERS & ADVANCED MINING PARTICLE SYSTEM
      // =====================================================================

      // Draw active mining laser beams with core glow
      harvesters.forEach((h) => {
        if (h.state === 'harvesting' && h.targetSpiceId) {
          const targetSpice = spicePatches.find((sp) => sp.id === h.targetSpiceId);
          if (targetSpice) {
            // Laser beam outer aura
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(targetSpice.x, targetSpice.y);
            ctx.strokeStyle = 'rgba(232, 121, 249, 0.4)';
            ctx.lineWidth = h.model === 'titan' ? 14 : 9;
            ctx.stroke();

            // Laser harmonic pulsating beam
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(targetSpice.x, targetSpice.y);
            ctx.strokeStyle = Math.sin(time * 20) > 0 ? '#f43f5e' : '#d946ef';
            ctx.lineWidth = h.model === 'titan' ? 6 : 4;
            ctx.stroke();

            // Blinding white inner laser core
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            ctx.lineTo(targetSpice.x, targetSpice.y);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Ground plasma scorch circle at impact point
            const impactGlow = ctx.createRadialGradient(
              targetSpice.x,
              targetSpice.y,
              1,
              targetSpice.x,
              targetSpice.y,
              18
            );
            impactGlow.addColorStop(0, '#ffffff');
            impactGlow.addColorStop(0.3, '#f43f5e');
            impactGlow.addColorStop(0.8, '#a21caf');
            impactGlow.addColorStop(1, 'rgba(162, 28, 175, 0)');
            ctx.beginPath();
            ctx.arc(targetSpice.x, targetSpice.y, 18, 0, Math.PI * 2);
            ctx.fillStyle = impactGlow;
            ctx.fill();
            ctx.restore();
          }
        }
      });

      // Draw all mining particles (sparks, suction stream motes, vent smoke)
      ctx.save();
      miningParticlesRef.current.forEach((mp) => {
        ctx.globalAlpha = Math.max(0, Math.min(1, mp.alpha));
        if (mp.type === 'stream') {
          // Suction crystal mote
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, mp.size, 0, Math.PI * 2);
          ctx.fillStyle = mp.color;
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (mp.type === 'impact_spark') {
          // High velocity impact spark
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, mp.size, 0, Math.PI * 2);
          ctx.fillStyle = mp.color;
          ctx.fill();
        } else if (mp.type === 'vent_smoke') {
          // Exhaust smoke from rover vents
          ctx.beginPath();
          ctx.arc(mp.x, mp.y, mp.size, 0, Math.PI * 2);
          ctx.fillStyle = mp.color;
          ctx.fill();
        }
      });
      ctx.restore();

      // Draw Harvester Rover Chassis
      harvesters.forEach((h) => {
        const isSelected = selectedHarvester?.id === h.id;

        ctx.save();
        ctx.translate(h.x, h.y);

        // ===================================================================
        // DYNAMIC TIME-OF-DAY HEADLIGHT PROJECTION & VOLUMETRIC BEAMS
        // Adjusts reach, intensity, color temperature and pool spread based on Sol cycle
        // ===================================================================
        ctx.save();
        ctx.rotate(h.angle);

        const modelMult = h.model === 'titan' ? 1.3 : h.model === 'heavy' ? 1.15 : 1.0;
        const length = h.model === 'titan' ? 38 : h.model === 'heavy' ? 30 : 22;
        const width = h.model === 'titan' ? 26 : h.model === 'heavy' ? 20 : 15;

        // Reach: Faint short daytime (50px) -> Golden morning (110px) -> Amber dusk (145px) -> High-beam night (225px+)
        const baseReach =
          50 * daylightFactor * (1 - morningFactor * 0.4 - eveningFactor * 0.4) +
          (80 + 35 * morningFactor) * morningFactor +
          (100 + 50 * eveningFactor) * eveningFactor +
          (135 + 90 * nightFactor) * nightFactor;
        const beamReach = baseReach * modelMult;

        // Core intensity: 0.12 in broad daylight -> 0.55 in morning -> 0.70 in evening -> 0.95 at night
        const beamAlpha =
          0.12 * daylightFactor * (1 - morningFactor * 0.5 - eveningFactor * 0.5) +
          (0.35 + 0.30 * morningFactor) * morningFactor +
          (0.45 + 0.35 * eveningFactor) * eveningFactor +
          (0.55 + 0.42 * nightFactor) * nightFactor;

        // Spread width at beam tip
        const beamSpreadY = (34 + 36 * nightFactor + 14 * (morningFactor + eveningFactor)) * modelMult;

        // Dual Headlight Geometry: Left projector cone + Right projector cone
        const leftLensY = -width * 0.36;
        const rightLensY = width * 0.36;
        const lensX = length / 2 - 2;

        // Primary volumetric forward beam gradient
        const lightGrad = ctx.createRadialGradient(lensX, 0, 8, lensX + beamReach * 0.5, 0, beamReach);
        if (nightFactor > 0.08) {
          // Night: Brilliant Xenon / Halogen white-yellow with cool atmospheric scatter
          lightGrad.addColorStop(0, `rgba(255, 255, 255, ${beamAlpha * 0.95})`);
          lightGrad.addColorStop(0.25, `rgba(254, 240, 138, ${beamAlpha * 0.85})`);
          lightGrad.addColorStop(0.65, `rgba(250, 204, 21, ${beamAlpha * 0.42})`);
          lightGrad.addColorStop(0.9, `rgba(147, 197, 253, ${beamAlpha * 0.18 * nightFactor})`);
          lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        } else if (morningFactor > 0.08) {
          // Morning: Warm golden-orange sunrise beam
          lightGrad.addColorStop(0, `rgba(255, 251, 235, ${beamAlpha * 0.9})`);
          lightGrad.addColorStop(0.35, `rgba(253, 224, 71, ${beamAlpha * 0.75})`);
          lightGrad.addColorStop(0.7, `rgba(251, 146, 60, ${beamAlpha * 0.40})`);
          lightGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else if (eveningFactor > 0.08) {
          // Evening: Warm sunset amber-orange dusk beam
          lightGrad.addColorStop(0, `rgba(254, 243, 199, ${beamAlpha * 0.9})`);
          lightGrad.addColorStop(0.35, `rgba(251, 191, 36, ${beamAlpha * 0.75})`);
          lightGrad.addColorStop(0.7, `rgba(249, 115, 22, ${beamAlpha * 0.45})`);
          lightGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        } else {
          // High Noon: Subtle daytime running light
          lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
          lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.08)');
          lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        }

        // 1. Left Projector Beam
        ctx.beginPath();
        ctx.moveTo(lensX, leftLensY);
        ctx.lineTo(lensX + beamReach, leftLensY - beamSpreadY * 0.6);
        ctx.lineTo(lensX + beamReach, 4);
        ctx.closePath();
        ctx.fillStyle = lightGrad;
        ctx.fill();

        // 2. Right Projector Beam
        ctx.beginPath();
        ctx.moveTo(lensX, rightLensY);
        ctx.lineTo(lensX + beamReach, -4);
        ctx.lineTo(lensX + beamReach, rightLensY + beamSpreadY * 0.6);
        ctx.closePath();
        ctx.fillStyle = lightGrad;
        ctx.fill();

        // 3. Central Merged Main Floodlight Cone
        ctx.beginPath();
        ctx.moveTo(lensX, 0);
        ctx.lineTo(lensX + beamReach * 1.05, -beamSpreadY * 0.85);
        ctx.lineTo(lensX + beamReach * 1.05, beamSpreadY * 0.85);
        ctx.closePath();
        ctx.fillStyle = lightGrad;
        ctx.fill();

        // 4. Ground Spotlight Illumination Pool (illuminating the dark terrain ahead)
        if (nightFactor > 0.08 || eveningFactor > 0.1 || morningFactor > 0.1) {
          const poolDist = lensX + beamReach * 0.65;
          const poolRadiusX = beamReach * 0.42;
          const poolRadiusY = beamSpreadY * 0.75;
          const poolGrad = ctx.createRadialGradient(poolDist, 0, 5, poolDist, 0, poolRadiusX);
          const poolAlpha = 0.45 * nightFactor + 0.25 * (eveningFactor + morningFactor);
          poolGrad.addColorStop(0, `rgba(254, 240, 138, ${poolAlpha})`);
          poolGrad.addColorStop(0.45, `rgba(253, 224, 71, ${poolAlpha * 0.5})`);
          poolGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

          ctx.beginPath();
          ctx.ellipse(poolDist, 0, poolRadiusX, poolRadiusY, 0, 0, Math.PI * 2);
          ctx.fillStyle = poolGrad;
          ctx.fill();
        }

        // 5. Volumetric dust motes caught in the headlight beam at night
        if (nightFactor > 0.15) {
          for (let di = 0; di < 4; di++) {
            const moteDist = lensX + ((time * 45 + di * 42) % (beamReach * 0.82)) + 12;
            const moteSpread = (moteDist / beamReach) * (beamSpreadY * 0.6);
            const moteY = Math.sin(time * 3.5 + di * 1.9 + h.x * 0.01) * moteSpread;
            const moteAlpha = (1 - (moteDist - lensX) / beamReach) * 0.75 * nightFactor;
            ctx.beginPath();
            ctx.arc(moteDist, moteY, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${moteAlpha})`;
            ctx.fill();
          }
        }

        ctx.restore();

        // Unloading fountain at Depot
        if (h.state === 'unloading') {
          ctx.restore();
          ctx.save();
          for (let u = 0; u < 6; u++) {
            const upx = h.x + (Math.random() - 0.5) * 22;
            const upy = h.y - ((time * 50 + u * 9) % 36);
            ctx.beginPath();
            ctx.arc(upx, upy, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#f472b6';
            ctx.shadowColor = '#e879f9';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.restore();
          ctx.save();
          ctx.translate(Math.round(h.x), Math.round(h.y));
        }

        // Rotate chassis
        ctx.rotate(h.angle);

        // Custom Rover Sprite or Procedural Chassis
        drawHarvester(ctx, h, length, width, isSelected);

        // Front Headlight Lens Pods (mounted on bumper corners, glowing brightly at night)
        const lampAlpha = 0.3 + 0.7 * nightFactor + 0.4 * (morningFactor + eveningFactor);
        const lampGlow = nightFactor > 0.1 ? 14 * nightFactor : (morningFactor + eveningFactor) > 0.1 ? 8 : 0;
        const lampColor =
          nightFactor > 0.1
            ? '#ffffff'
            : (morningFactor + eveningFactor) > 0.1
            ? '#fef08a'
            : '#e2e8f0';

        ctx.save();
        ctx.fillStyle = lampColor;
        if (lampGlow > 0) {
          ctx.shadowColor = nightFactor > 0.1 ? '#fef08a' : '#f59e0b';
          ctx.shadowBlur = lampGlow;
        }
        // Left lamp
        ctx.beginPath();
        ctx.arc(length / 2 - 1, -width * 0.36, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // Right lamp
        ctx.beginPath();
        ctx.arc(length / 2 - 1, width * 0.36, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();

        // Harvester HUD Cargo Gauge
        const hudY = h.y - 24;
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(h.x, h.y, 28, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Tactical path navigation indicator around buildings
          if (h.waypoints && h.waypoints.length > 0) {
            ctx.beginPath();
            ctx.moveTo(h.x, h.y);
            for (let wi = 0; wi < h.waypoints.length; wi++) {
              ctx.lineTo(h.waypoints[wi].x, h.waypoints[wi].y);
            }
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Waypoint nodes
            for (let wi = 0; wi < h.waypoints.length; wi++) {
              const wp = h.waypoints[wi];
              ctx.beginPath();
              ctx.arc(wp.x, wp.y, 3.5, 0, Math.PI * 2);
              ctx.fillStyle = wi === h.waypoints.length - 1 ? '#22c55e' : '#38bdf8';
              ctx.fill();
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        const barW = 36;
        const barH = 5;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(h.x - barW / 2, hudY, barW, barH);
        const fillW = (Math.min(h.cargo, h.maxCargo) / h.maxCargo) * barW;
        ctx.fillStyle =
          h.cargo >= h.maxCargo
            ? '#ef4444'
            : h.cargo > h.maxCargo * 0.6
            ? '#f59e0b'
            : '#10b981';
        ctx.fillRect(h.x - barW / 2, hudY, fillW, barH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(h.x - barW / 2, hudY, barW, barH);

        ctx.font = '700 9px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(h.name.toUpperCase(), h.x, hudY - 4);

        let stateLabel = 'IDLE';
        let stateColor = '#94a3b8';
        const oreRun = h.miningTarget === 'ore';
        if (h.state === 'moving_to_spice') {
          stateLabel = oreRun ? 'NAV TO ORE' : 'NAV TO SPICE';
          stateColor = '#38bdf8';
        } else if (h.state === 'harvesting') {
          stateLabel = oreRun
            ? `MINING ORE (${Math.round(h.cargo)}/${h.maxCargo})`
            : `MINING (${Math.round(h.cargo)}/${h.maxCargo})`;
          stateColor = oreRun ? '#f97316' : '#e879f9';
        } else if (h.state === 'returning_to_depot') {
          stateLabel = oreRun ? 'RETURNING ORE (FULL)' : 'RETURNING (FULL)';
          stateColor = '#f59e0b';
        } else if (h.state === 'unloading') {
          stateLabel = oreRun ? 'UNLOADING ORE' : 'UNLOADING SPICE';
          stateColor = '#10b981';
        }

        ctx.font = '600 8px Chakra Petch, sans-serif';
        ctx.fillStyle = stateColor;
        ctx.fillText(stateLabel, h.x, hudY + 14);
      });

      // =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits & Rovers)
      // =====================================================================
      const workerTime = performance.now();
      workers.forEach((w) => {
        if (w.transport === 'rover') {
          drawColonistRover(ctx, w, workerTime);
        } else {
          drawColonist(ctx, w, workerTime);
        }
      });

      // =====================================================================
      // 10.8. ELEVATED HIGH-VOLTAGE POWER CABLES & PYLONS
      // =====================================================================
      for (let i = 0; i < activePowerLines.length; i++) {
        const line = activePowerLines[i];
        const { x1, y1, x2, y2, length } = line;

        // 3. High-voltage ambient electromagnetic bloom
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 7;
        ctx.stroke();

        // 4. Heavy insulated casing
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.95)';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 5. Glowing superconducting core
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 6. High-voltage energy packet with radial bloom
        const pulseT = (time * 1.35 + i * 0.42) % 1;
        const dotX = x1 + (x2 - x1) * pulseT;
        const dotY = y1 + (y2 - y1) * pulseT;

        const packetGlow = ctx.createRadialGradient(dotX, dotY, 1, dotX, dotY, 10);
        packetGlow.addColorStop(0, '#ffffff');
        packetGlow.addColorStop(0.35, '#38bdf8');
        packetGlow.addColorStop(0.8, 'rgba(56, 189, 248, 0.4)');
        packetGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.beginPath();
        ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
        ctx.fillStyle = packetGlow;
        ctx.fill();

        // 7. Structural Transmission Pylons / Insulator Towers
        const numPylons = length > 220 ? 2 : length > 120 ? 1 : 0;
        for (let p = 1; p <= numPylons; p++) {
          const ptFrac = p / (numPylons + 1);
          const px = x1 + (x2 - x1) * ptFrac;
          const py = y1 + (y2 - y1) * ptFrac;

          // Pylon heavy concrete foundation base
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Ceramic insulator cap
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();

          // Flashing high-voltage hazard beacon
          const beaconFlash = (Math.sin(time * 3.5 + px * 0.08) + 1) * 0.5;
          ctx.beginPath();
          ctx.arc(px, py - 4, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.35 + beaconFlash * 0.65})`;
          ctx.fill();
        }
      }

      // =====================================================================
      // 11. ATMOSPHERIC DRIFT PARTICLES (Swirling Martian Dust)
      // =====================================================================
      atmosphericParticlesRef.current.forEach((p) => {
        p.x += p.vx + (weather.type === 'dust_storm' ? 5.5 : 0.6);
        p.y += p.vy + (weather.type === 'dust_storm' ? 2.2 : 0.2);

        if (p.x > WORLD_WIDTH) p.x = 0;
        if (p.x < 0) p.x = WORLD_WIDTH;
        if (p.y > WORLD_HEIGHT) p.y = 0;
        if (p.y < 0) p.y = WORLD_HEIGHT;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // =====================================================================
      // 12. WORLD-SPACE WEATHER PHENOMENA & SEISMIC FRACTURES
      // =====================================================================
      if (weather.type === 'seismic_tremor') {
        const severity = weather.severity || 0.65;
        // Expanding tectonic shockwave rings radiating from spice patch epicenters
        const numEpicenters = Math.min(5, Math.max(2, spicePatches.length));
        for (let e = 0; e < numEpicenters; e++) {
          const sp = spicePatches[e];
          const ex = sp ? sp.x : WORLD_WIDTH * (0.35 + e * 0.15);
          const ey = sp ? sp.y : WORLD_HEIGHT * (0.4 + e * 0.12);

          for (let r = 0; r < 4; r++) {
            const waveT = (time * 0.72 + e * 0.35 + r * 0.25) % 1;
            const waveRadius = waveT * 540;
            const waveAlpha = (1 - waveT) * 0.55 * severity;

            // Outer shockwave compression crest
            ctx.beginPath();
            ctx.arc(ex, ey, waveRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(192, 132, 252, ${waveAlpha})`;
            ctx.lineWidth = 3.5 * (1 - waveT) + 1;
            ctx.stroke();

            // Inner harmonic reverberation ring
            ctx.beginPath();
            ctx.arc(ex, ey, waveRadius * 0.72, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(244, 114, 182, ${waveAlpha * 0.75})`;
            ctx.lineWidth = 2 * (1 - waveT) + 0.5;
            ctx.stroke();
          }

          // Subterranean fault epicenter thermal pulse
          const pulseR = 18 + Math.sin(time * 6 + e) * 6;
          const epicGlow = ctx.createRadialGradient(ex, ey, 2, ex, ey, pulseR * 2.8);
          epicGlow.addColorStop(0, 'rgba(244, 114, 182, 0.75)');
          epicGlow.addColorStop(0.5, 'rgba(192, 132, 252, 0.35)');
          epicGlow.addColorStop(1, 'rgba(168, 85, 247, 0)');
          ctx.beginPath();
          ctx.arc(ex, ey, pulseR * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = epicGlow;
          ctx.fill();
        }
      } else if (weather.type === 'dust_storm') {
        // Swirling dust devils drifting across the Martian landscape
        dustDevilsRef.current.forEach((dd, di) => {
          dd.x = (dd.x + dd.vx * 1.8) % WORLD_WIDTH;
          dd.y = (dd.y + dd.vy * 1.8) % WORLD_HEIGHT;
          if (dd.x < 0) dd.x += WORLD_WIDTH;
          if (dd.y < 0) dd.y += WORLD_HEIGHT;
          dd.angle += dd.spinSpeed * 0.05;

          // Ground dust foot
          const footGlow = ctx.createRadialGradient(dd.x, dd.y, 4, dd.x, dd.y, dd.radius);
          footGlow.addColorStop(0, 'rgba(180, 83, 9, 0.55)');
          footGlow.addColorStop(0.6, 'rgba(194, 65, 12, 0.28)');
          footGlow.addColorStop(1, 'rgba(154, 52, 18, 0)');
          ctx.beginPath();
          ctx.arc(dd.x, dd.y, dd.radius, 0, Math.PI * 2);
          ctx.fillStyle = footGlow;
          ctx.fill();

          // Spiral vortex arms
          const numArms = 5;
          ctx.lineWidth = 2.2;
          for (let a = 0; a < numArms; a++) {
            const baseAngle = dd.angle + (a * Math.PI * 2) / numArms;
            ctx.beginPath();
            for (let st = 0; st <= 14; st++) {
              const r = (st / 14) * dd.radius;
              const th = baseAngle + st * 0.28;
              const px = dd.x + Math.cos(th) * r;
              const py = dd.y + Math.sin(th) * r;
              if (st === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = `rgba(254, 215, 170, ${0.45 + Math.sin(time * 4 + a + di) * 0.15})`;
            ctx.stroke();
          }
        });
      } else if (weather.type === 'solar_flare') {
        // High-energy ionization plasma reflections across the regolith
        const numPillars = 4;
        for (let ip = 0; ip < numPillars; ip++) {
          const px = (time * 65 + ip * (WORLD_WIDTH / numPillars)) % WORLD_WIDTH;
          const py = WORLD_HEIGHT * 0.35 + Math.sin(time * 2 + ip) * 200;
          const ionGrad = ctx.createRadialGradient(px, py, 10, px, py, 350);
          ionGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
          ionGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.15)');
          ionGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
          ctx.beginPath();
          ctx.arc(px, py, 350, 0, Math.PI * 2);
          ctx.fillStyle = ionGrad;
          ctx.fill();
        }
      }

      // =====================================================================
      // 13. DYNAMIC TIME-OF-DAY ATMOSPHERIC LIGHTING & GLOBAL SURFACE BRIGHTNESS
      // =====================================================================

      // A. Darker, blue-hued night phase (peaking around midnight)
      if (nightFactor > 0.02) {
        // Darkness absorption pass to lower global surface brightness
        const darkAlpha = Math.min(0.70, nightFactor * 0.68);
        ctx.fillStyle = `rgba(6, 10, 26, ${darkAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Rich cool cobalt/azure blue hue wash across Martian surface
        const blueAlpha = Math.min(0.38, nightFactor * 0.35);
        ctx.fillStyle = `rgba(29, 78, 216, ${blueAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Celestial moonlit radial glow across the surface
        const nightGrad = ctx.createRadialGradient(
          WORLD_WIDTH * 0.35,
          WORLD_HEIGHT * 0.3,
          WORLD_WIDTH * 0.12,
          WORLD_WIDTH / 2,
          WORLD_HEIGHT / 2,
          WORLD_WIDTH * 0.88
        );
        nightGrad.addColorStop(0, `rgba(96, 165, 250, ${nightFactor * 0.15})`);
        nightGrad.addColorStop(0.5, `rgba(30, 58, 138, ${nightFactor * 0.20})`);
        nightGrad.addColorStop(1, `rgba(10, 15, 30, ${nightFactor * 0.30})`);
        ctx.fillStyle = nightGrad;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // B. Warm, orange-tinted morning phase (dawn to mid-morning)
      if (morningFactor > 0.02) {
        // Golden-orange ambient tint layer
        const mOrangeAlpha = Math.min(0.28, morningFactor * 0.25);
        ctx.fillStyle = `rgba(249, 115, 22, ${mOrangeAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Radiant amber morning sunrise sheen
        const mGoldAlpha = Math.min(0.20, morningFactor * 0.18);
        ctx.fillStyle = `rgba(251, 146, 60, ${mGoldAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Directional sunrise solar horizon glow
        const morningHorizon = ctx.createLinearGradient(
          0,
          WORLD_HEIGHT,
          WORLD_WIDTH * 0.75,
          0
        );
        morningHorizon.addColorStop(0, `rgba(254, 215, 170, ${morningFactor * 0.22})`);
        morningHorizon.addColorStop(0.4, `rgba(249, 115, 22, ${morningFactor * 0.15})`);
        morningHorizon.addColorStop(1, 'rgba(180, 83, 9, 0)');
        ctx.fillStyle = morningHorizon;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // C. Warm, orange-tinted evening / sunset phase (afternoon to post-sunset)
      if (eveningFactor > 0.02) {
        // Warm sunset orange ambient tint layer
        const eOrangeAlpha = Math.min(0.30, eveningFactor * 0.27);
        ctx.fillStyle = `rgba(234, 88, 12, ${eOrangeAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Burnt sienna & crimson dusk twilight wash
        const eCrimsonAlpha = Math.min(0.20, eveningFactor * 0.17);
        ctx.fillStyle = `rgba(194, 65, 12, ${eCrimsonAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // Directional sunset solar horizon glow
        const sunsetHorizon = ctx.createLinearGradient(
          WORLD_WIDTH,
          0,
          WORLD_WIDTH * 0.25,
          WORLD_HEIGHT
        );
        sunsetHorizon.addColorStop(0, `rgba(251, 146, 60, ${eveningFactor * 0.26})`);
        sunsetHorizon.addColorStop(0.5, `rgba(225, 29, 72, ${eveningFactor * 0.17})`);
        sunsetHorizon.addColorStop(1, 'rgba(124, 45, 18, 0)');
        ctx.fillStyle = sunsetHorizon;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // D. High-noon peak solar brilliance
      if (daylightFactor > 0.85 && morningFactor < 0.15 && eveningFactor < 0.15) {
        const noonBoost = (daylightFactor - 0.85) / 0.15;
        ctx.fillStyle = `rgba(255, 247, 237, ${noonBoost * 0.07})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // =====================================================================
      // 13b. DYNAMIC HIGH-BEAM EMISSIVE PIERCING PASS AT NIGHT & TWILIGHT
      // Ensures vehicle headlights and perimeter floodlights vividly illuminate the dark night
      // =====================================================================
      if (nightFactor > 0.05 || eveningFactor > 0.1 || morningFactor > 0.1) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Additive screen blending against dark terrain

        harvesters.forEach((h) => {
          ctx.save();
          ctx.translate(h.x, h.y);
          ctx.rotate(h.angle);

          const modelMult = h.model === 'titan' ? 1.3 : h.model === 'heavy' ? 1.15 : 1.0;
          const length = h.model === 'titan' ? 38 : h.model === 'heavy' ? 30 : 22;
          const width = h.model === 'titan' ? 26 : h.model === 'heavy' ? 20 : 15;
          const beamReach = (135 + 90 * nightFactor) * modelMult;
          const beamSpreadY = (34 + 36 * nightFactor) * modelMult;
          const lensX = length / 2 - 2;

          // Piercing light cone that cuts through night shadow
          const emissiveGrad = ctx.createRadialGradient(lensX, 0, 5, lensX + beamReach * 0.5, 0, beamReach);
          const emissiveAlpha = Math.min(0.92, 0.45 * nightFactor + 0.3 * eveningFactor + 0.25 * morningFactor);

          if (nightFactor > 0.1) {
            emissiveGrad.addColorStop(0, `rgba(255, 255, 255, ${emissiveAlpha * 0.95})`);
            emissiveGrad.addColorStop(0.3, `rgba(254, 240, 138, ${emissiveAlpha * 0.70})`);
            emissiveGrad.addColorStop(0.7, `rgba(250, 204, 21, ${emissiveAlpha * 0.30})`);
            emissiveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else if (eveningFactor > 0.1) {
            emissiveGrad.addColorStop(0, `rgba(255, 247, 237, ${emissiveAlpha * 0.85})`);
            emissiveGrad.addColorStop(0.4, `rgba(251, 146, 60, ${emissiveAlpha * 0.55})`);
            emissiveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            emissiveGrad.addColorStop(0, `rgba(255, 255, 240, ${emissiveAlpha * 0.85})`);
            emissiveGrad.addColorStop(0.4, `rgba(253, 224, 71, ${emissiveAlpha * 0.55})`);
            emissiveGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          ctx.beginPath();
          ctx.moveTo(lensX, 0);
          ctx.lineTo(lensX + beamReach, -beamSpreadY * 0.85);
          ctx.lineTo(lensX + beamReach, beamSpreadY * 0.85);
          ctx.closePath();
          ctx.fillStyle = emissiveGrad;
          ctx.fill();

          // Forward ground spotlight pool piercing
          const poolDist = lensX + beamReach * 0.65;
          const poolRadX = beamReach * 0.40;
          const poolRadY = beamSpreadY * 0.72;
          const emissivePool = ctx.createRadialGradient(poolDist, 0, 3, poolDist, 0, poolRadX);
          emissivePool.addColorStop(0, `rgba(254, 240, 138, ${emissiveAlpha * 0.50})`);
          emissivePool.addColorStop(0.55, `rgba(253, 224, 71, ${emissiveAlpha * 0.22})`);
          emissivePool.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.beginPath();
          ctx.ellipse(poolDist, 0, poolRadX, poolRadY, 0, 0, Math.PI * 2);
          ctx.fillStyle = emissivePool;
          ctx.fill();

          // High-beam headlight lens corona flare
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = nightFactor > 0.1 ? '#fef08a' : '#f59e0b';
          ctx.shadowBlur = 18 * nightFactor + 8;
          ctx.beginPath();
          ctx.arc(lensX, -width * 0.36, 3, 0, Math.PI * 2);
          ctx.arc(lensX, width * 0.36, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        });

        // Module security lights & perimeter floodlights brightening at night
        if (nightFactor > 0.08) {
          modules.forEach((mod) => {
            if (!mod.isActive) return;
            const px = mod.x * TILE_SIZE;
            const py = mod.y * TILE_SIZE;
            const pw = mod.width * TILE_SIZE;
            const ph = mod.height * TILE_SIZE;
            const cx = px + pw / 2;
            const cy = py + ph / 2;

            // Security perimeter floodlight
            const secRad = pw * (0.85 + 0.35 * nightFactor);
            const secGrad = ctx.createRadialGradient(cx, cy, pw * 0.25, cx, cy, secRad);
            const secColor =
              mod.type === 'command'
                ? 'rgba(56, 189, 248, 0.28)'
                : mod.type === 'greenhouse'
                ? 'rgba(34, 197, 94, 0.24)'
                : mod.type === 'rtg'
                ? 'rgba(249, 115, 22, 0.32)'
                : mod.type === 'refinery'
                ? 'rgba(192, 38, 211, 0.26)'
                : mod.type === 'medbay'
                ? 'rgba(16, 185, 129, 0.28)'
                : 'rgba(56, 189, 248, 0.18)';
            secGrad.addColorStop(0, secColor);
            secGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy, secRad, 0, Math.PI * 2);
            ctx.fillStyle = secGrad;
            ctx.fill();
          });
        }

        ctx.restore();
      }

      // Ghost Building Placement Preview
      if (buildPlacingType && cursorGrid) {
        const bp = MODULE_BLUEPRINTS[buildPlacingType];
        if (bp) {
          const gx = cursorGrid.x;
          const gy = cursorGrid.y;
          const px = gx * TILE_SIZE;
          const py = gy * TILE_SIZE;
          const pw = bp.width * TILE_SIZE;
          const ph = bp.height * TILE_SIZE;

          const inBounds =
            gx >= 0 &&
            gy >= 0 &&
            gx + bp.width <= GRID_SIZE &&
            gy + bp.height <= GRID_SIZE;
          const occupied = isTileOccupied(gx, gy, bp.width, bp.height);
          const valid = inBounds && !occupied && canAffordPlacing;

          ctx.fillStyle = valid
            ? 'rgba(34, 197, 94, 0.35)'
            : 'rgba(239, 68, 68, 0.45)';
          ctx.fillRect(px, py, pw, ph);

          ctx.strokeStyle = valid ? '#22c55e' : '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(px, py, pw, ph);

          ctx.font = '700 12px Chakra Petch, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(
            valid
              ? `SNAP: ${bp.name}`
              : !inBounds
              ? 'OUT OF SECTOR BOUNDS'
              : occupied
              ? 'LOCATION OBSTRUCTED'
              : 'INSUFFICIENT RESOURCES',
            px + pw / 2,
            py - 8
          );
        }
      }

      ctx.restore();

      // =====================================================================
      // 13.5 DYNAMIC SCREEN-SPACE WEATHER EFFECT OVERLAY
      // =====================================================================

      // 1. SEVERE DUST STORM OVERLAY (Animated rushing sand streaks, sweeping curtains, lens vignette)
      if (weather.type === 'dust_storm') {
        // Atmospheric amber/ochre dust haze wash
        const stormWash = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        stormWash.addColorStop(0, 'rgba(180, 83, 9, 0.26)');
        stormWash.addColorStop(0.5, 'rgba(194, 65, 12, 0.36)');
        stormWash.addColorStop(1, 'rgba(146, 64, 14, 0.28)');
        ctx.fillStyle = stormWash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Sweeping sinusoidal wind curtains
        for (let wave = 0; wave < 3; wave++) {
          const waveSpeed = time * 540 + wave * 320;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);
          for (let wx = 0; wx <= canvas.width + 40; wx += 40) {
            const wy =
              Math.sin((wx + waveSpeed) * 0.004) * 80 + canvas.height * (0.3 + wave * 0.24);
            ctx.lineTo(wx, wy);
          }
          ctx.lineTo(canvas.width, canvas.height);
          ctx.closePath();
          ctx.fillStyle = `rgba(217, 119, 6, ${0.08 + Math.sin(time * 3 + wave) * 0.03})`;
          ctx.fill();
        }

        // Animated rushing sand streaks with directional motion blur tails
        stormStreaksRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x > canvas.width + 80) p.x = -60;
          if (p.x < -80) p.x = canvas.width + 60;
          if (p.y > canvas.height + 80) p.y = -60;
          if (p.y < -80) p.y = canvas.height + 60;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.thickness;
          ctx.globalAlpha = p.alpha;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        });

        // Sandblast perimeter vignette on visor/lens
        const stormVignette = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.3,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.72
        );
        stormVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        stormVignette.addColorStop(0.7, 'rgba(120, 53, 15, 0.28)');
        stormVignette.addColorStop(1, 'rgba(67, 20, 7, 0.62)');
        ctx.fillStyle = stormVignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 2. SEISMIC TREMOR OVERLAY (Screen distortion scanlines, tectonic stress vignette, seismograph wave)
      else if (weather.type === 'seismic_tremor') {
        const severity = weather.severity || 0.65;

        // Tectonic horizontal chromatic displacement bands / screen refraction ripples
        const numDisplacementBands = 7;
        for (let b = 0; b < numDisplacementBands; b++) {
          const bandProgress =
            (time * 170 + b * (canvas.height / numDisplacementBands)) % canvas.height;
          const bandHeight = 16 + Math.sin(time * 8 + b) * 8;
          const waveAmp = Math.sin(time * 12 + b * 1.7) * 0.5 + 0.5;
          const bandAlpha = waveAmp * 0.28 * severity;

          // Chromatic split lines (magenta & cyan chromatic fringes)
          ctx.fillStyle = `rgba(192, 132, 252, ${bandAlpha * 0.8})`;
          ctx.fillRect(0, bandProgress - 2, canvas.width, 2.5);
          ctx.fillStyle = `rgba(56, 189, 248, ${bandAlpha * 0.5})`;
          ctx.fillRect(0, bandProgress + bandHeight, canvas.width, 1.5);

          // Translucent tectonic refraction stripe
          ctx.fillStyle = `rgba(168, 85, 247, ${bandAlpha * 0.12})`;
          ctx.fillRect(0, bandProgress, canvas.width, bandHeight);
        }

        // Pulsing seismic stress perimeter vignette
        const tremorPulse = Math.sin(time * 5) * 0.5 + 0.5;
        const tremorVignette = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.35,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.72
        );
        tremorVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        tremorVignette.addColorStop(
          0.7,
          `rgba(88, 28, 135, ${0.15 * tremorPulse * severity})`
        );
        tremorVignette.addColorStop(
          1,
          `rgba(59, 7, 100, ${0.45 * tremorPulse * severity})`
        );
        ctx.fillStyle = tremorVignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subterranean Seismometer live waveform strip
        const sgWidth = 240;
        const sgHeight = 38;
        const sgX = 18;
        const sgY = canvas.height - sgHeight - 18;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(sgX, sgY, sgWidth, sgHeight);
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sgX, sgY, sgWidth, sgHeight);

        ctx.font = '700 9px Chakra Petch, sans-serif';
        ctx.fillStyle = '#f5d0fe';
        ctx.textAlign = 'left';
        ctx.fillText('SEISMOMETER // P-WAVE OSCILLOGRAM', sgX + 8, sgY + 11);

        ctx.beginPath();
        for (let sx = 0; sx < sgWidth - 16; sx += 3) {
          const waveFreq = time * 24 + sx * 0.18;
          const py =
            sgY +
            23 +
            (Math.sin(waveFreq) * 0.6 + Math.sin(waveFreq * 2.3) * 0.4) * 8 * severity;
          if (sx === 0) ctx.moveTo(sgX + 8 + sx, py);
          else ctx.lineTo(sgX + 8 + sx, py);
        }
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 3. ATMOSPHERIC DUST VEIL OVERLAY (Soft copper haze wash, floating motes)
      else if (weather.type === 'dust_veil') {
        const veilWash = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        veilWash.addColorStop(0, 'rgba(217, 119, 6, 0.14)');
        veilWash.addColorStop(0.5, 'rgba(180, 83, 9, 0.18)');
        veilWash.addColorStop(1, 'rgba(217, 119, 6, 0.12)');
        ctx.fillStyle = veilWash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Soft dust veil perimeter glow
        const veilVignette = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.4,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.75
        );
        veilVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        veilVignette.addColorStop(1, 'rgba(180, 83, 9, 0.22)');
        ctx.fillStyle = veilVignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 4. SOLAR FLARE / ION STORM OVERLAY (Aurora plasma curtains, cosmic ray streaks, CRT glitch)
      else if (weather.type === 'solar_flare') {
        // Upper atmospheric aurora plasma curtains
        for (let cur = 0; cur < 3; cur++) {
          const waveSpeed = time * 2.2 + cur * 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          for (let ax = 0; ax <= canvas.width + 40; ax += 30) {
            const ay =
              Math.sin(ax * 0.005 + waveSpeed) * 55 +
              Math.cos(ax * 0.008 - waveSpeed * 0.5) * 35 +
              canvas.height * (0.18 + cur * 0.12);
            ctx.lineTo(ax, ay);
          }
          ctx.lineTo(canvas.width, 0);
          ctx.closePath();
          const auroraColors = [
            'rgba(52, 211, 153, 0.12)', // emerald
            'rgba(56, 189, 248, 0.15)', // cyan
            'rgba(192, 132, 252, 0.14)', // violet
          ];
          ctx.fillStyle = auroraColors[cur % auroraColors.length];
          ctx.fill();
        }

        // Fast cosmic ray ionization streaks piercing the atmosphere
        cosmicRaysRef.current.forEach((cr) => {
          cr.x += cr.vx;
          cr.y += cr.vy;
          if (cr.y > canvas.height + 50) {
            cr.y = -40;
            cr.x = Math.random() * canvas.width;
          }
          ctx.beginPath();
          ctx.moveTo(cr.x, cr.y);
          ctx.lineTo(cr.x - cr.vx * 1.4, cr.y - cr.vy * 1.4);
          ctx.strokeStyle = cr.color;
          ctx.lineWidth = cr.thickness;
          ctx.globalAlpha = cr.alpha;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        });

        // Electromagnetic CRT telemetry static scanlines
        ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
        for (let sl = 0; sl < canvas.height; sl += 4) {
          ctx.fillRect(0, sl, canvas.width, 1);
        }

        // Coronal radiation pulse wash
        const flarePulse = (Math.sin(time * 4) + 1) * 0.5;
        ctx.fillStyle = `rgba(254, 240, 138, ${0.05 + flarePulse * 0.06})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 5. ENVIRONMENTAL TELEMETRY HUD BADGE (Screen Space, Top-Left)
      const hudBoxX = 18;
      const hudBoxY = 18;
      const hudBoxW = 250;
      const hudBoxH = 68;

      // Theme colors based on active weather condition
      const weatherThemeColor =
        weather.type === 'dust_storm'
          ? '#ef4444'
          : weather.type === 'seismic_tremor'
          ? '#c084fc'
          : weather.type === 'solar_flare'
          ? '#38bdf8'
          : weather.type === 'dust_veil'
          ? '#f59e0b'
          : '#10b981';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(hudBoxX, hudBoxY, hudBoxW, hudBoxH);
      ctx.strokeStyle = weatherThemeColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hudBoxX, hudBoxY, hudBoxW, hudBoxH);

      // Status beacon dot
      const beaconAlpha = (Math.sin(time * 5) + 1) * 0.5;
      ctx.beginPath();
      ctx.arc(hudBoxX + 12, hudBoxY + 14, 4, 0, Math.PI * 2);
      ctx.fillStyle = weatherThemeColor;
      ctx.globalAlpha = 0.5 + beaconAlpha * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Header text
      ctx.font = '700 10px "Chakra Petch", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText('ENVIRONMENTAL SENSOR // MARS', hudBoxX + 22, hudBoxY + 16);

      // Active condition title
      ctx.font = '800 12px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(weather.name.toUpperCase(), hudBoxX + 12, hudBoxY + 34);

      // Scientific telemetry readout line
      ctx.font = '600 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#cbd5e1';
      let telemetryStr = 'PRES: 6.1 MBAR · VIS: 100% · NOMINAL';
      if (weather.type === 'dust_storm') {
        telemetryStr = 'WIND: 84 KM/H · VIS: 18% · 840 PPM';
      } else if (weather.type === 'seismic_tremor') {
        telemetryStr = 'RICHTER: 5.6M · FAULT ACCEL: 0.42G';
      } else if (weather.type === 'dust_veil') {
        telemetryStr = 'OPACITY: 32% · SOLAR: -25% · AEROSOL';
      } else if (weather.type === 'solar_flare') {
        telemetryStr = 'FLUX: X-CLASS 2.8 · RAD: 450 RADS';
      }
      ctx.fillText(telemetryStr, hudBoxX + 12, hudBoxY + 49);

      // Interactive Simulate button indicator
      ctx.font = '700 8px sans-serif';
      ctx.fillStyle = weatherThemeColor;
      ctx.textAlign = 'right';
      ctx.fillText('[CLICK TO CYCLE ⇄]', hudBoxX + hudBoxW - 8, hudBoxY + 61);
      ctx.textAlign = 'left';

      // =====================================================================
      // 14. MINIMAP (Screen Space)
      // =====================================================================
      const mmWidth = 190;
      const mmHeight = 190;
      const mmX = canvas.width - mmWidth - 16;
      const mmY = canvas.height - mmHeight - 16;

      // Minimap theming dynamically responding to Martian diurnal cycle
      const mmBg =
        nightFactor > 0.1
          ? 'rgba(8, 14, 28, 0.93)'
          : morningFactor > 0.1
          ? 'rgba(26, 14, 8, 0.91)'
          : eveningFactor > 0.1
          ? 'rgba(28, 12, 10, 0.91)'
          : 'rgba(14, 10, 9, 0.90)';

      const mmBorder =
        nightFactor > 0.1
          ? '#38bdf8'
          : morningFactor > 0.1
          ? '#f97316'
          : eveningFactor > 0.1
          ? '#f43f5e'
          : '#ea580c';

      ctx.fillStyle = mmBg;
      ctx.fillRect(mmX, mmY, mmWidth, mmHeight);
      ctx.strokeStyle = mmBorder;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mmX, mmY, mmWidth, mmHeight);

      // Sector quadrant crosshair lines
      ctx.strokeStyle = nightFactor > 0.1 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(234, 88, 12, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mmX + mmWidth / 2, mmY);
      ctx.lineTo(mmX + mmWidth / 2, mmY + mmHeight);
      ctx.moveTo(mmX, mmY + mmHeight / 2);
      ctx.lineTo(mmX + mmWidth, mmY + mmHeight / 2);
      ctx.stroke();

      spicePatches.forEach((sp) => {
        if (sp.amount <= 0) return;
        const mx = mmX + (sp.x / WORLD_WIDTH) * mmWidth;
        const my = mmY + (sp.y / WORLD_HEIGHT) * mmHeight;
        ctx.fillStyle = '#d946ef';
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      oreDeposits.forEach((deposit) => {
        if (deposit.depleted) return;
        const depositWorldX = deposit.x * TILE_SIZE + TILE_SIZE / 2;
        const depositWorldY = deposit.y * TILE_SIZE + TILE_SIZE / 2;
        const mx = mmX + (depositWorldX / WORLD_WIDTH) * mmWidth;
        const my = mmY + (depositWorldY / WORLD_HEIGHT) * mmHeight;
        ctx.fillStyle = '#f97316'; // Orange for ore
        ctx.beginPath();
        ctx.arc(mx, my, deposit.size === 'large' ? 3 : deposit.size === 'medium' ? 2 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      modules.forEach((mod) => {
        const mx = mmX + ((mod.x * TILE_SIZE) / WORLD_WIDTH) * mmWidth;
        const my = mmY + ((mod.y * TILE_SIZE) / WORLD_HEIGHT) * mmHeight;
        ctx.fillStyle = mod.type === 'command' ? '#38bdf8' : '#0284c7';
        ctx.fillRect(mx, my, 3.5, 3.5);
      });

      // Minimap Harvester Trails
      harvesters.forEach((h) => {
        if (h.tireHistory && h.tireHistory.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = h.cargo > 5 ? 'rgba(217, 70, 239, 0.4)' : 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 1;
          for (let ti = 0; ti < h.tireHistory.length; ti++) {
            const pt = h.tireHistory[ti];
            const px = mmX + (pt.x / WORLD_WIDTH) * mmWidth;
            const py = mmY + (pt.y / WORLD_HEIGHT) * mmHeight;
            if (ti === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        const mx = mmX + (h.x / WORLD_WIDTH) * mmWidth;
        const my = mmY + (h.y / WORLD_HEIGHT) * mmHeight;

        // Minimap Headlight beam projection at night/twilight
        if (nightFactor > 0.08 || (morningFactor + eveningFactor) > 0.1) {
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(
            mx + Math.cos(h.angle) * (5 + 4 * nightFactor),
            my + Math.sin(h.angle) * (5 + 4 * nightFactor)
          );
          ctx.strokeStyle = nightFactor > 0.08 ? 'rgba(254, 240, 138, 0.85)' : 'rgba(249, 115, 22, 0.7)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draggable Viewport Camera Square
      const camW = (canvas.width / camera.zoom / WORLD_WIDTH) * mmWidth;
      const camH = (canvas.height / camera.zoom / WORLD_HEIGHT) * mmHeight;
      const camX = mmX + (camera.x / WORLD_WIDTH) * mmWidth;
      const camY = mmY + (camera.y / WORLD_HEIGHT) * mmHeight;

      // Soft semi-transparent fill for the draggable camera box
      ctx.fillStyle = isMinimapDraggingRef.current
        ? 'rgba(56, 189, 248, 0.35)'
        : 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(camX, camY, camW, camH);

      // Distinct border with drag highlight
      ctx.strokeStyle = isMinimapDraggingRef.current ? '#38bdf8' : '#ffffff';
      ctx.lineWidth = isMinimapDraggingRef.current ? 2 : 1.2;
      ctx.strokeRect(camX, camY, camW, camH);

      // Sci-fi corner brackets on the square
      const cornerLen = Math.max(3, Math.min(6, camW * 0.25, camH * 0.25));
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(camX, camY + cornerLen);
      ctx.lineTo(camX, camY);
      ctx.lineTo(camX + cornerLen, camY);
      // Top-right
      ctx.moveTo(camX + camW - cornerLen, camY);
      ctx.lineTo(camX + camW, camY);
      ctx.lineTo(camX + camW, camY + cornerLen);
      // Bottom-left
      ctx.moveTo(camX, camY + camH - cornerLen);
      ctx.lineTo(camX, camY + camH);
      ctx.lineTo(camX + cornerLen, camY + camH);
      // Bottom-right
      ctx.moveTo(camX + camW - cornerLen, camY + camH);
      ctx.lineTo(camX + camW, camY + camH);
      ctx.lineTo(camX + camW, camY + camH - cornerLen);
      ctx.stroke();

      // Center crosshair
      ctx.strokeStyle = isMinimapDraggingRef.current ? '#38bdf8' : 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(camX + camW / 2 - 3, camY + camH / 2);
      ctx.lineTo(camX + camW / 2 + 3, camY + camH / 2);
      ctx.moveTo(camX + camW / 2, camY + camH / 2 - 3);
      ctx.lineTo(camX + camW / 2, camY + camH / 2 + 3);
      ctx.stroke();

      ctx.font = '600 8.5px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('TACTICAL ORBITAL MAP', mmX + 6, mmY + 12);

      // Sol Phase badge
      const phaseBadge =
        nightFactor > 0.1
          ? 'NIGHT // BLUE'
          : morningFactor > 0.1
          ? 'MORNING // WARM'
          : eveningFactor > 0.1
          ? 'DUSK // WARM'
          : 'NOON // PEAK';

      const phaseBadgeColor =
        nightFactor > 0.1
          ? '#38bdf8'
          : morningFactor > 0.1
          ? '#fb923c'
          : eveningFactor > 0.1
          ? '#fb7185'
          : '#facc15';

      ctx.textAlign = 'right';
      ctx.fillStyle = phaseBadgeColor;
      ctx.fillText(phaseBadge, mmX + mmWidth - 6, mmY + 12);

      ctx.textAlign = 'left';
      ctx.fillStyle = isMinimapDraggingRef.current ? '#38bdf8' : '#78716c';
      ctx.fillText(
        isMinimapDraggingRef.current ? 'DRAGGING VIEWPORT' : 'DRAG SQUARE TO PAN',
        mmX + 6,
        mmY + mmHeight - 6
      );

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [
    camera,
    terrain,
    modules,
    harvesters,
    spicePatches,
    weather,
    timeOfDay,
    selectedModule,
    selectedHarvester,
    buildPlacingType,
    canAffordPlacing,
    cursorGrid,
    solarTracking,
    spiceCentrifuge,
    hydroRecycler,
    deepWellDrilling,
    stormHardening,
    terraformingGenesis,
  ]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden cursor-default">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      />

      {/* Quick Navigation / Zoom buttons */}
      <div className="absolute left-4 bottom-24 flex flex-col gap-1.5 z-20">
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.min(2.0, prev.zoom * 1.25) }))}
          className="w-10 h-10 bg-stone-900/90 hover:bg-stone-800 text-amber-400 border border-stone-700/80 rounded-md flex items-center justify-center font-bold text-lg shadow-lg active:scale-95 transition-transform"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setCamera((prev) => ({ ...prev, zoom: Math.max(0.3, prev.zoom * 0.8) }))}
          className="w-10 h-10 bg-stone-900/90 hover:bg-stone-800 text-amber-400 border border-stone-700/80 rounded-md flex items-center justify-center font-bold text-lg shadow-lg active:scale-95 transition-transform"
          title="Zoom Out"
        >
          -
        </button>
        <div className="bg-stone-900/90 border border-stone-800 px-1 py-0.5 rounded text-[10px] font-mono text-center text-amber-400/90">
          {Math.round(camera.zoom * 100)}%
        </div>
        <button
          onClick={() =>
            setCamera({
              x: WORLD_WIDTH / 2 - 450,
              y: WORLD_HEIGHT / 2 - 350,
              zoom: 1,
            })
          }
          className="w-10 h-8 bg-stone-900/90 hover:bg-stone-800 text-cyan-400 border border-stone-700/80 rounded-md flex items-center justify-center font-mono text-[10px] font-bold shadow-lg active:scale-95 transition-transform"
          title="Center on Colony Base"
        >
          BASE
        </button>
        <button
          onClick={() =>
            setCamera({
              x: WORLD_WIDTH / 2 - 1200,
              y: WORLD_HEIGHT / 2 - 900,
              zoom: 0.35,
            })
          }
          className="w-10 h-8 bg-stone-900/90 hover:bg-stone-800 text-purple-400 border border-stone-700/80 rounded-md flex items-center justify-center font-mono text-[10px] font-bold shadow-lg active:scale-95 transition-transform"
          title="Orbital Overview (Full Planet Map)"
        >
          ORBIT
        </button>
      </div>

      {/* Building Placement Banner when placing */}
      {buildPlacingType && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-stone-900/95 border-2 border-amber-500 text-amber-200 px-6 py-2.5 rounded-lg shadow-2xl flex items-center gap-4 z-30 animate-pulse">
          <span className="font-title font-semibold tracking-wide text-sm">
            PLACING: {MODULE_BLUEPRINTS[buildPlacingType]?.name.toUpperCase()}
          </span>
          <span className="text-xs text-stone-400 font-mono">
            [Left-Click] Place | [Right-Click / ESC] Cancel
          </span>
          <button
            onClick={onCancelPlacing}
            className="px-2 py-0.5 bg-stone-800 hover:bg-red-900/50 text-red-300 rounded text-xs border border-red-800/60"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};


// ------------------------------------------------------------
// HARVESTER RENDERING HELPERS
// ------------------------------------------------------------

function drawCommandCenter(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  // Design coordinates: 100 × 100.
  // Uniform scaling preserves the building's proportions.
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);

  const c = {
    outline: '#111827',
    wall: '#334155',
    roof: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#38bdf8',
    amber: '#fbbf24',
    cyan: '#38bdf8',
    glass: '#164e63'
  };

  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    ctx.strokeStyle = c.outline;
    ctx.beginPath();
    for (let offset = 2; offset < h; offset += 2) {
      ctx.moveTo(x + 1, y + offset);
      ctx.lineTo(x + w - 1, y + offset);
    }
    ctx.stroke();
  }

  function wing(x: number) {
    // Vertical wall beneath the roof.
    box(x, 43, 23, 31, c.wall);
    box(x, 37, 23, 25, c.roof);

    line(
      [[x + 1, 60], [x + 1, 38], [x + 22, 38]],
      c.highlight
    );

    // Roof panels, ventilation, and corner armor.
    line([[x + 2, 51], [x + 21, 51]], '#64748b');
    vent(x + 6, 41, 11, 7);
    box(x, 37, 4, 5, c.accent);
    box(x + 19, 37, 4, 5, c.accent);

    // South-facing control windows.
    light(x + 3, 64, 7, 5);
    light(x + 13, 64, 7, 5);
    box(x + 1, 71, 4, 3, c.accent);
    box(x + 18, 71, 4, 3, c.accent);
  }

  // Rear communications mast.
  box(46, 23, 8, 13, c.wall);
  box(49, 7, 2, 20, c.roof);
  light(48, 5, 4, 4, c.amber);
  line([[50, 15], [59, 15]], c.roof, 2);
  box(58, 11, 2, 8, c.accent);

  // Wing connections, behind the main structures.
  box(28, 48, 44, 13, c.wall);
  light(29, 51, 8, 4);
  light(63, 51, 8, 4);

  wing(8);
  wing(69);

  // Central drum: front wall beneath the dome.
  box(29, 48, 42, 17, c.wall);
  ellipse(50, 64, 21, 8, c.wall);
  ellipse(50, 49, 23, 11, c.accent);
  ellipse(50, 49, 21, 9, c.roof);

  // Raised glass dome.
  const glass = ctx.createLinearGradient(0, 28, 0, 53);
  glass.addColorStop(0, '#a5f3fc');
  glass.addColorStop(0.45, '#0891b2');
  glass.addColorStop(1, c.glass);

  ctx.beginPath();
  ctx.moveTo(29, 48);
  ctx.bezierCurveTo(29, 19, 71, 19, 71, 48);
  ctx.bezierCurveTo(65, 57, 35, 57, 29, 48);
  ctx.closePath();
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;

  // Dome ribs follow the curved roof.
  ctx.strokeStyle = c.wall;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(50, 29);
  ctx.bezierCurveTo(41, 34, 37, 44, 37, 52);
  ctx.moveTo(50, 29);
  ctx.lineTo(50, 54);
  ctx.moveTo(50, 29);
  ctx.bezierCurveTo(59, 34, 63, 44, 63, 52);
  ctx.moveTo(32, 39);
  ctx.bezierCurveTo(42, 44, 58, 44, 68, 39);
  ctx.stroke();
  ctx.lineWidth = 1;

  // Armored dome cap.
  ellipse(50, 29, 7, 4, c.accent);
  ellipse(50, 28, 5, 2.5, c.roof);

  // Rotating search radar on the dome.
  box(48.6, 24, 2.8, 5, c.roof);
  ellipse(50, 28.5, 3.4, 1.5, c.wall);
  ctx.save();
  ctx.translate(50, 26);
  ctx.scale(1, 0.55);
  ctx.rotate(timeMs * 0.001);
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = c.accent;
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#0c4a6e';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 6, -0.7, 0.15);
  ctx.closePath();
  ctx.fillStyle = 'rgba(165, 243, 252, 0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 6, -0.18, 0.18);
  ctx.closePath();
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(7.2, 0);
  ctx.strokeStyle = c.highlight;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(7.2, 0, 1, 0, Math.PI * 2);
  ctx.fillStyle = c.amber;
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
  ellipse(50, 26, 1.3, 0.7, c.highlight);

  // Front wall accents.
  light(32, 58, 8, 3, c.amber);
  light(60, 58, 8, 3, c.amber);
  line([[30, 65], [39, 69]], c.roof);
  line([[61, 69], [70, 65]], c.roof);

  // Entrance block and roof.
  box(39, 66, 22, 20, c.wall);
  box(38, 64, 24, 9, c.roof);
  box(38, 64, 4, 9, c.accent);
  box(58, 64, 4, 9, c.accent);
  light(44, 67, 12, 4);

  // Recessed airlock.
  box(43, 75, 14, 12, c.outline);
  box(45, 76, 10, 10, c.glass);
  light(47, 78, 6, 6);
  line([[50, 77], [50, 85]], '#cffafe');

  // Entrance steps.
  box(41, 87, 18, 7, c.wall);
  line([[42, 89], [58, 89]], c.roof);
  line([[42, 92], [58, 92]], c.roof);
  box(39, 86, 2, 8, c.accent);
  box(59, 86, 2, 8, c.accent);

  ctx.restore();
}
function drawSolarArray(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, time: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#fbbf24',
    cyan: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function polygon(points: number[][], fill: string | CanvasGradient | CanvasPattern) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function panel(x: number, y: number) {
    // Feet and support struts beneath the panel.
    for (const offset of [5, 19]) {
      box(x + offset, y + 20, 3, 8, c.wall);
      box(x + offset - 1, y + 26, 5, 3, c.accent);
    }

    // Visible south-facing frame thickness.
    polygon([
      [x, y + 24],
      [x + 26, y + 24],
      [x + 26, y + 27],
      [x, y + 27]
    ], c.wall);

    // Slightly tilted trapezoidal panel frame.
    polygon([
      [x + 2, y],
      [x + 24, y],
      [x + 26, y + 24],
      [x, y + 24]
    ], c.metal);

    const cells = [
      [x + 4, y + 2],
      [x + 22, y + 2],
      [x + 24, y + 22],
      [x + 2, y + 22]
    ];

    const glass = ctx.createLinearGradient(x, y, x + 26, y + 24);
    glass.addColorStop(0, '#0e7490');
    glass.addColorStop(0.45, '#0369a1');
    glass.addColorStop(1, '#172554');

    polygon(cells, glass);

    // Clip cell lines and reflections to the glass.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cells[0][0], cells[0][1]);
    for (let i = 1; i < cells.length; i++) {
      ctx.lineTo(cells[i][0], cells[i][1]);
    }
    ctx.closePath();
    ctx.clip();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 0.55;
    ctx.beginPath();

    // Grid follows the widening panel perspective.
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      ctx.moveTo(x + 4 + 18 * t, y + 2);
      ctx.lineTo(x + 2 + 22 * t, y + 22);
    }

    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      ctx.moveTo(x + 4 - 2 * t, y + 2 + 20 * t);
      ctx.lineTo(x + 22 + 2 * t, y + 2 + 20 * t);
    }

    ctx.stroke();

    ctx.fillStyle = 'rgba(165, 243, 252, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 2);
    ctx.lineTo(x + 12, y + 2);
    ctx.lineTo(x + 3, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    line([[x + 3, y + 1], [x + 23, y + 1]], c.highlight);
    box(x + 1, y + 21, 3, 3, c.accent);
    box(x + 22, y + 21, 3, 3, c.accent);
  }

  // Connected support rails behind the panels.
  box(9, 34, 82, 4, c.wall);
  box(9, 69, 82, 4, c.wall);

  // Power conduit leading to the south-side controller.
  const cable = [[50, 36], [50, 78]];
  line(cable, c.outline, 5);
  line(cable, c.metal, 3);

  // Draw rear row first for correct overlap.
  for (const y of [12, 47]) {
    for (const x of [8, 37, 66]) {
      panel(x, y);
    }
  }

  // Compact power management unit.
  box(38, 79, 24, 13, c.wall);
  box(38, 76, 24, 5, c.metal);
  box(38, 76, 4, 5, c.accent);
  box(58, 76, 4, 5, c.accent);
  light(43, 82, 14, 6);

  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(45 + i * 2.5, 86 - i * 0.7, 1.5, 1 + i * 0.7);
  }

  line([[44, 90], [56, 90]], c.metal);
  ctx.restore();
}

function drawSunTrackingGimbal(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  sunAngle: number = 0,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;
  ctx.save();
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const outline = '#111827';
  const orange = '#fbbf24';
  const cyan = '#fbbf24';
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
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }
  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
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
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // Fixed pedestal shadow.
  oval(50, 61, 28, 22, 'rgba(0, 0, 0, 0.25)', false);
  // Four reinforced mounting feet.
  for (const [x, y] of [
    [29, 29], [64, 29], [29, 64], [64, 64]
  ]) {
    box(x, y + 3, 7, 7, '#334155');
    box(x, y, 7, 7, '#94a3b8');
    box(x + 2, y + 2, 3, 3, '#475569');
  }
  // Diagonal foundation braces.
  line(33, 33, 50, 50, outline, 7);
  line(67, 33, 50, 50, outline, 7);
  line(33, 67, 50, 50, outline, 7);
  line(67, 67, 50, 50, outline, 7);
  line(33, 33, 50, 50, '#64748b', 4);
  line(67, 33, 50, 50, '#64748b', 4);
  line(33, 67, 50, 50, '#64748b', 4);
  line(67, 67, 50, 50, '#64748b', 4);
  // Circular pedestal with visible south-facing depth.
  oval(50, 56, 20, 17, '#334155');
  oval(50, 51, 20, 17, '#64748b');
  oval(50, 51, 15, 12, '#94a3b8');
  oval(50, 51, 10, 8, '#475569');
  // Fixed status display.
  box(43, 64, 14, 6, outline);
  box(45, 65.5, 10, 3, cyan, false);
  // Power cable to a fixed service cabinet.
  line(63, 61, 74, 70, outline, 4);
  line(74, 70, 80, 70, outline, 4);
  line(63, 61, 74, 70, '#64748b', 2);
  line(74, 70, 80, 70, '#64748b', 2);
  box(77, 65, 13, 15, '#334155');
  box(77, 63, 13, 13, '#94a3b8');
  box(80, 66, 7, 4, '#164e63');
  line(81, 68, 86, 68, cyan, 1);
  for (const y of [72, 74]) {
    line(80, y, 87, y, '#475569', 0.7);
  }
  // Rotating gimbal assembly.
  // Local +X points toward the sun.
  ctx.save();
  ctx.translate(50, 47);
  ctx.rotate(sunAngle);
  // Rotating bearing.
  oval(0, 0, 11, 11, '#334155');
  oval(0, 0, 8, 8, '#cbd5e1');
  oval(0, 0, 5, 5, '#475569');
  // Orange bearing markers.
  box(-1, -10, 2, 4, orange, false);
  box(-1, 6, 2, 4, orange, false);
  // Fork arms supporting the panel.
  box(-8, -23, 6, 46, '#475569');
  box(-7, -22, 3, 44, orange, false);
  // Cross-axis hinge.
  line(0, -27, 0, 27, outline, 5);
  line(0, -27, 0, 27, '#94a3b8', 3);
  // Tilt actuator on the rear side.
  line(-16, 0, -5, 0, outline, 4);
  line(-16, 0, -5, 0, '#cbd5e1', 2);
  box(-19, -4, 7, 8, '#64748b');
  box(-18, -3, 2, 6, orange, false);
  // Panel underside gives the array thickness.
  polygon(
    [
      [-17, -27], [17, -27], [20, -24],
      [20, 30], [-14, 30], [-17, 27]
    ],
    '#334155'
  );
  // Main metal frame.
  box(-18, -29, 36, 58, '#94a3b8');
  box(-16, -27, 32, 54, '#111827');
  // Six blue photovoltaic sections.
  for (let column = 0; column < 2; column++) {
    for (let row = 0; row < 3; row++) {
      const x = -14 + column * 15;
      const y = -25 + row * 17;
      box(x, y, 13, 15, '#164e63');
      // Solar cell grid.
      for (let cellX = 1; cellX < 4; cellX++) {
        line(
          x + cellX * 3.25,
          y + 0.5,
          x + cellX * 3.25,
          y + 14.5,
          '#60a5fa',
          0.35
        );
      }
      for (let cellY = 1; cellY < 5; cellY++) {
        line(
          x + 0.5,
          y + cellY * 3,
          x + 12.5,
          y + cellY * 3,
          '#60a5fa',
          0.35
        );
      }
      // Subtle surface highlight.
      line(x + 1, y + 1, x + 11, y + 1, '#93c5fd', 0.6);
    }
  }
  // Frame highlights and structural center rail.
  line(-18, -29, 18, -29, '#e2e8f0', 1);
  line(-18, -29, -18, 29, '#cbd5e1', 1);
  box(-1, -27, 2, 54, '#64748b', false);
  // Hinge caps remain visible beyond the panel edges.
  oval(0, -31, 4, 2.5, '#64748b');
  oval(0, 31, 4, 2.5, '#64748b');
  oval(0, -31, 1.5, 1.2, orange, false);
  oval(0, 31, 1.5, 1.2, orange, false);
  // Sun-direction sensor on the forward edge.
  box(18, -3, 5, 6, '#475569');
  box(20, -1.5, 2, 3, '#fbbf24', false);
  ctx.restore();
  // Fixed cabinet indicator.
  const pulse = 0.65 + Math.sin(timeMs * 0.004) * 0.35;
  ctx.fillStyle = `rgba(34, 211, 238, ${pulse})`;
  ctx.fillRect(85, 64, 2, 1);
  ctx.restore();
}

function drawHighDensitySpiceRefinement(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;
  ctx.save();
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const outline = '#111827';
  const orange = '#f97316';
  const cyan = '#f97316';
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
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }
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
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function pipe(points: number[][]) {
    ctx.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4.5;
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  function vent(x: number, y: number, width: number) {
    box(x, y, width, 6, '#334155');
    for (let offset = 2; offset < width - 1; offset += 3) {
      line(x + offset, y + 1, x + offset, y + 5, outline, 0.8);
    }
  }
  function chamber(x: number, y: number, phase: number) {
    // Cylinder body and lower mounting ring.
    oval(x, y + 21, 9, 5, '#334155');
    box(x - 9, y, 18, 21, '#64748b');
    oval(x, y + 20, 9, 4, '#475569');
    // Amber containment window.
    box(x - 6.5, y + 3, 13, 13, '#78350f');
    box(x - 5, y + 4, 10, 11, '#d97706', false);
    // Subtle processing pulse.
    const pulse = 0.15 + (Math.sin(timeMs * 0.003 + phase) + 1) * 0.12;
    box(
      x - 5,
      y + 4,
      10,
      11,
      `rgba(251, 191, 36, ${pulse})`,
      false
    );
    // Glass reflection.
    box(x - 4, y + 5, 1.5, 8, '#fde68a', false);
    // Steel retaining bands.
    box(x - 9, y + 1, 18, 2, '#94a3b8');
    box(x - 9, y + 16, 18, 2, '#94a3b8');
    // Top cap.
    oval(x, y, 9, 4, '#94a3b8');
    oval(x, y - 0.5, 6, 2.5, '#475569');
    oval(x, y - 0.5, 3, 1.3, '#334155');
    // Front status panel.
    box(x - 3, y + 19, 6, 6, outline);
    box(x - 2, y + 20, 4, 3, cyan, false);
  }
  // Building shadow and raised industrial deck.
  box(9, 17, 84, 76, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 13, 86, 76, '#334155');
  box(7, 13, 86, 70, '#64748b');
  box(11, 17, 78, 62, '#475569');
  // Deck seams.
  for (const x of [30, 50, 70]) {
    line(x, 18, x, 78, '#64748b', 0.6);
  }
  for (const y of [37, 58]) {
    line(12, y, 88, y, '#64748b', 0.6);
  }
  // Rear transfer manifold.
  pipe([[18, 27], [18, 19], [82, 19], [82, 27]]);
  pipe([[50, 19], [50, 30]]);
  // Side feed lines.
  pipe([[17, 40], [13, 40], [13, 64], [23, 64]]);
  pipe([[83, 40], [87, 40], [87, 64], [77, 64]]);
  // Rear pair of processing chambers.
  chamber(25, 27, 0);
  chamber(75, 27, 1.5);
  // Central separator tower base.
  box(37, 38, 26, 31, '#334155');
  box(39, 35, 22, 29, '#94a3b8');
  box(42, 39, 16, 21, '#475569');
  // Orange reinforced tower edges.
  box(39, 39, 3, 22, orange);
  box(58, 39, 3, 22, orange);
  // Vertical concentration chamber.
  box(45, 39, 10, 17, '#78350f');
  box(47, 40, 6, 15, '#f59e0b', false);
  box(47, 41, 1.2, 11, '#fef3c7', false);
  // Tower cap and circular separator motor.
  oval(50, 35, 12, 6, '#cbd5e1');
  oval(50, 34, 9, 4.5, '#64748b');
  oval(50, 34, 5, 2.8, '#334155');
  oval(50, 34, 2, 1.2, orange, false);
  box(44, 59, 12, 5, outline);
  box(46, 60, 8, 2.5, cyan, false);
  // Pipes from separator to the front chambers.
  pipe([[40, 56], [33, 56], [33, 60], [25, 60]]);
  pipe([[60, 56], [67, 56], [67, 60], [75, 60]]);
  // Front pair of processing chambers.
  chamber(25, 57, 3);
  chamber(75, 57, 4.5);
  // Central output conduit.
  pipe([[50, 65], [50, 76], [50, 82]]);
  // Product loading outlet.
  box(37, 79, 26, 15, '#334155');
  box(37, 76, 26, 13, '#94a3b8');
  box(41, 79, 18, 8, outline);
  box(43, 80, 14, 6, '#292524', false);
  // Conveyor rollers.
  for (const x of [44, 47, 50, 53, 56]) {
    line(x, 81, x, 85, '#64748b', 0.7);
  }
  // Refined spice cargo container.
  box(47, 80, 6, 5, '#b45309');
  line(48, 81, 52, 81, '#fbbf24', 0.8);
  // Loading bay hazard trim.
  for (let x = 39; x < 61; x += 5) {
    box(x, 88, 2.5, 2, orange, false);
  }
  // Rear cooling units.
  vent(35, 21, 12);
  vent(53, 21, 12);
  // Small control cabinet.
  box(9, 71, 11, 13, '#334155');
  box(9, 69, 11, 11, '#94a3b8');
  box(11, 71, 7, 4, '#164e63');
  line(12, 73, 17, 73, cyan, 0.8);
  box(16, 77, 2, 1.5, orange, false);
  // Perimeter guide lights.
  for (const x of [10, 87]) {
    box(x, 15, 3, 5, outline);
    box(x + 0.7, 16, 1.6, 3, cyan, false);
  }
  // South-facing deck trim.
  line(9, 84, 35, 84, '#94a3b8', 1);
  line(65, 84, 91, 84, '#94a3b8', 1);
  ctx.restore();
}

function drawClosedLoopMoistureReclamation(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;
  ctx.save();
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const outline = '#111827';
  const cyan = '#22d3ee';
  const orange = '#22d3ee';
  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }
  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function line(
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function pipe(points: number[][], inner = '#94a3b8') {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = inner;
    ctx.lineWidth = 2.8;
    ctx.stroke();
  }
  function valve(x: number, y: number) {
    oval(x, y, 3, 3, '#475569');
    oval(x, y, 1.7, 1.7, orange);
    line(x - 1.4, y, x + 1.4, y, '#fed7aa', 0.7);
    line(x, y - 1.4, x, y + 1.4, '#fed7aa', 0.7);
  }
  function tank(x: number, y: number, phase: number) {
    // Feet and lower cylinder rim.
    box(x - 9, y + 27, 5, 8, '#334155');
    box(x + 4, y + 27, 5, 8, '#334155');
    oval(x, y + 28, 12, 5, '#334155');
    // Steel cylinder.
    box(x - 12, y, 24, 28, '#64748b');
    box(x - 10, y + 2, 4, 23, '#94a3b8', false);
    oval(x, y + 27, 12, 4, '#475569');
    // Water inspection window.
    box(x - 5, y + 5, 10, 17, outline);
    box(x - 4, y + 6, 8, 15, '#164e63', false);
    box(x - 4, y + 11, 8, 10, '#0891b2', false);
    box(x - 3, y + 7, 1.3, 12, '#a5f3fc', false);
    // Animated water surface within the window.
    const surface = y + 11 + Math.sin(timeMs * 0.002 + phase) * 0.6;
    line(x - 3.5, surface, x + 3.5, surface, '#67e8f9', 0.8);
    // Retaining bands.
    box(x - 12, y + 3, 24, 2, '#cbd5e1');
    box(x - 12, y + 23, 24, 2, '#94a3b8');
    // Top lid and inlet.
    oval(x, y, 12, 5, '#cbd5e1');
    oval(x, y - 0.5, 8, 3.3, '#64748b');
    oval(x, y - 0.5, 3, 1.5, '#334155');
    // Status indicator.
    box(x - 3, y + 27, 6, 5, outline);
    box(x - 2, y + 28, 4, 2, cyan, false);
  }
  // Raised equipment deck.
  box(9, 19, 84, 72, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 15, 86, 72, '#334155');
  box(7, 15, 86, 66, '#64748b');
  box(11, 19, 78, 58, '#475569');
  // Deck seams.
  for (const x of [30, 50, 70]) {
    line(x, 20, x, 76, '#64748b', 0.6);
  }
  for (const y of [39, 59]) {
    line(12, y, 88, y, '#64748b', 0.6);
  }
  // Closed return circuit, behind the equipment.
  pipe([
    [25, 29], [25, 21], [77, 21],
    [86, 30], [86, 69], [77, 78],
    [23, 78], [14, 69], [14, 42], [25, 42]
  ]);
  // Cyan pipe collars.
  box(46, 18.5, 7, 5, '#164e63');
  box(48, 19.5, 3, 3, cyan, false);
  box(82.5, 51, 7, 6, '#164e63');
  box(84, 52, 4, 4, cyan, false);
  // Tank connections.
  pipe([[37, 49], [43, 49]]);
  pipe([[57, 49], [63, 49]]);
  pipe([[50, 65], [50, 78]], '#67e8f9');
  // Twin recovery tanks.
  tank(25, 34, 0);
  tank(75, 34, Math.PI);
  // Central condenser housing.
  box(39, 33, 22, 35, '#334155');
  box(39, 29, 22, 34, '#94a3b8');
  box(42, 33, 16, 25, '#475569');
  // Condenser fin stack.
  for (let y = 34; y <= 49; y += 3) {
    box(42, y, 16, 1.5, '#cbd5e1');
  }
  // Orange reinforced side rails.
  box(39, 33, 2.5, 24, orange);
  box(58.5, 33, 2.5, 24, orange);
  // Roof fan with slow rotation.
  oval(50, 29, 9, 6, '#334155');
  oval(50, 29, 7, 4.5, '#1e293b');
  ctx.save();
  ctx.translate(50, 29);
  ctx.scale(1, 0.64);
  ctx.rotate(timeMs * 0.0015);
  for (let blade = 0; blade < 4; blade++) {
    ctx.save();
    ctx.rotate(blade * Math.PI / 2);
    box(1, -1, 5, 2, '#94a3b8', false);
    ctx.restore();
  }
  ctx.restore();
  oval(50, 29, 2, 1.3, orange);
  // Condensate collector beneath the fins.
  box(44, 52, 12, 7, outline);
  box(46, 53, 8, 4, '#0891b2', false);
  line(47, 54, 53, 54, '#a5f3fc', 0.7);
  // Front circulation pump.
  box(40, 70, 20, 10, '#334155');
  box(42, 68, 16, 10, '#94a3b8');
  oval(50, 73, 5, 4, '#475569');
  oval(50, 73, 2.5, 2, '#164e63');
  oval(50, 73, 1.2, 1, cyan, false);
  // Isolation valves.
  valve(35, 21);
  valve(86, 64);
  valve(25, 78);
  // Front control cabinet.
  box(65, 73, 17, 16, '#334155');
  box(65, 70, 17, 14, '#94a3b8');
  box(68, 73, 11, 5, outline);
  box(69, 74, 9, 3, '#164e63', false);
  line(70, 75.5, 76, 75.5, cyan, 0.8);
  box(68, 80, 2, 2, '#22c55e', false);
  box(72, 80, 2, 2, orange, false);
  // Front maintenance hatch.
  box(20, 74, 13, 10, '#64748b');
  box(22, 76, 9, 6, '#475569');
  line(25, 79, 28, 79, '#cbd5e1', 0.8);
  // South-facing deck trim and hazard markings.
  line(9, 83, 63, 83, '#94a3b8', 1);
  line(84, 83, 91, 83, '#94a3b8', 1);
  for (const x of [9, 86]) {
    box(x, 16, 5, 3, orange);
    box(x + 1, 17, 3, 1, '#fed7aa', false);
  }
  ctx.restore();
}

function drawSubPermafrostThermalWells(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;
  ctx.save();
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const outline = '#111827';
  const orange = '#ea580c';
  const cyan = '#22d3ee';
  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }
  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function line(
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function pipe(points: number[][], color: string) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  function wellhead(x: number, y: number, phase: number) {
    // Reinforced bore collar.
    oval(x, y + 7, 13, 10, '#334155');
    oval(x, y + 4, 13, 10, '#94a3b8');
    oval(x, y + 4, 10, 7.5, '#475569');
    oval(x, y + 4, 7, 5.5, '#1e293b');
    // Insulated vertical riser.
    box(x - 6, y - 10, 12, 15, '#64748b');
    box(x - 5, y - 9, 3, 13, '#cbd5e1', false);
    box(x + 3, y - 9, 2, 13, '#334155', false);
    // Thermal inspection slit.
    box(x - 1, y - 7, 3, 9, outline);
    const intensity = 0.65 + Math.sin(timeMs * 0.003 + phase) * 0.2;
    box(
      x - 0.4, y - 6, 1.8, 7,
      `rgba(251, 146, 60, ${intensity})`,
      false
    );
    // Insulation bands.
    box(x - 6, y - 8, 12, 2, '#94a3b8');
    box(x - 6, y + 1, 12, 2, '#94a3b8');
    // Pressure cap and valve wheel.
    oval(x, y - 10, 7, 3.5, '#cbd5e1');
    oval(x, y - 10, 4, 2, '#475569');
    line(x, y - 11, x, y - 15, '#94a3b8', 1.5);
    oval(x, y - 16, 4, 2, orange);
    line(x - 3, y - 16, x + 3, y - 16, '#fed7aa', 0.7);
    // Collar bolts.
    for (const offset of [-9, 9]) {
      oval(x + offset, y + 4, 1.1, 0.8, '#cbd5e1', false);
    }
    // Monitoring tab.
    box(x - 3, y + 10, 6, 4, outline);
    box(x - 2, y + 11, 4, 1.5, cyan, false);
  }
  // Raised foundation.
  box(9, 18, 84, 74, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 14, 86, 74, '#334155');
  box(7, 14, 86, 68, '#64748b');
  box(11, 18, 78, 60, '#475569');
  // Deck panel seams.
  for (const x of [30, 50, 70]) {
    line(x, 19, x, 77, '#64748b', 0.6);
  }
  for (const y of [39, 59]) {
    line(12, y, 88, y, '#64748b', 0.6);
  }
  // Frost along the outer deck edges.
  line(14, 19, 28, 19, '#bae6fd', 1.4);
  line(71, 19, 85, 19, '#bae6fd', 1.4);
  line(12, 53, 12, 69, '#bae6fd', 1.2);
  line(88, 53, 88, 69, '#bae6fd', 1.2);
  // Hot supply manifold.
  pipe([[24, 37], [24, 49], [76, 49], [76, 37]], orange);
  pipe([[50, 34], [50, 49], [50, 57]], orange);
  // Cool return manifold.
  pipe([
    [16, 40], [16, 72], [84, 72], [84, 40]
  ], '#0891b2');
  pipe([[57, 67], [57, 72]], '#0891b2');
  // Rear wellheads.
  wellhead(24, 35, 0);
  wellhead(50, 30, 2);
  wellhead(76, 35, 4);
  // Insulated pipe collars.
  for (const x of [34, 64]) {
    box(x, 46, 4, 6, '#94a3b8');
    box(x + 1, 47, 2, 4, orange, false);
  }
  // Heat exchanger lower housing.
  box(32, 60, 36, 18, '#334155');
  box(32, 55, 36, 18, '#94a3b8');
  box(35, 58, 30, 12, '#475569');
  // Dense exchanger fins.
  for (let x = 37; x <= 63; x += 3) {
    box(x, 59, 1.5, 10, '#cbd5e1', false);
  }
  // Orange end caps and reinforcement.
  box(32, 58, 3, 12, orange);
  box(65, 58, 3, 12, orange);
  line(36, 56, 64, 56, '#e2e8f0', 1);
  // Front temperature display.
  box(43, 72, 14, 5, outline);
  box(45, 73, 10, 2.5, '#164e63', false);
  line(46, 74, 49, 74, cyan, 0.8);
  line(51, 74, 54, 74, '#fb923c', 0.8);
  // Small circulation pump.
  pipe([[68, 64], [75, 64], [75, 72]], '#0891b2');
  oval(75, 64, 5, 4, '#334155');
  oval(75, 63, 4, 3, '#94a3b8');
  oval(75, 63, 1.5, 1.2, cyan, false);
  // Front service cabinet.
  box(13, 75, 15, 14, '#334155');
  box(13, 72, 15, 13, '#94a3b8');
  box(16, 75, 9, 5, outline);
  box(17, 76, 7, 3, '#164e63', false);
  line(18, 77, 23, 77, cyan, 0.8);
  box(16, 82, 2, 1.5, orange, false);
  // Thermal output connection.
  pipe([[50, 78], [50, 87]], orange);
  box(44, 83, 12, 10, '#475569');
  box(46, 84, 8, 7, '#94a3b8');
  box(48, 85, 4, 5, '#b45309');
  line(49, 86, 49, 89, '#fbbf24', 0.8);
  // Hazard markings on the south edge.
  for (const x of [33, 39, 59, 65, 71, 77]) {
    box(x, 83, 3, 2, orange, false);
  }
  // Fixed perimeter lights.
  for (const x of [9, 87]) {
    box(x, 16, 3, 5, outline);
    box(x + 0.7, 17, 1.6, 3, cyan, false);
  }
  ctx.restore();
}

function drawElectrostaticDustDeflectors(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;
  ctx.save();
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const outline = '#111827';
  const cyan = '#38bdf8';
  const orange = '#38bdf8';
  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }
  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function line(
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function cable(points: number[][]) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  function pylon(x: number, y: number, phase: number) {
    // Mounting plinth with visible front depth.
    box(x - 8, y + 3, 16, 8, '#334155');
    box(x - 8, y, 16, 7, '#94a3b8');
    box(x - 5, y + 1, 10, 4, '#475569');
    // Insulated emitter mast.
    box(x - 3, y - 18, 6, 21, '#64748b');
    box(x - 2, y - 17, 1.5, 19, '#cbd5e1', false);
    // Ceramic insulation rings.
    for (const offset of [-14, -10, -6]) {
      oval(x, y + offset, 5, 2, '#94a3b8');
      line(
        x - 3.5, y + offset - 0.5,
        x + 3.5, y + offset - 0.5,
        '#e2e8f0', 0.6
      );
    }
    // Orange base collar.
    box(x - 4, y - 2, 8, 3, orange);
    // Emitter head.
    oval(x, y - 20, 7, 4, '#334155');
    oval(x, y - 22, 7, 4, '#94a3b8');
    oval(x, y - 22, 4.5, 2.5, '#164e63');
    const pulse = 0.65 + Math.sin(timeMs * 0.004 + phase) * 0.25;
    oval(
      x, y - 22, 2.5, 1.4,
      `rgba(103, 232, 249, ${pulse})`,
      false
    );
    // Small status panel.
    box(x - 2, y + 3, 4, 3, outline);
    box(x - 1.3, y + 3.7, 2.6, 1.3, cyan, false);
  }
  function fieldArc(
    x1: number, y1: number,
    cx: number, cy: number,
    x2: number, y2: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  }
  // Reinforced equipment deck.
  box(9, 23, 84, 68, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 19, 86, 68, '#334155');
  box(7, 19, 86, 62, '#64748b');
  box(11, 23, 78, 54, '#475569');
  // Deck seams.
  for (const x of [30, 50, 70]) {
    line(x, 24, x, 76, '#64748b', 0.6);
  }
  for (const y of [41, 59]) {
    line(12, y, 88, y, '#64748b', 0.6);
  }
  // Power conduits beneath the pylons and generator.
  cable([[24, 35], [24, 49], [42, 49]]);
  cable([[76, 35], [76, 49], [58, 49]]);
  cable([[24, 70], [35, 70], [35, 60], [42, 60]]);
  cable([[76, 70], [65, 70], [65, 60], [58, 60]]);
  // Rear emitter pair.
  pylon(24, 35, 0);
  pylon(76, 35, Math.PI);
  // Central high-voltage generator.
  box(37, 46, 26, 23, '#334155');
  box(37, 41, 26, 23, '#94a3b8');
  box(40, 45, 20, 15, '#475569');
  // Capacitor banks.
  for (const x of [44, 56]) {
    box(x - 3, 46, 6, 11, '#334155');
    oval(x, 46, 3, 1.8, '#cbd5e1');
    box(x - 1, 48, 2, 7, cyan, false);
    oval(x, 57, 3, 1.5, '#64748b');
  }
  // Orange armored sides.
  box(37, 45, 2.5, 15, orange);
  box(60.5, 45, 2.5, 15, orange);
  // Top cooling grille.
  box(42, 41, 16, 3, outline);
  for (let x = 44; x <= 56; x += 3) {
    line(x, 41.5, x, 43.5, '#94a3b8', 0.7);
  }
  // Front power display.
  box(43, 61, 14, 5, outline);
  box(45, 62, 10, 2.5, '#164e63', false);
  line(46, 63, 54, 63, cyan, 0.8);
  // Front emitter pair.
  pylon(24, 70, 1);
  pylon(76, 70, 3);
  // Field arcs between emitter heads.
  ctx.save();
  const fieldPulse = 0.2 + (Math.sin(timeMs * 0.003) + 1) * 0.1;
  ctx.strokeStyle = `rgba(34, 211, 238, ${fieldPulse})`;
  ctx.lineWidth = 3;
  fieldArc(24, 13, 50, 5, 76, 13);
  fieldArc(24, 13, 13, 30, 24, 48);
  fieldArc(76, 13, 87, 30, 76, 48);
  fieldArc(24, 48, 50, 57, 76, 48);
  // Narrow moving dashes suggest electrical flow.
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.65)';
  ctx.lineWidth = 0.7;
  ctx.setLineDash([2, 8]);
  ctx.lineDashOffset = -timeMs * 0.012;
  fieldArc(24, 13, 50, 5, 76, 13);
  fieldArc(24, 13, 13, 30, 24, 48);
  fieldArc(76, 13, 87, 30, 76, 48);
  fieldArc(24, 48, 50, 57, 76, 48);
  ctx.restore();
  // Front maintenance console.
  box(41, 76, 18, 14, '#334155');
  box(41, 73, 18, 13, '#94a3b8');
  box(44, 76, 12, 5, outline);
  box(45, 77, 10, 3, '#164e63', false);
  line(46, 78, 53, 78, cyan, 0.8);
  box(44, 83, 2, 1.5, orange, false);
  // South edge hazard markings.
  for (const x of [10, 16, 22, 70, 76, 82]) {
    box(x, 83, 3, 2, orange, false);
  }
  ctx.restore();
}

function drawAtmosphericGenesisEngine(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;
  ctx.save();
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);
  const outline = '#111827';
  const cyan = '#22d3ee';
  const orange = '#22d3ee';
  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }
  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function line(
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function pipe(points: number[][], color = '#94a3b8') {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  function tower(x: number, y: number) {
    // Mount and cylinder body.
    oval(x, y + 27, 10, 5, '#334155');
    box(x - 10, y, 20, 27, '#64748b');
    box(x - 8, y + 2, 3, 22, '#94a3b8', false);
    oval(x, y + 26, 10, 4, '#475569');
    // Gas chamber.
    box(x - 4, y + 5, 8, 15, outline);
    box(x - 3, y + 6, 6, 13, '#164e63', false);
    box(x - 2, y + 7, 1.2, 10, '#a5f3fc', false);
    // Reinforcement bands.
    box(x - 10, y + 2, 20, 2, '#cbd5e1');
    box(x - 10, y + 21, 20, 2, '#94a3b8');
    // Pressure cap.
    oval(x, y, 10, 4, '#cbd5e1');
    oval(x, y - 0.5, 6.5, 2.5, '#475569');
    oval(x, y - 0.5, 2.5, 1.2, orange, false);
    // Status panel.
    box(x - 3, y + 25, 6, 5, outline);
    box(x - 2, y + 26, 4, 2, cyan, false);
  }
  function fan(x: number, y: number, phase: number) {
    oval(x, y, 6, 4, '#334155');
    oval(x, y, 4.8, 3.2, outline);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.67);
    ctx.rotate(timeMs * 0.002 + phase);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 2);
      box(1, -0.8, 3.3, 1.6, '#94a3b8', false);
      ctx.restore();
    }
    ctx.restore();
    oval(x, y, 1.3, 0.9, orange, false);
  }
  // Raised industrial deck.
  box(9, 20, 84, 72, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 16, 86, 72, '#334155');
  box(7, 16, 86, 66, '#64748b');
  box(11, 20, 78, 58, '#475569');
  // Deck seams.
  for (const x of [30, 50, 70]) {
    line(x, 21, x, 77, '#64748b', 0.6);
  }
  for (const y of [40, 60]) {
    line(12, y, 88, y, '#64748b', 0.6);
  }
  // Rear circulation manifold.
  pipe([[23, 32], [23, 23], [77, 23], [77, 32]]);
  pipe([[50, 23], [50, 33]], '#0891b2');
  // Tower-to-reactor connections.
  pipe([[23, 55], [23, 63], [37, 63]]);
  pipe([[77, 55], [77, 63], [63, 63]]);
  // Twin gas-processing towers.
  tower(23, 32);
  tower(77, 32);
  // Reactor lower housing.
  box(34, 44, 32, 30, '#334155');
  box(34, 39, 32, 30, '#94a3b8');
  box(38, 43, 24, 22, '#475569');
  // Orange armored edges.
  box(34, 43, 3, 22, orange);
  box(63, 43, 3, 22, orange);
  // Central reaction chamber.
  box(43, 44, 14, 18, outline);
  box(45, 46, 10, 14, '#164e63', false);
  const pulse = 0.35 + (Math.sin(timeMs * 0.003) + 1) * 0.2;
  box(
    46, 47, 8, 12,
    `rgba(34, 211, 238, ${pulse})`,
    false
  );
  // Chamber separators and reflection.
  for (const y of [50, 54, 58]) {
    line(45, y, 55, y, '#67e8f9', 0.7);
  }
  box(46, 47, 1.2, 11, '#cffafe', false);
  // Reactor roof cap.
  oval(50, 39, 16, 8, '#cbd5e1');
  oval(50, 38, 12, 6, '#64748b');
  oval(50, 38, 7, 3.5, '#164e63');
  oval(50, 38, 3, 1.5, cyan, false);
  // Atmospheric outlet housing.
  box(34, 27, 32, 10, '#334155');
  box(34, 24, 32, 10, '#94a3b8');
  box(37, 26, 26, 6, outline);
  // Release grille.
  for (let x = 39; x <= 61; x += 3) {
    line(x, 27, x, 31, '#cbd5e1', 0.9);
  }
  // Front intake units.
  box(12, 67, 18, 13, '#334155');
  box(12, 64, 18, 12, '#94a3b8');
  fan(21, 69, 0);
  box(70, 67, 18, 13, '#334155');
  box(70, 64, 18, 12, '#94a3b8');
  fan(79, 69, Math.PI / 4);
  // Front diagnostic console.
  box(39, 76, 22, 15, '#334155');
  box(39, 73, 22, 13, '#94a3b8');
  box(42, 76, 16, 6, outline);
  box(43, 77, 14, 4, '#164e63', false);
  // Small waveform display.
  ctx.beginPath();
  ctx.moveTo(44, 79);
  ctx.lineTo(47, 79);
  ctx.lineTo(48, 77.8);
  ctx.lineTo(50, 80);
  ctx.lineTo(52, 78);
  ctx.lineTo(53, 79);
  ctx.lineTo(56, 79);
  ctx.strokeStyle = cyan;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  box(43, 83, 2, 1.5, '#22c55e', false);
  box(47, 83, 2, 1.5, orange, false);
  // Hazard trim.
  for (const x of [12, 18, 24, 72, 78, 84]) {
    box(x, 83, 3, 2, orange, false);
  }
  // Soft atmospheric plume, kept inside the footprint.
  for (let i = 0; i < 5; i++) {
    const progress = ((timeMs * 0.00025 + i / 5) % 1 + 1) % 1;
    const drift = Math.sin(progress * Math.PI * 2 + i) * 2;
    const alpha = Math.sin(progress * Math.PI) * 0.16;
    oval(
      50 + drift,
      25 - progress * 16,
      3 + progress * 5,
      1.5 + progress * 2,
      `rgba(165, 243, 252, ${alpha})`,
      false
    );
  }
  ctx.restore();
}

function drawFusionReactor(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    deck: '#475569',
    highlight: '#cbd5e1',
    orange: '#f97316',
    cyan: '#22d3ee',
    plasma: '#a5f3fc'
  };

  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);

    if (border) {
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }

  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function line(
    points: number[][],
    color: string,
    width = 1
  ) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 5);
    line(points, c.metal, 3);
  }

  function light(x: number, y: number, phase: number) {
    box(x, y, 6, 3, c.outline);
    const alpha = 0.65 + Math.sin(timeMs * 0.003 + phase) * 0.2;
    box(
      x + 0.7, y + 0.7, 4.6, 1.6,
      `rgba(34, 211, 238, ${alpha})`,
      false
    );
  }

  function coolingUnit(x: number, y: number, phase: number) {
    box(x, y + 4, 18, 22, c.wall);
    box(x, y, 18, 22, c.metal);
    box(x + 2, y + 2, 14, 17, c.deck);
    box(x, y + 2, 2, 17, c.orange);

    oval(x + 9, y + 9, 6, 4, c.wall);
    oval(x + 9, y + 9, 4.8, 3.2, c.outline);

    ctx.save();
    ctx.translate(x + 9, y + 9);
    ctx.scale(1, 0.67);
    ctx.rotate(timeMs * 0.002 + phase);

    for (let blade = 0; blade < 5; blade++) {
      ctx.save();
      ctx.rotate(blade * Math.PI * 2 / 5);
      polygon(
        [[1, -0.6], [4, -1], [4.3, 0.7], [1.5, 1]],
        c.metal
      );
      ctx.restore();
    }

    ctx.restore();
    oval(x + 9, y + 9, 1.5, 1, c.orange);

    for (const offset of [4, 7, 10, 13]) {
      line(
        [[x + offset, y + 16], [x + offset, y + 19]],
        c.outline,
        0.7
      );
    }

    light(x + 6, y + 22, phase);
  }

  box(9, 20, 84, 72, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 16, 86, 72, c.wall);
  box(7, 16, 86, 66, c.metal);
  box(11, 20, 78, 58, c.deck);

  for (const x of [30, 50, 70]) {
    line([[x, 21], [x, 77]], '#64748b', 0.6);
  }
  for (const y of [40, 60]) {
    line([[12, y], [88, y]], '#64748b', 0.6);
  }

  pipe([[21, 48], [21, 68], [39, 68]]);
  pipe([[79, 48], [79, 68], [61, 68]]);
  pipe([[21, 30], [21, 24], [79, 24], [79, 30]]);

  coolingUnit(12, 33, 0);
  coolingUnit(70, 33, Math.PI / 3);

  oval(50, 58, 24, 17, c.wall);
  box(26, 47, 48, 11, c.wall, false);
  oval(50, 47, 24, 17, c.metal);
  oval(50, 47, 20, 14, c.deck);

  box(32, 59, 8, 7, c.deck);
  box(60, 59, 8, 7, c.deck);
  light(33, 61, 0);
  light(61, 61, 2);

  oval(50, 44, 20, 13, c.outline);

  const pulse = 0.5 + Math.sin(timeMs * 0.003) * 0.15;

  ctx.beginPath();
  ctx.ellipse(50, 44, 15, 9, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(34, 211, 238, ${pulse * 0.3})`;
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(50, 44, 15, 9, 0, 0, Math.PI * 2);
  ctx.strokeStyle = c.cyan;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const rotation = timeMs * 0.0012;

  for (let i = 0; i < 3; i++) {
    const start = rotation + i * Math.PI * 2 / 3;

    ctx.beginPath();
    ctx.ellipse(50, 44, 15, 9, 0, start, start + 0.45);
    ctx.strokeStyle = c.plasma;
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }

  oval(50, 44, 8, 5, c.wall);
  box(42, 36, 16, 8, c.wall, false);
  oval(50, 36, 8, 5, c.highlight);
  oval(50, 35.5, 5.5, 3.5, c.deck);
  oval(50, 35.5, 2.5, 1.5, c.orange);

  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const x = 50 + Math.cos(angle) * 21;
    const y = 44 + Math.sin(angle) * 14;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(
      Math.sin(angle) * 14,
      Math.cos(angle) * 21
    ));

    box(-4, -2.5, 8, 5, c.metal);
    box(-1.3, -2.5, 2.6, 5, c.orange, false);
    line([[-3, -1.5], [-3, 1.5]], c.highlight, 0.7);

    ctx.restore();
  }

  pipe([[50, 65], [50, 75]]);
  box(43, 68, 14, 8, c.wall);
  box(46, 70, 8, 4, c.orange);

  box(36, 78, 28, 13, c.wall);
  box(36, 74, 28, 12, c.metal);
  box(40, 77, 20, 6, c.outline);
  box(41, 78, 18, 4, '#164e63', false);

  const trace: number[][] = [];

  for (let i = 0; i <= 16; i++) {
    trace.push([
      42 + i,
      80 + Math.sin(i * 0.8 - timeMs * 0.004) * 1.1
    ]);
  }

  line(trace, c.cyan, 0.7);

  box(40, 84, 2, 1.5, c.orange, false);
  box(44, 84, 2, 1.5, '#22c55e', false);

  for (const x of [12, 18, 24, 72, 78, 84]) {
    box(x, 83, 3, 2, c.orange, false);
  }

  light(13, 18, 1);
  light(81, 18, 3);

  ctx.restore();
}

function drawNuclearGenerator(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#fbbf24',
    cyan: '#fbbf24',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 7);
    line(points, c.metal, 5);
  }

  function coolingTower(x: number) {
    // Tapered cooling tower body.
    const shell = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
    shell.addColorStop(0, '#64748b');
    shell.addColorStop(0.4, c.highlight);
    shell.addColorStop(1, c.wall);

    ctx.beginPath();
    ctx.moveTo(x - 11, 19);
    ctx.bezierCurveTo(x - 8, 29, x - 8, 39, x - 13, 48);
    ctx.quadraticCurveTo(x, 55, x + 13, 48);
    ctx.bezierCurveTo(x + 8, 39, x + 8, 29, x + 11, 19);
    ctx.closePath();
    ctx.fillStyle = shell;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();

    ellipse(x, 49, 13, 5, c.orange);
    ellipse(x, 19, 12, 6, c.orange);
    ellipse(x, 18, 10, 5, c.metal);
    ellipse(x, 18, 7.5, 3.5, c.outline);

    // Intake grating inside the opening.
    for (const offset of [-4, 0, 4]) {
      line(
        [[x + offset, 16], [x + offset, 20]],
        '#475569'
      );
    }

    light(x - 2, 29, 4, 10);
    vent(x - 4, 41, 8, 5);
  }

  // Rear coolant connections.
  pipe([[25, 42], [25, 58], [38, 58]]);
  pipe([[75, 42], [75, 58], [62, 58]]);

  coolingTower(25);
  coolingTower(75);

  // Reactor base and visible front wall.
  box(29, 53, 42, 20, c.wall);
  ellipse(50, 72, 22, 8, c.wall);
  ellipse(50, 57, 24, 11, c.orange);
  ellipse(50, 56, 22, 9, c.metal);

  // Solid armored containment dome.
  const dome = ctx.createLinearGradient(30, 30, 68, 59);
  dome.addColorStop(0, c.highlight);
  dome.addColorStop(0.5, c.metal);
  dome.addColorStop(1, '#475569');

  ctx.beginPath();
  ctx.moveTo(28, 55);
  ctx.bezierCurveTo(28, 24, 72, 24, 72, 55);
  ctx.bezierCurveTo(65, 65, 35, 65, 28, 55);
  ctx.closePath();
  ctx.fillStyle = dome;
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;

  // Segmented dome seams.
  ctx.strokeStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(50, 34);
  ctx.bezierCurveTo(41, 39, 37, 48, 37, 60);
  ctx.moveTo(50, 34);
  ctx.lineTo(50, 62);
  ctx.moveTo(50, 34);
  ctx.bezierCurveTo(59, 39, 63, 48, 63, 60);
  ctx.moveTo(31, 45);
  ctx.bezierCurveTo(42, 50, 58, 50, 69, 45);
  ctx.stroke();

  ellipse(50, 34, 7, 4, c.orange);
  ellipse(50, 33, 5, 2.5, c.metal);
  ellipse(50, 33, 2, 1.2, c.cyan);

  // Reactor status lights.
  light(32, 66, 9, 3);
  light(59, 66, 9, 3);

  // Front auxiliary equipment.
  for (const x of [15, 73]) {
    box(x, 63, 12, 19, c.wall);
    box(x, 60, 12, 6, c.metal);
    vent(x + 2, 68, 8, 7);
    light(x + 3, 77, 6, 3);
    box(x, 80, 4, 3, c.orange);
    box(x + 8, 80, 4, 3, c.orange);
  }

  pipe([[26, 72], [34, 72], [34, 77]]);
  pipe([[74, 72], [66, 72], [66, 77]]);

  // South-facing control entrance.
  box(37, 72, 26, 15, c.wall);
  box(36, 69, 28, 7, c.metal);
  box(36, 69, 4, 7, c.orange);
  box(60, 69, 4, 7, c.orange);
  light(43, 71, 14, 4);

  box(44, 78, 12, 9, c.outline);
  box(45, 79, 10, 7, '#164e63');
  line([[50, 79], [50, 86]], c.metal);
  light(46, 80, 3, 5);
  light(51, 80, 3, 5);

  // Warning beacons and access steps.
  light(38, 79, 4, 4, c.amber);
  light(58, 79, 4, 4, c.amber);

  box(40, 87, 20, 6, c.wall);
  line([[42, 89], [58, 89]], c.metal);
  line([[42, 92], [58, 92]], c.metal);
  box(38, 87, 2, 6, c.orange);
  box(60, 87, 2, 6, c.orange);

  ctx.restore();
}


function drawBattery(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#22c55e',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function conduit(points: number[][]) {
    line(points, c.outline, 6);
    line(points, c.metal, 4);
  }

  function battery(x: number, y: number) {
    // Vertical casing beneath the raised roof.
    box(x, y + 6, 25, 23, c.wall);
    box(x, y, 25, 22, c.metal);
    line(
      [[x + 1, y + 21], [x + 1, y + 1], [x + 24, y + 1]],
      c.highlight
    );

    // Segmented casing and roof ventilation.
    line([[x + 2, y + 14], [x + 23, y + 14]], '#64748b');
    vent(x + 7, y + 4, 11, 7);

    box(x, y, 4, 5, c.accent);
    box(x + 21, y, 4, 5, c.accent);
    box(x, y + 24, 4, 5, c.accent);
    box(x + 21, y + 24, 4, 5, c.accent);

    // Front-facing charge display.
    light(x + 6, y + 23, 13, 4);

    ctx.fillStyle = '#cffafe';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 8 + i * 2.5, y + 24, 1.5, 2);
    }
  }

  // Low support frame, with visible south-facing thickness.
  box(15, 28, 70, 53, c.wall);
  box(15, 24, 70, 51, '#475569');
  line([[16, 74], [16, 25], [84, 25]], c.metal);

  // Main bus between the two battery columns.
  conduit([[50, 20], [50, 81]]);
  conduit([[28, 36], [72, 36]]);
  conduit([[28, 68], [72, 68]]);

  // Rear electrical terminals.
  for (const x of [43, 57]) {
    box(x - 2, 13, 4, 10, c.metal);
    for (const y of [14, 17, 20]) {
      box(x - 3, y, 6, 2, c.wall);
    }
    box(x - 2, 11, 4, 3, c.accent);
  }

  // Rear row first, then front row.
  for (const y of [19, 51]) {
    battery(19, y);
    battery(56, y);
  }

  // Central bus couplings remain visible in the aisle.
  box(47, 30, 6, 5, c.accent);
  box(47, 62, 6, 5, c.accent);
  light(48, 42, 4, 8);

  // Front power management cabinet.
  box(36, 79, 28, 13, c.wall);
  box(35, 75, 30, 7, c.metal);
  box(35, 75, 4, 7, c.accent);
  box(61, 75, 4, 7, c.accent);

  light(42, 83, 16, 6);

  // Charge bars on the control screen.
  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(
      44 + i * 3,
      87 - i * 0.7,
      2,
      1 + i * 0.7
    );
  }

  light(37, 84, 4, 4, c.amber);
  light(59, 84, 4, 4, c.amber);

  // Grounded support feet.
  box(17, 78, 9, 5, c.accent);
  box(74, 78, 9, 5, c.accent);
  box(39, 92, 22, 3, c.metal);

  ctx.restore();
}

function drawScrubber(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, time: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#22d3ee',
    cyan: '#22d3ee'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 7);
    line(points, c.metal, 5);
  }

  function filter(x: number, y: number) {
    // Cylindrical filter casing and raised lid.
    box(x - 6, y, 12, 23, c.wall);
    ellipse(x, y + 23, 6, 3, c.wall);
    box(x - 5, y + 2, 10, 18, c.metal);
    line([[x - 4, y + 3], [x - 4, y + 18]], c.highlight);

    box(x - 6, y + 5, 12, 3, c.accent);
    box(x - 6, y + 17, 12, 3, c.accent);
    light(x - 2, y + 9, 4, 6);

    ellipse(x, y, 7, 3.5, c.accent);
    ellipse(x, y - 1, 5, 2.5, c.metal);
  }

  function fan(x: number, y: number) {
    // Raised fan housing.
    ellipse(x, y + 3, 12, 9, c.wall);
    ellipse(x, y, 13, 10, c.accent);
    ellipse(x, y, 11, 8, c.metal);
    ellipse(x, y, 9, 6.5, c.outline);

    // Blades follow the flattened roof perspective.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.72);
    ctx.rotate(time * 0.0012);

    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate(i * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(2, -1);
      ctx.lineTo(7, -3);
      ctx.lineTo(8, 0);
      ctx.lineTo(3, 2);
      ctx.closePath();
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
    ellipse(x, y, 2.5, 2, c.cyan);
  }

  // Rear air ducts.
  pipe([[27, 38], [27, 24], [73, 24], [73, 38]]);
  box(37, 21, 4, 6, c.accent);
  box(59, 21, 4, 6, c.accent);

  // Armored body and south-facing wall.
  box(22, 44, 56, 34, c.wall);
  box(21, 34, 58, 31, c.metal);
  line([[22, 64], [22, 35], [78, 35]], c.highlight);

  for (const x of [21, 73]) {
    box(x, 34, 6, 5, c.accent);
    box(x, 60, 6, 5, c.accent);
  }

  // Roof seam and twin air intake fans.
  line([[50, 36], [50, 63]], '#64748b');
  fan(36, 47);
  fan(64, 47);

  // Side filter connections.
  pipe([[23, 58], [14, 58], [14, 48]]);
  pipe([[77, 58], [86, 58], [86, 48]]);
  filter(14, 39);
  filter(86, 39);

  // Rear filter cartridges.
  filter(38, 15);
  filter(62, 15);

  // Front vents and status indicators.
  vent(26, 68, 12, 8);
  vent(62, 68, 12, 8);
  light(28, 62, 8, 3);
  light(64, 62, 8, 3);

  // Central control housing.
  box(39, 65, 22, 20, c.wall);
  box(38, 64, 24, 6, c.metal);
  box(38, 64, 4, 6, c.accent);
  box(58, 64, 4, 6, c.accent);
  light(43, 72, 14, 7);

  // Display shows air-flow bars.
  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(45 + i * 2.5, 77 - i * 0.7, 1.5, 1 + i * 0.7);
  }

  vent(44, 81, 12, 4);

  // Base feet.
  box(23, 78, 9, 5, c.accent);
  box(68, 78, 9, 5, c.accent);
  box(40, 85, 20, 4, c.metal);

  ctx.restore();
}

function drawVaporator(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#22d3ee',
    cyan: '#22d3ee',
    water: '#075985'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  // Compact equipment base with visible front thickness.
  box(22, 72, 56, 17, c.wall);
  box(22, 67, 56, 15, c.metal);
  line([[23, 81], [23, 68], [77, 68]], c.highlight);

  for (const x of [22, 72]) {
    box(x, 67, 6, 5, c.accent);
    box(x, 83, 6, 6, c.accent);
  }

  // Coolant pipe behind the tower and collection tank.
  const pipe = [[49, 60], [49, 76], [68, 76], [68, 65]];
  line(pipe, c.outline, 7);
  line(pipe, c.metal, 5);
  line([[50, 74], [66, 74]], c.highlight);
  box(55, 73, 4, 6, c.accent);

  // Water collection tank.
  box(61, 58, 16, 18, c.wall);
  ellipse(69, 76, 8, 4, c.wall);

  const water = ctx.createLinearGradient(62, 0, 76, 0);
  water.addColorStop(0, '#0e7490');
  water.addColorStop(0.4, c.cyan);
  water.addColorStop(1, c.water);

  box(63, 61, 12, 13, water);
  line([[65, 63], [65, 71]], '#a5f3fc');
  line([[64, 68], [74, 68]], '#67e8f9');

  ellipse(69, 59, 9, 4, c.accent);
  ellipse(69, 57, 8, 3, c.metal);
  box(67, 53, 4, 4, c.wall);

  // Main condenser column.
  box(37, 25, 16, 45, c.wall);
  ellipse(45, 70, 10, 5, c.accent);
  box(39, 25, 12, 43, c.metal);
  line([[40, 28], [40, 65]], c.highlight);

  // Horizontal collection fins.
  for (let i = 0; i < 5; i++) {
    const y = 30 + i * 7;

    box(28, y + 2, 34, 3, c.wall);
    box(27, y, 36, 3, c.metal);
    line([[28, y + 0.5], [62, y + 0.5]], c.highlight);

    box(27, y, 3, 3, c.accent);
    box(60, y, 3, 3, c.accent);
  }

  // Front sensor strip.
  box(42, 29, 6, 35, c.wall);
  light(43, 34, 4, 10);
  light(43, 49, 4, 10);

  // Condenser head and upper intake.
  box(35, 19, 20, 8, c.wall);
  ellipse(45, 26, 11, 5, c.accent);
  ellipse(45, 19, 11, 5, c.metal);
  ellipse(45, 18, 7, 3, c.outline);

  line([[40, 18], [50, 18]], c.metal);
  line([[45, 16], [45, 20]], c.metal);

  box(43, 9, 4, 7, c.metal);
  ellipse(45, 9, 4, 2, c.accent);

  // Support braces.
  line([[35, 57], [27, 76]], c.outline, 5);
  line([[35, 57], [27, 76]], c.metal, 3);
  line([[55, 57], [59, 76]], c.outline, 5);
  line([[55, 57], [59, 76]], c.metal, 3);

  box(24, 75, 7, 5, c.accent);
  box(56, 75, 7, 5, c.accent);

  // South-facing management console.
  box(35, 78, 22, 13, c.wall);
  box(35, 76, 22, 5, c.metal);
  light(39, 82, 14, 5);

  // Small charge/status bars within the display.
  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(41 + i * 3, 85 - i, 2, 1 + i);
  }

  ctx.restore();
}

function drawGreenhouse(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#10b981',
    cyan: '#22d3ee',
    glass: '#164e63'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 6);
    line(points, c.metal, 4);
  }

  function domePath() {
    ctx.beginPath();
    ctx.moveTo(20, 57);
    ctx.bezierCurveTo(20, 4, 80, 4, 80, 57);
    ctx.bezierCurveTo(71, 76, 29, 76, 20, 57);
    ctx.closePath();
  }

  function waterTank(x: number) {
    box(x - 6, 62, 12, 16, c.wall);
    ellipse(x, 78, 6, 3, c.wall);

    const water = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
    water.addColorStop(0, '#075985');
    water.addColorStop(0.45, c.cyan);
    water.addColorStop(1, '#0e7490');

    box(x - 4, 65, 8, 10, water as any);
    line([[x - 2, 66], [x - 2, 73]], '#a5f3fc');

    ellipse(x, 62, 7, 3.5, c.accent);
    ellipse(x, 60, 6, 2.5, c.metal);
    box(x - 6, 76, 12, 3, c.accent);
  }

  // Water connections behind the dome.
  pipe([[14, 68], [25, 68], [25, 59]]);
  pipe([[86, 68], [75, 68], [75, 59]]);

  // Raised foundation drum.
  box(21, 57, 58, 12, c.wall);
  ellipse(50, 68, 29, 10, c.wall);
  ellipse(50, 58, 31, 12, c.accent);
  ellipse(50, 57, 29, 10, c.metal);

  // Interior and plants clipped to the glass silhouette.
  ctx.save();
  domePath();
  ctx.clip();

  const interior = ctx.createLinearGradient(0, 18, 0, 70);
  interior.addColorStop(0, '#164e63');
  interior.addColorStop(1, '#12352d');

  ctx.fillStyle = interior;
  ctx.fillRect(19, 12, 62, 60);

  // Central service walkway.
  box(47, 35, 6, 34, '#64748b');

  // Hydroponic beds and fixed crop pattern.
  for (const y of [37, 47, 57]) {
    for (const x of [29, 56]) {
      box(x, y, 15, 7, '#334155');
      box(x + 1, y + 1, 13, 5, '#14532d');

      for (let i = 0; i < 3; i++) {
        const plantX = x + 3 + i * 4;
        ellipse(plantX, y + 3, 2, 1.8, '#22c55e');
        ellipse(plantX - 0.5, y + 2.3, 1, 0.8, '#86efac');
      }

      line([[x + 1, y + 6], [x + 14, y + 6]], c.cyan, 0.6);
    }
  }

  // Transparent blue glass overlay.
  const glass = ctx.createLinearGradient(25, 20, 75, 66);
  glass.addColorStop(0, 'rgba(165, 243, 252, 0.30)');
  glass.addColorStop(0.5, 'rgba(34, 211, 238, 0.10)');
  glass.addColorStop(1, 'rgba(8, 145, 178, 0.28)');

  ctx.fillStyle = glass;
  ctx.fillRect(19, 12, 62, 60);

  // Soft reflection on the northwest glass.
  ctx.fillStyle = 'rgba(207, 250, 254, 0.28)';
  ctx.beginPath();
  ctx.moveTo(31, 28);
  ctx.bezierCurveTo(35, 22, 41, 19, 45, 18);
  ctx.lineTo(39, 33);
  ctx.lineTo(28, 45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Glass outline.
  domePath();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Curved structural ribs.
  ctx.strokeStyle = c.metal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 18);
  ctx.bezierCurveTo(38, 25, 32, 44, 32, 68);
  ctx.moveTo(50, 18);
  ctx.lineTo(50, 71);
  ctx.moveTo(50, 18);
  ctx.bezierCurveTo(62, 25, 68, 44, 68, 68);
  ctx.moveTo(24, 38);
  ctx.bezierCurveTo(38, 46, 62, 46, 76, 38);
  ctx.moveTo(20, 57);
  ctx.bezierCurveTo(35, 68, 65, 68, 80, 57);
  ctx.stroke();
  ctx.lineWidth = 1;

  // Dome cap and rim indicators.
  ellipse(50, 18, 6, 3.5, c.accent);
  ellipse(50, 17, 4, 2, c.metal);
  ellipse(50, 17, 1.5, 1, c.cyan);

  light(25, 67, 8, 3);
  light(67, 67, 8, 3);

  waterTank(14);
  waterTank(86);

  // South-facing airlock.
  box(38, 70, 24, 17, c.wall);
  box(37, 68, 26, 7, c.metal);
  box(37, 68, 4, 7, c.accent);
  box(59, 68, 4, 7, c.accent);
  light(44, 70, 12, 4);

  box(43, 77, 14, 10, c.outline);
  box(44, 78, 12, 8, c.glass);
  line([[50, 78], [50, 86]], c.metal);
  light(45, 79, 3, 6);
  light(52, 79, 3, 6);

  // Access steps.
  box(40, 87, 20, 6, c.wall);
  line([[42, 89], [58, 89]], c.metal);
  line([[42, 92], [58, 92]], c.metal);
  box(38, 87, 2, 6, c.accent);
  box(60, 87, 2, 6, c.accent);

  ctx.restore();
}

function drawHabitat(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    roof: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#22d3ee',
    cyan: '#22d3ee',
    glass: '#164e63'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: any, y: any, w: any, h: any) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function roof(x: any, y: any, w: any, h: any) {
    // Chamfered roof over a visible south-facing wall.
    box(x, y + 8, w, h, c.wall);

    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + w - 4, y);
    ctx.lineTo(x + w, y + 4);
    ctx.lineTo(x + w, y + h - 4);
    ctx.lineTo(x + w - 4, y + h);
    ctx.lineTo(x + 4, y + h);
    ctx.lineTo(x, y + h - 4);
    ctx.lineTo(x, y + 4);
    ctx.closePath();
    ctx.fillStyle = c.roof;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();

    line(
      [[x + 1, y + 5], [x + 5, y + 1], [x + w - 5, y + 1]],
      c.highlight
    );
  }

  function wing(x: any) {
    roof(x, 31, 27, 30);

    // Roof ventilation and seams.
    vent(x + 8, 36, 11, 7);
    line([[x + 2, 49], [x + 25, 49]], '#64748b');
    line([[x + 2, 55], [x + 25, 55]], '#64748b');

    box(x + 1, 33, 4, 5, c.orange);
    box(x + 22, 33, 4, 5, c.orange);

    // Two rows of residential windows on the front wall.
    box(x, 61, 27, 16, c.wall);
    for (const y of [63, 70]) {
      for (const offset of [3, 11, 19]) {
        light(x + offset, y, 5, 4);
      }
    }

    box(x + 1, 74, 4, 4, c.orange);
    box(x + 22, 74, 4, 4, c.orange);
  }

  // Rear utility connections.
  box(28, 36, 44, 11, c.wall);
  light(29, 39, 8, 4);
  light(63, 39, 8, 4);

  wing(7);
  wing(66);

  // Central residential/service core.
  roof(34, 20, 32, 46);

  // Segmented roof panels.
  line([[36, 33], [64, 33]], '#64748b');
  line([[36, 53], [64, 53]], '#64748b');

  // Central skylight.
  box(42, 35, 16, 16, c.outline);
  box(43, 36, 14, 14, c.glass);
  line([[44, 37], [56, 37]], '#a5f3fc');
  line([[50, 36], [50, 50]], c.roof);
  line([[43, 43], [57, 43]], c.roof);

  ctx.fillStyle = 'rgba(34, 211, 238, 0.35)';
  ctx.fillRect(44, 38, 5, 4);
  ctx.fillRect(51, 44, 5, 5);

  vent(43, 24, 14, 6);
  box(35, 22, 4, 6, c.orange);
  box(61, 22, 4, 6, c.orange);
  box(35, 58, 4, 7, c.orange);
  box(61, 58, 4, 7, c.orange);

  // Small rooftop communications aerial.
  box(59, 14, 3, 9, c.wall);
  box(59, 12, 3, 3, c.orange);
  line([[60.5, 16], [65, 16]], c.roof);

  // South-facing airlock housing.
  box(38, 65, 24, 20, c.wall);
  box(37, 62, 26, 8, c.roof);
  box(37, 62, 4, 8, c.orange);
  box(59, 62, 4, 8, c.orange);
  light(44, 64, 12, 4);

  box(43, 73, 14, 12, c.outline);
  box(44, 74, 12, 10, c.glass);
  line([[50, 74], [50, 84]], c.roof);
  light(45, 76, 3, 6);
  light(52, 76, 3, 6);

  // Entrance steps.
  box(40, 85, 20, 8, c.wall);
  for (let y = 87; y < 93; y += 2) {
    line([[42, y], [58, y]], c.roof);
  }
  box(38, 85, 2, 8, c.orange);
  box(60, 85, 2, 8, c.orange);

  ctx.restore();
}


function drawRefinery(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, time: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#f97316',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function rock(x: number, y: number, size: number, fill: string) {
    polygon([
      [x, y - size],
      [x + size, y - size * 0.3],
      [x + size * 0.7, y + size * 0.7],
      [x - size * 0.5, y + size],
      [x - size, y]
    ], fill);

    line([
      [x - size * 0.5, y],
      [x, y - size * 0.6],
      [x + size * 0.5, y - size * 0.2]
    ], c.highlight, 0.7);
  }

  function bin(x: number, y: number, w: number, h: number) {
    box(x, y + 5, w, h, c.wall);
    box(x, y, w, h, c.metal);
    box(x + 3, y + 3, w - 6, h - 6, c.outline);

    for (const dx of [0, w - 4]) {
      for (const dy of [0, h - 4]) {
        box(x + dx, y + dy, 4, 4, c.accent);
      }
    }
  }

  // Exhaust stacks behind the processing building.
  for (const x of [43, 59]) {
    box(x - 4, 13, 8, 22, c.wall);
    box(x - 3, 13, 6, 18, c.metal);
    box(x - 4, 24, 8, 4, c.accent);
    ellipse(x, 13, 5, 3, c.metal);
    ellipse(x, 13, 3, 1.5, c.outline);
  }

  // Conveyor between input and output.
  box(22, 49, 56, 13, c.wall);
  box(23, 47, 54, 10, c.outline);

  for (let x = 25; x < 77; x += 5) {
    line([[x, 48], [x, 56]], '#64748b');
  }

  // Ore input hopper.
  bin(7, 34, 25, 28);

  const ore = [
    [15, 43, 3.2], [23, 42, 3],
    [19, 49, 3.5], [13, 53, 2.8],
    [25, 54, 3], [21, 57, 2.4]
  ];

  ore.forEach(([x, y, size], i) => {
    rock(x, y, size, i % 2 ? '#64748b' : '#78716c');
  });

  light(14, 64, 11, 4);

  // Refined-metal output bin.
  bin(71, 48, 23, 25);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = 76 + col * 7;
      const y = 54 + row * 5;
      box(x, y, 6, 3, c.highlight);
      line([[x + 1, y + 0.5], [x + 5, y + 0.5]], '#f1f5f9', 0.6);
    }
  }

  light(77, 75, 11, 4);

  // Main processor walls and chamfered roof.
  box(33, 37, 36, 42, c.wall);

  polygon([
    [39, 28], [63, 28],
    [70, 35], [70, 55],
    [63, 62], [39, 62],
    [32, 55], [32, 35]
  ], c.metal);

  line([[33, 36], [40, 29], [62, 29]], c.highlight);
  line([[35, 54], [40, 59], [62, 59]], '#64748b');

  for (const x of [33, 65]) {
    for (const y of [34, 53]) {
      box(x, y, 4, 7, c.accent);
    }
  }

  // Raised crusher housing.
  box(42, 35, 18, 17, c.wall);
  box(41, 32, 20, 14, c.metal);
  vent(45, 35, 12, 8);

  // Furnace inspection window.
  const heat = ctx.createLinearGradient(0, 66, 0, 73);
  heat.addColorStop(0, '#fbbf24');
  heat.addColorStop(0.5, '#f97316');
  heat.addColorStop(1, '#9a3412');

  box(41, 64, 20, 11, c.outline);
  box(43, 66, 16, 7, heat as any);
  line([[48, 66], [48, 73]], c.wall, 2);
  line([[54, 66], [54, 73]], c.wall, 2);

  // South-facing control cabinet.
  box(37, 77, 28, 13, c.wall);
  box(36, 74, 30, 6, c.metal);
  box(36, 74, 4, 6, c.accent);
  box(62, 74, 4, 6, c.accent);
  light(43, 81, 16, 5);

  light(38, 82, 4, 4, c.amber);
  light(60, 82, 4, 4, c.amber);

  box(33, 88, 7, 5, c.accent);
  box(62, 88, 7, 5, c.accent);

  ctx.restore();
}

function drawStorageDepot(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  timeMs: number = 0
) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash([]);

  const outline = '#111827';
  const orange = '#ea580c';
  const cyan = '#22d3ee';

  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);

    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
    }
  }

  function line(
    x1: number, y1: number,
    x2: number, y2: number,
    color: string, width = 1
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function pipe(points: number[][], color = '#94a3b8') {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  function statusLight(
    x: number, y: number,
    rgb: string, phase: number
  ) {
    box(x, y, 4, 3, outline);
    const alpha = 0.65 + Math.sin(timeMs * 0.003 + phase) * 0.2;
    box(x + 0.7, y + 0.7, 2.6, 1.6, `rgba(${rgb}, ${alpha})`, false);
  }

  function silo(
    x: number, y: number,
    kind: 'spice' | 'water',
    phase: number
  ) {
    const water = kind === 'water';

    // Reinforced feet and cylindrical body.
    box(x - 6, y + 21, 3, 6, '#334155');
    box(x + 3, y + 21, 3, 6, '#334155');
    oval(x, y + 22, 8, 4, '#334155');
    box(x - 8, y, 16, 22, '#64748b');
    box(x - 6.5, y + 2, 2, 17, '#94a3b8', false);
    oval(x, y + 21, 8, 3, '#475569');

    // Inspection window.
    box(x - 3, y + 4, 6, 13, outline);
    box(
      x - 2, y + 5, 4, 11,
      water ? '#164e63' : '#78350f',
      false
    );

    if (water) {
      // Moving water surface, clipped inside the window.
      const surface = y + 9 + Math.sin(timeMs * 0.002 + phase) * 0.5;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 2, y + 5, 4, 11);
      ctx.clip();

      box(x - 2, surface, 4, y + 16 - surface, '#0891b2', false);
      line(x - 2, surface, x + 2, surface, '#67e8f9', 0.6);
      ctx.restore();
    } else {
      box(x - 2, y + 8, 4, 8, '#d97706', false);
      line(x - 1.5, y + 8, x + 1.5, y + 8, '#fbbf24', 0.7);
    }

    // Glass reflection and retaining bands.
    box(x - 1.5, y + 5.5, 0.8, 9, '#f8fafc', false);
    box(x - 8, y + 2, 16, 2, '#94a3b8');
    box(x - 8, y + 18, 16, 2, '#94a3b8');

    // Lid and resource-colored cap.
    oval(x, y, 8, 3.5, '#cbd5e1');
    oval(x, y - 0.5, 5.5, 2.2, '#475569');
    oval(x, y - 0.5, 2.5, 1, water ? cyan : orange, false);

    statusLight(
      x - 2, y + 21,
      water ? '34, 211, 238' : '251, 191, 36',
      phase
    );
  }

  function crate(x: number, y: number, color: string) {
    box(x, y + 2, 8, 7, '#334155');
    box(x, y, 8, 7, color);
    line(x + 1, y + 1, x + 7, y + 6, '#94a3b8', 0.6);
    line(x + 7, y + 1, x + 1, y + 6, '#94a3b8', 0.6);
  }

  // Raised industrial deck.
  box(9, 18, 84, 75, 'rgba(0, 0, 0, 0.25)', false);
  box(7, 14, 86, 75, '#334155');
  box(7, 14, 86, 69, '#64748b');
  box(11, 18, 78, 61, '#475569');

  for (const x of [30, 50, 70]) {
    line(x, 19, x, 78, '#64748b', 0.6);
  }
  for (const y of [39, 59]) {
    line(12, y, 88, y, '#64748b', 0.6);
  }

  // Rear transfer pipes, drawn beneath the tanks.
  pipe([[21, 25], [21, 19], [39, 19], [39, 25]], '#b45309');
  pipe([[63, 25], [63, 19], [81, 19], [81, 25]], '#0891b2');
  pipe([[81, 43], [88, 43], [88, 64]], '#0891b2');

  // Two spice silos and two water tanks.
  silo(21, 25, 'spice', 0);
  silo(39, 25, 'spice', 1);
  silo(63, 25, 'water', 2);
  silo(81, 25, 'water', 3);

  // Central warehouse front wall.
  box(34, 57, 32, 18, '#64748b');

  // Warehouse roof.
  box(34, 51, 32, 14, '#94a3b8');
  box(37, 54, 26, 8, '#64748b');
  line(50, 54, 50, 62, '#475569', 0.7);
  line(34, 51, 66, 51, '#cbd5e1', 1);
  box(34, 51, 2.5, 14, orange);
  box(63.5, 51, 2.5, 14, orange);

  // Roof vent.
  box(42, 55, 16, 5, '#334155');
  for (let x = 44; x <= 56; x += 3) {
    line(x, 56, x, 59, '#94a3b8', 0.7);
  }

  // Loading door.
  box(40, 65, 20, 10, outline);
  box(42, 67, 16, 7, '#1e293b', false);
  line(41, 66, 59, 66, '#94a3b8', 1);
  box(44, 63, 12, 1.5, cyan, false);

  crate(44, 69, '#b45309');

  // Ore storage hopper on the left.
  box(13, 56, 17, 20, '#334155');
  box(15, 71, 3, 8, '#64748b');
  box(25, 71, 3, 8, '#64748b');

  polygon(
    [[13, 54], [30, 54], [28, 69], [24, 74], [19, 74], [15, 69]],
    '#64748b'
  );

  // Open hopper rim.
  box(12, 51, 19, 13, '#94a3b8');
  box(14, 53, 15, 9, '#292524');

  // Individual ore chunks.
  polygon([[15, 59], [16, 55], [20, 54], [22, 58], [19, 61]], '#78716c');
  polygon([[20, 59], [22, 54], [26, 55], [28, 59], [25, 61]], '#a8a29e');
  polygon([[17, 61], [19, 58], [23, 59], [24, 62]], '#57534e');

  line(13, 52, 30, 52, '#cbd5e1', 1);
  box(13, 63, 3, 4, orange);
  box(27, 63, 3, 4, orange);

  // Ore discharge gate.
  box(19, 73, 6, 5, outline);
  line(20, 75, 24, 75, '#94a3b8', 0.8);

  // Refrigerated food container on the right.
  box(70, 55, 17, 23, '#334155');
  box(70, 51, 17, 22, '#94a3b8');
  box(72, 53, 13, 17, '#64748b');

  // Green food-storage stripe.
  box(70, 54, 3, 16, '#16a34a');
  for (const x of [76, 80, 84]) {
    line(x, 54, x, 69, '#94a3b8', 0.7);
  }

  // Refrigeration fan on the roof.
  oval(79, 59, 4.5, 3, '#334155');
  oval(79, 59, 3.5, 2.3, outline);

  ctx.save();
  ctx.translate(79, 59);
  ctx.scale(1, 0.66);
  ctx.rotate(timeMs * 0.0015);

  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 2);
    box(0.8, -0.6, 2.3, 1.2, '#cbd5e1', false);
    ctx.restore();
  }

  ctx.restore();
  oval(79, 59, 1, 0.7, '#22c55e', false);

  // Refrigerated double doors and status light.
  box(73, 73, 11, 5, '#475569');
  line(78.5, 73, 78.5, 78, outline, 0.7);
  statusLight(81, 68, '74, 222, 128', 4);

  // Loading apron.
  box(34, 77, 32, 11, '#334155');
  box(36, 78, 28, 8, '#64748b');
  line(40, 79, 40, 85, '#cbd5e1', 0.8);
  line(60, 79, 60, 85, '#cbd5e1', 0.8);

  // Resource crates awaiting collection.
  crate(16, 81, '#78716c');
  crate(25, 80, '#b45309');
  crate(72, 81, '#15803d');
  crate(81, 80, '#15803d');

  // Loading console.
  box(65, 77, 4, 10, '#334155');
  box(63, 75, 8, 5, '#94a3b8');
  box(65, 76, 4, 2, '#164e63', false);
  line(65.5, 77, 68.5, 77, cyan, 0.6);

  // Hazard trim and perimeter lights.
  for (let x = 36; x <= 61; x += 5) {
    box(x, 87, 2.5, 2, orange, false);
  }

  for (const x of [9, 87]) {
    box(x, 16, 3, 5, outline);
    box(x + 0.7, 17, 1.6, 3, cyan, false);
  }

  ctx.restore();
}

function drawDepot(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#a855f7',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 7);
    line(points, c.metal, 5);
  }

  function spiceWindow(x: number, y: number, w: number, h: number) {
    const spice = ctx.createLinearGradient(x, y, x + w, y + h);
    spice.addColorStop(0, '#fde68a');
    spice.addColorStop(0.45, '#f59e0b');
    spice.addColorStop(1, '#9a3412');

    box(x, y, w, h, spice as any);

    // Fixed pattern avoids flickering between frames.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, h - 2);
    ctx.clip();

    for (let row = 0; row < Math.ceil(h / 3); row++) {
      for (let col = 0; col < Math.ceil(w / 3); col++) {
        ctx.fillStyle = (row + col) % 3 === 0
          ? '#fde68a'
          : '#d97706';

        ctx.fillRect(
          x + 1 + col * 3 + (row % 2),
          y + 1 + row * 3,
          1.3,
          1.3
        );
      }
    }

    ctx.restore();
  }

  function tank(x: number) {
    // Cylindrical armored casing.
    const shell = ctx.createLinearGradient(x - 11, 0, x + 11, 0);
    shell.addColorStop(0, '#64748b');
    shell.addColorStop(0.35, c.highlight);
    shell.addColorStop(1, c.wall);

    box(x - 11, 25, 22, 37, shell as any);
    ellipse(x, 62, 11, 5, c.wall);

    // Amber processing chamber.
    spiceWindow(x - 7, 32, 14, 23);
    line([[x - 5, 34], [x - 5, 52]], '#fef3c7', 0.8);

    // Reinforcing bands.
    box(x - 11, 28, 22, 4, c.accent);
    box(x - 11, 55, 22, 4, c.accent);
    line([[x - 7, 43], [x + 7, 43]], c.metal, 2);

    // Raised lid and ventilation.
    ellipse(x, 25, 12, 6, c.accent);
    ellipse(x, 23, 11, 5, c.metal);
    ellipse(x, 22, 6, 2.5, c.wall);
    line([[x - 4, 22], [x + 4, 22]], c.metal);

    light(x - 4, 61, 8, 3);
  }

  // Rear transfer manifold.
  pipe([[24, 28], [24, 16], [76, 16], [76, 28]]);
  box(43, 13, 5, 6, c.accent);
  box(55, 13, 5, 6, c.accent);

  // Low equipment platform.
  box(14, 57, 72, 23, c.wall);
  box(14, 54, 72, 19, '#475569');

  tank(24);
  tank(76);

  // Tank connections, partly hidden by the processor.
  pipe([[34, 48], [42, 48], [42, 58]]);
  pipe([[66, 48], [58, 48], [58, 58]]);
  box(35, 45, 4, 6, c.accent);
  box(61, 45, 4, 6, c.accent);

  // Central processing block.
  box(37, 37, 26, 38, c.wall);
  box(36, 30, 28, 29, c.metal);
  line([[37, 58], [37, 31], [63, 31]], c.highlight);

  box(36, 30, 4, 5, c.accent);
  box(60, 30, 4, 5, c.accent);
  box(36, 54, 4, 5, c.accent);
  box(60, 54, 4, 5, c.accent);

  vent(42, 35, 16, 10);
  line([[39, 50], [61, 50]], '#64748b');
  light(43, 52, 14, 4);

  // Front processing status screen.
  light(42, 62, 16, 7);
  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(44 + i * 3, 67 - i, 2, 1 + i);
  }

  // South-facing spice intake.
  box(36, 72, 28, 18, c.wall);
  box(35, 70, 30, 6, c.metal);
  box(35, 70, 4, 6, c.accent);
  box(61, 70, 4, 6, c.accent);

  box(41, 77, 18, 10, c.outline);
  spiceWindow(43, 79, 14, 6);

  // Intake rollers.
  for (const y of [78, 85]) {
    box(42, y, 16, 2, c.metal);
    box(42, y, 2, 2, c.accent);
    box(56, y, 2, 2, c.accent);
  }

  // Warning indicators and access lip.
  light(37, 79, 3, 5, c.amber);
  light(60, 79, 3, 5, c.amber);
  box(39, 90, 22, 4, c.metal);

  // Side pump cabinets.
  for (const x of [13, 75]) {
    box(x, 69, 12, 14, c.wall);
    box(x, 67, 12, 5, c.metal);
    vent(x + 2, 73, 8, 5);
    light(x + 3, 79, 6, 3);
    box(x, 81, 4, 3, c.accent);
    box(x + 8, 81, 4, 3, c.accent);
  }

  ctx.restore();
}

function drawResearchCenter(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, time: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#ec4899',
    cyan: '#22d3ee',
    glass: '#164e63',
    violet: '#a78bfa'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function wing(x: number) {
    box(x, 47, 25, 28, c.wall);
    box(x, 39, 25, 23, c.metal);
    line(
      [[x + 1, 61], [x + 1, 40], [x + 24, 40]],
      c.highlight
    );

    vent(x + 7, 43, 11, 7);
    line([[x + 2, 55], [x + 23, 55]], '#64748b');

    box(x, 39, 4, 5, c.accent);
    box(x + 21, 39, 4, 5, c.accent);

    // Observation window and laboratory equipment.
    box(x + 3, 64, 19, 8, c.outline);
    box(x + 4, 65, 17, 6, c.glass);

    line([[x + 5, 69], [x + 20, 69]], c.metal);

    for (const offset of [7, 11, 15]) {
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(x + offset, 66, 2, 3);
    }

    line([[x + 5, 65.5], [x + 12, 65.5]], c.cyan);
    box(x + 1, 72, 4, 4, c.accent);
    box(x + 20, 72, 4, 4, c.accent);
  }

  // Connections behind the research wings.
  box(27, 48, 46, 11, c.wall);
  light(29, 51, 8, 4);
  light(63, 51, 8, 4);

  wing(8);
  wing(67);

  // Central laboratory walls and chamfered roof.
  box(34, 30, 32, 43, c.wall);

  polygon([
    [40, 20], [60, 20],
    [68, 28], [68, 49],
    [60, 57], [40, 57],
    [32, 49], [32, 28]
  ], c.metal);

  line([[33, 29], [41, 21], [59, 21]], c.highlight);

  // Blue observation skylight.
  polygon([
    [43, 27], [57, 27],
    [61, 32], [61, 44],
    [57, 49], [43, 49],
    [39, 44], [39, 32]
  ], c.glass);

  // Research bench beneath the glass.
  box(43, 37, 14, 6, '#475569');
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(45, 34, 2, 5);
  ctx.fillRect(53, 35, 2, 4);

  line([[50, 27], [50, 49]], c.metal, 1.5);
  line([[39, 38], [61, 38]], c.metal, 1.5);
  line([[43, 28], [56, 28]], '#a5f3fc', 0.8);

  vent(43, 51, 14, 4);

  for (const x of [33, 63]) {
    box(x, 27, 4, 6, c.accent);
    box(x, 46, 4, 6, c.accent);
  }

  // Specimen chamber connection.
  line([[67, 31], [80, 31]], c.outline, 6);
  line([[67, 31], [80, 31]], c.metal, 4);

  // Raised violet specimen chamber.
  box(75, 15, 14, 23, c.wall);
  box(77, 19, 10, 15, '#2e1065');

  polygon([
    [82, 21], [85, 26],
    [83, 32], [79, 28]
  ], c.violet);

  line([[82, 22], [82, 30]], '#ede9fe');
  ellipse(82, 37, 8, 3.5, c.accent);
  ellipse(82, 15, 8, 4, c.accent);
  ellipse(82, 13, 6, 3, c.metal);
  light(80, 9, 4, 4);

  // South-facing entrance canopy.
  box(38, 65, 24, 20, c.wall);
  box(37, 62, 26, 8, c.metal);
  box(37, 62, 4, 8, c.accent);
  box(59, 62, 4, 8, c.accent);
  light(44, 64, 12, 4);

  box(43, 73, 14, 12, c.outline);
  box(44, 74, 12, 10, c.glass);
  line([[50, 74], [50, 84]], c.metal);
  light(45, 76, 3, 6);
  light(52, 76, 3, 6);

  // Access steps.
  box(40, 85, 20, 8, c.wall);
  for (let y = 87; y < 93; y += 2) {
    line([[42, y], [58, y]], c.metal);
  }
  box(38, 85, 2, 8, c.accent);
  box(60, 85, 2, 8, c.accent);

  ctx.restore();
}

function drawLaunchpad(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    deck: '#475569',
    highlight: '#cbd5e1',
    accent: '#64748b',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function octagon(x: number, y: number, w: number, h: number, corner: number): number[][] {
    return [
      [x + corner, y],
      [x + w - corner, y],
      [x + w, y + corner],
      [x + w, y + h - corner],
      [x + w - corner, y + h],
      [x + corner, y + h],
      [x, y + h - corner],
      [x, y + corner]
    ];
  }

  function beacon(x: number, y: number) {
    box(x - 4, y + 2, 8, 8, c.wall);
    ellipse(x, y + 3, 5, 2.5, c.accent);
    box(x - 2, y - 3, 4, 6, c.metal);
    light(x - 2, y - 4, 4, 4, c.amber);
  }

  // Visible platform thickness beneath the deck.
  polygon(octagon(12, 21, 76, 59, 12), c.wall);

  // Raised armored perimeter and recessed landing surface.
  polygon(octagon(12, 16, 76, 59, 12), c.metal);
  polygon(octagon(18, 21, 64, 48, 10), c.deck);

  line([[13, 29], [25, 17], [75, 17]], c.highlight);
  line([[24, 74], [76, 74], [87, 63]], c.outline, 2);

  // Subtle deck panel seams.
  line([[35, 22], [35, 68]], '#334155');
  line([[65, 22], [65, 68]], '#334155');
  line([[19, 45], [81, 45]], '#334155');

  // Cyan landing ring, flattened to match the perspective.
  ctx.strokeStyle = c.cyan;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 4; i++) {
    const start = i * Math.PI / 2 + 0.18;
    ctx.beginPath();
    ctx.ellipse(
      50, 45, 19, 13,
      0, start, start + Math.PI / 2 - 0.36
    );
    ctx.stroke();
  }

  ctx.lineWidth = 1;
  ellipse(50, 45, 2.5, 1.8, '#164e63');

  // Landing alignment guides.
  line([[50, 27], [50, 36]], c.cyan, 1.5);
  line([[50, 54], [50, 63]], c.cyan, 1.5);
  line([[25, 45], [39, 45]], c.cyan, 1.5);
  line([[61, 45], [75, 45]], c.cyan, 1.5);

  // Hazard markers along north and south edges.
  for (const x of [29, 39, 59, 69]) {
    box(x, 18, 5, 2, c.amber);
    box(x, 71, 5, 2, c.amber);
  }

  // Integrated perimeter conduits.
  for (const x of [10, 87]) {
    box(x, 35, 3, 23, c.wall);
    box(x, 39, 3, 4, c.accent);
    box(x, 51, 3, 4, c.accent);
  }

  // Corner approach beacons.
  beacon(23, 19);
  beacon(77, 19);
  beacon(23, 68);
  beacon(77, 68);

  // South-facing launch control cabinet.
  box(40, 73, 20, 11, c.wall);
  box(39, 71, 22, 5, c.metal);
  box(39, 71, 4, 5, c.accent);
  box(57, 71, 4, 5, c.accent);
  light(44, 77, 12, 4);

  // Short access ramp.
  box(37, 84, 26, 10, c.wall);
  for (let y = 86; y < 94; y += 2) {
    line([[40, y], [60, y]], c.metal);
  }

  for (const x of [38, 61]) {
    for (const y of [85, 89, 93]) {
      box(x, y, 1.5, 1, c.amber);
    }
  }

  ctx.restore();
}

function drawRadar(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, time: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#06b6d4',
    cyan: '#22d3ee',
    amber: '#fbbf24',
    glass: '#164e63'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function sensorPod(x: number, y: number) {
    box(x - 6, y, 12, 10, c.wall);
    ellipse(x, y + 9, 7, 3, c.accent);
    ellipse(x, y, 7, 4, c.metal);
    ellipse(x, y - 1, 3, 1.8, c.cyan);
    light(x - 3, y + 4, 6, 3);
  }

  // Seismic cables beneath the station.
  for (const points of [
    [[23, 68], [37, 68], [42, 75]],
    [[77, 68], [63, 68], [58, 75]]
  ]) {
    line(points, c.outline, 5);
    line(points, c.metal, 3);
  }

  sensorPod(20, 64);
  sensorPod(80, 64);

  // Raised monitoring station.
  box(32, 62, 36, 23, c.wall);
  polygon([
    [37, 55], [63, 55],
    [69, 61], [69, 71],
    [63, 77], [37, 77],
    [31, 71], [31, 61]
  ], c.metal);

  line([[32, 62], [38, 56], [62, 56]], c.highlight);
  box(32, 61, 4, 6, c.accent);
  box(64, 61, 4, 6, c.accent);

  // Braced radar mast.
  line([[39, 61], [47, 30]], c.outline, 6);
  line([[39, 61], [47, 30]], c.metal, 4);
  line([[61, 61], [53, 30]], c.outline, 6);
  line([[61, 61], [53, 30]], c.metal, 4);

  line([[42, 49], [58, 49]], c.wall, 3);
  line([[44, 40], [56, 40]], c.wall, 3);
  box(47, 28, 6, 34, c.wall);
  light(48, 42, 4, 11);

  // Scanner pedestal.
  ellipse(50, 30, 8, 4, c.accent);
  box(46, 20, 8, 10, c.metal);

  // Wide storm radar housing and visible lower edge.
  box(19, 15, 62, 14, c.wall);
  polygon([
    [23, 10], [77, 10],
    [82, 15], [82, 23],
    [77, 27], [23, 27],
    [18, 23], [18, 15]
  ], c.metal);

  box(23, 14, 54, 9, c.glass);

  // Scanner grid.
  for (let x = 29; x < 77; x += 6) {
    line([[x, 15], [x, 22]], '#0891b2', 0.6);
  }
  line([[24, 18.5], [76, 18.5]], '#0891b2', 0.6);

  line([[24, 14.5], [76, 14.5]], c.cyan, 0.8);
  box(19, 13, 4, 7, c.accent);
  box(77, 13, 4, 7, c.accent);

  // Weather sensor and warning beacon.
  box(48, 5, 4, 5, c.wall);
  light(48, 3, 4, 4, c.amber);

  line([[73, 56], [73, 36]], c.metal, 2);
  line([[69, 38], [77, 38]], c.metal, 1.5);
  ellipse(69, 38, 2, 1, c.accent);
  ellipse(77, 38, 2, 1, c.accent);

  // Monitoring screen.
  light(39, 65, 22, 9);

  // Seismic waveform within the display.
  line([
    [41, 70], [44, 70], [46, 67],
    [48, 72], [50, 68], [52, 70],
    [55, 70], [57, 68], [59, 70]
  ], '#cffafe', 0.8);

  // South-facing service door.
  box(43, 78, 14, 10, c.outline);
  box(44, 79, 12, 8, c.glass);
  line([[50, 79], [50, 87]], c.metal);
  light(45, 80, 3, 5);
  light(52, 80, 3, 5);

  // Access steps.
  box(40, 88, 20, 6, c.wall);
  line([[42, 90], [58, 90]], c.metal);
  line([[42, 93], [58, 93]], c.metal);
  box(38, 88, 2, 6, c.accent);
  box(60, 88, 2, 6, c.accent);

  ctx.restore();
}

function drawMedicalBay(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, time: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    roof: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#22d3ee',
    cyan: '#22d3ee',
    glass: '#164e63'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(time * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function medicalCross(x: number, y: number, size: number) {
    const arm = size / 3;

    // Dark backing stays put so the beacon has a socket when the cross is dark.
    box(x - 1, y - 1, size + 2, size + 2, c.wall);
    const lit = Math.floor(time / 450) % 2 === 0;
    if (!lit) return;

    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + arm, y, arm, size);
    ctx.fillRect(x, y + arm, size, arm);

    ctx.fillStyle = '#cffafe';
    ctx.fillRect(x + arm + 0.7, y + 0.7, arm - 1.4, size - 1.4);
  }

  function wing(x: number) {
    // Raised roof and visible south-facing wall.
    box(x, 42, 25, 31, c.wall);
    box(x, 33, 25, 25, c.roof);
    line(
      [[x + 1, 57], [x + 1, 34], [x + 24, 34]],
      c.highlight
    );

    vent(x + 7, 38, 11, 7);
    line([[x + 2, 50], [x + 23, 50]], '#64748b');

    box(x, 33, 4, 5, c.accent);
    box(x + 21, 33, 4, 5, c.accent);
    box(x, 69, 4, 4, c.accent);
    box(x + 21, 69, 4, 4, c.accent);

    // Treatment-room observation window.
    box(x + 3, 60, 19, 9, c.outline);
    box(x + 4, 61, 17, 7, c.glass);

    // Bed and monitor silhouettes.
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(x + 6, 65, 8, 2);
    ctx.fillRect(x + 6, 63, 3, 2);
    ctx.fillRect(x + 16, 62, 3, 3);
    line([[x + 17, 65], [x + 17, 67]], c.roof);

    line([[x + 5, 61.5], [x + 13, 61.5]], c.cyan);
  }

  // Connectors behind the treatment wings.
  box(27, 44, 46, 12, c.wall);
  light(28, 47, 9, 4);
  light(63, 47, 9, 4);

  wing(8);
  wing(67);

  // Central pavilion walls.
  box(33, 29, 34, 43, c.wall);

  // Chamfered armored roof.
  ctx.beginPath();
  ctx.moveTo(39, 20);
  ctx.lineTo(61, 20);
  ctx.lineTo(68, 27);
  ctx.lineTo(68, 49);
  ctx.lineTo(61, 56);
  ctx.lineTo(39, 56);
  ctx.lineTo(32, 49);
  ctx.lineTo(32, 27);
  ctx.closePath();
  ctx.fillStyle = c.roof;
  ctx.fill();
  ctx.strokeStyle = c.outline;
  ctx.stroke();

  line([[33, 28], [40, 21], [60, 21]], c.highlight);
  line([[34, 48], [40, 54], [60, 54], [66, 48]], '#64748b');

  // Corner armor and roof medical symbol.
  box(33, 25, 4, 7, c.accent);
  box(63, 25, 4, 7, c.accent);
  box(33, 45, 4, 7, c.accent);
  box(63, 45, 4, 7, c.accent);
  medicalCross(42, 29, 16);

  vent(43, 48, 14, 5);

  // Front wall indicators.
  light(36, 60, 5, 7);
  light(59, 60, 5, 7);

  // Raised entrance canopy.
  box(39, 65, 22, 17, c.wall);
  box(37, 62, 26, 8, c.roof);
  box(37, 62, 4, 8, c.accent);
  box(58, 62, 4, 8, c.accent);
  light(44, 64, 12, 4);

  // Double airlock doors.
  box(43, 72, 14, 11, c.outline);
  box(44, 73, 12, 9, c.glass);
  line([[50, 73], [50, 82]], c.roof);
  light(45, 75, 3, 5);
  light(52, 75, 3, 5);

  // Short access ramp.
  box(40, 83, 20, 9, c.wall);
  for (let y = 85; y < 92; y += 2) {
    line([[42, y], [58, y]], c.roof);
  }
  box(38, 83, 2, 9, c.accent);
  box(60, 83, 2, 9, c.accent);

  ctx.restore();
}





function drawHarvesterGarage(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    roof: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#f97316',
    cyan: '#f97316',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function arm(points: number[][]) {
    line(points, c.outline, 5);
    line(points, c.roof, 3);

    for (let i = 0; i < points.length - 1; i++) {
      ellipse(points[i][0], points[i][1], 2.5, 2.5, c.orange);
    }

    const [x, y] = points[points.length - 1];
    line([[x - 2, y + 1], [x - 3, y + 4]], c.roof, 2);
    line([[x + 2, y + 1], [x + 3, y + 4]], c.roof, 2);
  }

  // Raised servicing deck and visible front thickness.
  box(17, 42, 66, 43, c.wall);
  box(18, 39, 64, 42, '#475569');

  // Recessed maintenance channel.
  box(40, 46, 20, 32, c.outline);
  box(43, 47, 14, 30, '#1e293b');

  // Track rails accommodate a harvester.
  for (const x of [29, 64]) {
    box(x, 44, 7, 35, c.wall);
    line([[x + 1, 45], [x + 1, 78]], c.highlight);

    for (let y = 47; y < 79; y += 5) {
      line([[x + 1, y], [x + 6, y]], c.roof);
    }
  }

  // Rear garage section.
  box(18, 21, 64, 24, c.wall);
  box(17, 13, 66, 23, c.roof);
  line([[18, 35], [18, 14], [82, 14]], c.highlight);
  line([[50, 15], [50, 34]], '#64748b');

  vent(25, 19, 15, 8);
  vent(60, 19, 15, 8);
  light(43, 20, 14, 6);

  // Rear recessed shutter.
  box(35, 37, 30, 8, c.outline);
  for (let y = 39; y < 45; y += 2) {
    line([[37, y], [63, y]], c.wall);
  }

  // Side service cabinets.
  for (const x of [9, 79]) {
    box(x, 47, 12, 29, c.wall);
    box(x, 43, 12, 9, c.roof);
    vent(x + 2, 56, 8, 9);
    light(x + 3, 68, 6, 4);
    box(x, 73, 4, 4, c.orange);
    box(x + 8, 73, 4, 4, c.orange);
  }

  // Articulated repair arms over the bay.
  arm([[23, 53], [31, 58], [35, 66]]);
  arm([[77, 53], [69, 58], [65, 66]]);

  // Gantry uprights and their south-facing walls.
  box(20, 35, 7, 38, c.wall);
  box(73, 35, 7, 38, c.wall);
  box(19, 32, 9, 8, c.roof);
  box(72, 32, 9, 8, c.roof);
  light(22, 45, 3, 12);
  light(75, 45, 3, 12);

  // Raised overhead beam.
  box(20, 33, 60, 7, c.wall);
  box(19, 29, 62, 6, c.roof);
  line([[20, 30], [80, 30]], c.highlight);
  box(19, 29, 6, 6, c.orange);
  box(75, 29, 6, 6, c.orange);

  // Suspended hoist and open gripping hook.
  box(44, 31, 12, 7, c.orange);
  light(47, 33, 6, 3);
  line([[50, 38], [50, 46]], c.outline, 2);
  box(47, 45, 6, 5, c.roof);
  line([[48, 50], [46, 53], [47, 55]], c.wall, 2);
  line([[52, 50], [54, 53], [53, 55]], c.wall, 2);

  // South-facing access ramp.
  box(27, 81, 46, 12, c.wall);
  for (let y = 84; y < 93; y += 3) {
    line([[31, y], [69, y]], c.roof);
  }

  // Hazard markers along the ramp sides.
  for (let y = 82; y < 92; y += 4) {
    box(28, y, 2, 2, c.amber);
    box(70, y, 2, 2, c.amber);
  }

  // Entry beacons.
  light(20, 76, 6, 4, c.amber);
  light(74, 76, 6, 4, c.amber);

  ctx.restore();
}


function drawBuildingPad(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  const padInset = 4;
  const rx = px + padInset;
  const ry = py + padInset;
  const rw = pw - padInset * 2;
  const rh = ph - padInset * 2;

  if (rw <= 0 || rh <= 0) return;

  ctx.save();

  const unit = Math.min(rw, rh);
  const rim = Math.min(5, unit * 0.08);
  const depth = Math.min(3, unit * 0.05);
  const nodeSize = Math.min(8, unit * 0.14);

  // South-facing edge gives the foundation thickness.
  ctx.fillStyle = '#111827';
  ctx.fillRect(rx, ry + depth, rw, rh);

  // Armored perimeter.
  ctx.fillStyle = '#475569';
  ctx.fillRect(rx, ry, rw, rh);

  // Recessed deck.
  ctx.fillStyle = '#263b38';
  ctx.fillRect(
    rx + rim,
    ry + rim,
    rw - rim * 2,
    rh - rim * 2
  );

  // Light catches the north and west edges.
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(rx, ry + rh);
  ctx.lineTo(rx, ry);
  ctx.lineTo(rx + rw, ry);
  ctx.stroke();

  // Dark south and east edges.
  ctx.strokeStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(rx + rw, ry);
  ctx.lineTo(rx + rw, ry + rh);
  ctx.lineTo(rx, ry + rh);
  ctx.stroke();

  // Subtle deck seams.
  ctx.strokeStyle = '#172b29';
  ctx.beginPath();

  for (const fraction of [1 / 3, 2 / 3]) {
    const sx = rx + rw * fraction;
    const sy = ry + rh * fraction;

    ctx.moveTo(sx, ry + rim);
    ctx.lineTo(sx, ry + rh - rim);

    ctx.moveTo(rx + rim, sy);
    ctx.lineTo(rx + rw - rim, sy);
  }

  ctx.stroke();

  // Accent inside the metal rim.
  ctx.strokeStyle = '#34d399';
  ctx.globalAlpha = 0.55;
  ctx.strokeRect(
    rx + rim,
    ry + rim,
    rw - rim * 2,
    rh - rim * 2
  );
  ctx.globalAlpha = 1;

  // Four corners and four side midpoints.
  const offset = Math.max(rim / 2, nodeSize / 2);
  const left = rx + offset;
  const right = rx + rw - offset;
  const top = ry + offset;
  const bottom = ry + rh - offset;
  const midX = rx + rw / 2;
  const midY = ry + rh / 2;

  const nodes = [
    [left, top],
    [midX, top],
    [right, top],
    [right, midY],
    [right, bottom],
    [midX, bottom],
    [left, bottom],
    [left, midY]
  ];

  for (const [nx, ny] of nodes) {
    const half = nodeSize / 2;

    // Metal socket housing.
    ctx.fillStyle = '#111827';
    ctx.fillRect(nx - half, ny - half, nodeSize, nodeSize);

    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(nx - half, ny - half, nodeSize, nodeSize);

    // Cyan mounting point.
    ctx.fillStyle = '#0891b2';
    ctx.beginPath();
    ctx.arc(nx, ny, nodeSize * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a5f3fc';
    ctx.beginPath();
    ctx.arc(nx, ny, nodeSize * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMiner(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    accent: '#b45309',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string | CanvasGradient | CanvasPattern) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function rock(x: number, y: number, size: number) {
    polygon([
      [x, y - size],
      [x + size, y - size * 0.2],
      [x + size * 0.6, y + size],
      [x - size * 0.7, y + size * 0.6],
      [x - size, y - size * 0.2]
    ], '#64748b');

    line(
      [[x - size * 0.6, y], [x, y - size * 0.6],
       [x + size * 0.5, y - size * 0.1]],
      c.highlight,
      0.7
    );
  }

  // Raised equipment platform.
  box(12, 53, 58, 30, c.wall);
  box(12, 49, 58, 27, '#475569');
  line([[13, 75], [13, 50], [69, 50]], c.metal);

  // Metal-lined extraction shaft.
  ellipse(42, 58, 18, 12, c.accent);
  ellipse(42, 57, 16, 10, c.metal);
  ellipse(42, 57, 12, 7, c.outline);

  // Conveyor leading to the ore hopper.
  box(59, 56, 26, 12, c.wall);
  box(59, 53, 26, 10, c.outline);
  for (let x = 61; x < 85; x += 4) {
    line([[x, 54], [x, 62]], '#64748b');
  }
  rock(65, 58, 2);
  rock(74, 58, 2.4);

  // Ore collection hopper.
  box(76, 43, 18, 28, c.wall);
  box(75, 39, 20, 26, c.metal);
  box(78, 42, 14, 19, c.outline);

  for (const [x, y, size] of [
    [82, 47, 2.5], [88, 47, 2.4],
    [84, 53, 3], [89, 57, 2.3],
    [81, 58, 2.2]
  ]) {
    rock(x, y, size);
  }

  for (const x of [75, 91]) {
    box(x, 39, 4, 4, c.accent);
    box(x, 61, 4, 4, c.accent);
  }
  light(80, 67, 10, 3);

  // Rear gantry braces.
  line([[26, 24], [34, 45]], c.outline, 5);
  line([[26, 24], [34, 45]], c.metal, 3);
  line([[58, 24], [50, 45]], c.outline, 5);
  line([[58, 24], [50, 45]], c.metal, 3);

  // Drill shaft.
  box(38, 28, 8, 29, c.wall);
  box(40, 29, 3, 27, c.metal);

  // Spiral cutting flights.
  for (let y = 35; y <= 53; y += 6) {
    polygon([
      [36, y], [46, y - 3],
      [48, y], [38, y + 4]
    ], c.metal);

    line([[37, y], [46, y - 2]], c.highlight);
  }

  polygon([[38, 57], [46, 57], [42, 63]], c.metal);

  // Tall gantry columns.
  for (const x of [23, 55]) {
    box(x, 20, 6, 43, c.wall);
    box(x, 20, 3, 39, c.metal);
    box(x - 1, 57, 8, 7, c.accent);
    light(x + 1, 32, 4, 11);
  }

  // Overhead beam.
  box(23, 20, 38, 7, c.wall);
  box(22, 16, 40, 7, c.metal);
  line([[23, 17], [61, 17]], c.highlight);
  box(22, 16, 5, 7, c.accent);
  box(57, 16, 5, 7, c.accent);

  // Drill motor mounted above the shaft.
  box(35, 13, 14, 16, c.wall);
  box(34, 10, 16, 13, c.metal);
  vent(38, 12, 8, 6);
  box(35, 24, 14, 4, c.accent);
  light(39, 20, 6, 3);

  // Top warning beacon.
  box(40, 5, 4, 5, c.wall);
  light(40, 4, 4, 4, c.amber);

  // South-facing operations cabin.
  box(19, 70, 46, 18, c.wall);
  box(18, 66, 48, 10, c.metal);
  box(18, 66, 5, 10, c.accent);
  box(61, 66, 5, 10, c.accent);

  vent(25, 68, 11, 6);
  light(43, 68, 15, 5);

  box(37, 78, 14, 10, c.outline);
  box(38, 79, 12, 8, '#164e63');
  line([[44, 79], [44, 87]], c.metal);
  light(39, 80, 3, 5);
  light(46, 80, 3, 5);

  // Access steps.
  box(34, 88, 20, 6, c.wall);
  line([[36, 90], [52, 90]], c.metal);
  line([[36, 93], [52, 93]], c.metal);
  box(32, 88, 2, 6, c.accent);
  box(54, 88, 2, 6, c.accent);

  ctx.restore();
}


function drawHarvester(ctx: CanvasRenderingContext2D, h: Harvester, length: number, width: number, isSelected: boolean) {
  const model = h.model || 'scout';

  const colors: Record<HarvesterModel, { hull: string; hullLight: string; hullDark: string; accent: string }> = {
    scout: {
      hull: '#0369a1',
      hullLight: '#0ea5e9',
      hullDark: '#075985',
      accent: '#7dd3fc'
    },
    heavy: {
      hull: '#b45309',
      hullLight: '#f59e0b',
      hullDark: '#78350f',
      accent: '#fbbf24'
    },
    titan: {
      hull: '#701a75',
      hullLight: '#a21caf',
      hullDark: '#4a044e',
      accent: '#e879f9'
    }
  };

  const c = colors[model] || colors.scout;

  // Draw back-to-front
  drawTracks(ctx, model, length, width);
  drawHull(ctx, model, length, width, c, isSelected);
  drawCargoTank(ctx, h, length, width);
  drawEngineDetails(ctx, model, length, width, c);
  drawHarvesterHead(ctx, model, length, width);
}


// ------------------------------------------------------------
// TRACKS / WHEELS
// ------------------------------------------------------------

function drawTracks(ctx: CanvasRenderingContext2D, model: HarvesterModel, length: number, width: number) {
  const trackOffset = width / 2;

  ctx.save();

  ctx.fillStyle = '#1c1917';
  ctx.strokeStyle = '#44403c';
  ctx.lineWidth = 1;

  if (model === 'titan') {
    // Large continuous crawler tracks
    drawTrack(
      ctx,
      -length / 2 - 2,
      -trackOffset - 5,
      length + 4,
      7,
      5
    );

    drawTrack(
      ctx,
      -length / 2 - 2,
      trackOffset - 2,
      length + 4,
      7,
      5
    );

  } else if (model === 'heavy') {
    // Chunky segmented tracks
    drawTrack(
      ctx,
      -length / 2,
      -trackOffset - 4,
      length,
      6,
      4
    );

    drawTrack(
      ctx,
      -length / 2,
      trackOffset - 2,
      length,
      6,
      4
    );

  } else {
    // Scout uses four independent wheel/track pods
    const podLength = Math.max(7, length * 0.22);

    drawWheelPod(
      ctx,
      -length / 2 + 2,
      -trackOffset - 3,
      podLength,
      5
    );

    drawWheelPod(
      ctx,
      length / 2 - podLength - 2,
      -trackOffset - 3,
      podLength,
      5
    );

    drawWheelPod(
      ctx,
      -length / 2 + 2,
      trackOffset - 2,
      podLength,
      5
    );

    drawWheelPod(
      ctx,
      length / 2 - podLength - 2,
      trackOffset - 2,
      podLength,
      5
    );
  }

  ctx.restore();
}


function drawTrack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, segments: number) {
  // Outer track
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#57534e';
  ctx.strokeRect(x, y, w, h);

  // Track plates
  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 0.7;

  const segmentWidth = w / segments;

  for (let i = 1; i < segments; i++) {
    const sx = x + i * segmentWidth;

    ctx.beginPath();
    ctx.moveTo(sx, y + 1);
    ctx.lineTo(sx, y + h - 1);
    ctx.stroke();
  }

  // Inner mechanical strip
  ctx.fillStyle = '#292524';
  ctx.fillRect(
    x + 2,
    y + h * 0.3,
    w - 4,
    h * 0.4
  );
}


function drawWheelPod(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#57534e';
  ctx.strokeRect(x, y, w, h);

  // Wheel hubs
  ctx.fillStyle = '#78716c';

  ctx.beginPath();
  ctx.arc(x + 2.5, y + h / 2, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + w - 2.5, y + h / 2, 1.5, 0, Math.PI * 2);
  ctx.fill();
}


// ------------------------------------------------------------
// MAIN HULL
// ------------------------------------------------------------

function drawHull(ctx: CanvasRenderingContext2D, model: HarvesterModel, length: number, width: number, c: { hull: string; hullLight: string; hullDark: string; accent: string }, isSelected: boolean) {
  ctx.save();

  // Main hull
  ctx.fillStyle = c.hull;

  ctx.fillRect(
    -length / 2,
    -width / 2,
    length,
    width
  );

  // Top highlight creates a beveled appearance
  ctx.fillStyle = c.hullLight;

  ctx.beginPath();
  ctx.moveTo(-length / 2 + 2, -width / 2 + 2);
  ctx.lineTo(length / 2 - 3, -width / 2 + 2);
  ctx.lineTo(length / 2 - 6, -width / 2 + 5);
  ctx.lineTo(-length / 2 + 4, -width / 2 + 5);
  ctx.closePath();
  ctx.fill();

  // Lower shadow
  ctx.fillStyle = c.hullDark;

  ctx.fillRect(
    -length / 2 + 2,
    width / 2 - 4,
    length - 4,
    3
  );

  // Front armour
  ctx.fillStyle = c.hullDark;

  ctx.beginPath();
  ctx.moveTo(length / 2 - 6, -width / 2);
  ctx.lineTo(length / 2, -width * 0.32);
  ctx.lineTo(length / 2, width * 0.32);
  ctx.lineTo(length / 2 - 6, width / 2);
  ctx.closePath();
  ctx.fill();

  // Outline / selection
  ctx.strokeStyle = isSelected
    ? '#38bdf8'
    : 'rgba(255,255,255,0.45)';

  ctx.lineWidth = isSelected ? 2.5 : 1;

  ctx.strokeRect(
    -length / 2,
    -width / 2,
    length,
    width
  );

  if (isSelected) {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;

    ctx.strokeRect(
      -length / 2 - 1,
      -width / 2 - 1,
      length + 2,
      width + 2
    );

    ctx.shadowBlur = 0;
  }

  ctx.restore();
}


// ------------------------------------------------------------
// SPICE CARGO TANK
// ------------------------------------------------------------

function drawCargoTank(ctx: CanvasRenderingContext2D, h: Harvester, length: number, width: number) {
  const maxCargo = Math.max(1, h.maxCargo || 1);

  const cargoFillRatio = Math.max(
    0,
    Math.min(1, (h.cargo || 0) / maxCargo)
  );

  const tankX = -length * 0.34;
  const tankY = -width * 0.28;

  const tankWidth = length * 0.43;
  const tankHeight = width * 0.56;

  // Tank frame
  ctx.fillStyle = '#0f172a';

  ctx.fillRect(
    tankX - 1,
    tankY - 1,
    tankWidth + 2,
    tankHeight + 2
  );

  // Empty tank
  ctx.fillStyle = '#1e293b';

  ctx.fillRect(
    tankX,
    tankY,
    tankWidth,
    tankHeight
  );

  // Spice
  if (cargoFillRatio > 0) {
    const fillWidth = tankWidth * cargoFillRatio;

    ctx.save();

    const isOre = h.miningTarget === 'ore';
    ctx.fillStyle = isOre 
      ? (cargoFillRatio > 0.9 ? '#fdba74' : cargoFillRatio > 0.65 ? '#f97316' : '#ea580c')
      : (cargoFillRatio > 0.9 ? '#f472b6' : cargoFillRatio > 0.65 ? '#d946ef' : '#a855f7');

    ctx.shadowColor = isOre ? '#f97316' : '#d946ef';
    ctx.shadowBlur = 5;

    ctx.fillRect(
      tankX,
      tankY,
      fillWidth,
      tankHeight
    );

    ctx.restore();
  }

  // Tank ribs
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.7;

  for (let i = 1; i < 4; i++) {
    const x = tankX + (tankWidth / 4) * i;

    ctx.beginPath();
    ctx.moveTo(x, tankY);
    ctx.lineTo(x, tankY + tankHeight);
    ctx.stroke();
  }
}


// ------------------------------------------------------------
// ENGINE / MACHINE DETAILS
// ------------------------------------------------------------

function drawEngineDetails(ctx: CanvasRenderingContext2D, model: HarvesterModel, length: number, width: number, c: { hull: string; hullLight: string; hullDark: string; accent: string }) {
  // Rear engine compartment
  const engineX = -length / 2 + 3;

  ctx.fillStyle = c.hullDark;

  ctx.fillRect(
    engineX,
    -width * 0.32,
    length * 0.13,
    width * 0.64
  );

  // Cooling vents
  ctx.strokeStyle = '#d6d3d1';
  ctx.lineWidth = 0.7;

  for (let i = 0; i < 3; i++) {
    const x = engineX + 2 + i * 2;

    ctx.beginPath();
    ctx.moveTo(x, -width * 0.22);
    ctx.lineTo(x, width * 0.22);
    ctx.stroke();
  }

  // Small warning / status light
  ctx.fillStyle = '#22c55e';

  ctx.beginPath();
  ctx.arc(
    length * 0.16,
    -width * 0.32,
    1.2,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Titan gets additional armour plating
  if (model === 'titan') {
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-length * 0.1, -width / 2 + 2);
    ctx.lineTo(length * 0.25, -width / 2 + 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-length * 0.1, width / 2 - 2);
    ctx.lineTo(length * 0.25, width / 2 - 2);
    ctx.stroke();
  }
}


// ------------------------------------------------------------
// HARVESTING HEAD
// ------------------------------------------------------------

function drawHarvesterHead(ctx: CanvasRenderingContext2D, model: HarvesterModel, length: number, width: number) {
  const frontX = length / 2;

  const headLength =
    model === 'titan' ? 9 :
    model === 'heavy' ? 8 :
    6;

  const headWidth =
    model === 'titan'
      ? width * 0.9
      : width * 0.72;

  ctx.save();

  // Mechanical arm
  ctx.fillStyle = '#78716c';

  ctx.fillRect(
    frontX - 1,
    -headWidth * 0.28,
    4,
    headWidth * 0.56
  );

  // Main harvesting scoop
  ctx.fillStyle = '#cbd5e1';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(
    frontX + 2,
    -headWidth / 2
  );

  ctx.lineTo(
    frontX + headLength,
    -headWidth * 0.35
  );

  ctx.lineTo(
    frontX + headLength + 2,
    0
  );

  ctx.lineTo(
    frontX + headLength,
    headWidth * 0.35
  );

  ctx.lineTo(
    frontX + 2,
    headWidth / 2
  );

  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Cutting teeth
  ctx.fillStyle = '#94a3b8';

  const teeth = model === 'titan' ? 5 : 4;

  for (let i = 0; i < teeth; i++) {
    const y =
      -headWidth * 0.35 +
      (i * headWidth * 0.7) / (teeth - 1);

    ctx.beginPath();

    ctx.moveTo(
      frontX + headLength,
      y - 1
    );

    ctx.lineTo(
      frontX + headLength + 4,
      y
    );

    ctx.lineTo(
      frontX + headLength,
      y + 1
    );

    ctx.closePath();

    ctx.fill();
  }

  // Central intake
  ctx.fillStyle = '#292524';

  ctx.beginPath();

  ctx.arc(
    frontX + headLength * 0.55,
    0,
    Math.max(2, width * 0.12),
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.fillStyle = '#f59e0b';

  ctx.beginPath();

  ctx.arc(
    frontX + headLength * 0.55,
    0,
    Math.max(0.8, width * 0.045),
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}


function drawSpiceRefinery(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#f97316',
    cyan: '#f97316',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 7);
    line(points, c.metal, 5);
  }

  function spiceWindow(x: any, y: any, w: any, h: any) {
    const spice = ctx.createLinearGradient(x, y, x + w, y + h);
    spice.addColorStop(0, '#fde68a');
    spice.addColorStop(0.45, '#f59e0b');
    spice.addColorStop(1, '#9a3412');

    box(x, y, w, h, spice as any);

    // Fixed pattern avoids flickering between frames.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, h - 2);
    ctx.clip();

    for (let row = 0; row < Math.ceil(h / 3); row++) {
      for (let col = 0; col < Math.ceil(w / 3); col++) {
        ctx.fillStyle = (row + col) % 3 === 0
          ? '#fde68a'
          : '#d97706';

        ctx.fillRect(
          x + 1 + col * 3 + (row % 2),
          y + 1 + row * 3,
          1.3,
          1.3
        );
      }
    }

    ctx.restore();
  }

  function tank(x: any) {
    // Cylindrical armored casing.
    const shell = ctx.createLinearGradient(x - 11, 0, x + 11, 0);
    shell.addColorStop(0, '#64748b');
    shell.addColorStop(0.35, c.highlight);
    shell.addColorStop(1, c.wall);

    box(x - 11, 25, 22, 37, shell as any);
    ellipse(x, 62, 11, 5, c.wall);

    // Amber processing chamber.
    spiceWindow(x - 7, 32, 14, 23);
    line([[x - 5, 34], [x - 5, 52]], '#fef3c7', 0.8);

    // Reinforcing bands.
    box(x - 11, 28, 22, 4, c.orange);
    box(x - 11, 55, 22, 4, c.orange);
    line([[x - 7, 43], [x + 7, 43]], c.metal, 2);

    // Raised lid and ventilation.
    ellipse(x, 25, 12, 6, c.orange);
    ellipse(x, 23, 11, 5, c.metal);
    ellipse(x, 22, 6, 2.5, c.wall);
    line([[x - 4, 22], [x + 4, 22]], c.metal);

    light(x - 4, 61, 8, 3);
  }

  // Rear transfer manifold.
  pipe([[24, 28], [24, 16], [76, 16], [76, 28]]);
  box(43, 13, 5, 6, c.orange);
  box(55, 13, 5, 6, c.orange);

  // Low equipment platform.
  box(14, 57, 72, 23, c.wall);
  box(14, 54, 72, 19, '#475569');

  tank(24);
  tank(76);

  // Tank connections, partly hidden by the processor.
  pipe([[34, 48], [42, 48], [42, 58]]);
  pipe([[66, 48], [58, 48], [58, 58]]);
  box(35, 45, 4, 6, c.orange);
  box(61, 45, 4, 6, c.orange);

  // Central processing block.
  box(37, 37, 26, 38, c.wall);
  box(36, 30, 28, 29, c.metal);
  line([[37, 58], [37, 31], [63, 31]], c.highlight);

  box(36, 30, 4, 5, c.orange);
  box(60, 30, 4, 5, c.orange);
  box(36, 54, 4, 5, c.orange);
  box(60, 54, 4, 5, c.orange);

  vent(42, 35, 16, 10);
  line([[39, 50], [61, 50]], '#64748b');
  light(43, 52, 14, 4);

  // Front processing status screen.
  light(42, 62, 16, 7);
  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(44 + i * 3, 67 - i, 2, 1 + i);
  }

  // South-facing spice intake.
  box(36, 72, 28, 18, c.wall);
  box(35, 70, 30, 6, c.metal);
  box(35, 70, 4, 6, c.orange);
  box(61, 70, 4, 6, c.orange);

  box(41, 77, 18, 10, c.outline);
  spiceWindow(43, 79, 14, 6);

  // Intake rollers.
  for (const y of [78, 85]) {
    box(42, y, 16, 2, c.metal);
    box(42, y, 2, 2, c.orange);
    box(56, y, 2, 2, c.orange);
  }

  // Warning indicators and access lip.
  light(37, 79, 3, 5, c.amber);
  light(60, 79, 3, 5, c.amber);
  box(39, 90, 22, 4, c.metal);

  // Side pump cabinets.
  for (const x of [13, 75]) {
    box(x, 69, 12, 14, c.wall);
    box(x, 67, 12, 5, c.metal);
    vent(x + 2, 73, 8, 5);
    light(x + 3, 79, 6, 3);
    box(x, 81, 4, 3, c.orange);
    box(x + 8, 81, 4, 3, c.orange);
  }

  ctx.restore();
}


function drawScienceLab(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#a78bfa',
    cyan: '#a78bfa',
    glass: '#164e63',
    violet: '#a78bfa'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: any, y: any, w: any, h: any) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function wing(x: any) {
    box(x, 47, 25, 28, c.wall);
    box(x, 39, 25, 23, c.metal);
    line(
      [[x + 1, 61], [x + 1, 40], [x + 24, 40]],
      c.highlight
    );

    vent(x + 7, 43, 11, 7);
    line([[x + 2, 55], [x + 23, 55]], '#64748b');

    box(x, 39, 4, 5, c.orange);
    box(x + 21, 39, 4, 5, c.orange);

    // Observation window and laboratory equipment.
    box(x + 3, 64, 19, 8, c.outline);
    box(x + 4, 65, 17, 6, c.glass);

    line([[x + 5, 69], [x + 20, 69]], c.metal);

    for (const offset of [7, 11, 15]) {
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(x + offset, 66, 2, 3);
    }

    line([[x + 5, 65.5], [x + 12, 65.5]], c.cyan);
    box(x + 1, 72, 4, 4, c.orange);
    box(x + 20, 72, 4, 4, c.orange);
  }

  // Connections behind the research wings.
  box(27, 48, 46, 11, c.wall);
  light(29, 51, 8, 4);
  light(63, 51, 8, 4);

  wing(8);
  wing(67);

  // Central laboratory walls and chamfered roof.
  box(34, 30, 32, 43, c.wall);

  polygon([
    [40, 20], [60, 20],
    [68, 28], [68, 49],
    [60, 57], [40, 57],
    [32, 49], [32, 28]
  ], c.metal);

  line([[33, 29], [41, 21], [59, 21]], c.highlight);

  // Blue observation skylight.
  polygon([
    [43, 27], [57, 27],
    [61, 32], [61, 44],
    [57, 49], [43, 49],
    [39, 44], [39, 32]
  ], c.glass);

  // Research bench beneath the glass.
  box(43, 37, 14, 6, '#475569');
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(45, 34, 2, 5);
  ctx.fillRect(53, 35, 2, 4);

  line([[50, 27], [50, 49]], c.metal, 1.5);
  line([[39, 38], [61, 38]], c.metal, 1.5);
  line([[43, 28], [56, 28]], '#a5f3fc', 0.8);

  vent(43, 51, 14, 4);

  for (const x of [33, 63]) {
    box(x, 27, 4, 6, c.orange);
    box(x, 46, 4, 6, c.orange);
  }

  // Specimen chamber connection.
  line([[67, 31], [80, 31]], c.outline, 6);
  line([[67, 31], [80, 31]], c.metal, 4);

  // Raised violet specimen chamber.
  box(75, 15, 14, 23, c.wall);
  box(77, 19, 10, 15, '#2e1065');

  polygon([
    [82, 21], [85, 26],
    [83, 32], [79, 28]
  ], c.violet);

  line([[82, 22], [82, 30]], '#ede9fe');
  ellipse(82, 37, 8, 3.5, c.orange);
  ellipse(82, 15, 8, 4, c.orange);
  ellipse(82, 13, 6, 3, c.metal);
  light(80, 9, 4, 4);

  // South-facing entrance canopy.
  box(38, 65, 24, 20, c.wall);
  box(37, 62, 26, 8, c.metal);
  box(37, 62, 4, 8, c.orange);
  box(59, 62, 4, 8, c.orange);
  light(44, 64, 12, 4);

  box(43, 73, 14, 12, c.outline);
  box(44, 74, 12, 10, c.glass);
  line([[50, 74], [50, 84]], c.metal);
  light(45, 76, 3, 6);
  light(52, 76, 3, 6);

  // Access steps.
  box(40, 85, 20, 8, c.wall);
  for (let y = 87; y < 93; y += 2) {
    line([[42, y], [58, y]], c.metal);
  }
  box(38, 85, 2, 8, c.orange);
  box(60, 85, 2, 8, c.orange);

  ctx.restore();
}


type RocketLaunchState = {
  startedAt: number | null;
  queued: boolean;
};

function createRocketLaunchState(): RocketLaunchState {
  return { startedAt: null, queued: false };
}

function triggerRocketLaunch(
  state: RocketLaunchState,
  timeMs: number
) {
  // Prevent repeated triggers from restarting the animation.
  if (state.startedAt === null) {
    state.startedAt = timeMs;
    state.queued = false;
  } else {
    state.queued = true;
  }
}

function resetRocketLaunch(state: RocketLaunchState) {
  state.startedAt = null;
  state.queued = false;
}

// Climb, linger off the pad, then descend onto the same ring.
const ROCKET_IGNITION = 0.8;
const ROCKET_ASCENT_END = 3.8;
const ROCKET_AWAY = 4.2;
const ROCKET_RETURN_START = ROCKET_ASCENT_END + ROCKET_AWAY;
const ROCKET_DESCENT = 2.6;
const ROCKET_TOUCHDOWN = ROCKET_RETURN_START + ROCKET_DESCENT;
const ROCKET_CYCLE_END = ROCKET_TOUCHDOWN + 0.8;

function drawLaunchPadRocket(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  pw: number,
  ph: number,
  state: RocketLaunchState,
  timeMs: number
) {
  if (pw <= 0 || ph <= 0) return;

  const elapsed = state.startedAt === null
    ? -1
    : Math.max(0, (timeMs - state.startedAt) / 1000);

  if (elapsed >= ROCKET_CYCLE_END) return;

  const ascending = elapsed >= 0 && elapsed < ROCKET_ASCENT_END;
  const returning = elapsed >= ROCKET_RETURN_START && elapsed < ROCKET_CYCLE_END;
  let lift = 0;
  if (elapsed >= ROCKET_IGNITION && elapsed < ROCKET_RETURN_START) {
    const flightTime = elapsed - ROCKET_IGNITION;
    lift = 28 * flightTime * flightTime;
  } else if (elapsed >= ROCKET_RETURN_START && elapsed < ROCKET_TOUCHDOWN) {
    const remaining = ROCKET_TOUCHDOWN - elapsed;
    lift = 28 * remaining * remaining;
  }

  let throttle = 0;
  if (ascending) {
    throttle = Math.min(1, elapsed / ROCKET_IGNITION);
  } else if (elapsed >= ROCKET_RETURN_START && elapsed < ROCKET_TOUCHDOWN) {
    const remaining = ROCKET_TOUCHDOWN - elapsed;
    throttle = 0.42 + 0.58 * Math.min(1, remaining / 0.9);
  } else if (elapsed >= ROCKET_TOUCHDOWN && elapsed < ROCKET_CYCLE_END) {
    throttle = Math.max(0, 1 - (elapsed - ROCKET_TOUCHDOWN) / 0.7);
  }
  const firing = throttle > 0.02;

  ctx.save();

  // Exactly the same coordinate system as the pad.
  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([]);

  const c = {
    outline: '#111827',
    dark: '#334155',
    metal: '#94a3b8',
    suit: '#e5e7eb',
    highlight: '#f8fafc',
    orange: '#f97316',
    amber: '#fbbf24'
  };

  function polygon(points: number[][], fill: string, border = true) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  function oval(
    x: number, y: number,
    rx: number, ry: number,
    fill: string, border = true
  ) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    if (border) {
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  function box(
    x: number, y: number,
    width: number, height: number,
    fill: string, border = true
  ) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);

    if (border) {
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x, y, width, height);
    }
  }

  // Shadow shrinks and fades as the rocket rises.
  const shadowAlpha = 0.3 * Math.exp(-lift / 35);

  oval(
    50, 46,
    11 / (1 + lift * 0.015),
    6 / (1 + lift * 0.015),
    `rgba(0, 0, 0, ${shadowAlpha})`,
    false
  );

  // Warm light on the deck during ignition.
  if (firing) {
    const glow = ctx.createRadialGradient(50, 45, 1, 50, 45, 17);
    glow.addColorStop(0, `rgba(251, 191, 36, ${throttle * 0.4})`);
    glow.addColorStop(1, 'rgba(249, 115, 22, 0)');

    ctx.beginPath();
    ctx.ellipse(50, 45, 17, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  // Ground smoke: deterministic particles, no per-frame random values.
  // Each puff lasts 2.2 seconds and spreads away from the pad center.
  // The same burst plays again when the landing burn starts.
  function drawGroundSmoke(origin: number) {
    const ageBase = elapsed - origin;
    if (ageBase < 0) return;
    for (let i = 0; i < 46; i++) {
      const birth = i * 0.08;
      const age = ageBase - birth;
      const lifetime = 2.2;

      if (age < 0 || age >= lifetime) continue;

      const progress = age / lifetime;
      const direction = i * 2.399963;
      const distance = 4 + progress * (18 + (i % 4) * 3);
      const x = 50 + Math.cos(direction) * distance;
      const y = 45 + Math.sin(direction) * distance * 0.48;
      const radius = 2 + progress * 5;
      const alpha = Math.sin(progress * Math.PI) * 0.32;

      oval(
        x, y - progress * 2,
        radius, radius * 0.65,
        `rgba(203, 213, 225, ${alpha})`,
        false
      );
    }
  }

  if (elapsed >= 0) drawGroundSmoke(0);
  if (returning) drawGroundSmoke(ROCKET_RETURN_START);

  // Fade out at the top of the climb, then fade back in as it descends.
  let rocketAlpha = 1;
  if (elapsed >= 0 && elapsed < ROCKET_RETURN_START) {
    rocketAlpha = Math.max(0, Math.min(1, (ROCKET_ASCENT_END - elapsed) / 0.4));
  } else if (returning && elapsed < ROCKET_RETURN_START + 0.45) {
    rocketAlpha = (elapsed - ROCKET_RETURN_START) / 0.45;
  }

  if (rocketAlpha > 0) {
    ctx.save();
    ctx.globalAlpha *= rocketAlpha;

    const vibration = firing
      ? Math.sin(timeMs * 0.065) * 0.12 * throttle
      : 0;

    // Engine nozzle rests over the center of the landing ring.
    ctx.translate(50 + vibration, 45 - lift);

    // Exhaust points downward while the rocket rises vertically.
    if (firing) {
      const flicker =
        Math.sin(timeMs * 0.08) * 1.5 +
        Math.sin(timeMs * 0.137) * 0.7;

      const flameLength = (6 + throttle * 15 + flicker) * throttle;

      polygon(
        [
          [-3, -1], [3, -1],
          [4, flameLength * 0.35],
          [1.5, flameLength * 0.7],
          [0, flameLength],
          [-2, flameLength * 0.65],
          [-4, flameLength * 0.3]
        ],
        '#f97316',
        false
      );

      polygon(
        [
          [-2, -1], [2, -1],
          [2.5, flameLength * 0.25],
          [0, flameLength * 0.8],
          [-2.5, flameLength * 0.25]
        ],
        '#fbbf24',
        false
      );

      polygon(
        [[-1.2, -1], [1.2, -1], [0, flameLength * 0.5]],
        '#fff7ed',
        false
      );
    }

    // Rear fins.
    polygon(
      [[-5, -17], [-10, -8], [-10, -2], [-4, -6]],
      c.metal
    );
    polygon(
      [[5, -17], [10, -8], [10, -2], [4, -6]],
      c.dark
    );

    // Engine bell.
    polygon(
      [[-3, -7], [3, -7], [4, -1], [-4, -1]],
      c.dark
    );
    oval(0, -1, 4, 1.5, c.outline);

    // Main cylindrical body.
    box(-5, -29, 10, 22, c.suit);
    box(2, -28, 3, 20, c.metal, false);
    box(-4, -27, 1.5, 18, c.highlight, false);
    oval(0, -7, 5, 2, c.metal);

    // Orange structural bands.
    box(-5, -24, 10, 2.5, c.orange);
    box(-5, -11, 10, 2, c.orange);

    // Pointed nose cone.
    polygon(
      [[-5, -29], [-3.5, -35], [0, -41], [3.5, -35], [5, -29]],
      c.suit
    );
    polygon(
      [[0, -41], [3.5, -35], [5, -29], [1.5, -29]],
      c.metal,
      false
    );
    polygon(
      [[0, -40], [-2.6, -35], [-3.5, -30], [-1.8, -30]],
      c.highlight,
      false
    );

    // Small observation window.
    oval(0, -27, 2.3, 2.6, c.outline);
    oval(0, -27, 1.5, 1.8, '#164e63', false);
    oval(-0.5, -27.6, 0.4, 0.7, '#a5f3fc', false);

    // Front stabilizer fin.
    polygon(
      [[0, -16], [1.5, -10], [1.5, -3], [-1.5, -3], [-1.5, -10]],
      c.orange
    );

    // Small hull markings.
    box(-1.5, -20, 3, 4, c.dark, false);
    box(-0.7, -19.2, 1.4, 2.4, c.amber, false);

    ctx.restore();
  }

  ctx.restore();
}

function drawLaunchPad(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    deck: '#475569',
    highlight: '#cbd5e1',
    orange: '#f97316',
    cyan: '#f97316',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function octagon(x: any, y: any, w: any, h: any, corner: any) {
    return [
      [x + corner, y],
      [x + w - corner, y],
      [x + w, y + corner],
      [x + w, y + h - corner],
      [x + w - corner, y + h],
      [x + corner, y + h],
      [x, y + h - corner],
      [x, y + corner]
    ];
  }

  function beacon(x: any, y: any) {
    box(x - 4, y + 2, 8, 8, c.wall);
    ellipse(x, y + 3, 5, 2.5, c.orange);
    box(x - 2, y - 3, 4, 6, c.metal);
    light(x - 2, y - 4, 4, 4, c.amber);
  }

  // Visible platform thickness beneath the deck.
  polygon(octagon(12, 21, 76, 59, 12), c.wall);

  // Raised armored perimeter and recessed landing surface.
  polygon(octagon(12, 16, 76, 59, 12), c.metal);
  polygon(octagon(18, 21, 64, 48, 10), c.deck);

  line([[13, 29], [25, 17], [75, 17]], c.highlight);
  line([[24, 74], [76, 74], [87, 63]], c.outline, 2);

  // Subtle deck panel seams.
  line([[35, 22], [35, 68]], '#334155');
  line([[65, 22], [65, 68]], '#334155');
  line([[19, 45], [81, 45]], '#334155');

  // Cyan landing ring, flattened to match the perspective.
  ctx.strokeStyle = c.cyan;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 4; i++) {
    const start = i * Math.PI / 2 + 0.18;
    ctx.beginPath();
    ctx.ellipse(
      50, 45, 19, 13,
      0, start, start + Math.PI / 2 - 0.36
    );
    ctx.stroke();
  }

  ctx.lineWidth = 1;
  ellipse(50, 45, 2.5, 1.8, '#164e63');

  // Landing alignment guides.
  line([[50, 27], [50, 36]], c.cyan, 1.5);
  line([[50, 54], [50, 63]], c.cyan, 1.5);
  line([[25, 45], [39, 45]], c.cyan, 1.5);
  line([[61, 45], [75, 45]], c.cyan, 1.5);

  // Hazard markers along north and south edges.
  for (const x of [29, 39, 59, 69]) {
    box(x, 18, 5, 2, c.amber);
    box(x, 71, 5, 2, c.amber);
  }

  // Integrated perimeter conduits.
  for (const x of [10, 87]) {
    box(x, 35, 3, 23, c.wall);
    box(x, 39, 3, 4, c.orange);
    box(x, 51, 3, 4, c.orange);
  }

  // Corner approach beacons.
  beacon(23, 19);
  beacon(77, 19);
  beacon(23, 68);
  beacon(77, 68);

  // South-facing launch control cabinet.
  box(40, 73, 20, 11, c.wall);
  box(39, 71, 22, 5, c.metal);
  box(39, 71, 4, 5, c.orange);
  box(57, 71, 4, 5, c.orange);
  light(44, 77, 12, 4);

  // Short access ramp.
  box(37, 84, 26, 10, c.wall);
  for (let y = 86; y < 94; y += 2) {
    line([[40, y], [60, y]], c.metal);
  }

  for (const x of [38, 61]) {
    for (const y of [85, 89, 93]) {
      box(x, y, 1.5, 1, c.amber);
    }
  }

  ctx.restore();
}


function drawSeismicStormRadar(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#38bdf8',
    cyan: '#38bdf8',
    amber: '#fbbf24',
    glass: '#164e63'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function sensorPod(x: number, y: number) {
    box(x - 6, y, 12, 10, c.wall);
    ellipse(x, y + 9, 7, 3, c.orange);
    ellipse(x, y, 7, 4, c.metal);
    ellipse(x, y - 1, 3, 1.8, c.cyan);
    light(x - 3, y + 4, 6, 3);
  }

  // Seismic cables beneath the station.
  for (const points of [
    [[23, 68], [37, 68], [42, 75]],
    [[77, 68], [63, 68], [58, 75]]
  ]) {
    line(points, c.outline, 5);
    line(points, c.metal, 3);
  }

  sensorPod(20, 64);
  sensorPod(80, 64);

  // Raised monitoring station.
  box(32, 62, 36, 23, c.wall);
  polygon([
    [37, 55], [63, 55],
    [69, 61], [69, 71],
    [63, 77], [37, 77],
    [31, 71], [31, 61]
  ], c.metal);

  line([[32, 62], [38, 56], [62, 56]], c.highlight);
  box(32, 61, 4, 6, c.orange);
  box(64, 61, 4, 6, c.orange);

  // Braced radar mast.
  line([[39, 61], [47, 30]], c.outline, 6);
  line([[39, 61], [47, 30]], c.metal, 4);
  line([[61, 61], [53, 30]], c.outline, 6);
  line([[61, 61], [53, 30]], c.metal, 4);

  line([[42, 49], [58, 49]], c.wall, 3);
  line([[44, 40], [56, 40]], c.wall, 3);
  box(47, 28, 6, 34, c.wall);
  light(48, 42, 4, 11);

  // Scanner pedestal.
  ellipse(50, 30, 8, 4, c.orange);
  box(46, 20, 8, 10, c.metal);

  // Wide storm radar housing and visible lower edge.
  box(19, 15, 62, 14, c.wall);
  polygon([
    [23, 10], [77, 10],
    [82, 15], [82, 23],
    [77, 27], [23, 27],
    [18, 23], [18, 15]
  ], c.metal);

  box(23, 14, 54, 9, c.glass);

  // Scanner grid.
  for (let x = 29; x < 77; x += 6) {
    line([[x, 15], [x, 22]], '#0891b2', 0.6);
  }
  line([[24, 18.5], [76, 18.5]], '#0891b2', 0.6);

  line([[24, 14.5], [76, 14.5]], c.cyan, 0.8);
  box(19, 13, 4, 7, c.orange);
  box(77, 13, 4, 7, c.orange);

  const sweep = 29 + ((timeMs * 0.02) % 48);
  line([[sweep, 15], [sweep, 22]], '#e0f2fe', 1.2);

  // Weather sensor and warning beacon.
  box(48, 5, 4, 5, c.wall);
  light(48, 3, 4, 4, c.amber);

  line([[73, 56], [73, 36]], c.metal, 2);
  line([[69, 38], [77, 38]], c.metal, 1.5);
  ellipse(69, 38, 2, 1, c.orange);
  ellipse(77, 38, 2, 1, c.orange);

  // Monitoring screen.
  light(39, 65, 22, 9);

  // Seismic waveform within the display.
  line([
    [41, 70], [44, 70], [46, 67],
    [48, 72], [50, 68], [52, 70],
    [55, 70], [57, 68], [59, 70]
  ], '#cffafe', 0.8);

  // South-facing service door.
  box(43, 78, 14, 10, c.outline);
  box(44, 79, 12, 8, c.glass);
  line([[50, 79], [50, 87]], c.metal);
  light(45, 80, 3, 5);
  light(52, 80, 3, 5);

  // Access steps.
  box(40, 88, 20, 6, c.wall);
  line([[42, 90], [58, 90]], c.metal);
  line([[42, 93], [58, 93]], c.metal);
  box(38, 88, 2, 6, c.orange);
  box(60, 88, 2, 6, c.orange);

  ctx.restore();
}


function drawHydroponicBioDome(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#22d3ee',
    cyan: '#22d3ee',
    glass: '#164e63'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: any, y: any, w: any, h: any) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = c.cyan;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function pipe(points: number[][]) {
    line(points, c.outline, 6);
    line(points, c.metal, 4);
  }

  function domePath() {
    ctx.beginPath();
    ctx.moveTo(20, 57);
    ctx.bezierCurveTo(20, 4, 80, 4, 80, 57);
    ctx.bezierCurveTo(71, 76, 29, 76, 20, 57);
    ctx.closePath();
  }

  function waterTank(x: any) {
    box(x - 6, 62, 12, 16, c.wall);
    ellipse(x, 78, 6, 3, c.wall);

    const water = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
    water.addColorStop(0, '#075985');
    water.addColorStop(0.45, c.cyan);
    water.addColorStop(1, '#0e7490');

    box(x - 4, 65, 8, 10, water as any);
    line([[x - 2, 66], [x - 2, 73]], '#a5f3fc');

    ellipse(x, 62, 7, 3.5, c.orange);
    ellipse(x, 60, 6, 2.5, c.metal);
    box(x - 6, 76, 12, 3, c.orange);
  }

  // Water connections behind the dome.
  pipe([[14, 68], [25, 68], [25, 59]]);
  pipe([[86, 68], [75, 68], [75, 59]]);

  // Raised foundation drum.
  box(21, 57, 58, 12, c.wall);
  ellipse(50, 68, 29, 10, c.wall);
  ellipse(50, 58, 31, 12, c.orange);
  ellipse(50, 57, 29, 10, c.metal);

  // Interior and plants clipped to the glass silhouette.
  ctx.save();
  domePath();
  ctx.clip();

  const interior = ctx.createLinearGradient(0, 18, 0, 70);
  interior.addColorStop(0, '#164e63');
  interior.addColorStop(1, '#12352d');

  ctx.fillStyle = interior;
  ctx.fillRect(19, 12, 62, 60);

  // Central service walkway.
  box(47, 35, 6, 34, '#64748b');

  // Hydroponic beds and fixed crop pattern.
  for (const y of [37, 47, 57]) {
    for (const x of [29, 56]) {
      box(x, y, 15, 7, '#334155');
      box(x + 1, y + 1, 13, 5, '#14532d');

      for (let i = 0; i < 3; i++) {
        const plantX = x + 3 + i * 4;
        ellipse(plantX, y + 3, 2, 1.8, '#22c55e');
        ellipse(plantX - 0.5, y + 2.3, 1, 0.8, '#86efac');
      }

      line([[x + 1, y + 6], [x + 14, y + 6]], c.cyan, 0.6);
    }
  }

  // Transparent blue glass overlay.
  const glass = ctx.createLinearGradient(25, 20, 75, 66);
  glass.addColorStop(0, 'rgba(165, 243, 252, 0.30)');
  glass.addColorStop(0.5, 'rgba(34, 211, 238, 0.10)');
  glass.addColorStop(1, 'rgba(8, 145, 178, 0.28)');

  ctx.fillStyle = glass;
  ctx.fillRect(19, 12, 62, 60);

  // Soft reflection on the northwest glass.
  ctx.fillStyle = 'rgba(207, 250, 254, 0.28)';
  ctx.beginPath();
  ctx.moveTo(31, 28);
  ctx.bezierCurveTo(35, 22, 41, 19, 45, 18);
  ctx.lineTo(39, 33);
  ctx.lineTo(28, 45);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Glass outline.
  domePath();
  ctx.strokeStyle = c.outline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Curved structural ribs.
  ctx.strokeStyle = c.metal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 18);
  ctx.bezierCurveTo(38, 25, 32, 44, 32, 68);
  ctx.moveTo(50, 18);
  ctx.lineTo(50, 71);
  ctx.moveTo(50, 18);
  ctx.bezierCurveTo(62, 25, 68, 44, 68, 68);
  ctx.moveTo(24, 38);
  ctx.bezierCurveTo(38, 46, 62, 46, 76, 38);
  ctx.moveTo(20, 57);
  ctx.bezierCurveTo(35, 68, 65, 68, 80, 57);
  ctx.stroke();
  ctx.lineWidth = 1;

  // Dome cap and rim indicators.
  ellipse(50, 18, 6, 3.5, c.orange);
  ellipse(50, 17, 4, 2, c.metal);
  ellipse(50, 17, 1.5, 1, c.cyan);

  light(25, 67, 8, 3);
  light(67, 67, 8, 3);

  waterTank(14);
  waterTank(86);

  // South-facing airlock.
  box(38, 70, 24, 17, c.wall);
  box(37, 68, 26, 7, c.metal);
  box(37, 68, 4, 7, c.orange);
  box(59, 68, 4, 7, c.orange);
  light(44, 70, 12, 4);

  box(43, 77, 14, 10, c.outline);
  box(44, 78, 12, 8, c.glass);
  line([[50, 78], [50, 86]], c.metal);
  light(45, 79, 3, 6);
  light(52, 79, 3, 6);

  // Access steps.
  box(40, 87, 20, 6, c.wall);
  line([[42, 89], [58, 89]], c.metal);
  line([[42, 92], [58, 92]], c.metal);
  box(38, 87, 2, 6, c.orange);
  box(60, 87, 2, 6, c.orange);

  ctx.restore();
}


function drawBatterySubstation(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, timeMs: number = 0) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#fbbf24',
    cyan: '#fbbf24',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(timeMs * 0.003 + x) * 0.35;
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
    ctx.restore();
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function conduit(points: any) {
    line(points, c.outline, 6);
    line(points, c.metal, 4);
  }

  function battery(x: any, y: any) {
    // Vertical casing beneath the raised roof.
    box(x, y + 6, 25, 23, c.wall);
    box(x, y, 25, 22, c.metal);
    line(
      [[x + 1, y + 21], [x + 1, y + 1], [x + 24, y + 1]],
      c.highlight
    );

    // Segmented casing and roof ventilation.
    line([[x + 2, y + 14], [x + 23, y + 14]], '#64748b');
    vent(x + 7, y + 4, 11, 7);

    box(x, y, 4, 5, c.orange);
    box(x + 21, y, 4, 5, c.orange);
    box(x, y + 24, 4, 5, c.orange);
    box(x + 21, y + 24, 4, 5, c.orange);

    // Front-facing charge display.
    light(x + 6, y + 23, 13, 4);

    ctx.fillStyle = '#cffafe';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + 8 + i * 2.5, y + 24, 1.5, 2);
    }
  }

  // Low support frame, with visible south-facing thickness.
  box(15, 28, 70, 53, c.wall);
  box(15, 24, 70, 51, '#475569');
  line([[16, 74], [16, 25], [84, 25]], c.metal);

  // Main bus between the two battery columns.
  conduit([[50, 20], [50, 81]]);
  conduit([[28, 36], [72, 36]]);
  conduit([[28, 68], [72, 68]]);

  // Rear electrical terminals.
  for (const x of [43, 57]) {
    box(x - 2, 13, 4, 10, c.metal);
    for (const y of [14, 17, 20]) {
      box(x - 3, y, 6, 2, c.wall);
    }
    box(x - 2, 11, 4, 3, c.orange);
  }

  // Rear row first, then front row.
  for (const y of [19, 51]) {
    battery(19, y);
    battery(56, y);
  }

  // Central bus couplings remain visible in the aisle.
  box(47, 30, 6, 5, c.orange);
  box(47, 62, 6, 5, c.orange);
  light(48, 42, 4, 8);

  // Front power management cabinet.
  box(36, 79, 28, 13, c.wall);
  box(35, 75, 30, 7, c.metal);
  box(35, 75, 4, 7, c.orange);
  box(61, 75, 4, 7, c.orange);

  light(42, 83, 16, 6);

  // Charge bars on the control screen.
  ctx.fillStyle = '#cffafe';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(
      44 + i * 3,
      87 - i * 0.7,
      2,
      1 + i * 0.7
    );
  }

  light(37, 84, 4, 4, c.amber);
  light(59, 84, 4, 4, c.amber);

  // Grounded support feet.
  box(17, 78, 9, 5, c.orange);
  box(74, 78, 9, 5, c.orange);
  box(39, 92, 22, 3, c.metal);

  ctx.restore();
}


function drawOreExtractionMiner(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#ea580c',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function rock(x: any, y: any, size: any) {
    polygon([
      [x, y - size],
      [x + size, y - size * 0.2],
      [x + size * 0.6, y + size],
      [x - size * 0.7, y + size * 0.6],
      [x - size, y - size * 0.2]
    ], '#64748b');

    line(
      [[x - size * 0.6, y], [x, y - size * 0.6],
       [x + size * 0.5, y - size * 0.1]],
      c.highlight,
      0.7
    );
  }

  // Raised equipment platform.
  box(12, 53, 58, 30, c.wall);
  box(12, 49, 58, 27, '#475569');
  line([[13, 75], [13, 50], [69, 50]], c.metal);

  // Metal-lined extraction shaft.
  ellipse(42, 58, 18, 12, c.orange);
  ellipse(42, 57, 16, 10, c.metal);
  ellipse(42, 57, 12, 7, c.outline);

  // Conveyor leading to the ore hopper.
  box(59, 56, 26, 12, c.wall);
  box(59, 53, 26, 10, c.outline);
  for (let x = 61; x < 85; x += 4) {
    line([[x, 54], [x, 62]], '#64748b');
  }
  rock(65, 58, 2);
  rock(74, 58, 2.4);

  // Ore collection hopper.
  box(76, 43, 18, 28, c.wall);
  box(75, 39, 20, 26, c.metal);
  box(78, 42, 14, 19, c.outline);

  for (const [x, y, size] of [
    [82, 47, 2.5], [88, 47, 2.4],
    [84, 53, 3], [89, 57, 2.3],
    [81, 58, 2.2]
  ]) {
    rock(x, y, size);
  }

  for (const x of [75, 91]) {
    box(x, 39, 4, 4, c.orange);
    box(x, 61, 4, 4, c.orange);
  }
  light(80, 67, 10, 3);

  // Rear gantry braces.
  line([[26, 24], [34, 45]], c.outline, 5);
  line([[26, 24], [34, 45]], c.metal, 3);
  line([[58, 24], [50, 45]], c.outline, 5);
  line([[58, 24], [50, 45]], c.metal, 3);

  // Drill shaft.
  box(38, 28, 8, 29, c.wall);
  box(40, 29, 3, 27, c.metal);

  // Spiral cutting flights.
  for (let y = 35; y <= 53; y += 6) {
    polygon([
      [36, y], [46, y - 3],
      [48, y], [38, y + 4]
    ], c.metal);

    line([[37, y], [46, y - 2]], c.highlight);
  }

  polygon([[38, 57], [46, 57], [42, 63]], c.metal);

  // Tall gantry columns.
  for (const x of [23, 55]) {
    box(x, 20, 6, 43, c.wall);
    box(x, 20, 3, 39, c.metal);
    box(x - 1, 57, 8, 7, c.orange);
    light(x + 1, 32, 4, 11);
  }

  // Overhead beam.
  box(23, 20, 38, 7, c.wall);
  box(22, 16, 40, 7, c.metal);
  line([[23, 17], [61, 17]], c.highlight);
  box(22, 16, 5, 7, c.orange);
  box(57, 16, 5, 7, c.orange);

  // Drill motor mounted above the shaft.
  box(35, 13, 14, 16, c.wall);
  box(34, 10, 16, 13, c.metal);
  vent(38, 12, 8, 6);
  box(35, 24, 14, 4, c.orange);
  light(39, 20, 6, 3);

  // Top warning beacon.
  box(40, 5, 4, 5, c.wall);
  light(40, 4, 4, 4, c.amber);

  // South-facing operations cabin.
  box(19, 70, 46, 18, c.wall);
  box(18, 66, 48, 10, c.metal);
  box(18, 66, 5, 10, c.orange);
  box(61, 66, 5, 10, c.orange);

  vent(25, 68, 11, 6);
  light(43, 68, 15, 5);

  box(37, 78, 14, 10, c.outline);
  box(38, 79, 12, 8, '#164e63');
  line([[44, 79], [44, 87]], c.metal);
  light(39, 80, 3, 5);
  light(46, 80, 3, 5);

  // Access steps.
  box(34, 88, 20, 6, c.wall);
  line([[36, 90], [52, 90]], c.metal);
  line([[36, 93], [52, 93]], c.metal);
  box(32, 88, 2, 6, c.orange);
  box(54, 88, 2, 6, c.orange);

  ctx.restore();
}


function drawOreRefinery(ctx: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number) {
  if (pw <= 0 || ph <= 0) return;

  ctx.save();

  const scale = Math.min(pw, ph) / 100;
  ctx.translate(
    px + (pw - 100 * scale) / 2,
    py + (ph - 100 * scale) / 2
  );
  ctx.scale(scale, scale);
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  const c = {
    outline: '#111827',
    wall: '#334155',
    metal: '#94a3b8',
    highlight: '#cbd5e1',
    orange: '#ea580c',
    cyan: '#22d3ee',
    amber: '#fbbf24'
  };

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = c.outline;
    ctx.strokeRect(x, y, w, h);
  }

  function line(points: number[][], stroke: string, width = 1) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function polygon(points: number[][], fill: string) {
    ctx.beginPath();
    ctx.moveTo((points[0] as any)[0], (points[0] as any)[1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo((points[i] as any)[0], (points[i] as any)[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function ellipse(x: number, y: number, rx: number, ry: number, fill: string) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = c.outline;
    ctx.stroke();
  }

  function light(x: number, y: number, w: number, h: number, fill: string = c.cyan) {
    box(x, y, w, h, c.outline);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 0.8, y + 0.8, w - 1.6, h - 1.6);
  }

  function vent(x: number, y: number, w: number, h: number) {
    box(x, y, w, h, c.wall);
    for (let offset = 2; offset < h; offset += 2) {
      line(
        [[x + 1, y + offset], [x + w - 1, y + offset]],
        c.outline
      );
    }
  }

  function rock(x: any, y: any, size: any, fill: any) {
    polygon([
      [x, y - size],
      [x + size, y - size * 0.3],
      [x + size * 0.7, y + size * 0.7],
      [x - size * 0.5, y + size],
      [x - size, y]
    ], fill);

    line([
      [x - size * 0.5, y],
      [x, y - size * 0.6],
      [x + size * 0.5, y - size * 0.2]
    ], c.highlight, 0.7);
  }

  function bin(x: any, y: any, w: any, h: any) {
    box(x, y + 5, w, h, c.wall);
    box(x, y, w, h, c.metal);
    box(x + 3, y + 3, w - 6, h - 6, c.outline);

    for (const dx of [0, w - 4]) {
      for (const dy of [0, h - 4]) {
        box(x + dx, y + dy, 4, 4, c.orange);
      }
    }
  }

  // Exhaust stacks behind the processing building.
  for (const x of [43, 59]) {
    box(x - 4, 13, 8, 22, c.wall);
    box(x - 3, 13, 6, 18, c.metal);
    box(x - 4, 24, 8, 4, c.orange);
    ellipse(x, 13, 5, 3, c.metal);
    ellipse(x, 13, 3, 1.5, c.outline);
  }

  // Conveyor between input and output.
  box(22, 49, 56, 13, c.wall);
  box(23, 47, 54, 10, c.outline);

  for (let x = 25; x < 77; x += 5) {
    line([[x, 48], [x, 56]], '#64748b');
  }

  // Ore input hopper.
  bin(7, 34, 25, 28);

  const ore = [
    [15, 43, 3.2], [23, 42, 3],
    [19, 49, 3.5], [13, 53, 2.8],
    [25, 54, 3], [21, 57, 2.4]
  ];

  ore.forEach(([x, y, size], i) => {
    rock(x, y, size, i % 2 ? '#64748b' : '#78716c');
  });

  light(14, 64, 11, 4);

  // Refined-metal output bin.
  bin(71, 48, 23, 25);

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const x = 76 + col * 7;
      const y = 54 + row * 5;
      box(x, y, 6, 3, c.highlight);
      line([[x + 1, y + 0.5], [x + 5, y + 0.5]], '#f1f5f9', 0.6);
    }
  }

  light(77, 75, 11, 4);

  // Main processor walls and chamfered roof.
  box(33, 37, 36, 42, c.wall);

  polygon([
    [39, 28], [63, 28],
    [70, 35], [70, 55],
    [63, 62], [39, 62],
    [32, 55], [32, 35]
  ], c.metal);

  line([[33, 36], [40, 29], [62, 29]], c.highlight);
  line([[35, 54], [40, 59], [62, 59]], '#64748b');

  for (const x of [33, 65]) {
    for (const y of [34, 53]) {
      box(x, y, 4, 7, c.orange);
    }
  }

  // Raised crusher housing.
  box(42, 35, 18, 17, c.wall);
  box(41, 32, 20, 14, c.metal);
  vent(45, 35, 12, 8);

  // Furnace inspection window.
  const heat = ctx.createLinearGradient(0, 66, 0, 73);
  heat.addColorStop(0, '#fbbf24');
  heat.addColorStop(0.5, '#f97316');
  heat.addColorStop(1, '#9a3412');

  box(41, 64, 20, 11, c.outline);
  box(43, 66, 16, 7, heat as any);
  line([[48, 66], [48, 73]], c.wall, 2);
  line([[54, 66], [54, 73]], c.wall, 2);

  // South-facing control cabinet.
  box(37, 77, 28, 13, c.wall);
  box(36, 74, 30, 6, c.metal);
  box(36, 74, 4, 6, c.orange);
  box(62, 74, 4, 6, c.orange);
  light(43, 81, 16, 5);

  light(38, 82, 4, 4, c.amber);
  light(60, 82, 4, 4, c.amber);

  box(33, 88, 7, 5, c.orange);
  box(62, 88, 7, 5, c.orange);

  ctx.restore();
}

