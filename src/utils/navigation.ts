import { ColonyModule } from '../types/colony';
import { GRID_SIZE, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './constants';

export interface Point {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Returns the padded world bounding box of a module
 */
export function getModuleAABB(module: ColonyModule, padding: number = 18): AABB {
  const minX = module.x * TILE_SIZE - padding;
  const minY = module.y * TILE_SIZE - padding;
  const maxX = (module.x + module.width) * TILE_SIZE + padding;
  const maxY = (module.y + module.height) * TILE_SIZE + padding;
  return { minX, minY, maxX, maxY };
}

/**
 * Checks if a 2D line segment intersects an Axis-Aligned Bounding Box (Liang-Barsky)
 */
export function segmentIntersectsAABB(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: AABB
): boolean {
  const { minX, minY, maxX, maxY } = box;

  // Quick bounding box check
  if (Math.max(x1, x2) < minX || Math.min(x1, x2) > maxX) return false;
  if (Math.max(y1, y2) < minY || Math.min(y1, y2) > maxY) return false;

  // If either endpoint is inside the box
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
  if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;

  const dx = x2 - x1;
  const dy = y2 - y1;

  const p = [-dx, dx, -dy, dy];
  const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];

  let t0 = 0.0;
  let t1 = 1.0;

  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }

  return t0 <= t1 && t1 >= 0 && t0 <= 1;
}

/**
 * Checks if there is a clear, unobstructed line of sight between two points
 */
export function hasClearLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  modules: ColonyModule[],
  padding: number = 18
): boolean {
  for (let i = 0; i < modules.length; i++) {
    const box = getModuleAABB(modules[i], padding);
    if (segmentIntersectsAABB(x1, y1, x2, y2, box)) {
      return false;
    }
  }
  return true;
}

/**
 * Finds the ideal exterior docking bay apron for a depot or command module.
 * Places the docking target outside the building walls so vehicles offload
 * at the exterior garage door rather than driving through the structure.
 */
export function findDockingApron(
  depot: ColonyModule,
  fromX: number,
  fromY: number,
  modules: ColonyModule[],
  clearance: number = 28
): Point {
  const cx = (depot.x + depot.width / 2) * TILE_SIZE;
  const cy = (depot.y + depot.height / 2) * TILE_SIZE;
  const halfW = (depot.width * TILE_SIZE) / 2;
  const halfH = (depot.height * TILE_SIZE) / 2;

  // Candidate docking aprons on all 4 exterior sides
  const candidates: Point[] = [
    { x: cx, y: cy + halfH + clearance }, // South apron
    { x: cx, y: cy - halfH - clearance }, // North apron
    { x: cx + halfW + clearance, y: cy }, // East apron
    { x: cx - halfW - clearance, y: cy }, // West apron
  ];

  // Filter out any candidates that overlap other buildings
  const validCandidates = candidates.filter((cand) => {
    return !modules.some((m) => {
      if (m.id === depot.id) return false;
      const b = getModuleAABB(m, 12);
      return cand.x >= b.minX && cand.x <= b.maxX && cand.y >= b.minY && cand.y <= b.maxY;
    });
  });

  const pool = validCandidates.length > 0 ? validCandidates : candidates;

  // Pick candidate closest to incoming vehicle
  let best = pool[0];
  let bestDist = Math.hypot(fromX - best.x, fromY - best.y);

  for (let i = 1; i < pool.length; i++) {
    const d = Math.hypot(fromX - pool[i].x, fromY - pool[i].y);
    if (d < bestDist) {
      bestDist = d;
      best = pool[i];
    }
  }

  return best;
}

/**
 * Fast local A* grid pathfinder to route vehicles around buildings.
 * Uses string-pulling (line-of-sight pruning) to convert discrete tile steps
 * into smooth diagonal corner waypoints.
 */
