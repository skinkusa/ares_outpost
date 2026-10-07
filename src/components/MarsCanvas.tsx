import React, { useEffect, useRef, useState } from 'react';
import {
  ColonyModule,
  Harvester,
  ModuleBlueprint,
  ModuleType,
  SpicePatch,
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

interface MarsCanvasProps {
  terrain: MarsTerrainData;
  modules: ColonyModule[];
  harvesters: Harvester[];
  spicePatches: SpicePatch[];
  weather: WeatherCondition;
  timeOfDay: number; // 0 to 1
  selectedModule: ColonyModule | null;
  selectedHarvester: Harvester | null;
  buildPlacingType: ModuleType | null;
  canAffordPlacing: boolean;
  onSelectModule: (module: ColonyModule | null) => void;
  onSelectHarvester: (harvester: Harvester | null) => void;
  onPlaceModule: (gridX: number, gridY: number) => void;
  onCancelPlacing: () => void;
  onManualHarvesterOrder: (harvesterId: string, worldX: number, worldY: number) => void;
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

export const MarsCanvas: React.FC<MarsCanvasProps> = ({
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
  onSelectModule,
  onSelectHarvester,
  onPlaceModule,
  onCancelPlacing,
  onManualHarvesterOrder,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Particle systems
  const atmosphericParticlesRef = useRef<AtmosphericParticle[]>([]);
  const dustKickParticlesRef = useRef<DustKickParticle[]>([]);
  const miningParticlesRef = useRef<MiningParticle[]>([]);
  const lastRoverPositionsRef = useRef<Record<string, { x: number; y: number; time: number }>>({});

  // Initialize atmospheric particles
  useEffect(() => {
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

      // Camera transformation
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-camera.x, -camera.y);

      // 1. Draw Martian Terrain Base
      const terrainGrad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      terrainGrad.addColorStop(0, '#782d1b');
      terrainGrad.addColorStop(0.5, '#682414');
      terrainGrad.addColorStop(1, '#531b0e');
      ctx.fillStyle = terrainGrad;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // 1b. Atmospheric Ambient Ground Sheen / Horizon Solar Radiance
      const sunAngle = timeOfDay * Math.PI * 2;
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
      if (timeOfDay < 0.5) {
        // Daylight warmth
        atmoAura.addColorStop(0, 'rgba(251, 146, 60, 0.18)');
        atmoAura.addColorStop(0.6, 'rgba(234, 88, 12, 0.08)');
        atmoAura.addColorStop(1, 'rgba(120, 45, 27, 0)');
      } else {
        // Night twilight crimson/violet glow
        atmoAura.addColorStop(0, 'rgba(192, 38, 211, 0.12)');
        atmoAura.addColorStop(0.5, 'rgba(99, 102, 241, 0.07)');
        atmoAura.addColorStop(1, 'rgba(20, 8, 16, 0)');
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

        // Shaded crest line
        ctx.strokeStyle = 'rgba(230, 110, 75, 0.25)';
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

        ctx.strokeStyle = 'rgba(235, 120, 85, 0.4)';
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

      // =====================================================================
      // 7. POWER CONDUITS WITH ENERGY BLOOM
      // =====================================================================
      ctx.lineWidth = 2.5;
      for (let i = 0; i < modules.length; i++) {
        for (let j = i + 1; j < modules.length; j++) {
          const m1 = modules[i];
          const m2 = modules[j];
          const c1x = (m1.x + m1.width / 2) * TILE_SIZE;
          const c1y = (m1.y + m1.height / 2) * TILE_SIZE;
          const c2x = (m2.x + m2.width / 2) * TILE_SIZE;
          const c2y = (m2.y + m2.height / 2) * TILE_SIZE;
          const dist = Math.hypot(c1x - c2x, c1y - c2y);

          if (dist < TILE_SIZE * 9) {
            // Conduit ambient glow
            ctx.beginPath();
            ctx.moveTo(c1x, c1y);
            ctx.lineTo(c2x, c2y);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.lineWidth = 6;
            ctx.stroke();

            // Conduit inner core
            ctx.beginPath();
            ctx.moveTo(c1x, c1y);
            ctx.lineTo(c2x, c2y);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Pulsing energy packet with glow
            const pulseT = (time * 1.2 + i * 0.5) % 1;
            const dotX = c1x + (c2x - c1x) * pulseT;
            const dotY = c1y + (c2y - c1y) * pulseT;

            const packetGlow = ctx.createRadialGradient(dotX, dotY, 1, dotX, dotY, 9);
            packetGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            packetGlow.addColorStop(0.4, 'rgba(56, 189, 248, 0.7)');
            packetGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
            ctx.beginPath();
            ctx.arc(dotX, dotY, 9, 0, Math.PI * 2);
            ctx.fillStyle = packetGlow;
            ctx.fill();
          }
        }
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
          let auraColor = 'rgba(56, 189, 248, 0.15)';
          let auraRadius = pw * 0.8;
          if (mod.type === 'greenhouse') {
            auraColor = 'rgba(34, 197, 94, 0.22)'; // Lush emerald
            auraRadius = pw * 0.95;
          } else if (mod.type === 'rtg') {
            auraColor = 'rgba(249, 115, 22, 0.28)'; // Nuclear thermal orange
            auraRadius = pw * 0.9;
          } else if (mod.type === 'battery') {
            auraColor = 'rgba(16, 185, 129, 0.2)'; // Emerald charge
          } else if (mod.type === 'refinery') {
            auraColor = 'rgba(192, 38, 211, 0.25)'; // Spice purple furnace
            auraRadius = pw * 1.0;
          } else if (mod.type === 'command') {
            auraColor = 'rgba(3, 105, 161, 0.25)'; // Sky blue bunker
          }

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

        // Specific Building Visuals
        switch (mod.type) {
          case 'command': {
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = '#0369a1';
            ctx.fill();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Tactical signal pulse ring expanding outward
            const pulseRadius = ((time * 35) % (pw * 1.2)) + 6;
            const pulseAlpha = Math.max(0, 1 - pulseRadius / (pw * 1.2)) * 0.6;
            ctx.beginPath();
            ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${pulseAlpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Rotating communications array
            const dishAngle = time * 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(dishAngle) * (pw * 0.32), cy + Math.sin(dishAngle) * (pw * 0.32));
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Blinking beacon
            if (Math.sin(time * 5) > 0) {
              ctx.beginPath();
              ctx.arc(cx, cy, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#38bdf8';
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            break;
          }

          case 'solar': {
            const panW = (pw - 16) / 2;
            const panH = ph - 16;
            for (let p = 0; p < 2; p++) {
              const panX = px + 8 + p * (panW + 4);
              const panY = py + 8;
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(panX, panY, panW, panH);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1;
              ctx.strokeRect(panX, panY, panW, panH);

              // Photovoltaic sun reflection glint
              const glintX = panX + (Math.sin(time * 0.8 + p) * 0.4 + 0.5) * panW;
              ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
              ctx.beginPath();
              ctx.moveTo(glintX, panY);
              ctx.lineTo(glintX, panY + panH);
              ctx.stroke();

              ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
              ctx.beginPath();
              ctx.moveTo(panX + panW / 2, panY);
              ctx.lineTo(panX + panW / 2, panY + panH);
              ctx.moveTo(panX, panY + panH / 2);
              ctx.lineTo(panX + panW, panY + panH / 2);
              ctx.stroke();
            }
            break;
          }

          case 'rtg': {
            // Thermal radiation pulse
            const rtgPulse = Math.sin(time * 3) * 0.15 + 0.85;
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.3 * rtgPulse, 0, Math.PI * 2);
            ctx.fillStyle = '#ea580c';
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;

            for (let fin = 0; fin < 6; fin++) {
              const fAngle = (fin * Math.PI) / 3;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(fAngle) * 8, cy + Math.sin(fAngle) * 8);
              ctx.lineTo(cx + Math.cos(fAngle) * (pw * 0.42), cy + Math.sin(fAngle) * (pw * 0.42));
              ctx.strokeStyle = '#f97316';
              ctx.lineWidth = 4;
              ctx.stroke();
            }
            break;
          }

          case 'battery': {
            const cellW = (pw - 20) / 2;
            const cellH = (ph - 20) / 2;
            for (let bx = 0; bx < 2; bx++) {
              for (let by = 0; by < 2; by++) {
                ctx.fillStyle = '#065f46';
                ctx.fillRect(px + 8 + bx * (cellW + 4), py + 8 + by * (cellH + 4), cellW, cellH);
                ctx.fillStyle = '#10b981';
                ctx.shadowColor = '#34d399';
                ctx.shadowBlur = 5;
                ctx.fillRect(px + 10 + bx * (cellW + 4), py + 10 + by * (cellH + 4), cellW - 4, cellH - 4);
                ctx.shadowBlur = 0;
              }
            }
            break;
          }

          case 'scrubber': {
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = '#0891b2';
            ctx.fill();

            const fanAngle = time * 4;
            for (let f = 0; f < 3; f++) {
              const a = fanAngle + (f * Math.PI * 2) / 3;
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.lineTo(cx + Math.cos(a) * (pw * 0.28), cy + Math.sin(a) * (pw * 0.28));
              ctx.strokeStyle = '#cffafe';
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            break;
          }

          case 'vaporator': {
            ctx.fillStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.34, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = '#3b82f6';
            ctx.fill();
            break;
          }

          case 'greenhouse': {
            // Translucent glass dome with inner lush flora
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.38, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(22, 101, 52, 0.88)';
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#86efac';
            ctx.beginPath();
            ctx.arc(cx - 8, cy - 6, 6, 0, Math.PI * 2);
            ctx.arc(cx + 10, cy + 5, 8, 0, Math.PI * 2);
            ctx.arc(cx - 4, cy + 9, 5, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'habitat': {
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.36, 0, Math.PI * 2);
            ctx.fillStyle = '#581c87';
            ctx.fill();
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.stroke();

            for (let w = 0; w < 5; w++) {
              const wa = (w * Math.PI * 2) / 5;
              const wx = cx + Math.cos(wa) * (pw * 0.24);
              const wy = cy + Math.sin(wa) * (ph * 0.24);
              ctx.beginPath();
              ctx.arc(wx, wy, 3, 0, Math.PI * 2);
              ctx.fillStyle = '#fef08a';
              ctx.fill();
            }
            break;
          }

          case 'refinery': {
            ctx.fillStyle = '#4a044e';
            ctx.fillRect(px + 10, py + 10, pw - 20, ph - 20);
            ctx.strokeStyle = '#e879f9';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 10, py + 10, pw - 20, ph - 20);

            // Shimmering spice furnace with neon glow
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fillStyle = Math.sin(time * 3) > 0 ? '#d946ef' : '#a21caf';
            ctx.shadowColor = '#e879f9';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
          }

          case 'depot': {
            ctx.fillStyle = '#4c0519';
            ctx.fillRect(px + 10, py + 10, pw - 20, ph - 20);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2;
            ctx.strokeRect(px + 10, py + 10, pw - 20, ph - 20);

            ctx.fillStyle = '#facc15';
            ctx.fillRect(px + pw / 2 - 16, py + ph - 14, 32, 10);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + pw / 2 - 16, py + ph - 14, 32, 10);
            break;
          }

          case 'research': {
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = '#312e81';
            ctx.fill();
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(129, 140, 248, 0.7)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, pw * 0.3, pw * 0.12, time * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }

          case 'launchpad': {
            ctx.fillStyle = '#292524';
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.strokeStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.25, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(cx - 7, cy - 24, 14, 48);
            ctx.beginPath();
            ctx.moveTo(cx - 7, cy - 24);
            ctx.lineTo(cx, cy - 38);
            ctx.lineTo(cx + 7, cy - 24);
            ctx.fillStyle = '#ea580c';
            ctx.fill();
            break;
          }

          case 'radar': {
            ctx.beginPath();
            ctx.arc(cx, cy, pw * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = '#115e59';
            ctx.fill();
            ctx.strokeStyle = '#2dd4bf';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Holographic radar sweep arc with fading tail
            const radAngle = time * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, pw * 1.1, radAngle - 0.45, radAngle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(45, 212, 191, 0.28)';
            ctx.fill();
            break;
          }
        }

        // Module Label & Level
        ctx.font = '700 10px Chakra Petch, sans-serif';
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

        // Volumetric Headlight Cone
        ctx.save();
        ctx.rotate(h.angle);
        const lightGrad = ctx.createRadialGradient(0, 0, 10, 80, 0, 130);
        lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
        lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.2)');
        lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(130, -42);
        ctx.lineTo(130, 42);
        ctx.closePath();
        ctx.fillStyle = lightGrad;
        ctx.fill();
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
          ctx.translate(h.x, h.y);
        }

        // Rotate chassis
        ctx.rotate(h.angle);

        const length = h.model === 'titan' ? 38 : h.model === 'heavy' ? 30 : 22;
        const width = h.model === 'titan' ? 26 : h.model === 'heavy' ? 20 : 15;

        // Wheels / Treads
        ctx.fillStyle = '#1c1917';
        if (h.model === 'titan') {
          ctx.fillRect(-length / 2, -width / 2 - 4, length, 6);
          ctx.fillRect(-length / 2, width / 2 - 2, length, 6);
        } else if (h.model === 'heavy') {
          for (let w = -1; w <= 1; w++) {
            ctx.fillRect(w * 9 - 4, -width / 2 - 4, 8, 5);
            ctx.fillRect(w * 9 - 4, width / 2 - 1, 8, 5);
          }
        } else {
          ctx.fillRect(-length / 2 + 2, -width / 2 - 3, 7, 4);
          ctx.fillRect(length / 2 - 9, -width / 2 - 3, 7, 4);
          ctx.fillRect(-length / 2 + 2, width / 2 - 1, 7, 4);
          ctx.fillRect(length / 2 - 9, width / 2 - 1, 7, 4);
        }

        // Main Hull Body
        ctx.fillStyle = h.model === 'titan' ? '#701a75' : h.model === 'heavy' ? '#b45309' : '#0369a1';
        ctx.fillRect(-length / 2, -width / 2, length, width);
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#fed7aa';
        ctx.lineWidth = isSelected ? 2.5 : 1.2;
        ctx.strokeRect(-length / 2, -width / 2, length, width);

        // Spice Cargo Tank (glows based on fullness)
        const cargoFillRatio = Math.min(1, h.cargo / h.maxCargo);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(-length * 0.35, -width * 0.35, length * 0.45, width * 0.7);

        if (cargoFillRatio > 0) {
          ctx.fillStyle = cargoFillRatio > 0.9 ? '#ec4899' : '#a855f7';
          ctx.shadowColor = '#d946ef';
          ctx.shadowBlur = 6;
          ctx.fillRect(
            -length * 0.35,
            -width * 0.35,
            length * 0.45 * cargoFillRatio,
            width * 0.7
          );
          ctx.shadowBlur = 0;
        }

        // Front drill / scoop
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(length / 2, -width * 0.3);
        ctx.lineTo(length / 2 + 6, 0);
        ctx.lineTo(length / 2, width * 0.3);
        ctx.closePath();
        ctx.fill();

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
        if (h.state === 'moving_to_spice') {
          stateLabel = 'NAV TO SPICE';
          stateColor = '#38bdf8';
        } else if (h.state === 'harvesting') {
          stateLabel = `MINING (${Math.round(h.cargo)}/${h.maxCargo})`;
          stateColor = '#e879f9';
        } else if (h.state === 'returning_to_depot') {
          stateLabel = 'RETURNING (FULL)';
          stateColor = '#f59e0b';
        } else if (h.state === 'unloading') {
          stateLabel = 'UNLOADING SPICE';
          stateColor = '#10b981';
        }

        ctx.font = '600 8px Chakra Petch, sans-serif';
        ctx.fillStyle = stateColor;
        ctx.fillText(stateLabel, h.x, hudY + 14);
      });

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
      // 12. WEATHER & DUST STORM OVERLAY
      // =====================================================================
      if (weather.type === 'dust_storm') {
        const stormGrad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        stormGrad.addColorStop(0, 'rgba(180, 83, 9, 0.45)');
        stormGrad.addColorStop(0.5, 'rgba(194, 65, 12, 0.58)');
        stormGrad.addColorStop(1, 'rgba(154, 52, 18, 0.45)');
        ctx.fillStyle = stormGrad;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        ctx.strokeStyle = 'rgba(254, 215, 170, 0.3)';
        ctx.lineWidth = 2.5;
        for (let ws = 0; ws < 28; ws++) {
          const wx = (time * 350 + ws * 110) % WORLD_WIDTH;
          const wy = (ws * 75) % WORLD_HEIGHT;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 90, wy + 25);
          ctx.stroke();
        }
      }

      // =====================================================================
      // 13. DAY / NIGHT ATMOSPHERIC LIGHTING FILTER & VIGNETTE
      // =====================================================================
      let nightAlpha = 0;
      if (timeOfDay > 0.5 && timeOfDay < 1) {
        nightAlpha = Math.sin((timeOfDay - 0.5) * Math.PI * 2) * 0.68;
      }

      if (nightAlpha > 0.05) {
        ctx.fillStyle = `rgba(10, 15, 30, ${nightAlpha})`;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
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
      // 14. MINIMAP (Screen Space)
      // =====================================================================
      const mmWidth = 190;
      const mmHeight = 190;
      const mmX = canvas.width - mmWidth - 16;
      const mmY = canvas.height - mmHeight - 16;

      ctx.fillStyle = 'rgba(12, 10, 9, 0.88)';
      ctx.fillRect(mmX, mmY, mmWidth, mmHeight);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mmX, mmY, mmWidth, mmHeight);

      // Sector quadrant crosshair lines
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.25)';
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
