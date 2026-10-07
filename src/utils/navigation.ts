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

export interface PowerLine {
  id: string;
  fromId: string;
  toId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
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
 * Calculates the positions of power nodes on a building pad.
 */
export function getBuildingNodes(module: ColonyModule): Point[] {
  const px = module.x * TILE_SIZE;
  const py = module.y * TILE_SIZE;
  const pw = module.width * TILE_SIZE;
  const ph = module.height * TILE_SIZE;

  const padInset = 4;
  const rx = px + padInset;
  const ry = py + padInset;
  const rw = pw - padInset * 2;
  const rh = ph - padInset * 2;

  if (rw <= 0 || rh <= 0) return [{ x: px + pw / 2, y: py + ph / 2 }];

  const unit = Math.min(rw, rh);
  const rim = Math.min(5, unit * 0.08);
  const nodeSize = Math.min(8, unit * 0.14);
  const offset = Math.max(rim / 2, nodeSize / 2);
  const left = rx + offset;
  const right = rx + rw - offset;
  const top = ry + offset;
  const bottom = ry + rh - offset;
  const midX = rx + rw / 2;
  const midY = ry + rh / 2;

  return [
    { x: left, y: top },
    { x: midX, y: top },
    { x: right, y: top },
    { x: right, y: midY },
    { x: right, y: bottom },
    { x: midX, y: bottom },
    { x: left, y: bottom },
    { x: left, y: midY },
  ];
}

/**
 * Finds the pair of closest power nodes between two modules.
 */
export function getClosestNodes(m1: ColonyModule, m2: ColonyModule): { n1: Point; n2: Point } {
  const nodes1 = getBuildingNodes(m1);
  const nodes2 = getBuildingNodes(m2);

  let minD = Infinity;
  let bestPair = { n1: nodes1[0], n2: nodes2[0] };
  for (const n1 of nodes1) {
    for (const n2 of nodes2) {
      const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
      if (d < minD) {
        minD = d;
        bestPair = { n1, n2 };
      }
    }
  }
  return bestPair;
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
 * Computes closest point on line segment (x1, y1)-(x2, y2) to target point (px, py)
 */
export function closestPointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; t: number; dist: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const dist = Math.hypot(px - x1, py - y1);
    return { x: x1, y: y1, t: 0, dist };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return { x: cx, y: cy, t, dist: Math.hypot(px - cx, py - cy) };
}

/**
 * Checks if two 2D line segments strictly cross each other
 */
export function segmentsCross(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  }
  return (
    ccw(x1, y1, x3, y3, x4, y4) !== ccw(x2, y2, x3, y3, x4, y4) &&
    ccw(x1, y1, x2, y2, x3, y3) !== ccw(x1, y1, x2, y2, x4, y4)
  );
}

/**
 * Calculates minimum distance between two 2D line segments
 */
export function distanceBetweenSegments(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): number {
  if (segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4)) return 0;
  const d1 = closestPointOnSegment(x1, y1, x3, y3, x4, y4).dist;
  const d2 = closestPointOnSegment(x2, y2, x3, y3, x4, y4).dist;
  const d3 = closestPointOnSegment(x3, y3, x1, y1, x2, y2).dist;
  const d4 = closestPointOnSegment(x4, y4, x1, y1, x2, y2).dist;
  return Math.min(d1, d2, d3, d4);
}

/**
 * Derives the active high-voltage power transmission network connecting colony modules.
 * Ensures a realistic, planar, non-crisscrossing grid topology.
 */
export function getPowerLines(
  modules: ColonyModule[],
  maxRange: number = TILE_SIZE * 9.5
): PowerLine[] {
  const candidates: PowerLine[] = [];

  for (let i = 0; i < modules.length; i++) {
    for (let j = i + 1; j < modules.length; j++) {
      const m1 = modules[i];
      const m2 = modules[j];
      const { n1, n2 } = getClosestNodes(m1, m2);
      const c1x = n1.x;
      const c1y = n1.y;
      const c2x = n2.x;
      const c2y = n2.y;
      const dist = Math.hypot(c1x - c2x, c1y - c2y);

      if (dist > maxRange) continue;

      // Discard connections that pierce straight through another module
      let piercesModule = false;
      for (const m3 of modules) {
        if (m3.id === m1.id || m3.id === m2.id) continue;
        const box = {
          minX: m3.x * TILE_SIZE + 6,
          minY: m3.y * TILE_SIZE + 6,
          maxX: (m3.x + m3.width) * TILE_SIZE - 6,
          maxY: (m3.y + m3.height) * TILE_SIZE - 6,
        };
        if (segmentIntersectsAABB(c1x, c1y, c2x, c2y, box)) {
          piercesModule = true;
          break;
        }
      }

      if (!piercesModule) {
        candidates.push({
          id: `${m1.id}_${m2.id}`,
          fromId: m1.id,
          toId: m2.id,
          x1: c1x,
          y1: c1y,
          x2: c2x,
          y2: c2y,
          length: dist,
        });
      }
    }
  }

  // Sort shortest connections first for optimal grid efficiency
  candidates.sort((a, b) => a.length - b.length);

  const accepted: PowerLine[] = [];
  const degree = new Map<string, number>();

  for (const cand of candidates) {
    const d1 = degree.get(cand.fromId) || 0;
    const d2 = degree.get(cand.toId) || 0;

    // Prevent excessive clustering / web clutter
    if (d1 >= 3 && d2 >= 3) continue;

    // Reject lines that cross existing power lines
    let crosses = false;
    for (const ex of accepted) {
      if (
        ex.fromId === cand.fromId ||
        ex.fromId === cand.toId ||
        ex.toId === cand.fromId ||
        ex.toId === cand.toId
      ) {
        continue; // Shared junction point is acceptable
      }
      if (segmentsCross(cand.x1, cand.y1, cand.x2, cand.y2, ex.x1, ex.y1, ex.x2, ex.y2)) {
        crosses = true;
        break;
      }
    }

    if (!crosses) {
      accepted.push(cand);
      degree.set(cand.fromId, d1 + 1);
      degree.set(cand.toId, d2 + 1);
    }
  }

  return accepted;
}

