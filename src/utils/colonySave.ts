import {
  ColonistWorker,
  ColonyEventLog,
  ColonyModule,
  ColonyStats,
  Harvester,
  RandomEvent,
  ResourceHistoryPoint,
  SpicePatch,
  OreDeposit,
  TechNode,
  WeatherCondition,
} from '../types/colony';
import { TECH_TREE } from './constants';
import { MarsTerrainData } from './terrain';

export const COLONY_SAVE_KEY = 'ares_colony_v1';

export interface ColonySave {
  version: 1;
  terrain: MarsTerrainData;
  spicePatches: SpicePatch[];
  oreDeposits: OreDeposit[];
  modules: ColonyModule[];
  harvesters: Harvester[];
  workers: ColonistWorker[];
  techNodes: TechNode[];
  weather: WeatherCondition;
  randomEvent: RandomEvent | null;
  stats: ColonyStats;
  resourceHistory: ResourceHistoryPoint[];
  logs: ColonyEventLog[];
}

const WEATHER_TYPES = new Set([
  'clear',
  'dust_veil',
  'dust_storm',
  'seismic_tremor',
  'solar_flare',
]);

const MODULE_TYPES = new Set([
  'command',
  'solar',
  'rtg',
  'battery',
  'fusion',
  'scrubber',
  'vaporator',
  'greenhouse',
  'habitat',
  'refinery',
  'depot',
  'research',
  'launchpad',
  'radar',
  'medbay',
  'garage',
  'storage',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isColonySave(value: unknown): value is ColonySave {
  if (!isRecord(value) || value.version !== 1) return false;
  if (!isRecord(value.terrain)) return false;
  if (!Array.isArray(value.terrain.craters)) return false;
  if (!Array.isArray(value.terrain.rocks)) return false;
  if (!Array.isArray(value.terrain.dunes)) return false;
  if (!Array.isArray(value.spicePatches) || !Array.isArray(value.oreDeposits)) return false;
  if (!Array.isArray(value.modules) || value.modules.length === 0) return false;
  if (
    !value.modules.every(
      (mod) =>
        isRecord(mod) &&
        typeof mod.id === 'string' &&
        typeof mod.type === 'string' &&
        MODULE_TYPES.has(mod.type) &&
        typeof mod.x === 'number' &&
        typeof mod.y === 'number'
    )
  ) {
    return false;
  }
  if (!Array.isArray(value.harvesters) || !Array.isArray(value.workers)) return false;
  if (!Array.isArray(value.techNodes) || !Array.isArray(value.resourceHistory) || !Array.isArray(value.logs)) {
    return false;
  }
  if (!isRecord(value.stats) || typeof value.stats.sol !== 'number' || typeof value.stats.timeOfDay !== 'number') {
    return false;
  }
  if (!isRecord(value.weather) || typeof value.weather.type !== 'string' || !WEATHER_TYPES.has(value.weather.type)) {
    return false;
  }
  if (value.randomEvent !== null && !isRecord(value.randomEvent)) return false;
  return true;
}

export function loadColony(): ColonySave | null {
  try {
    const raw = localStorage.getItem(COLONY_SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isColonySave(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveColony(save: ColonySave): void {
  try {
    localStorage.setItem(COLONY_SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private mode or a full quota leaves the last good save in place.
  }
}

export function clearColonySave(): void {
  try {
    localStorage.removeItem(COLONY_SAVE_KEY);
  } catch {
    // Nothing else stores the colony.
  }
}

export function mergeSavedTech(saved: TechNode[]): TechNode[] {
  const unlocked = new Set(saved.filter((node) => node && node.unlocked).map((node) => node.id));
  return TECH_TREE.map((node) => ({ ...node, unlocked: unlocked.has(node.id) || node.unlocked }));
}