export function findNavigationPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  modules: ColonyModule[]
): Point[] {
  // 1. Direct path check: if line-of-sight is already clear, no waypoints needed!
  if (hasClearLineOfSight(startX, startY, targetX, targetY, modules, 18)) {
    return [{ x: targetX, y: targetY }];
  }

  // 2. Setup local search grid around start and target with generous padding
  const startTileX = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(startX / TILE_SIZE)));
  const startTileY = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(startY / TILE_SIZE)));
  const endTileX = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(targetX / TILE_SIZE)));
  const endTileY = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(targetY / TILE_SIZE)));

  const padTiles = 5;
  const minGx = Math.max(0, Math.min(startTileX, endTileX) - padTiles);
  const maxGx = Math.min(GRID_SIZE - 1, Math.max(startTileX, endTileX) + padTiles);
  const minGy = Math.max(0, Math.min(startTileY, endTileY) - padTiles);
  const maxGy = Math.min(GRID_SIZE - 1, Math.max(startTileY, endTileY) + padTiles);

  // Mark blocked tiles based on building footprints
  const blockedTiles = new Set<string>();
  modules.forEach((m) => {
    for (let gx = m.x; gx < m.x + m.width; gx++) {
      for (let gy = m.y; gy < m.y + m.height; gy++) {
        blockedTiles.add(`${gx},${gy}`);
      }
    }
  });

  // A* search
  interface Node {
    x: number;
    y: number;
    g: number;
    f: number;
    parent: Node | null;
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: startTileX,
    y: startTileY,
    g: 0,
    f: Math.hypot(endTileX - startTileX, endTileY - startTileY),
    parent: null,
  };
  openList.push(startNode);

  let goalNode: Node | null = null;
  let iterations = 0;
  const MAX_ITERATIONS = 400; // prevent stalling

  const directions = [
    { dx: 1, dy: 0, cost: 1 },
    { dx: -1, dy: 0, cost: 1 },
    { dx: 0, dy: 1, cost: 1 },
    { dx: 0, dy: -1, cost: 1 },
    { dx: 1, dy: 1, cost: 1.414 },
    { dx: 1, dy: -1, cost: 1.414 },
    { dx: -1, dy: 1, cost: 1.414 },
    { dx: -1, dy: -1, cost: 1.414 },
  ];

  while (openList.length > 0 && iterations++ < MAX_ITERATIONS) {
    // Pick node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[bestIdx].f) bestIdx = i;
    }
    const current = openList.splice(bestIdx, 1)[0];
    const key = `${current.x},${current.y}`;

    if (current.x === endTileX && current.y === endTileY) {
      goalNode = current;
      break;
    }

    closedSet.add(key);

    for (const d of directions) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;
      const nKey = `${nx},${ny}`;

      if (nx < minGx || nx > maxGx || ny < minGy || ny > maxGy) continue;
      if (closedSet.has(nKey)) continue;

      // Cannot step on building tile unless it's start or end
      if (blockedTiles.has(nKey) && !(nx === endTileX && ny === endTileY) && !(nx === startTileX && ny === startTileY)) {
        continue;
      }

      // If diagonal, check corner cutting
      if (d.dx !== 0 && d.dy !== 0) {
        if (blockedTiles.has(`${current.x + d.dx},${current.y}`) || blockedTiles.has(`${current.x},${current.y + d.dy}`)) {
          continue;
        }
      }

      const g = current.g + d.cost;
      const h = Math.hypot(endTileX - nx, endTileY - ny);
      const f = g + h;

      const existing = openList.find((node) => node.x === nx && node.y === ny);
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = f;
          existing.parent = current;
        }
      } else {
        openList.push({ x: nx, y: ny, g, f, parent: current });
      }
    }
  }

  // Reconstruct path
  if (!goalNode) {
    // Fallback: direct to target
    return [{ x: targetX, y: targetY }];
  }

  const rawPoints: Point[] = [];
  let curr: Node | null = goalNode;
  while (curr) {
    rawPoints.unshift({
      x: (curr.x + 0.5) * TILE_SIZE,
      y: (curr.y + 0.5) * TILE_SIZE,
    });
    curr = curr.parent;
  }

  // Replace final tile center with exact target coordinate
  if (rawPoints.length > 0) {
    rawPoints[rawPoints.length - 1] = { x: targetX, y: targetY };
  }

  // 3. String-Pulling / Line-of-sight path pruning:
  // Skip intermediate nodes if direct line-of-sight is unobstructed
  const pruned: Point[] = [];
  let currentPos: Point = { x: startX, y: startY };

  let i = 0;
  while (i < rawPoints.length) {
    let furthest = i;
    for (let j = rawPoints.length - 1; j > i; j--) {
      if (hasClearLineOfSight(currentPos.x, currentPos.y, rawPoints[j].x, rawPoints[j].y, modules, 18)) {
        furthest = j;
        break;
      }
    }
    pruned.push(rawPoints[furthest]);
    currentPos = rawPoints[furthest];
    if (furthest === rawPoints.length - 1) break;
    i = furthest + 1;
  }

  return pruned.length > 0 ? pruned : [{ x: targetX, y: targetY }];
}

