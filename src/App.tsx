/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ColonyEventLog,
  ColonistWorker,
  ColonyModule,
  ColonyStats,
  Harvester,
  HarvesterModel,
  ModuleType,
  ResourceHistoryPoint,
  SpicePatch,
  OreDeposit,
  TechNode,
  WeatherCondition,
  RandomEvent,
  RandomEventType,
} from './types/colony';
import {
  GRID_SIZE,
  HARVESTER_SPECS,
  MODULE_BLUEPRINTS,
  TECH_TREE,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './utils/constants';
import { generateMarsTerrain, spawnNewSpicePatch } from './utils/terrain';
import { sound } from './utils/audio';
import {
  findDockingApron,
  findNavigationPath,
  getPowerLines,
  PowerLine,
  steerAndAvoidBuildings,
} from './utils/navigation';

import { MarsCanvas } from './components/MarsCanvas';
import { TopBar } from './components/TopBar';
import { BuildMenu } from './components/BuildMenu';
import { HarvesterManager } from './components/HarvesterManager';
import { ModuleDetailsModal } from './components/ModuleDetailsModal';
import { HarvesterDetailsModal } from './components/HarvesterDetailsModal';
import { TechTreeModal } from './components/TechTreeModal';
import { TradeRocketModal } from './components/TradeRocketModal';
import { TutorialModal } from './components/TutorialModal';
import { ColonyLog } from './components/ColonyLog';
import { ResourceMonitor } from './components/ResourceMonitor';
import { CustomAssetsModal } from './components/CustomAssetsModal';

function generateInitialResourceHistory(initialStats: ColonyStats): ResourceHistoryPoint[] {
  const history: ResourceHistoryPoint[] = [];
  const currentTotalMinutes = (initialStats.sol - 1) * 1440 + Math.floor(initialStats.timeOfDay * 1440);

  // Pre-seed the prior 50 game minutes with realistic telemetry curves
  for (let offset = -50; offset <= 0; offset++) {
    const minute = Math.max(0, currentTotalMinutes + offset);
    const sol = Math.floor(minute / 1440) + 1;
    const minuteInSol = minute % 1440;
    const timeOfDay = minuteInSol / 1440;
    const hours = Math.floor(timeOfDay * 24);
    const mins = Math.floor((timeOfDay * 24 * 60) % 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    const progress = (offset + 50) / 50; // 0 (50 mins ago) to 1 (now)
    const power = Math.max(
      100,
      Math.min(
        initialStats.powerCapacity,
        initialStats.powerStored - (1 - progress) * 50 + Math.sin(offset * 0.22) * 6
      )
    );
    const water = Math.max(
      80,
      Math.min(
        initialStats.maxWater,
        initialStats.water - (1 - progress) * 25 + Math.cos(offset * 0.18) * 5
      )
    );
    const oxygen = Math.max(
      90,
      Math.min(
        initialStats.maxOxygen,
        initialStats.oxygen - (1 - progress) * 35 + Math.sin(offset * 0.14) * 6
      )
    );

    history.push({
      gameMinute: minute,
      sol,
      timeOfDay,
      timeStr,
      minutesAgo: offset,
      power: Math.round(power * 10) / 10,
      powerPct: Math.round((power / Math.max(1, initialStats.powerCapacity)) * 1000) / 10,
      powerNet: initialStats.powerNet,
      powerProd: initialStats.currentPowerProd,
      powerCons: initialStats.currentPowerCons,
      powerCapacity: initialStats.powerCapacity,
      water: Math.round(water * 10) / 10,
      waterPct: Math.round((water / Math.max(1, initialStats.maxWater)) * 1000) / 10,
      waterDelta: initialStats.currentWaterDelta,
      maxWater: initialStats.maxWater,
      oxygen: Math.round(oxygen * 10) / 10,
      oxygenPct: Math.round((oxygen / Math.max(1, initialStats.maxOxygen)) * 1000) / 10,
      oxygenDelta: initialStats.currentO2Delta,
      maxOxygen: initialStats.maxOxygen,
      food: initialStats.food,
      foodPct: Math.round((initialStats.food / Math.max(1, initialStats.maxFood)) * 1000) / 10,
      foodDelta: initialStats.currentFoodDelta,
      maxFood: initialStats.maxFood,
      alloy: initialStats.alloy,
      ore: initialStats.ore,
      spice: initialStats.spice,
      credits: initialStats.credits,
      morale: initialStats.morale,
      health: initialStats.colonistHealth || 100,
    });
  }
  return history;
}

export default function App() {
  // Terrain & World
  const [terrain] = useState(() => generateMarsTerrain());
  const [spicePatches, setSpicePatches] = useState<SpicePatch[]>(() => terrain.spicePatches);
  const [oreDeposits] = useState<OreDeposit[]>(() => terrain.oreDeposits);

  // Colony Modules
  const [modules, setModules] = useState<ColonyModule[]>([
    {
      id: 'mod_cmd',
      type: 'command',
      x: 38,
      y: 38,
      width: 3,
      height: 3,
      level: 1,
      health: 200,
      maxHealth: 200,
      isActive: true,
      assignedColonists: 2,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_solar_1',
      type: 'solar',
      x: 35,
      y: 38,
      width: 2,
      height: 2,
      level: 1,
      health: 100,
      maxHealth: 100,
      isActive: true,
      assignedColonists: 0,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_rtg_1',
      type: 'rtg',
      x: 35,
      y: 41,
      width: 2,
      height: 2,
      level: 1,
      health: 150,
      maxHealth: 150,
      isActive: true,
      assignedColonists: 0,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_depot_1',
      type: 'depot',
      x: 42,
      y: 38,
      width: 3,
      height: 3,
      level: 1,
      health: 180,
      maxHealth: 180,
      isActive: true,
      assignedColonists: 1,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_scrubber_1',
      type: 'scrubber',
      x: 38,
      y: 35,
      width: 2,
      height: 2,
      level: 1,
      health: 120,
      maxHealth: 120,
      isActive: true,
      assignedColonists: 1,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_vaporator_1',
      type: 'vaporator',
      x: 41,
      y: 35,
      width: 2,
      height: 2,
      level: 1,
      health: 110,
      maxHealth: 110,
      isActive: true,
      assignedColonists: 1,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_battery_1',
      type: 'battery',
      x: 38,
      y: 42,
      width: 2,
      height: 2,
      level: 1,
      health: 130,
      maxHealth: 130,
      isActive: true,
      assignedColonists: 0,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_hab_1',
      type: 'habitat',
      x: 42,
      y: 42,
      width: 3,
      height: 3,
      level: 1,
      health: 150,
      maxHealth: 150,
      isActive: true,
      assignedColonists: 0,
      constructed: true,
      constructProgress: 100,
    },
    {
      id: 'mod_medbay_1',
      type: 'medbay',
      x: 35,
      y: 35,
      width: 2,
      height: 2,
      level: 1,
      health: 120,
      maxHealth: 120,
      isActive: true,
      assignedColonists: 1,
      constructed: true,
      constructProgress: 100,
    },
  ]);

  // High-voltage power transmission lines network
  const powerLines = useMemo(() => getPowerLines(modules), [modules]);

  // Initial Harvesters
  const [workers, setWorkers] = useState<ColonistWorker[]>([]);
  const [harvesters, setHarvesters] = useState<Harvester[]>([
    {
      id: 'harvester_alpha',
      name: 'Harvester Alpha',
      model: 'heavy',
      x: 45.5 * TILE_SIZE,
      y: 39.5 * TILE_SIZE,
      targetX: null,
      targetY: null,
      waypoints: [],
      angle: 0,
      speed: HARVESTER_SPECS.heavy.speed,
      cargo: 0,
      maxCargo: HARVESTER_SPECS.heavy.maxCargo,
      harvestRate: HARVESTER_SPECS.heavy.harvestRate,
      health: HARVESTER_SPECS.heavy.maxHealth,
      maxHealth: HARVESTER_SPECS.heavy.maxHealth,
      state: 'idle',
      targetSpiceId: null,
      homeDepotId: 'mod_depot_1',
      autoHarvest: true,
      miningTarget: 'spice',
      tireHistory: [],
      laserPulseTimer: 0,
      unloadingTimer: 0,
      totalSpiceDelivered: 0,
    },
  ]);

  // Tech Tree
  const [techNodes, setTechNodes] = useState<TechNode[]>(() => TECH_TREE);

  // Weather Condition
  const [weather, setWeather] = useState<WeatherCondition>({
    type: 'clear',
    name: 'Clear Martian Skies',
    description: 'Optimal visibility and solar radiation.',
    duration: 120,
    maxDuration: 120,
    severity: 0,
  });

  // Random Events
  const [randomEvent, setRandomEvent] = useState<RandomEvent | null>(null);

  // Colony Stats & Resources
  const statsRef = useRef<ColonyStats | null>(null);
  const [stats, setStats] = useState<ColonyStats>({
    sol: 1,
    timeOfDay: 0.15, // morning
    dayCycleSpeed: 0.006, // approx 2.5 minutes per day at 1x
    credits: 220,
    alloy: 140,
    spice: 45,
    spiceCapacity: 600,
    autoExportSpice: false,
    autoExportThreshold: 100,
    ore: 0,
    maxOre: 500,
    powerStored: 350,
    powerCapacity: 400,
    currentPowerProd: 65,
    currentPowerCons: 40,
    powerNet: 25,
    oxygen: 400,
    maxOxygen: 800,
    currentO2Delta: 15,
    water: 350,
    maxWater: 800,
    currentWaterDelta: 12,
    food: 280,
    maxFood: 600,
    currentFoodDelta: 0,
    techPoints: 20,
    population: 8,
    maxPopulation: 14,
    morale: 88,
    colonistHealth: 94,
    radiationLevel: 1.35,
    effectiveRadiationDose: 0.62,
    medicalBayCount: 1,
    healthRecoveryRate: 0.35,
    totalSpiceMined: 45,
    totalCreditsEarned: 0,
  });

  // UI Navigation & Modals State
  const [gameSpeed, setGameSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedModule, setSelectedModule] = useState<ColonyModule | null>(null);
  const [selectedHarvester, setSelectedHarvester] = useState<Harvester | null>(null);
  const [buildPlacingType, setBuildPlacingType] = useState<ModuleType | null>(null);
  const [isHarvesterBayOpen, setIsHarvesterBayOpen] = useState<boolean>(false);
  const [isTechTreeOpen, setIsTechTreeOpen] = useState<boolean>(false);
  const [isTradeRocketOpen, setIsTradeRocketOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isCustomAssetsOpen, setIsCustomAssetsOpen] = useState<boolean>(false);
  const [isResourceMonitorOpen, setIsResourceMonitorOpen] = useState<boolean>(false);
  const [resourceMonitorFilter, setResourceMonitorFilter] = useState<'all' | 'power' | 'water' | 'oxygen'>('all');
  const [resourceHistory, setResourceHistory] = useState<ResourceHistoryPoint[]>(() =>
    generateInitialResourceHistory(stats)
  );
  const lastRecordedGameMinuteRef = useRef<number>((1 - 1) * 1440 + Math.floor(0.15 * 1440));

  // Colony Event Logs
  const [logs, setLogs] = useState<ColonyEventLog[]>([
    {
      id: 'log_0',
      sol: 1,
      timeStr: '06:00',
      type: 'info',
      title: 'Ares Outpost Online',
      message: 'Life support operational. Primary Harvester Alpha ready for spice deployment.',
    },
  ]);

  // Add Log Helper
  const addLog = (
    type: ColonyEventLog['type'],
    title: string,
    message: string,
    urgency?: ColonyEventLog['urgency']
  ) => {
    const hours = Math.floor(stats.timeOfDay * 24);
    const mins = Math.floor((stats.timeOfDay * 24 * 60) % 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    setLogs((prev) => [
      ...prev.slice(-30),
      {
        id: `log_${Date.now()}_${Math.random()}`,
        sol: stats.sol,
        timeStr,
        type,
        title,
        message,
        urgency,
      },
    ]);
  };

  // Morale, Vital & Health warning cooldown tracker
  const moraleWarningCooldownRef = useRef<{
    o2: number;
    water: number;
    food: number;
    power: number;
    general: number;
    health: number;
    radiation: number;
  }>({ o2: 0, water: 0, food: 0, power: 0, general: 0, health: 0, radiation: 0 });

  // Prolonged Low Resource Deprivation Tracker (> 5 minutes / 300 seconds of game time)
  const prolongedLowTrackerRef = useRef<{
    powerSec: number;
    oxygenSec: number;
    waterSec: number;
    foodSec: number;
    powerLastUrgencyAlert: number;
    oxygenLastUrgencyAlert: number;
    waterLastUrgencyAlert: number;
    foodLastUrgencyAlert: number;
  }>({
    powerSec: 0,
    oxygenSec: 0,
    waterSec: 0,
    foodSec: 0,
    powerLastUrgencyAlert: 0,
    oxygenLastUrgencyAlert: 0,
    waterLastUrgencyAlert: 0,
    foodLastUrgencyAlert: 0,
  });

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Sound Engine Setup on first interaction
  useEffect(() => {
    const onFirstUserClick = () => {
      sound.startAmbient();
      window.removeEventListener('click', onFirstUserClick);
    };
    window.addEventListener('click', onFirstUserClick);
    return () => window.removeEventListener('click', onFirstUserClick);
  }, []);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    sound.setMuted(nextMute);
  };

  // Helper: check tech unlocked
  const hasTech = (techId: string) => {
    return techNodes.some((t) => t.id === techId && t.unlocked);
  };

  // -------------------------------------------------------------
  // SIMULATION TICK LOOP (Runs every 100ms)
  // -------------------------------------------------------------
  useEffect(() => {
    if (gameSpeed === 0) return;

    const interval = setInterval(() => {
      const dt = 0.1 * gameSpeed; // scaled seconds

      // 1. Advance Sol Clock & Time of Day
      setStats((prevStats) => {
        let newTime = prevStats.timeOfDay + prevStats.dayCycleSpeed * dt;
        let newSol = prevStats.sol;
        if (newTime >= 1) {
          newTime = 0;
          newSol += 1;
          addLog('info', 'New Sol', `Dawn breaks over Mars. Sol ${newSol} begins.`);
        }

        // Calculate power generation based on sunlight
        // Sun peaks at noon (0.25). 0 at night (>0.5)
        let sunFactor = 0;
        if (newTime <= 0.5) {
          sunFactor = Math.sin((newTime / 0.5) * Math.PI);
        }
        const hasRadar = modules.some(m => m.type === 'radar' && m.isActive);
        if (weather.type === 'dust_storm') {
          sunFactor *= hasTech('storm_hardening') ? 0.6 : (hasRadar ? 0.4 : 0.25);
        } else if (weather.type === 'dust_veil') {
          sunFactor *= 0.75;
        } else if (weather.type === 'solar_flare') {
          sunFactor *= 2.2;
        }

        // Module rates calculation
        let powerProd = 0;
        let powerCons = 0;
        let o2Gen = 0;
        let waterGen = 0;
        let foodGen = 0;
        let techGen = 0;
        let spiceCap = 600;
        let oreGen = 0;
        let oreConsRate = 0;
        let alloyGenRate = 0;
        let batteryCap = 0;
        let popCap = 0;
        let medBayCount = 0;
        let medBayEffectiveness = 0;

        modules.forEach((mod) => {
          if (!mod.isActive) return;
          const bp = MODULE_BLUEPRINTS[mod.type];
          if (!bp) return;
          const mult = 1 + (mod.level - 1) * 0.5;

          if (mod.type === 'medbay') {
            medBayCount++;
            medBayEffectiveness += mult;
          }

          if (bp.powerDelta > 0) {
            if (mod.type === 'solar') {
              const solarBonus = hasTech('solar_tracking') ? 1.35 : 1.0;
              powerProd += bp.powerDelta * mult * sunFactor * solarBonus;
            } else if (mod.type === 'rtg') {
              const rtgBonus = hasTech('nuclear_enrichment') ? 1.5 : 1.0;
              powerProd += bp.powerDelta * mult * rtgBonus;
            } else {
              powerProd += bp.powerDelta * mult;
            }
          } else {
            powerCons += Math.abs(bp.powerDelta * mult);
          }

          if (bp.batteryCapacity) batteryCap += bp.batteryCapacity * mult;
          if (bp.spiceCapacity) spiceCap += bp.spiceCapacity * mult;
          if (bp.popCapacity) popCap += bp.popCapacity;

          if (bp.o2Delta > 0) o2Gen += bp.o2Delta * mult;
          if (bp.waterDelta > 0) {
            const waterBonus = hasTech('deep_well_drilling') ? 1.5 : 1.0;
            waterGen += bp.waterDelta * mult * waterBonus;
          }
          if (bp.foodDelta > 0) foodGen += bp.foodDelta * mult;
          if (bp.techRate) techGen += bp.techRate * mult;
          
          if (mod.type === 'miner') {
            oreGen += 5 * mult; // Static miner produces 5 ore per second
          }
          if (mod.type === 'refinery') {
            oreConsRate += 4 * mult; // Consumes 4 ore per sec
            alloyGenRate += 2 * mult; // Produces 2 alloy per sec (2:1 ratio)
          }
        });

        // Apply Random Event Effects
        if (randomEvent) {
          if (randomEvent.type === 'tech_breakthrough') {
            powerCons *= randomEvent.effectMultiplier;
          } else if (randomEvent.type === 'meteor_strike') {
            powerProd *= randomEvent.effectMultiplier;
            o2Gen *= randomEvent.effectMultiplier;
            waterGen *= randomEvent.effectMultiplier;
            foodGen *= randomEvent.effectMultiplier;
          }
        }

        // Life support consumption by colonists
        const o2Cons = prevStats.population * 1.5;
        const waterCons = prevStats.population * 1.0;
        const foodCons = prevStats.population * 0.8;

        const netPower = powerProd - powerCons;
        let newPowerStored = prevStats.powerStored + netPower * dt;
        if (newPowerStored > batteryCap) newPowerStored = batteryCap;
        if (newPowerStored < 0) newPowerStored = 0;

        // Ore & Alloy processing
        let availableOreRate = prevStats.ore / dt + oreGen;
        let actualOreConsRate = Math.min(oreConsRate, availableOreRate);
        let actualAlloyGenRate = oreConsRate > 0 ? alloyGenRate * (actualOreConsRate / oreConsRate) : 0;
        
        let newOre = Math.min(prevStats.maxOre, Math.max(0, prevStats.ore + (oreGen - actualOreConsRate) * dt));
        let newAlloy = prevStats.alloy + actualAlloyGenRate * dt;

        // Oxygen & Water & Food integration
        let newO2 = Math.min(prevStats.maxOxygen, Math.max(0, prevStats.oxygen + (o2Gen - o2Cons) * dt));
        let newWater = Math.min(prevStats.maxWater, Math.max(0, prevStats.water + (waterGen - waterCons) * dt));
        let newFood = Math.min(prevStats.maxFood, Math.max(0, prevStats.food + (foodGen - foodCons) * dt));
        let newTech = prevStats.techPoints + techGen * dt;

        // Decrement vital warning cooldowns
        const cd = moraleWarningCooldownRef.current;
        cd.o2 = Math.max(0, cd.o2 - dt);
        cd.water = Math.max(0, cd.water - dt);
        cd.food = Math.max(0, cd.food - dt);
        cd.power = Math.max(0, cd.power - dt);
        cd.general = Math.max(0, cd.general - dt);
        cd.health = Math.max(0, cd.health - dt);
        cd.radiation = Math.max(0, cd.radiation - dt);

        // Dynamic Morale Calculation based on life support and amenities
        let targetMorale = 92;

        // O2 vital thresholds
        if (newO2 < 35) {
          targetMorale -= 55;
          if (cd.o2 <= 0) {
            cd.o2 = 18;
            sound.playAlarm();
            addLog('danger', 'O2 Asphyxiation Warning', `Atmospheric oxygen critical (${Math.round(newO2)}m³)! Colonists suffocating; morale collapsing.`);
          }
        } else if (newO2 < 80) {
          targetMorale -= 28;
          if (cd.o2 <= 0) {
            cd.o2 = 24;
            addLog('warning', 'O2 Depletion Warning', `Oxygen reserves low (${Math.round(newO2)}m³). MOXIE scrubbers struggling.`);
          }
        }

        // Water vital thresholds
        if (newWater < 30) {
          targetMorale -= 45;
          if (cd.water <= 0) {
            cd.water = 18;
            sound.playAlarm();
            addLog('danger', 'Severe Dehydration', `Water supplies critical (${Math.round(newWater)}L)! Immediate medical emergency.`);
          }
        } else if (newWater < 70) {
          targetMorale -= 24;
          if (cd.water <= 0) {
            cd.water = 24;
            addLog('warning', 'Water Rationing', `Potable water dipping below quota (${Math.round(newWater)}L). Crew rationing ordered.`);
          }
        }

        // Food vital thresholds
        if (newFood < 25) {
          targetMorale -= 40;
          if (cd.food <= 0) {
            cd.food = 18;
            sound.playAlarm();
            addLog('danger', 'Starvation Warning', `Food stores empty (${Math.round(newFood)} rations)! Malnutrition outbreak spreading.`);
          }
        } else if (newFood < 60) {
          targetMorale -= 22;
          if (cd.food <= 0) {
            cd.food = 24;
            addLog('warning', 'Ration Shortage', `Food supplies depleted (${Math.round(newFood)} rations). Hydroponic production needed.`);
          }
        }

        // Power blackout penalty
        if (newPowerStored <= 0 && netPower < 0) {
          targetMorale -= 32;
          if (cd.power <= 0) {
            cd.power = 20;
            sound.playAlarm();
            addLog('danger', 'Grid Blackout', 'Total battery depletion! Domes plunged into unheated darkness.');
          }
        }

        // Overcrowding penalty
        if (popCap > 0 && prevStats.population > popCap) {
          targetMorale -= 15;
        }

        // Smoothly interpolate morale towards target
        targetMorale = Math.max(5, Math.min(100, targetMorale));
        const moraleDelta = (targetMorale - prevStats.morale) * (0.06 * dt);
        const newMorale = Math.max(5, Math.min(100, prevStats.morale + moraleDelta));

        // Periodic Morale Tier Crossing Alerts
        if (newMorale < 38 && prevStats.morale >= 38 && cd.general <= 0) {
          cd.general = 25;
          sound.playAlarm();
          addLog('danger', 'Morale Crisis', `Colony morale collapsed to ${Math.round(newMorale)}%! Colonist productivity stalled.`);
        } else if (newMorale > 80 && prevStats.morale <= 80 && cd.general <= 0) {
          cd.general = 25;
          addLog('success', 'Morale Restored', `Life support stabilized. Colonists report optimal morale (${Math.round(newMorale)}%).`);
        }

        // =====================================================================
        // ENVIRONMENTAL RADIATION & EFFECTIVE DOSE DYNAMICS
        // =====================================================================
        // Baseline background cosmic radiation on Martian surface: ~1.25 mSv/h
        let baseRadiation = 1.25;
        if (newTime <= 0.5) {
          // Solar cosmic ray flux and solar energetic particles increase with sun elevation
          baseRadiation += sunFactor * 0.75;
        }
        if (weather.type === 'solar_flare') {
          // Severe coronal mass ejection ion storm! Spikes radiation significantly
          baseRadiation += 7.5;
        } else if (weather.type === 'dust_storm') {
          // Dense dust clouds absorb cosmic ultraviolet rays slightly
          baseRadiation -= 0.35;
        } else if (weather.type === 'dust_veil') {
          baseRadiation -= 0.18;
        } else if (weather.type === 'seismic_tremor') {
          baseRadiation += 0.22; // Subterranean radon venting
        }
        const currentEnvRadiation = Math.max(0.4, baseRadiation);

        // Grid blackout reduces Medical Bay bio-pod effectiveness to emergency battery reserve
        const effectiveMedBayPowerMult = (newPowerStored <= 0 && netPower < 0) ? 0.25 : 1.0;
        const operationalMedBayEffectiveness = medBayEffectiveness * effectiveMedBayPowerMult;

        // Absorbed radiation dose for sheltered colonists
        const shelterFactor = popCap >= prevStats.population ? 0.6 : 0.85;
        const techShield = hasTech('storm_hardening') ? 0.75 : 1.0;
        // Medical Bay actively purges cellular radiation toxins & provides radioprotection
        const medBayDecontamination = 1 / (1 + operationalMedBayEffectiveness * 0.85);

        const currentEffectiveDose = Math.max(
          0.05,
          currentEnvRadiation * shelterFactor * techShield * medBayDecontamination
        );

        // =====================================================================
        // COLONIST HEALTH DYNAMICS (Fluctuates on Morale, Radiation & Med Bay)
        // =====================================================================
        // 1. Morale Influence on Health:
        // High morale promotes physiological wellness, rest, and preventative hygiene.
        // Low morale leads to chronic stress, exhaustion, and physical neglect.
        let moraleHealthRate = 0;
        if (newMorale >= 85) {
          moraleHealthRate = 0.32; // Peak wellness (+0.32%/s)
        } else if (newMorale >= 70) {
          moraleHealthRate = 0.16; // Mild recovery (+0.16%/s)
        } else if (newMorale >= 50) {
          moraleHealthRate = -0.05; // Equilibrium drift
        } else if (newMorale >= 35) {
          moraleHealthRate = -0.35; // Chronic stress fatigue (-0.35%/s)
        } else {
          moraleHealthRate = -0.85; // Severe psychological collapse (-0.85%/s)
        }

        // 2. Radiation Health Degradation:
        // Safe absorbed threshold is ~0.70 mSv/h. Dosages above cause cellular damage.
        let radiationDamageRate = 0;
        if (currentEffectiveDose > 0.70) {
          radiationDamageRate = -(currentEffectiveDose - 0.70) * 0.45;
        }

        // 3. Acute Life Support Deprivation Damage:
        let vitalDeprivationRate = 0;
        if (newO2 < 35) vitalDeprivationRate -= 1.5;
        if (newWater < 30) vitalDeprivationRate -= 1.2;
        if (newFood < 25) vitalDeprivationRate -= 1.0;

        // 4. Medical Bay Recovery Boost & Long-Term Degradation Reduction:
        // Active Medical Bay boosts recovery with bio-stasis trauma pods
        const medBayHealingBoost = operationalMedBayEffectiveness * 1.2; // +1.2%/s per level

        // Medical Bay reduces long-term physical degradation from all negative stressors:
        // Each effective Medical Bay cuts degradation significantly (halves or quarters rate)
        const degradationMitigation = 1 / (1 + operationalMedBayEffectiveness * 1.05);

        const totalDegradation =
          (Math.min(0, moraleHealthRate) + radiationDamageRate + vitalDeprivationRate) *
          degradationMitigation;
        const totalRecovery = Math.max(0, moraleHealthRate) + medBayHealingBoost;

        const netHealthDeltaRate = totalRecovery + totalDegradation;
        const prevHealth = prevStats.colonistHealth ?? 94;
        const newHealth = Math.max(5, Math.min(100, prevHealth + netHealthDeltaRate * dt));

        // Periodic Colonist Health Alerts
        if (newHealth < 35 && prevHealth >= 35 && cd.health <= 0) {
          cd.health = 25;
          sound.playAlarm();
          addLog(
            'danger',
            'COLONIST HEALTH CRISIS',
            `Colonist health dropped to ${Math.round(newHealth)}%! Crew suffering acute radiation sickness and physiological breakdown. Construct Medical Bay immediately!`,
            'CRITICAL'
          );
        } else if (newHealth < 60 && prevHealth >= 60 && cd.health <= 0) {
          cd.health = 30;
          addLog(
            'warning',
            'Colonist Health Compromised',
            `Crew vitality degraded to ${Math.round(newHealth)}% under radiation exposure (${currentEffectiveDose.toFixed(1)} mSv/h) and morale strain.`
          );
        } else if (newHealth >= 90 && prevHealth < 90 && cd.health <= 0) {
          cd.health = 30;
          addLog(
            'success',
            'Colonist Health Restored',
            `Crew vitality restored to optimal levels (${Math.round(newHealth)}%). Medical bay bio-stasis and high morale stabilized vital signs.`
          );
        }

        // Solar radiation alert if unmitigated
        if (currentEnvRadiation > 5.5 && cd.radiation <= 0) {
          cd.radiation = 45;
          if (medBayCount === 0) {
            addLog(
              'danger',
              'Severe Radiation Warning',
              `Coronal ion storm detected (${currentEnvRadiation.toFixed(1)} mSv/h)! Unshielded colonists suffering cellular damage. Medical Bay treatment required.`,
              'HIGH'
            );
          }
        }

        // =====================================================================
        // PROLONGED RESOURCE DEPRIVATION CHECK (> 5 MINUTES / 300s GAME TIME)
        // =====================================================================
        const tracker = prolongedLowTrackerRef.current;
        const FIVE_MINUTES = 300; // 300 seconds of accumulated game time

        // 1. Power prolonged low check (< 50 kW or grid battery blackout)
        const isPowerLow = newPowerStored < 50 || (netPower < 0 && newPowerStored <= 0);
        if (isPowerLow) {
          tracker.powerSec += dt;
          if (tracker.powerSec >= FIVE_MINUTES) {
            if (tracker.powerSec - tracker.powerLastUrgencyAlert >= 60) {
              tracker.powerLastUrgencyAlert = tracker.powerSec;
              sound.playAlarm();
              const mins = Math.floor(tracker.powerSec / 60);
              const secs = Math.floor(tracker.powerSec % 60);
              addLog(
                'urgency',
                'POWER GRID PROLONGED DEFICIT',
                `Colony power has lingered at critical levels for over ${mins}m ${secs}s! Emergency batteries exhausted; vital life support failing.`,
                'CRITICAL'
              );
            }
          }
        } else {
          if (tracker.powerSec >= FIVE_MINUTES) {
            addLog(
              'success',
              'Power Grid Restored',
              'Power reserves stabilized above safe levels after prolonged deficit crisis.'
            );
          }
          tracker.powerSec = 0;
          tracker.powerLastUrgencyAlert = 0;
        }

        // 2. Oxygen prolonged low check (< 80 m³)
        const isOxygenLow = newO2 < 80;
        if (isOxygenLow) {
          tracker.oxygenSec += dt;
          if (tracker.oxygenSec >= FIVE_MINUTES) {
            if (tracker.oxygenSec - tracker.oxygenLastUrgencyAlert >= 60) {
              tracker.oxygenLastUrgencyAlert = tracker.oxygenSec;
              sound.playAlarm();
              const mins = Math.floor(tracker.oxygenSec / 60);
              const secs = Math.floor(tracker.oxygenSec % 60);
              addLog(
                'urgency',
                'OXYGEN PROLONGED DEPLETION',
                `Atmospheric oxygen has remained critically low for over ${mins}m ${secs}s! Severe asphyxiation danger; life support overhaul needed.`,
                'CRITICAL'
              );
            }
          }
        } else {
          if (tracker.oxygenSec >= FIVE_MINUTES) {
            addLog(
              'success',
              'Oxygen Supply Restored',
              'Atmospheric oxygen levels normalized after sustained depletion crisis.'
            );
          }
          tracker.oxygenSec = 0;
          tracker.oxygenLastUrgencyAlert = 0;
        }

        // 3. Water prolonged low check (< 70 L)
        const isWaterLow = newWater < 70;
        if (isWaterLow) {
          tracker.waterSec += dt;
          if (tracker.waterSec >= FIVE_MINUTES) {
            if (tracker.waterSec - tracker.waterLastUrgencyAlert >= 60) {
              tracker.waterLastUrgencyAlert = tracker.waterSec;
              sound.playAlarm();
              const mins = Math.floor(tracker.waterSec / 60);
              addLog(
                'urgency',
                'WATER PROLONGED SHORTAGE',
                `Potable water reserves have remained below quota for over ${mins} minutes! Acute dehydration emergency across habitats.`,
                'HIGH'
              );
            }
          }
        } else {
          tracker.waterSec = 0;
          tracker.waterLastUrgencyAlert = 0;
        }

        // 4. Food prolonged low check (< 60 rations)
        const isFoodLow = newFood < 60;
        if (isFoodLow) {
          tracker.foodSec += dt;
          if (tracker.foodSec >= FIVE_MINUTES) {
            if (tracker.foodSec - tracker.foodLastUrgencyAlert >= 60) {
              tracker.foodLastUrgencyAlert = tracker.foodSec;
              sound.playAlarm();
              const mins = Math.floor(tracker.foodSec / 60);
              addLog(
                'urgency',
                'FOOD PROLONGED FAMINE',
                `Nutrient rations have remained depleted for over ${mins} minutes! Crew malnutrition spreading; hydroponic expansion required.`,
                'HIGH'
              );
            }
          }
        } else {
          tracker.foodSec = 0;
          tracker.foodLastUrgencyAlert = 0;
        }

        // 5. Telemetry Logging for ResourceMonitor (samples every game minute)
        const currentTotalMinutes = Math.floor((newSol - 1) * 1440 + newTime * 1440);
        if (currentTotalMinutes !== lastRecordedGameMinuteRef.current) {
          lastRecordedGameMinuteRef.current = currentTotalMinutes;
          const hours = Math.floor(newTime * 24);
          const mins = Math.floor((newTime * 24 * 60) % 60);
          const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

          const newPt: ResourceHistoryPoint = {
            gameMinute: currentTotalMinutes,
            sol: newSol,
            timeOfDay: newTime,
            timeStr,
            minutesAgo: 0,
            power: Math.round(newPowerStored * 10) / 10,
            powerPct: Math.round((newPowerStored / Math.max(1, batteryCap)) * 1000) / 10,
            powerNet: Math.round(netPower * 10) / 10,
            powerProd: Math.round(powerProd * 10) / 10,
            powerCons: Math.round(powerCons * 10) / 10,
            powerCapacity: batteryCap,
            water: Math.round(newWater * 10) / 10,
            waterPct: Math.round((newWater / Math.max(1, prevStats.maxWater)) * 1000) / 10,
            waterDelta: Math.round((waterGen - waterCons) * 10) / 10,
            maxWater: prevStats.maxWater,
            oxygen: Math.round(newO2 * 10) / 10,
            oxygenPct: Math.round((newO2 / Math.max(1, prevStats.maxOxygen)) * 1000) / 10,
            oxygenDelta: Math.round((o2Gen - o2Cons) * 10) / 10,
            maxOxygen: prevStats.maxOxygen,
            food: Math.round(newFood * 10) / 10,
            foodPct: Math.round((newFood / Math.max(1, prevStats.maxFood)) * 1000) / 10,
            foodDelta: Math.round((foodGen - foodCons) * 10) / 10,
            maxFood: prevStats.maxFood,
            alloy: Math.round(newAlloy * 10) / 10,
            ore: Math.round(newOre * 10) / 10,
            spice: Math.round(prevStats.spice * 10) / 10,
            credits: Math.round(prevStats.credits * 10) / 10,
            morale: Math.round(newMorale * 10) / 10,
            health: Math.round(newHealth * 10) / 10,
          };

          setResourceHistory((prev) => {
            const updated = prev
              .map((pt) => ({
                ...pt,
                minutesAgo: pt.gameMinute - currentTotalMinutes,
              }))
              .filter((pt) => pt.gameMinute - currentTotalMinutes >= -50);
            return [...updated, newPt];
          });
        }

        // Auto Export Spice Logic
        const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
        let finalSpice = prevStats.spice;
        let finalCredits = prevStats.credits;
        let finalTotalEarned = prevStats.totalCreditsEarned;
        
        if (hasLaunchpad && prevStats.autoExportSpice) {
          const threshold = prevStats.autoExportThreshold || 100;
          if (finalSpice >= threshold && threshold > 0) {
            // Sell exactly 'threshold' amount or all of it? Let's sell chunks of threshold.
            // Or just sell all of it if it hits the threshold.
            const amountToSell = Math.floor(finalSpice);
            const tariff = 1.0; // Launchpad means 1.0 tariff
            const mult = hasTech('spice_centrifuge') ? 1.4 : 1.0;
            const pricePerKg = 2.5 * mult * tariff;
            const revenue = Math.round(amountToSell * pricePerKg);
            
            finalSpice -= amountToSell;
            finalCredits += revenue;
            finalTotalEarned += revenue;
            
            addLog('spice', 'Auto-Export Complete', `Automated Shuttle launched ${amountToSell}kg Spice for +₡${revenue}!`);
          }
        }

        return {
          ...prevStats,
          spice: finalSpice,
          credits: finalCredits,
          totalCreditsEarned: finalTotalEarned,
          sol: newSol,
          timeOfDay: newTime,
          powerStored: newPowerStored,
          powerCapacity: batteryCap,
          currentPowerProd: powerProd,
          currentPowerCons: powerCons,
          powerNet: netPower,
          oxygen: newO2,
          currentO2Delta: o2Gen - o2Cons,
          water: newWater,
          currentWaterDelta: waterGen - waterCons,
          food: newFood,
          currentFoodDelta: foodGen - foodCons,
          techPoints: newTech,
          spiceCapacity: spiceCap,
          maxPopulation: popCap,
          morale: newMorale,
          colonistHealth: newHealth,
          radiationLevel: currentEnvRadiation,
          effectiveRadiationDose: currentEffectiveDose,
          medicalBayCount: medBayCount,
          healthRecoveryRate: netHealthDeltaRate,
        };
      });

      // 2. Weather Cycle Tick
      setWeather((prevWeather) => {
        const nextDur = prevWeather.duration - dt;
        if (nextDur <= 0) {
          // Roll new weather event
          const roll = Math.random();
          if (roll < 0.45) {
            return {
              type: 'clear',
              name: 'Clear Martian Skies',
              description: 'Clear conditions across the sector.',
              duration: Math.random() * 90 + 90,
              maxDuration: 180,
              severity: 0,
            };
          } else if (roll < 0.65) {
            return {
              type: 'dust_veil',
              name: 'Atmospheric Dust Veil',
              description: 'Moderate airborne particulate reducing solar output.',
              duration: Math.random() * 45 + 40,
              maxDuration: 90,
              severity: 0.35,
            };
          } else if (roll < 0.82) {
            sound.playAlarm();
            addLog('danger', 'Dust Storm Alert', 'Severe Martian dust storm detected! Solar offline.');
            return {
              type: 'dust_storm',
              name: 'Severe Dust Storm',
              description: 'Dangerous winds and heavy sand. Harvesters slowed, solar penalized.',
              duration: Math.random() * 50 + 40,
              maxDuration: 90,
              severity: 0.85,
            };
          } else if (roll < 0.92) {
            sound.playAlarm();
            addLog('warning', 'Seismic Tremor', 'Subterranean seismic activity detected! New spice vein geyser erupted.');
            // Spawn new spice vein
            setSpicePatches((prevPatches) => [...prevPatches, spawnNewSpicePatch(prevPatches)]);
            return {
              type: 'seismic_tremor',
              name: 'Seismic Dune Tremor',
              description: 'Ground tremors uncovering underground spice geysers.',
              duration: 35,
              maxDuration: 35,
              severity: 0.65,
            };
          } else {
            sound.playAlarm();
            addLog('warning', 'Solar Flare', 'Coronal mass ejection! High radiation ion storm, solar output surge.');
            return {
              type: 'solar_flare',
              name: 'Coronal Solar Flare',
              description: 'Intense cosmic rays and ion plasma auroras. Solar output +120%, communications interference.',
              duration: 45,
              maxDuration: 45,
              severity: 0.9,
            };
          }
        }
        return { ...prevWeather, duration: nextDur };
      });

      // 3. Random Event Generator Tick
      setRandomEvent((prevEvent) => {
        if (prevEvent) {
          const nextDur = prevEvent.duration - dt;
          if (nextDur <= 0) {
            addLog('info', 'Event Concluded', `${prevEvent.name} has ended.`);
            return null;
          }
          return { ...prevEvent, duration: nextDur };
        }

        // 0.1% chance per tick to trigger an event
        if (Math.random() < 0.001) {
          const roll = Math.random();
          let newEvent: RandomEvent;
          if (roll < 0.33) {
            newEvent = {
              type: 'sandstorm_recovery',
              name: 'Sandstorm Recovery',
              description: 'Surface cleanup crews finding leftover spice deposits.',
              duration: 60,
              maxDuration: 60,
              effectMultiplier: 1.5, // +50% spice income
            };
            addLog('success', 'Sandstorm Recovery', 'Cleanup crews found new spice deposits!');
          } else if (roll < 0.66) {
            newEvent = {
              type: 'tech_breakthrough',
              name: 'Tech Breakthrough',
              description: 'Engineering team optimized power grids.',
              duration: 120,
              maxDuration: 120,
              effectMultiplier: 0.5, // -50% power consumption
            };
            addLog('success', 'Tech Breakthrough', 'Engineers optimized power grid usage!');
          } else {
            newEvent = {
              type: 'meteor_strike',
              name: 'Meteor Strike',
              description: 'Impact damaged infrastructure efficiency.',
              duration: 40,
              maxDuration: 40,
              effectMultiplier: 0.8, // -20% overall efficiency
            };
            addLog('danger', 'Meteor Strike!', 'Impact damaged colony infrastructure!');
          }
          return newEvent;
        }
        return null;
      });

      // 3. Harvester Autonomous Roam & Harvest Tick
      setHarvesters((prevHarvesters) => {
        return prevHarvesters.map((h) => {
          let updated = { ...h };

          // Determine home depot/command position for return using exterior docking apron
          const isOre = h.miningTarget === 'ore';
          const depot = isOre 
            ? (modules.find((m) => m.id === h.homeDepotId) || modules.find((m) => m.type === 'refinery') || modules[0])
            : (modules.find((m) => m.id === h.homeDepotId) || modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'garage') || modules.find((m) => m.type === 'command') || modules[0]);
          const depotDock = depot
            ? findDockingApron(depot, h.x, h.y, modules, 28, powerLines, (h.targetX !== null && h.targetY !== null) ? { x: h.targetX, y: h.targetY } : null)
            : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
          const depotX = depotDock.x;
          const depotY = depotDock.y;

          // Vehicle collision radius
          const roverRadius = h.model === 'titan' ? 22 : h.model === 'heavy' ? 18 : 14;

          // Speed modifiers (dust storm slow, tech upgrades)
          let currentSpeed = h.speed * (hasTech('rover_turbo') ? 1.35 : 1.0);
          if (weather.type === 'dust_storm' && !hasTech('storm_hardening')) {
            const hasRadar = modules.some(m => m.type === 'radar' && m.isActive);
            currentSpeed *= hasRadar ? 0.85 : 0.65; // Radar gives early navigation warnings
          }

          // Cargo capacity bonus from tech
          const effectiveMaxCargo = Math.round(
            h.maxCargo * (hasTech('titan_holds') ? 1.5 : 1.0)
          );

          // Sandstorm Recovery effect
          const currentHarvestRate = h.harvestRate * (randomEvent && randomEvent.type === 'sandstorm_recovery' ? randomEvent.effectMultiplier : 1.0);

          // State Machine
          if (h.autoHarvest) {
            // Check if cargo full
            if (updated.cargo >= effectiveMaxCargo && updated.state !== 'unloading' && updated.state !== 'returning_to_depot') {
              updated.state = 'returning_to_depot';
              updated.targetX = depotX;
              updated.targetY = depotY;
              updated.waypoints = findNavigationPath(updated.x, updated.y, depotX, depotY, modules, powerLines);
            }

            // IDLE: Seek closest spice patch with spice available
            if (updated.state === 'idle') {
              const availablePatches = isOre 
                ? oreDeposits.filter(p => !p.depleted).map(p => ({...p, x: p.x * 48 + 24, y: p.y * 48 + 24, amount: 100})) // adapter for ore to world coords
                : spicePatches.filter((p) => p.amount > 10);
              if (availablePatches.length > 0) {
                // Find nearest
                let nearest = availablePatches[0];
                let minD = Math.hypot(nearest.x - h.x, nearest.y - h.y);
                for (const p of availablePatches) {
                  const d = Math.hypot(p.x - h.x, p.y - h.y);
                  if (d < minD) {
                    minD = d;
                    nearest = p;
                  }
                }
                updated.state = 'moving_to_spice';
                updated.targetSpiceId = nearest.id;
                updated.targetX = nearest.x;
                updated.targetY = nearest.y;
                updated.waypoints = findNavigationPath(updated.x, updated.y, nearest.x, nearest.y, modules, powerLines);
              }
            }

            // MOVING TO SPICE
            if (updated.state === 'moving_to_spice') {
              let targetSpice: { x: number, y: number } | undefined;
              if (isOre) {
                const ore = oreDeposits.find(d => d.id === updated.targetSpiceId && !d.depleted);
                if (ore) targetSpice = { ...ore, x: ore.x * 48 + 24, y: ore.y * 48 + 24 };
              } else {
                targetSpice = spicePatches.find((sp) => sp.id === updated.targetSpiceId && sp.amount > 0);
              }
              if (!targetSpice) {
                // Pick another or return
                updated.state = 'idle';
                updated.targetSpiceId = null;
                updated.waypoints = [];
              } else {
                const distToSpice = Math.hypot(targetSpice.x - h.x, targetSpice.y - h.y);
                if (distToSpice < 42) {
                  updated.state = 'harvesting';
                  updated.targetX = null;
                  updated.targetY = null;
                  updated.waypoints = [];
                } else {
                  // Ensure waypoints are present
                  if (
                    !updated.waypoints ||
                    updated.waypoints.length === 0 ||
                    updated.targetX !== targetSpice.x ||
                    updated.targetY !== targetSpice.y
                  ) {
                    updated.targetX = targetSpice.x;
                    updated.targetY = targetSpice.y;
                    updated.waypoints = findNavigationPath(
                      updated.x,
                      updated.y,
                      targetSpice.x,
                      targetSpice.y,
                      modules,
                      powerLines
                    );
                  }

                  const currentGoal =
                    updated.waypoints && updated.waypoints.length > 0
                      ? updated.waypoints[0]
                      : { x: targetSpice.x, y: targetSpice.y };

                  if (
                    Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y) < 8 &&
                    updated.waypoints &&
                    updated.waypoints.length > 1
                  ) {
                    updated.waypoints = updated.waypoints.slice(1);
                  }

                  // Steer around buildings & power lines and resolve collisions
                  const nextWaypoint =
                    updated.waypoints && updated.waypoints.length > 0
                      ? updated.waypoints[0]
                      : { x: targetSpice.x, y: targetSpice.y };

                  const { nextX, nextY, nextAngle } = steerAndAvoidBuildings(
                    updated.x,
                    updated.y,
                    nextWaypoint.x,
                    nextWaypoint.y,
                    currentSpeed,
                    updated.angle,
                    dt,
                    modules,
                    roverRadius,
                    powerLines
                  );
                  updated.x = nextX;
                  updated.y = nextY;
                  updated.angle = nextAngle;

                  // Add tire track history
                  if (
                    updated.tireHistory.length === 0 ||
                    Math.hypot(
                      updated.x - updated.tireHistory[updated.tireHistory.length - 1].x,
                      updated.y - updated.tireHistory[updated.tireHistory.length - 1].y
                    ) > 15
                  ) {
                    updated.tireHistory = [
                      ...updated.tireHistory.slice(-55),
                      { x: updated.x, y: updated.y, alpha: 0.4 },
                    ];
                  }
                }
              }
            }

            // HARVESTING SPICE
            if (updated.state === 'harvesting') {
              let targetSpice: { id: string, amount: number } | undefined;
              if (isOre) {
                const ore = oreDeposits.find(d => d.id === updated.targetSpiceId);
                if (ore && !ore.depleted) targetSpice = { id: ore.id, amount: 100000 }; // Ore doesn't deplete by amount
              } else {
                targetSpice = spicePatches.find((sp) => sp.id === updated.targetSpiceId);
              }
              
              if (!targetSpice || targetSpice.amount <= 0) {
                // Spice patch dried up
                updated.state = 'idle';
                updated.targetSpiceId = null;
                updated.waypoints = [];
              } else {
                const minedAmount = Math.min(
                  targetSpice.amount,
                  Math.min(effectiveMaxCargo - updated.cargo, currentHarvestRate * dt)
                );
                updated.cargo += minedAmount;

                // Decrement from patch
                if (!isOre) {
                  setSpicePatches((prevPatches) =>
                    prevPatches.map((p) =>
                      p.id === targetSpice?.id
                        ? { ...p, amount: Math.max(0, p.amount - minedAmount) }
                        : p
                    )
                  );
                }

                // Play occasional pulse sound
                if (Math.random() < 0.2) {
                  sound.playMiningPulse();
                }

                if (updated.cargo >= effectiveMaxCargo) {
                  updated.state = 'returning_to_depot';
                  updated.targetX = depotX;
                  updated.targetY = depotY;
                  updated.waypoints = findNavigationPath(updated.x, updated.y, depotX, depotY, modules, powerLines);
                  addLog(
                    'spice',
                    'Cargo Full',
                    `${updated.name} filled cargo (${Math.round(updated.cargo)}kg) - returning to base.`
                  );
                }
              }
            }

            // RETURNING TO DEPOT
            if (updated.state === 'returning_to_depot') {
              const distToDepot = Math.hypot(depotX - h.x, depotY - h.y);
              if (distToDepot < 44) {
                updated.state = 'unloading';
                updated.unloadingTimer = 2.0; // 2 seconds unload animation
                updated.targetX = null;
                updated.targetY = null;
                updated.waypoints = [];
              } else {
                // Ensure waypoints are present
                if (
                  !updated.waypoints ||
                  updated.waypoints.length === 0 ||
                  updated.targetX !== depotX ||
                  updated.targetY !== depotY
                ) {
                  updated.targetX = depotX;
                  updated.targetY = depotY;
                  updated.waypoints = findNavigationPath(updated.x, updated.y, depotX, depotY, modules, powerLines);
                }

                const currentGoal =
                  updated.waypoints && updated.waypoints.length > 0
                    ? updated.waypoints[0]
                    : { x: depotX, y: depotY };

                if (
                  Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y) < 8 &&
                  updated.waypoints &&
                  updated.waypoints.length > 1
                ) {
                  updated.waypoints = updated.waypoints.slice(1);
                }

                const nextWaypoint =
                  updated.waypoints && updated.waypoints.length > 0
                    ? updated.waypoints[0]
                    : { x: depotX, y: depotY };

                const { nextX, nextY, nextAngle } = steerAndAvoidBuildings(
                  updated.x,
                  updated.y,
                  nextWaypoint.x,
                  nextWaypoint.y,
                  currentSpeed,
                  updated.angle,
                  dt,
                  modules,
                  roverRadius,
                  powerLines
                );
                updated.x = nextX;
                updated.y = nextY;
                updated.angle = nextAngle;

                // Add tire track history
                if (
                  updated.tireHistory.length === 0 ||
                  Math.hypot(
                    updated.x - updated.tireHistory[updated.tireHistory.length - 1].x,
                    updated.y - updated.tireHistory[updated.tireHistory.length - 1].y
                  ) > 15
                ) {
                  updated.tireHistory = [
                    ...updated.tireHistory.slice(-55),
                    { x: updated.x, y: updated.y, alpha: 0.4 },
                  ];
                }
              }
            }

            // UNLOADING AT DEPOT
            if (updated.state === 'unloading') {
              updated.unloadingTimer -= dt;
              if (updated.unloadingTimer <= 0) {
                // Deposit spice/ore into colony stockpile!
                const delivered = updated.cargo;
                setStats((prevStats) => ({
                  ...prevStats,
                  spice: isOre ? prevStats.spice : Math.min(prevStats.spiceCapacity, prevStats.spice + delivered),
                  ore: isOre ? prevStats.ore + delivered : prevStats.ore,
                  totalSpiceMined: isOre ? prevStats.totalSpiceMined : prevStats.totalSpiceMined + delivered,
                }));

                sound.playSpiceDelivered();
                addLog(
                  'success',
                  isOre ? 'Ore Delivered' : 'Spice Delivered',
                  `${updated.name} delivered ${Math.round(delivered)}kg ${isOre ? 'Raw Ore' : 'Spice'} to ${isOre ? 'Ore Refinery' : 'refinery'}.`
                );

                updated.totalSpiceDelivered += delivered;
                updated.cargo = 0;
                updated.state = 'idle'; // ready to seek next patch!
                updated.waypoints = [];
              }
            }
          } else {
            // Manual Navigation Orders for Rovers
            if (updated.targetX !== null && updated.targetY !== null) {
              const distToTarget = Math.hypot(updated.targetX - h.x, updated.targetY - h.y);
              if (distToTarget > 20) {
                if (!updated.waypoints || updated.waypoints.length === 0) {
                  updated.waypoints = findNavigationPath(
                    updated.x,
                    updated.y,
                    updated.targetX,
                    updated.targetY,
                    modules,
                    powerLines
                  );
                }

                const currentGoal =
                  updated.waypoints && updated.waypoints.length > 0
                    ? updated.waypoints[0]
                    : { x: updated.targetX, y: updated.targetY };

                if (
                  Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y) < 8 &&
                  updated.waypoints &&
                  updated.waypoints.length > 1
                ) {
                  updated.waypoints = updated.waypoints.slice(1);
                }

                const nextWaypoint =
                  updated.waypoints && updated.waypoints.length > 0
                    ? updated.waypoints[0]
                    : { x: updated.targetX, y: updated.targetY };

                const { nextX, nextY, nextAngle } = steerAndAvoidBuildings(
                  updated.x,
                  updated.y,
                  nextWaypoint.x,
                  nextWaypoint.y,
                  currentSpeed,
                  updated.angle,
                  dt,
                  modules,
                  roverRadius,
                  powerLines
                );
                updated.x = nextX;
                updated.y = nextY;
                updated.angle = nextAngle;

                if (
                  updated.tireHistory.length === 0 ||
                  Math.hypot(
                    updated.x - updated.tireHistory[updated.tireHistory.length - 1].x,
                    updated.y - updated.tireHistory[updated.tireHistory.length - 1].y
                  ) > 15
                ) {
                  updated.tireHistory = [
                    ...updated.tireHistory.slice(-55),
                    { x: updated.x, y: updated.y, alpha: 0.4 },
                  ];
                }
              } else {
                updated.targetX = null;
                updated.targetY = null;
                updated.waypoints = [];
                updated.state = 'idle';
              }
            }
          }

          return updated;
        });
      });

      // 4. Colonist Workers (EVA Suits) Update
      setWorkers((prevWorkers) => {
        let updatedWorkers = prevWorkers.map((w) => {
          let updated = { ...w };
          if (updated.state === 'idle') {
            updated.timer -= dt;
            if (updated.timer <= 0) {
              // Pick a random building to walk to
              if (modules.length > 0) {
                const targetMod = modules[Math.floor(Math.random() * modules.length)];
                // Target a point slightly outside the building
                const tx = targetMod.x * 48 + 24 + (Math.random() * 40 - 20);
                const ty = targetMod.y * 48 + 24 + (Math.random() * 40 - 20);
                updated.targetX = tx;
                updated.targetY = ty;
                updated.waypoints = findNavigationPath(updated.x, updated.y, tx, ty, modules, []);
                updated.state = 'walking';
              } else {
                updated.timer = 5;
              }
            }
          } else if (updated.state === 'walking') {
            const currentGoal =
              updated.waypoints && updated.waypoints.length > 0
                ? updated.waypoints[0]
                : { x: updated.targetX || updated.x, y: updated.targetY || updated.y };

            const dist = Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y);
            if (dist < 4) {
              if (updated.waypoints && updated.waypoints.length > 1) {
                updated.waypoints = updated.waypoints.slice(1);
              } else {
                updated.state = 'idle';
                updated.timer = Math.random() * 10 + 5; // Idle 5-15s
                updated.waypoints = [];
              }
            } else {
              // Move towards goal
              const angle = Math.atan2(currentGoal.y - updated.y, currentGoal.x - updated.x);
              // Workers steer smoothly
              const angleDiff = angle - updated.angle;
              const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
              updated.angle += normalizedDiff * 5 * dt;

              const speed = 14; // Slow walk speed
              updated.x += Math.cos(updated.angle) * speed * dt;
              updated.y += Math.sin(updated.angle) * speed * dt;
            }
          }
          return updated;
        });

        // Spawn logic (max 1 worker per 2 population, up to 25)
        const pop = statsRef.current?.population || 8;
        const maxWorkers = Math.min(25, Math.max(0, Math.floor(pop / 2)));
        if (updatedWorkers.length < maxWorkers && Math.random() < 0.2 * dt && modules.length > 0) {
          const spawnMod = modules[Math.floor(Math.random() * modules.length)];
          const spawnX = spawnMod.x * 48 + 24;
          const spawnY = spawnMod.y * 48 + 24;
          updatedWorkers.push({
            id: `worker_${Date.now()}_${Math.random()}`,
            x: spawnX + (Math.random() * 20 - 10),
            y: spawnY + (Math.random() * 20 - 10),
            targetX: null,
            targetY: null,
            waypoints: [],
            angle: Math.random() * Math.PI * 2,
            state: 'idle',
            timer: Math.random() * 5 + 2,
          });
        }
        
        // Despawn logic (if population drops)
        if (updatedWorkers.length > maxWorkers) {
           updatedWorkers = updatedWorkers.slice(0, maxWorkers);
        }

        return updatedWorkers;
      });

    }, 100);

    return () => clearInterval(interval);
  }, [gameSpeed, modules, spicePatches, weather, stats.dayCycleSpeed, stats.sol, stats.timeOfDay, techNodes]);

  // -------------------------------------------------------------
  // USER ACTIONS & HANDLERS
  // -------------------------------------------------------------

  // Place Module
  const handlePlaceModule = (gridX: number, gridY: number) => {
    if (!buildPlacingType) return;
    const bp = MODULE_BLUEPRINTS[buildPlacingType];
    if (!bp) return;

    if (gridX < 0 || gridY < 0 || gridX + bp.width > GRID_SIZE || gridY + bp.height > GRID_SIZE) {
      addLog('warning', 'Boundary Error', `Cannot construct outside planetary sector limits.`);
      return;
    }

    if (stats.alloy < bp.costAlloy || stats.credits < bp.costCredits) {
      addLog('warning', 'Insufficient Resources', `Cannot afford ${bp.name}.`);
      return;
    }

    if (buildPlacingType === 'miner') {
      const isNearOre = oreDeposits.some(d => !d.depleted && Math.hypot(d.x - gridX, d.y - gridY) < 5);
      if (!isNearOre) {
        addLog('warning', 'Mining Restriction', 'Ore Miner must be placed near an ore deposit!');
        return;
      }
    }

    // Deduct resources
    setStats((prev) => ({
      ...prev,
      alloy: prev.alloy - bp.costAlloy,
      credits: prev.credits - bp.costCredits,
    }));

    const newModule: ColonyModule = {
      id: `mod_${Date.now()}`,
      type: buildPlacingType,
      x: gridX,
      y: gridY,
      width: bp.width,
      height: bp.height,
      level: 1,
      health: 120,
      maxHealth: 120,
      isActive: true,
      assignedColonists: 0,
      constructed: true,
      constructProgress: 100,
    };

    setModules((prev) => [...prev, newModule]);
    // Invalidate cached waypoints so roaming vehicles immediately route around the newly constructed building
    setHarvesters((prev) => prev.map((h) => ({ ...h, waypoints: [] })));
    sound.playBuild();
    addLog('info', 'Construction Complete', `${bp.name} constructed in Sector [${gridX}, ${gridY}].`);
    setBuildPlacingType(null);
  };

  // Deploy Harvester
  const handleDeployHarvester = (model: HarvesterModel) => {
    const spec = HARVESTER_SPECS[model];
    if (stats.alloy < spec.costAlloy || stats.credits < spec.costCredits) return;

    // Find depot or command exterior docking apron
    const isOre = model === 'ore_rover';
    const depot = isOre 
      ? (modules.find((m) => m.type === 'refinery') || modules[0])
      : (modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'command') || modules[0]);
    const dock = depot
      ? findDockingApron(depot, WORLD_WIDTH / 2 + 120, WORLD_HEIGHT / 2, modules, 28, powerLines)
      : { x: WORLD_WIDTH / 2 + 50, y: WORLD_HEIGHT / 2 };
    const spawnX = dock.x;
    const spawnY = dock.y;

    setStats((prev) => ({
      ...prev,
      alloy: prev.alloy - spec.costAlloy,
      credits: prev.credits - spec.costCredits,
    }));

    const newHarvester: Harvester = {
      id: `harvester_${Date.now()}`,
      name: `Harvester ${['Beta', 'Gamma', 'Delta', 'Titan', 'Apex', 'Vanguard', 'Omega'][harvesters.length % 7]}`,
      model: spec.model,
      x: spawnX,
      y: spawnY,
      targetX: null,
      targetY: null,
      angle: 0,
      speed: spec.speed,
      cargo: 0,
      maxCargo: spec.maxCargo,
      harvestRate: spec.harvestRate,
      health: spec.maxHealth,
      maxHealth: spec.maxHealth,
      state: 'idle',
      targetSpiceId: null,
      homeDepotId: depot?.id || '',
      autoHarvest: true,
      miningTarget: isOre ? 'ore' : 'spice',
      tireHistory: [],
      laserPulseTimer: 0,
      unloadingTimer: 0,
      totalSpiceDelivered: 0,
    };

    setHarvesters((prev) => [...prev, newHarvester]);
    sound.playBuild();
    addLog('info', 'Harvester Deployed', `${newHarvester.name} (${spec.name}) launched to harvest spice.`);
  };

  // Recall Harvester
  const handleRecallHarvester = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => {
        if (h.id === harvesterId) {
          const isOre = h.miningTarget === 'ore';
          const depot = isOre 
            ? (modules.find((m) => m.id === h.homeDepotId) || modules.find((m) => m.type === 'refinery') || modules[0])
            : (modules.find((m) => m.id === h.homeDepotId) || modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'garage') || modules.find((m) => m.type === 'command') || modules[0]);
          const dock = depot
            ? findDockingApron(depot, h.x, h.y, modules, 28, powerLines, (h.targetX !== null && h.targetY !== null) ? { x: h.targetX, y: h.targetY } : null)
            : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
          return {
            ...h,
            state: 'returning_to_depot',
            targetX: dock.x,
            targetY: dock.y,
            targetSpiceId: null,
            waypoints: findNavigationPath(h.x, h.y, dock.x, dock.y, modules, powerLines),
          };
        }
        return h;
      })
    );
    setSelectedHarvester((prev) => prev && prev.id === harvesterId ? { ...prev, state: 'returning_to_depot' } : prev);
    addLog('info', 'Harvester Recalled', 'Harvester ordered to return immediately to base depot.');
  };

  // Toggle Auto-harvest
  const handleToggleAutoHarvest = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => (h.id === harvesterId ? { ...h, autoHarvest: !h.autoHarvest } : h))
    );
    setSelectedHarvester((prev) => prev && prev.id === harvesterId ? { ...prev, autoHarvest: !prev.autoHarvest } : prev);
  };

  // Toggle Mining Target
  const handleToggleMiningTarget = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => {
        if (h.id === harvesterId) {
          const newTarget = h.miningTarget === 'ore' ? 'spice' : 'ore';
          const newDepot = newTarget === 'ore'
            ? (modules.find((m) => m.type === 'refinery') || modules[0])
            : (modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'command') || modules[0]);
          return {
            ...h,
            miningTarget: newTarget,
            homeDepotId: newDepot.id,
            state: 'idle', // Reset state so it immediately paths to the new target
            targetSpiceId: null,
            targetX: null,
            targetY: null,
            waypoints: []
          };
        }
        return h;
      })
    );
  };

  // Scrap Harvester
  const handleScrapHarvester = (harvesterId: string) => {
    const target = harvesters.find((h) => h.id === harvesterId);
    if (!target) return;
    const spec = HARVESTER_SPECS[target.model];
    const refund = Math.round(spec.costAlloy * 0.5);

    setHarvesters((prev) => prev.filter((h) => h.id !== harvesterId));
    setStats((prev) => ({ ...prev, alloy: prev.alloy + refund }));
    if (selectedHarvester?.id === harvesterId) setSelectedHarvester(null);
    addLog('info', 'Harvester Scrapped', `${target.name} decommissioned. Recovered ${refund} Alloy.`);
  };

  // Sell Spice
  const handleSellSpice = (amount: number) => {
    if (amount <= 0 || stats.spice < amount) return;
    const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
    const tariff = hasLaunchpad ? 1.0 : 0.85;
    const mult = hasTech('spice_centrifuge') ? 1.4 : 1.0;
    const pricePerKg = 2.5 * mult * tariff;
    const revenue = Math.round(amount * pricePerKg);

    setStats((prev) => ({
      ...prev,
      spice: prev.spice - amount,
      credits: prev.credits + revenue,
      totalCreditsEarned: prev.totalCreditsEarned + revenue,
    }));

    sound.playRocketLaunch();
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    addLog('spice', 'Spice Exported', `Shipped ${Math.round(amount)}kg Spice to Earth for +₡${revenue}!`);
  };

  // Import Earth Supplies
  const handleImportSupply = (type: 'crew' | 'alloy' | 'supplies') => {
    if (type === 'crew' && stats.credits >= 180) {
      setStats((prev) => ({
        ...prev,
        credits: prev.credits - 180,
        population: prev.population + 4,
        alloy: prev.alloy + 20,
      }));
      addLog('success', 'Earth Shuttle Arrived', '+4 Specialist Crew and +20 Alloy arrived from Earth.');
    } else if (type === 'alloy' && stats.credits >= 140) {
      setStats((prev) => ({
        ...prev,
        credits: prev.credits - 140,
        alloy: prev.alloy + 75,
      }));
      addLog('success', 'Alloy Crates Delivered', '+75 Structural Alloy delivered to supply depot.');
    } else if (type === 'supplies' && stats.credits >= 120) {
      setStats((prev) => ({
        ...prev,
        credits: prev.credits - 120,
        food: Math.min(prev.maxFood, prev.food + 80),
        water: Math.min(prev.maxWater, prev.water + 80),
      }));
      addLog('success', 'Rations Delivered', '+80 Rations and +80L Water stockpiled.');
    }
  };

  // Unlock Tech
  const handleUnlockTech = (techId: string) => {
    const tech = techNodes.find((t) => t.id === techId);
    if (!tech || tech.unlocked || stats.techPoints < tech.cost) return;

    setStats((prev) => ({ ...prev, techPoints: prev.techPoints - tech.cost }));
    setTechNodes((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, unlocked: true } : t))
    );

    sound.playBuild();
    addLog('success', 'Breakthrough Achieved', `Researched "${tech.name}": ${tech.effectLabel}`);

    if (techId === 'terraforming_genesis') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
      });
      addLog('success', 'Terraforming Milestone', 'Atmospheric Genesis initiated! The Red Planet is turning green!');
    }
  };

  // Module Actions: Toggle Active, Upgrade, Repair, Demolish
  const handleToggleModuleActive = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, isActive: !m.isActive } : m))
    );
    setSelectedModule((prev) => (prev && prev.id === moduleId ? { ...prev, isActive: !prev.isActive } : prev));
  };

  const handleUpgradeModule = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const bp = MODULE_BLUEPRINTS[mod.type];
    const costAlloy = Math.round(bp.costAlloy * 0.8 * mod.level);
    const costCredits = Math.round(bp.costCredits * 0.8 * mod.level);

    if (stats.alloy < costAlloy || stats.credits < costCredits) return;

    setStats((prev) => ({
      ...prev,
      alloy: prev.alloy - costAlloy,
      credits: prev.credits - costCredits,
    }));

    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, level: m.level + 1 } : m))
    );

    // Update selected module to reflect changes instantly
    setSelectedModule((prev) => (prev && prev.id === moduleId ? { ...prev, level: prev.level + 1 } : prev));

    sound.playBuild();
    addLog('info', 'Module Upgraded', `${bp.name} upgraded to Tier ${mod.level + 1}.`);
  };

  const handleRepairModule = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const bp = MODULE_BLUEPRINTS[mod.type];
    const costAlloy = Math.round(bp.costAlloy * 0.2);

    if (stats.alloy < costAlloy) return;

    setStats((prev) => ({ ...prev, alloy: prev.alloy - costAlloy }));
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, health: m.maxHealth } : m))
    );
    setSelectedModule((prev) => (prev && prev.id === moduleId ? { ...prev, health: prev.maxHealth } : prev));

    sound.playBuild();
    addLog('info', 'Module Repaired', `${bp.name} restored to 100% structural integrity.`);
  };

  const handleDemolishModule = (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;
    const bp = MODULE_BLUEPRINTS[mod.type];
    const refund = Math.round(bp.costAlloy * 0.6);

    setStats((prev) => ({ ...prev, alloy: prev.alloy + refund }));
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    setSelectedModule(null);
    addLog('info', 'Module Deconstructed', `${bp.name} dismantled. Recovered ${refund} Alloy.`);
  };

  // Manual Harvester Order
  const handleManualHarvesterOrder = (harvesterId: string, worldX: number, worldY: number) => {
    // Check if clicked near a spice patch
    const clickedSpice = spicePatches.find(
      (sp) => Math.hypot(sp.x - worldX, sp.y - worldY) < sp.radius + 20
    );

    setHarvesters((prev) =>
      prev.map((h) => {
        if (h.id === harvesterId) {
          if (clickedSpice) {
            return {
              ...h,
              state: 'moving_to_spice',
              targetSpiceId: clickedSpice.id,
              targetX: clickedSpice.x,
              targetY: clickedSpice.y,
              waypoints: findNavigationPath(h.x, h.y, clickedSpice.x, clickedSpice.y, modules, powerLines),
              autoHarvest: true,
            };
          } else {
            return {
              ...h,
              state: 'moving_to_spice',
              targetSpiceId: null,
              targetX: worldX,
              targetY: worldY,
              waypoints: findNavigationPath(h.x, h.y, worldX, worldY, modules, powerLines),
              autoHarvest: false,
            };
          }
        }
        return h;
      })
    );

    sound.playClick(600);
    addLog('info', 'Order Dispatched', 'Manual navigation coordinates transmitted to rover.');
  };

  return (
    <div className="relative w-screen h-screen bg-stone-950 overflow-hidden font-sans">
      {/* HUD Top Bar */}
      <TopBar
        stats={stats}
        weather={weather}
        gameSpeed={gameSpeed}
        isMuted={isMuted}
        onSetGameSpeed={setGameSpeed}
        onToggleMute={handleToggleMute}
        onOpenTechTree={() => setIsTechTreeOpen(true)}
        onOpenTradeRocket={() => setIsTradeRocketOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenCustomAssets={() => setIsCustomAssetsOpen(true)}
        onOpenResourceMonitor={(filter) => {
          setResourceMonitorFilter(filter || 'all');
          setIsResourceMonitorOpen(true);
          sound.playClick(850);
        }}
      />

      {/* Main 2D Martian Surface Canvas */}
      <MarsCanvas
        terrain={terrain}
        modules={modules}
        harvesters={harvesters}
        workers={workers}
        powerLines={powerLines}
        spicePatches={spicePatches}
        oreDeposits={oreDeposits}
        weather={weather}
        timeOfDay={stats.timeOfDay}
        selectedModule={modules.find((m) => m.id === selectedModule?.id) || selectedModule}
        selectedHarvester={harvesters.find((h) => h.id === selectedHarvester?.id) || selectedHarvester}
        buildPlacingType={buildPlacingType}
        canAffordPlacing={
          buildPlacingType
            ? stats.alloy >= MODULE_BLUEPRINTS[buildPlacingType]?.costAlloy &&
              stats.credits >= MODULE_BLUEPRINTS[buildPlacingType]?.costCredits
            : false
        }
        onSelectModule={(mod) => {
          setSelectedModule(mod);
          if (mod) sound.playClick(750);
        }}
        onSelectHarvester={(harv) => {
          setSelectedHarvester(harv);
          if (harv) sound.playClick(650);
        }}
        onPlaceModule={handlePlaceModule}
        onCancelPlacing={() => setBuildPlacingType(null)}
        onManualHarvesterOrder={handleManualHarvesterOrder}
      />

      {/* Mission Log Feed & Population Morale Dashboard */}
      <ColonyLog
        logs={logs}
        stats={stats}
        onOpenTradeRocket={() => setIsTradeRocketOpen(true)}
      />

      {/* Bottom Construction Bar */}
      <BuildMenu
        currentCredits={stats.credits}
        currentAlloy={stats.alloy}
        activePlacingType={buildPlacingType}
        onSelectPlacingType={(type) => {
          setBuildPlacingType(type);
          if (type) sound.playClick(900);
        }}
        onOpenHarvesterBay={() => {
          setIsHarvesterBayOpen(true);
          sound.playClick(800);
        }}
        harvesterCount={harvesters.length}
      />

      {/* Selected Module Details Drawer */}
      <ModuleDetailsModal
        module={modules.find((m) => m.id === selectedModule?.id) || selectedModule}
        onClose={() => setSelectedModule(null)}
        currentCredits={stats.credits}
        currentAlloy={stats.alloy}
        onToggleActive={handleToggleModuleActive}
        onUpgradeModule={handleUpgradeModule}
        onRepairModule={handleRepairModule}
        onDemolishModule={handleDemolishModule}
      />

      {/* Selected Harvester Details Drawer */}
      <HarvesterDetailsModal
        harvester={harvesters.find((h) => h.id === selectedHarvester?.id) || selectedHarvester}
        onClose={() => setSelectedHarvester(null)}
        currentAlloy={stats.alloy}
        onRecall={handleRecallHarvester}
        onToggleAuto={handleToggleAutoHarvest}
        onRepair={(id) => {
          if (stats.alloy >= 15) {
            setStats((prev) => ({ ...prev, alloy: prev.alloy - 15 }));
            setHarvesters((prev) =>
              prev.map((h) => (h.id === id ? { ...h, health: h.maxHealth } : h))
            );
            setSelectedHarvester((prev) => prev && prev.id === id ? { ...prev, health: prev.maxHealth } : prev);
            sound.playBuild();
            addLog('info', 'Rover Repaired', 'Harvester chassis repaired to 100% hull.');
          }
        }}
        onScrap={handleScrapHarvester}
      />

      {/* Harvester Fleet Manager Modal */}
      <HarvesterManager
        isOpen={isHarvesterBayOpen}
        onClose={() => setIsHarvesterBayOpen(false)}
        harvesters={harvesters}
        modules={modules}
        currentAlloy={stats.alloy}
        currentCredits={stats.credits}
        onDeployHarvester={handleDeployHarvester}
        onRecallHarvester={handleRecallHarvester}
        onScrapHarvester={handleScrapHarvester}
        onToggleAutoHarvest={handleToggleAutoHarvest}
        onToggleMiningTarget={handleToggleMiningTarget}
        onFocusHarvester={(h) => {
          setSelectedHarvester(h);
          setIsHarvesterBayOpen(false);
        }}
      />

      {/* Tech Tree Modal */}
      <TechTreeModal
        isOpen={isTechTreeOpen}
        onClose={() => setIsTechTreeOpen(false)}
        techNodes={techNodes}
        techPoints={stats.techPoints}
        onUnlockTech={handleUnlockTech}
      />

      {/* Earth Trade Shuttle Modal */}
      <TradeRocketModal
        isOpen={isTradeRocketOpen}
        onClose={() => setIsTradeRocketOpen(false)}
        spiceAmount={stats.spice}
        credits={stats.credits}
        modules={modules}
        spicePriceMultiplier={hasTech('spice_centrifuge') ? 1.4 : 1.0}
        onSellSpice={handleSellSpice}
        onImportSupply={handleImportSupply}
        autoExportSpice={stats.autoExportSpice || false}
        autoExportThreshold={stats.autoExportThreshold || 100}
        onToggleAutoExport={() => setStats(s => ({ ...s, autoExportSpice: !s.autoExportSpice }))}
        onChangeAutoExportThreshold={(val) => setStats(s => ({ ...s, autoExportThreshold: val }))}
      />

      {/* Tutorial & Mission Briefing Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Historical Resource Consumption & Telemetry Monitor (Recharts) */}
      <ResourceMonitor
        isOpen={isResourceMonitorOpen}
        onClose={() => setIsResourceMonitorOpen(false)}
        history={resourceHistory}
        currentStats={stats}
        initialFilter={resourceMonitorFilter}
      />

      {/* Custom PNG Graphics & Sprites Manager Modal */}
      <CustomAssetsModal
        isOpen={isCustomAssetsOpen}
        onClose={() => setIsCustomAssetsOpen(false)}
      />
    </div>
  );
}
