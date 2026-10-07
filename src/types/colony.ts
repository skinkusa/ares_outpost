export type ResourceType =
  | 'credits'
  | 'alloy'
  | 'spice'
  | 'power'
  | 'batteryStored'
  | 'powerCapacity'
  | 'oxygen'
  | 'water'
  | 'food'
  | 'techPoints';

export type ModuleCategory =
  | 'command'
  | 'power'
  | 'life_support'
  | 'industry'
  | 'research';

export type ModuleType =
  | 'command'
  | 'solar'
  | 'rtg'
  | 'battery'
  | 'scrubber'
  | 'vaporator'
  | 'greenhouse'
  | 'habitat'
  | 'refinery'
  | 'depot'
  | 'research'
  | 'launchpad'
  | 'radar';

export interface ModuleBlueprint {
  type: ModuleType;
  name: string;
  category: ModuleCategory;
  description: string;
  costAlloy: number;
  costCredits: number;
  width: number; // grid tiles
  height: number;
  powerDelta: number; // positive = generation, negative = consumption
  batteryCapacity?: number;
  o2Delta: number;
  waterDelta: number;
  foodDelta: number;
  popCapacity?: number;
  techRate?: number;
  spiceCapacity?: number;
  color: string;
  icon: string;
}

export interface ColonyModule {
  id: string;
  type: ModuleType;
  x: number; // grid col
  y: number; // grid row
  width: number;
  height: number;
  level: number;
  health: number;
  maxHealth: number;
  isActive: boolean;
  assignedColonists: number;
  constructed: boolean;
  constructProgress: number; // 0 to 100
}

export type HarvesterState =
  | 'idle'
  | 'moving_to_spice'
  | 'harvesting'
  | 'returning_to_depot'
  | 'unloading'
  | 'broken_down'
  | 'docked';

export type HarvesterModel = 'scout' | 'heavy' | 'titan';

export interface HarvesterModelSpec {
  model: HarvesterModel;
  name: string;
  description: string;
  costAlloy: number;
  costCredits: number;
  maxCargo: number;
  speed: number;
  harvestRate: number; // kg per second
  maxHealth: number;
}

export interface Harvester {
  id: string;
  name: string;
  model: HarvesterModel;
  x: number; // world pixels
  y: number;
  targetX: number | null;
  targetY: number | null;
  angle: number; // radians
  speed: number;
  cargo: number;
  maxCargo: number;
  harvestRate: number;
  health: number;
  maxHealth: number;
  state: HarvesterState;
  targetSpiceId: string | null;
  homeDepotId: string;
  autoHarvest: boolean;
  tireHistory: Array<{ x: number; y: number; alpha: number }>;
  laserPulseTimer: number;
  unloadingTimer: number;
  totalSpiceDelivered: number;
  waypoints?: Array<{ x: number; y: number }>;
}

export interface SpicePatch {
  id: string;
  x: number; // world pixels
  y: number;
  radius: number;
  amount: number;
  maxAmount: number;
  richness: 'standard' | 'rich' | 'pure_vein';
  discovered: boolean;
  pulseOffset: number;
}

export type WeatherType =
  | 'clear'
  | 'dust_veil'
  | 'dust_storm'
  | 'seismic_tremor'
  | 'solar_flare';

export interface WeatherCondition {
  type: WeatherType;
  name: string;
  description: string;
  duration: number; // seconds left
  maxDuration: number;
  severity: number; // 0 to 1
}

export interface TechNode {
  id: string;
  name: string;
  category: 'spice' | 'power' | 'life_support' | 'engineering';
  description: string;
  cost: number;
  unlocked: boolean;
  requires: string[];
  effectLabel: string;
}

export interface TradeRocket {
  id: string;
  state: 'in_orbit' | 'landing' | 'docked' | 'launching';
  timer: number; // progress in current state
  spiceLoaded: number;
  maxSpiceCapacity: number;
  creditBonusPerKg: number;
  lastPayout: number;
}

export type ColonyEventType =
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'spice'
  | 'urgency';

export interface ColonyEventLog {
  id: string;
  sol: number;
  timeStr: string;
  type: ColonyEventType;
  title: string;
  message: string;
  urgency?: 'CRITICAL' | 'HIGH' | 'URGENT';
}

export interface ColonyStats {
  sol: number;
  timeOfDay: number; // 0 to 1 (0 = dawn, 0.25 = noon, 0.5 = sunset, 0.75 = midnight)
  dayCycleSpeed: number;
  credits: number;
  alloy: number;
  spice: number;
  spiceCapacity: number;
  powerStored: number;
  powerCapacity: number;
  currentPowerProd: number;
  currentPowerCons: number;
  powerNet: number;
  oxygen: number;
  maxOxygen: number;
  currentO2Delta: number;
  water: number;
  maxWater: number;
  currentWaterDelta: number;
  food: number;
  maxFood: number;
  currentFoodDelta: number;
  techPoints: number;
  population: number;
  maxPopulation: number;
  morale: number; // 0 to 100
  totalSpiceMined: number;
  totalCreditsEarned: number;
}