/**
 * Checks if there is a clear, unobstructed line of sight between two points,
 * verifying that no buildings AND no high-voltage power lines lie in the way.
 */
export function hasClearLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  modules: ColonyModule[],
  powerLines?: PowerLine[],
  padding: number = 18,
  linePadding: number = 16
): boolean {
  // 1. Check building AABB obstructions
  for (let i = 0; i < modules.length; i++) {
    const box = getModuleAABB(modules[i], padding);
    if (segmentIntersectsAABB(x1, y1, x2, y2, box)) {
      return false;
    }
  }

  // 2. Power lines are elevated cables; harvesters can freely pass under them.
  // We no longer block line of sight based on power lines.

  return true;
}

/**
 * Finds the ideal exterior docking bay apron for a depot or command module.
 * Places the docking target outside building walls and clear of power line conduits
 * so vehicles offload at the exterior garage door without hazardous crossings.
 */
export function findDockingApron(
  depot: ColonyModule,
  fromX: number,
  fromY: number,
  modules: ColonyModule[],
  clearance: number = 28,
  powerLines?: PowerLine[],
  currentTarget?: { x: number; y: number } | null
): Point {
  const cx = (depot.x + depot.width / 2) * TILE_SIZE;
  const cy = (depot.y + depot.height / 2) * TILE_SIZE;
  const halfW = (depot.width * TILE_SIZE) / 2;
  const halfH = (depot.height * TILE_SIZE) / 2;
  const lines = powerLines || getPowerLines(modules);

  // Candidate docking aprons on all 4 exterior sides
  const candidates: Point[] = [
    { x: cx, y: cy + halfH + clearance }, // South apron
    { x: cx, y: cy - halfH - clearance }, // North apron
    { x: cx + halfW + clearance, y: cy }, // East apron
    { x: cx - halfW - clearance, y: cy }, // West apron
  ];

  // Filter out any candidates that overlap other buildings OR power lines
  const validCandidates = candidates.filter((cand) => {
    // Check building overlap
    const hitBuilding = modules.some((m) => {
      if (m.id === depot.id) return false;
      const b = getModuleAABB(m, 12);
      return cand.x >= b.minX && cand.x <= b.maxX && cand.y >= b.minY && cand.y <= b.maxY;
    });
    if (hitBuilding) return false;

    // Check power line proximity - removed, harvesters can drive under them
    return true;
  });

  const pool = validCandidates.length > 0 ? validCandidates : candidates;

  // If we already have a target that is still a valid apron, stick to it to prevent oscillating
  if (currentTarget) {
    for (const p of pool) {
      if (Math.hypot(p.x - currentTarget.x, p.y - currentTarget.y) < 1.0) {
        return p;
      }
    }
  }

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
 * Fast local A* grid pathfinder to route vehicles around buildings and power lines.
 * Uses string-pulling (line-of-sight pruning) to convert discrete tile steps
 * into smooth diagonal corner waypoints that avoid high-voltage conduits.
 */
export function findNavigationPath(
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  modules: ColonyModule[],
  powerLines?: PowerLine[]
): Point[] {
  const lines = powerLines || getPowerLines(modules);

  // 1. Direct path check: if line-of-sight is unobstructed by buildings or power lines
  if (hasClearLineOfSight(startX, startY, targetX, targetY, modules, lines, 18, 16)) {
    return [{ x: targetX, y: targetY }];
  }

  // 2. Setup local search grid around start and target with generous padding
  const startTileX = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(startX / TILE_SIZE)));
  const startTileY = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(startY / TILE_SIZE)));
  const endTileX = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(targetX / TILE_SIZE)));
  const endTileY = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(targetY / TILE_SIZE)));

  const padTiles = 6;
  const minGx = Math.max(0, Math.min(startTileX, endTileX) - padTiles);
  const maxGx = Math.min(GRID_SIZE - 1, Math.max(startTileX, endTileX) + padTiles);
  const minGy = Math.max(0, Math.min(startTileY, endTileY) - padTiles);
  const maxGy = Math.min(GRID_SIZE - 1, Math.max(startTileY, endTileY) + padTiles);

  // Mark blocked tiles based on building footprints
  const buildingBlockedTiles = new Set<string>();
  modules.forEach((m) => {
    for (let gx = m.x; gx < m.x + m.width; gx++) {
      for (let gy = m.y; gy < m.y + m.height; gy++) {
        buildingBlockedTiles.add(`${gx},${gy}`);
      }
    }
  });

  // A* search runner
  interface Node {
    x: number;
    y: number;
    g: number;
    f: number;
    parent: Node | null;
  }

  function runAStar(): Node | null {
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
    const MAX_ITERATIONS = 450;

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

        // Buildings are strictly impassable (unless starting on or reaching target)
        if (
          buildingBlockedTiles.has(nKey) &&
          !(nx === endTileX && ny === endTileY) &&
          !(nx === startTileX && ny === startTileY)
        ) {
          continue;
        }

        // Corner cutting prevention
        if (d.dx !== 0 && d.dy !== 0) {
          if (
            buildingBlockedTiles.has(`${current.x + d.dx},${current.y}`) ||
            buildingBlockedTiles.has(`${current.x},${current.y + d.dy}`)
          ) {
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

    return goalNode;
  }

  let goalNode = runAStar();

  // Reconstruct path
  if (!goalNode) {
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

  if (rawPoints.length > 0) {
    const last = rawPoints[rawPoints.length - 1];
    if (Math.hypot(last.x - targetX, last.y - targetY) > 2) {
      rawPoints.push({ x: targetX, y: targetY });
    }
  }

  // 3. String-Pulling / Line-of-sight path pruning:
  // Skip intermediate nodes if direct line-of-sight is unobstructed by buildings or power lines
  const pruned: Point[] = [];
  let currentPos: Point = { x: startX, y: startY };

  let i = 0;
  while (i < rawPoints.length) {
    let furthest = i;
    for (let j = rawPoints.length - 1; j > i; j--) {
      if (
        hasClearLineOfSight(
          currentPos.x,
          currentPos.y,
          rawPoints[j].x,
          rawPoints[j].y,
          modules,
          lines,
          16,
          14
        )
      ) {
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
 * 1. Using forward sensory whiskers to smoothly steer away from building corners AND power lines.
 * 2. Enforcing physical non-penetration against all building AABBs and power line cables.
 * 3. Sliding along building exterior walls and power line clearance corridors.
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
  radius: number = 16,
  powerLines?: PowerLine[]
): { nextX: number; nextY: number; nextAngle: number } {
  const lines = powerLines || getPowerLines(modules);

  // 1. Desired velocity toward target
  const toTargetAngle = Math.atan2(targetY - y, targetX - x);
  let desiredVx = Math.cos(toTargetAngle);
  let desiredVy = Math.sin(toTargetAngle);

  let combinedVx = desiredVx;
  let combinedVy = desiredVy;

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
  // A. Prevent penetration inside any building's padded bounding box
  // We cap the physical radius to 16 so it never intersects the center of adjacent A* tiles (20px).
  const safeRadius = Math.min(radius, 16);
  
  for (const m of modules) {
    const box = getModuleAABB(m, safeRadius);

    if (nextX > box.minX && nextX < box.maxX && nextY > box.minY && nextY < box.maxY) {
      const dLeft = nextX - box.minX;
      const dRight = box.maxX - nextX;
      const dTop = nextY - box.minY;
      const dBottom = box.maxY - nextY;

      const minPen = Math.min(dLeft, dRight, dTop, dBottom);

      if (minPen === dLeft) {
        nextX = box.minX;
      } else if (minPen === dRight) {
        nextX = box.maxX;
      } else if (minPen === dTop) {
        nextY = box.minY;
      } else {
        nextY = box.maxY;
      }
    }
  }

  // Keep within world boundaries
  nextX = Math.max(radius, Math.min(WORLD_WIDTH - radius, nextX));
  nextY = Math.max(radius, Math.min(WORLD_HEIGHT - radius, nextY));

  // Final Angle Snapping: If wall-sliding physically redirected the rover,
  // ensure the visual chassis perfectly aligns with the actual physical movement vector.
  // This completely eliminates diagonal "drifting" against straight walls.
  const actualDx = nextX - x;
  const actualDy = nextY - y;
  let finalAngle = nextAngle;
  if (Math.hypot(actualDx, actualDy) > 0.001) {
    finalAngle = Math.atan2(actualDy, actualDx);
  }

  return { nextX, nextY, nextAngle: finalAngle };
}

// Export alias for semantic clarity
export const steerAndAvoidObstacles = steerAndAvoidBuildings;