/**
 * Steers a vehicle towards a destination while:
 * 1. Using forward sensory whiskers to smoothly steer away from building corners.
 * 2. Enforcing physical non-penetration against all building AABBs.
 * 3. Sliding along building exterior walls when in contact.
 */
export function steerAndAvoidBuildings(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  speed: number,
  currentAngle: number,
  dt: number,
  modules: ColonyModule[],
  radius: number = 16
): { nextX: number; nextY: number; nextAngle: number } {
  // 1. Desired velocity toward target
  const toTargetAngle = Math.atan2(targetY - y, targetX - x);
  let desiredVx = Math.cos(toTargetAngle);
  let desiredVy = Math.sin(toTargetAngle);

  // 2. Sensory Whisker Obstacle Avoidance:
  // Cast forward, left-whisker (+35°), right-whisker (-35°)
  const whiskerDist = Math.max(28, speed * 26 * dt * 3.5);
  const whiskers = [
    { angle: currentAngle, weight: 1.4 },
    { angle: currentAngle + 0.6, weight: 1.0 },
    { angle: currentAngle - 0.6, weight: 1.0 },
  ];

  let steerRepulsionX = 0;
  let steerRepulsionY = 0;

  for (const w of whiskers) {
    const wx = x + Math.cos(w.angle) * whiskerDist;
    const wy = y + Math.sin(w.angle) * whiskerDist;

    for (const m of modules) {
      const box = getModuleAABB(m, radius + 4);
      if (segmentIntersectsAABB(x, y, wx, wy, box)) {
        // Whisker detected building! Add repulsion away from building center
        const bcx = (box.minX + box.maxX) / 2;
        const bcy = (box.minY + box.maxY) / 2;
        const awayAngle = Math.atan2(y - bcy, x - bcx);
        steerRepulsionX += Math.cos(awayAngle) * w.weight * 1.5;
        steerRepulsionY += Math.sin(awayAngle) * w.weight * 1.5;
      }
    }
  }

  // Combine desired direction with whisker avoidance
  let combinedVx = desiredVx + steerRepulsionX;
  let combinedVy = desiredVy + steerRepulsionY;
  const combinedLen = Math.hypot(combinedVx, combinedVy);
  if (combinedLen > 0.001) {
    combinedVx /= combinedLen;
    combinedVy /= combinedLen;
  }

  // Smooth turn toward combined direction
  const targetTurnAngle = Math.atan2(combinedVy, combinedVx);
  let angleDiff = targetTurnAngle - currentAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const maxTurn = Math.PI * 3.5 * dt; // max turn rate in radians/sec
  const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

  // Compute displacement
  const moveDist = speed * 22 * dt;
  let nextX = x + Math.cos(nextAngle) * moveDist;
  let nextY = y + Math.sin(nextAngle) * moveDist;

  // 3. Strict Physical Collision Resolution & Wall Sliding:
  // Prevent any vehicle penetration inside any building's padded bounding box.
  for (const m of modules) {
    const box = getModuleAABB(m, radius);

    if (nextX > box.minX && nextX < box.maxX && nextY > box.minY && nextY < box.maxY) {
      // Calculate penetration depth from each of the 4 edges
      const dLeft = nextX - box.minX;
      const dRight = box.maxX - nextX;
      const dTop = nextY - box.minY;
      const dBottom = box.maxY - nextY;

      const minPen = Math.min(dLeft, dRight, dTop, dBottom);

      if (minPen === dLeft) {
        nextX = box.minX; // Snap outside left wall
      } else if (minPen === dRight) {
        nextX = box.maxX; // Snap outside right wall
      } else if (minPen === dTop) {
        nextY = box.minY; // Snap outside top wall
      } else {
        nextY = box.maxY; // Snap outside bottom wall
      }
    }
  }

  // Keep within world boundaries
  nextX = Math.max(radius, Math.min(WORLD_WIDTH - radius, nextX));
  nextY = Math.max(radius, Math.min(WORLD_HEIGHT - radius, nextY));

  return { nextX, nextY, nextAngle };
}
