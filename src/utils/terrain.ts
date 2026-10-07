import { GRID_SIZE, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import { SpicePatch } from '../types/colony';

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
}

export function generateMarsTerrain(): MarsTerrainData {
  const craters: Crater[] = [];
  const rocks: Rock[] = [];
  const dunes: DuneRidge[] = [];
  const spicePatches: SpicePatch[] = [];

  // Generate 12-18 craters across the map
  const craterCount = 14;
  for (let i = 0; i < craterCount; i++) {
    // Avoid center starting base area (grid x: 16-24, y: 16-24)
    let cx = Math.random() * (WORLD_WIDTH - 200) + 100;
    let cy = Math.random() * (WORLD_HEIGHT - 200) + 100;
    const distToCenter = Math.hypot(cx - WORLD_WIDTH / 2, cy - WORLD_HEIGHT / 2);
    if (distToCenter < 280) {
      // Push outward
      cx += cx > WORLD_WIDTH / 2 ? 300 : -300;
      cy += cy > WORLD_HEIGHT / 2 ? 300 : -300;
    }
    craters.push({
      x: cx,
      y: cy,
      radius: Math.random() * 55 + 35,
      depth: Math.random() * 0.4 + 0.6,
    });
  }

  // Generate 40-60 scattered basalt rocks
  for (let i = 0; i < 50; i++) {
    rocks.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      radius: Math.random() * 12 + 6,
      angle: Math.random() * Math.PI * 2,
    });
  }

  // Generate wavy sand dune ridges
  for (let i = 0; i < 7; i++) {
    const startY = i * 280 + Math.random() * 80;
    const points: Array<{ x: number; y: number }> = [];
    const segments = 10;
    for (let s = 0; s <= segments; s++) {
      const px = (s / segments) * WORLD_WIDTH;
      const py = startY + Math.sin(s * 0.9 + i) * 60 + (Math.random() - 0.5) * 20;
      points.push({ x: px, y: py });
    }
    dunes.push({ points, width: Math.random() * 20 + 25 });
  }

  // Spawn initial Spice Patches in various sectors of Mars
  // Starting base is at center (x: 960, y: 960)
  const initialSpiceLocations = [
    { x: 450, y: 500, amount: 800, richness: 'rich' as const },
    { x: 1450, y: 480, amount: 650, richness: 'standard' as const },
    { x: 1520, y: 1400, amount: 1100, richness: 'pure_vein' as const },
    { x: 520, y: 1450, amount: 900, richness: 'rich' as const },
    { x: 1000, y: 350, amount: 600, richness: 'standard' as const },
    { x: 920, y: 1650, amount: 750, richness: 'standard' as const },
    { x: 300, y: 1000, amount: 500, richness: 'standard' as const },
    { x: 1680, y: 950, amount: 1200, richness: 'pure_vein' as const },
  ];

  initialSpiceLocations.forEach((loc, idx) => {
    spicePatches.push({
      id: `spice_${idx}_${Date.now()}`,
      x: loc.x,
      y: loc.y,
      radius: loc.richness === 'pure_vein' ? 58 : loc.richness === 'rich' ? 48 : 38,
      amount: loc.amount,
      maxAmount: loc.amount,
      richness: loc.richness,
      discovered: true,
      pulseOffset: Math.random() * Math.PI * 2,
    });
  });

  return { craters, rocks, dunes, spicePatches };
}

/**
 * Spawns a new spice eruption from a seismic fissure
 */
export function spawnNewSpicePatch(existing: SpicePatch[]): SpicePatch {
  // Find a spot not too close to existing patches or base center
  let attempts = 0;
  let x = 0;
  let y = 0;
  while (attempts < 20) {
    x = Math.random() * (WORLD_WIDTH - 250) + 125;
    y = Math.random() * (WORLD_HEIGHT - 250) + 125;
    const distCenter = Math.hypot(x - WORLD_WIDTH / 2, y - WORLD_HEIGHT / 2);
    if (distCenter > 220) break;
    attempts++;
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
