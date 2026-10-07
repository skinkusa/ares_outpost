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
      const c1x = (m1.x + m1.width / 2) * TILE_SIZE;
      const c1y = (m1.y + m1.height / 2) * TILE_SIZE;
      const c2x = (m2.x + m2.width / 2) * TILE_SIZE;
      const c2y = (m2.y + m2.height / 2) * TILE_SIZE;
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

  // 2. Check power line crossings
  const lines = powerLines || getPowerLines(modules);
  for (let i = 0; i < lines.length; i++) {
    const pl = lines[i];
    if (distanceBetweenSegments(x1, y1, x2, y2, pl.x1, pl.y1, pl.x2, pl.y2) < linePadding) {
      return false;
    }
  }

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
  powerLines?: PowerLine[]
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

    // Check power line proximity
    const hitPowerLine = lines.some((pl) => {
      const pt = closestPointOnSegment(cand.x, cand.y, pl.x1, pl.y1, pl.x2, pl.y2);
      return pt.dist < clearance;
    });
    return !hitPowerLine;
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

  // Mark tiles crossed by high-voltage power lines
  const powerLineBlockedTiles = new Set<string>();
  lines.forEach((pl) => {
    const minX = Math.max(0, Math.floor((Math.min(pl.x1, pl.x2) - 14) / TILE_SIZE));
    const maxX = Math.min(GRID_SIZE - 1, Math.floor((Math.max(pl.x1, pl.x2) + 14) / TILE_SIZE));
    const minY = Math.max(0, Math.floor((Math.min(pl.y1, pl.y2) - 14) / TILE_SIZE));
    const maxY = Math.min(GRID_SIZE - 1, Math.floor((Math.max(pl.y1, pl.y2) + 14) / TILE_SIZE));

    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const box = {
          minX: gx * TILE_SIZE,
          minY: gy * TILE_SIZE,
          maxX: (gx + 1) * TILE_SIZE,
          maxY: (gy + 1) * TILE_SIZE,
        };
        if (segmentIntersectsAABB(pl.x1, pl.y1, pl.x2, pl.y2, box)) {
          powerLineBlockedTiles.add(`${gx},${gy}`);
        }
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

  function runAStar(allowPowerLinePenalized: boolean): Node | null {
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

        // Power lines check
        let stepCost = d.cost;
        if (powerLineBlockedTiles.has(nKey)) {
          if (!allowPowerLinePenalized) {
            // Strictly blocked in primary pass
            if (!(nx === endTileX && ny === endTileY) && !(nx === startTileX && ny === startTileY)) {
              continue;
            }
          } else {
            // High penalty in fallback pass to strongly favor perimeter routing
            stepCost += 50;
          }
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

        const g = current.g + stepCost;
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

  // 1st Pass: strictly avoid power lines
  let goalNode = runAStar(false);

  // 2nd Pass: if completely enclosed with zero open paths, allow penalized crossing
  if (!goalNode) {
    goalNode = runAStar(true);
  }

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
    rawPoints[rawPoints.length - 1] = { x: targetX, y: targetY };
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
          18,
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

  // 2. Sensory Whisker Obstacle Avoidance:
  // Cast forward, left-whisker (+35°), right-whisker (-35°)
  const whiskerDist = Math.max(30, speed * 26 * dt * 3.6);
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

    // A. Detect Buildings
    for (const m of modules) {
      const box = getModuleAABB(m, radius + 4);
      if (segmentIntersectsAABB(x, y, wx, wy, box)) {
        const bcx = (box.minX + box.maxX) / 2;
        const bcy = (box.minY + box.maxY) / 2;
        const awayAngle = Math.atan2(y - bcy, x - bcx);
        steerRepulsionX += Math.cos(awayAngle) * w.weight * 1.6;
        steerRepulsionY += Math.sin(awayAngle) * w.weight * 1.6;
      }
    }

    // B. Detect Power Lines
    for (const pl of lines) {
      // Check if whisker segment crosses the power line or tip is too close
      const crosses = segmentsCross(x, y, wx, wy, pl.x1, pl.y1, pl.x2, pl.y2);
      const tipClosest = closestPointOnSegment(wx, wy, pl.x1, pl.y1, pl.x2, pl.y2);

      if (crosses || tipClosest.dist < radius + 6) {
        // Vehicle closest point on power line
        const vehClosest = closestPointOnSegment(x, y, pl.x1, pl.y1, pl.x2, pl.y2);
        let awayX = x - vehClosest.x;
        let awayY = y - vehClosest.y;
        const awayDist = Math.hypot(awayX, awayY);

        if (awayDist > 0.001) {
          awayX /= awayDist;
          awayY /= awayDist;
        } else {
          // If perfectly on line, push perpendicular to power line
          const ldx = pl.x2 - pl.x1;
          const ldy = pl.y2 - pl.y1;
          const llen = Math.hypot(ldx, ldy) || 1;
          awayX = -ldy / llen;
          awayY = ldx / llen;
        }

        steerRepulsionX += awayX * w.weight * 1.8;
        steerRepulsionY += awayY * w.weight * 1.8;
      }
    }
  }

  // Combine desired direction with obstacle whisker avoidance
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
  // A. Prevent penetration inside any building's padded bounding box
  for (const m of modules) {
    const box = getModuleAABB(m, radius);

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

  // B. Prevent driving over / penetrating high-voltage power lines
  const powerClearance = radius + 6;
  for (const pl of lines) {
    const pt = closestPointOnSegment(nextX, nextY, pl.x1, pl.y1, pl.x2, pl.y2);
    if (pt.dist < powerClearance) {
      const overlap = powerClearance - pt.dist;
      let nx = nextX - pt.x;
      let ny = nextY - pt.y;
      const ndist = Math.hypot(nx, ny);

      if (ndist > 0.001) {
        nx /= ndist;
        ny /= ndist;
      } else {
        const ldx = pl.x2 - pl.x1;
        const ldy = pl.y2 - pl.y1;
        const llen = Math.hypot(ldx, ldy) || 1;
        nx = -ldy / llen;
        ny = ldx / llen;
      }

      nextX += nx * overlap;
      nextY += ny * overlap;
    }
  }

  // Keep within world boundaries
  nextX = Math.max(radius, Math.min(WORLD_WIDTH - radius, nextX));
  nextY = Math.max(radius, Math.min(WORLD_HEIGHT - radius, nextY));

  return { nextX, nextY, nextAngle };
}

// Export alias for semantic clarity
export const steerAndAvoidObstacles = steerAndAvoidBuildings;
