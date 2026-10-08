import { GRID_SIZE, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { OreDeposit, SpicePatch } from '../types/colony';

export interface Crater {
  x: number;
  y: number;
  radius: number;
  depth: number;
}

export interface Rock {
  x: number;
  y: number;
  radius: number;
  angle: number;
}

export interface DuneRidge {
  points: Array<{ x: number; y: number }>;
  width: number;
}

export interface MarsTerrainData {
  craters: Crater[];
  rocks: Rock[];
  dunes: DuneRidge[];
  spicePatches: SpicePatch[];
  oreDeposits: OreDeposit[];
}

// Starter buildings occupy tiles 35–48 by 35–45. Keep deposits off those streets.
const OUTPOST_CENTER_X = 41.5 * TILE_SIZE;
const OUTPOST_CENTER_Y = 40 * TILE_SIZE;
const OUTPOST_CLEAR_RADIUS = 700;

function isClearOfOutpost(x: number, y: number, padding = 0) {
  return Math.hypot(x - OUTPOST_CENTER_X, y - OUTPOST_CENTER_Y) >= OUTPOST_CLEAR_RADIUS + padding;
}

function pushOutsideOutpost(x: number, y: number, padding = 0) {
  const dx = x - OUTPOST_CENTER_X;
  const dy = y - OUTPOST_CENTER_Y;
  const dist = Math.hypot(dx, dy) || 1;
  const min = OUTPOST_CLEAR_RADIUS + padding;
  if (dist >= min) return { x, y };
  const scale = min / dist;
  const margin = 160;
  return {
    x: Math.min(WORLD_WIDTH - margin, Math.max(margin, OUTPOST_CENTER_X + dx * scale)),
    y: Math.min(WORLD_HEIGHT - margin, Math.max(margin, OUTPOST_CENTER_Y + dy * scale)),
  };
}

export function generateMarsTerrain(): MarsTerrainData {
  const craters: Crater[] = [];
  const rocks: Rock[] = [];
  const dunes: DuneRidge[] = [];
  const spicePatches: SpicePatch[] = [];
  const oreDeposits: OreDeposit[] = [];

  // Generate 28-36 craters across the enlarged map
  const craterCount = 30;
  for (let i = 0; i < craterCount; i++) {
    // Avoid center starting base area (around center x: 1920, y: 1920)
    let cx = Math.random() * (WORLD_WIDTH - 260) + 130;
    let cy = Math.random() * (WORLD_HEIGHT - 260) + 130;
    const distToCenter = Math.hypot(cx - WORLD_WIDTH / 2, cy - WORLD_HEIGHT / 2);
    if (distToCenter < 380) {
      // Push outward
      cx += cx > WORLD_WIDTH / 2 ? 450 : -450;
      cy += cy > WORLD_HEIGHT / 2 ? 450 : -450;
    }
    craters.push({
      x: cx,
      y: cy,
      radius: Math.random() * 60 + 35,
      depth: Math.random() * 0.4 + 0.6,
    });
  }

  // Generate 100-120 scattered basalt rocks across the vast terrain
  for (let i = 0; i < 110; i++) {
    rocks.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: Math.random() * 12 + 6,
      angle: Math.random() * Math.PI * 2,
    });
  }

  // Generate wavy sand dune ridges spanning the entire map height
  const duneCount = 13;
  for (let i = 0; i < duneCount; i++) {
    const startY = (i / duneCount) * WORLD_HEIGHT + (Math.random() - 0.5) * 100;
    const points: Array<{ x: number; y: number }> = [];
    const segments = 16;
    for (let s = 0; s <= segments; s++) {
      const px = (s / segments) * WORLD_WIDTH;
      const py = startY + Math.sin(s * 0.85 + i * 1.1) * 70 + (Math.random() - 0.5) * 25;
      points.push({ x: px, y: py });
    }
    dunes.push({ points, width: Math.random() * 22 + 26 });
  }

  // Spawn initial Spice Patches in various sectors of Mars
  // Starting base is at center (x: 1920, y: 1920)
  const initialSpiceLocations = [
    // Inner Sector (close deposits for early harvesters)
    { x: 1400, y: 1450, amount: 900, richness: 'rich' as const },
    { x: 2450, y: 1480, amount: 800, richness: 'standard' as const },
    { x: 1420, y: 2450, amount: 850, richness: 'rich' as const },
    { x: 2480, y: 2400, amount: 950, richness: 'rich' as const },
    { x: 1920, y: 1300, amount: 750, richness: 'standard' as const },
    { x: 1920, y: 2550, amount: 800, richness: 'standard' as const },

    // Mid Sector (richer expansion veins across four quadrants)
    { x: 920, y: 950, amount: 1100, richness: 'rich' as const },
    { x: 2950, y: 920, amount: 1250, richness: 'pure_vein' as const },
    { x: 950, y: 2950, amount: 1100, richness: 'rich' as const },
    { x: 2980, y: 2920, amount: 1350, richness: 'pure_vein' as const },
    { x: 750, y: 1920, amount: 900, richness: 'standard' as const },
    { x: 3100, y: 1920, amount: 1200, richness: 'rich' as const },
    { x: 1920, y: 720, amount: 950, richness: 'standard' as const },
    { x: 1920, y: 3150, amount: 1050, richness: 'standard' as const },

    // Deep Desert Expeditions (massive pure veins on remote planetary fringes)
    { x: 420, y: 450, amount: 1800, richness: 'pure_vein' as const },
    { x: 3450, y: 420, amount: 2000, richness: 'pure_vein' as const },
    { x: 450, y: 3450, amount: 1900, richness: 'pure_vein' as const },
    { x: 3420, y: 3420, amount: 2200, richness: 'pure_vein' as const },
    { x: 380, y: 1920, amount: 1500, richness: 'pure_vein' as const },
    { x: 3500, y: 1920, amount: 1600, richness: 'pure_vein' as const },
  ];

  initialSpiceLocations.forEach((loc, idx) => {
    const radius = loc.richness === 'pure_vein' ? 58 : loc.richness === 'rich' ? 48 : 38;
    const placed = pushOutsideOutpost(loc.x, loc.y, radius);
    spicePatches.push({
      id: `spice_${idx}_${Date.now()}`,
      x: placed.x,
      y: placed.y,
      radius,
      amount: loc.amount,
      maxAmount: loc.amount,
      richness: loc.richness,
      discovered: true,
      pulseOffset: Math.random() * Math.PI * 2,
    });
  });
  
  // Spawn initial Ore Deposits outside the starter outpost.
  for (let i = 0; i < 15; i++) {
    let x = 2;
    let y = 2;
    const orePadding = 28;
    for (let attempt = 0; attempt < 50; attempt++) {
      x = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      y = Math.floor(Math.random() * (GRID_SIZE - 4)) + 2;
      if (isClearOfOutpost((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE, orePadding)) break;
    }
    if (!isClearOfOutpost((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE, orePadding)) {
      const placed = pushOutsideOutpost((x + 0.5) * TILE_SIZE, (y + 0.5) * TILE_SIZE, orePadding);
      x = Math.min(GRID_SIZE - 3, Math.max(2, Math.floor(placed.x / TILE_SIZE)));
      y = Math.min(GRID_SIZE - 3, Math.max(2, Math.floor(placed.y / TILE_SIZE)));
    }
    oreDeposits.push({
      id: `ore_${i}_${Date.now()}`,
      x,
      y,
      size: Math.random() > 0.7 ? 'large' : Math.random() > 0.4 ? 'medium' : 'small',
      depleted: false,
    });
  }

  return { craters, rocks, dunes, spicePatches, oreDeposits };
}

/**
 * Spawns a new spice eruption from a seismic fissure
 */
export function spawnNewSpicePatch(existing: SpicePatch[]): SpicePatch {
  // Find a spot not too close to existing patches or base center
  let attempts = 0;
  let x = 0;
  let y = 0;
  while (attempts < 30) {
    x = Math.random() * (WORLD_WIDTH - 300) + 150;
    y = Math.random() * (WORLD_HEIGHT - 300) + 150;
    if (isClearOfOutpost(x, y, 58)) break;
    attempts++;
  }
  if (!isClearOfOutpost(x, y, 58)) {
    const placed = pushOutsideOutpost(x, y, 58);
    x = placed.x;
    y = placed.y;
  }

  const richnessRoll = Math.random();
  const richness: 'standard' | 'rich' | 'pure_vein' =
    richnessRoll > 0.75 ? 'pure_vein' : richnessRoll > 0.4 ? 'rich' : 'standard';
  const amount =
    richness === 'pure_vein'
      ? Math.floor(Math.random() * 600 + 1000)
      : richness === 'rich'
      ? Math.floor(Math.random() * 400 + 600)
      : Math.floor(Math.random() * 300 + 400);

  return {
    id: `spice_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    x,
    y,
    radius: richness === 'pure_vein' ? 58 : richness === 'rich' ? 48 : 38,
    amount,
    maxAmount: amount,
    richness,
    discovered: true,
    pulseOffset: Math.random() * Math.PI * 2,
  };
}
