/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ColonyEventLog,
  ColonyModule,
  ColonyStats,
  Harvester,
  HarvesterModel,
  ModuleType,
  ResourceHistoryPoint,
  SpicePatch,
  TechNode,
  WeatherCondition,
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
    });
  }
  return history;
}

export default function App() {
  // Terrain & World
  const [terrain] = useState(() => generateMarsTerrain());
  const [spicePatches, setSpicePatches] = useState<SpicePatch[]>(() => terrain.spicePatches);

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
  ]);

  // Initial Harvesters
  const [harvesters, setHarvesters] = useState<Harvester[]>([
    {
      id: 'harvester_alpha',
      name: 'Harvester Alpha',
      model: 'heavy',
      x: 43.5 * TILE_SIZE,
      y: 42 * TILE_SIZE,
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

  // Colony Stats & Resources
  const [stats, setStats] = useState<ColonyStats>({
    sol: 1,
    timeOfDay: 0.15, // morning
    dayCycleSpeed: 0.006, // approx 2.5 minutes per day at 1x
    credits: 220,
    alloy: 140,
    spice: 45,
    spiceCapacity: 600,
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

  // Morale & Vital warning cooldown tracker
  const moraleWarningCooldownRef = useRef<{
    o2: number;
    water: number;
    food: number;
    power: number;
    general: number;
  }>({ o2: 0, water: 0, food: 0, power: 0, general: 0 });

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
        if (weather.type === 'dust_storm') {
          sunFactor *= hasTech('storm_hardening') ? 0.6 : 0.25;
        }

        // Module rates calculation
        let powerProd = 0;
        let powerCons = 0;
        let o2Gen = 0;
        let waterGen = 0;
        let foodGen = 0;
        let techGen = 0;
        let spiceCap = 600;
        let batteryCap = 0;
        let popCap = 0;

        modules.forEach((mod) => {
          if (!mod.isActive) return;
          const bp = MODULE_BLUEPRINTS[mod.type];
          if (!bp) return;
          const mult = 1 + (mod.level - 1) * 0.5;

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
        });

        // Life support consumption by colonists
        const o2Cons = prevStats.population * 1.5;
        const waterCons = prevStats.population * 1.0;
        const foodCons = prevStats.population * 0.8;

        const netPower = powerProd - powerCons;
        let newPowerStored = prevStats.powerStored + netPower * dt;
        if (newPowerStored > batteryCap) newPowerStored = batteryCap;
        if (newPowerStored < 0) newPowerStored = 0;

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

        return {
          ...prevStats,
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
        };
      });

      // 2. Weather Cycle Tick
      setWeather((prevWeather) => {
        const nextDur = prevWeather.duration - dt;
        if (nextDur <= 0) {
          // Roll new weather event
          const roll = Math.random();
          if (roll < 0.65) {
            return {
              type: 'clear',
              name: 'Clear Martian Skies',
              description: 'Clear conditions across the sector.',
              duration: Math.random() * 90 + 90,
              maxDuration: 180,
              severity: 0,
            };
          } else if (roll < 0.85) {
            return {
              type: 'dust_veil',
              name: 'Atmospheric Dust Veil',
              description: 'Moderate airborne particulate reducing solar output.',
              duration: Math.random() * 45 + 40,
              maxDuration: 90,
              severity: 0.3,
            };
          } else if (roll < 0.95) {
            sound.playAlarm();
            addLog('danger', 'Dust Storm Alert', 'Severe Martian dust storm detected! Solar offline.');
            return {
              type: 'dust_storm',
              name: 'Severe Dust Storm',
              description: 'Dangerous winds and heavy sand. Harvesters slowed, solar penalized.',
              duration: Math.random() * 50 + 40,
              maxDuration: 90,
              severity: 0.8,
            };
          } else {
            sound.playAlarm();
            addLog('warning', 'Seismic Tremor', 'Subterranean seismic activity detected! New spice vein geyser erupted.');
            // Spawn new spice vein
            setSpicePatches((prevPatches) => [...prevPatches, spawnNewSpicePatch(prevPatches)]);
            return {
              type: 'seismic_tremor',
              name: 'Seismic Dune Tremor',
              description: 'Ground tremors uncovering underground spice melange geysers.',
              duration: 35,
              maxDuration: 35,
              severity: 0.5,
            };
          }
        }
        return { ...prevWeather, duration: nextDur };
      });

      // 3. Harvester Autonomous Roam & Harvest Tick
      setHarvesters((prevHarvesters) => {
        return prevHarvesters.map((h) => {
          let updated = { ...h };

          // Determine home depot/command position for return using exterior docking apron
          const depot =
            modules.find((m) => m.id === h.homeDepotId) ||
            modules.find((m) => m.type === 'depot') ||
            modules.find((m) => m.type === 'command') ||
            modules[0];
          const depotDock = depot
            ? findDockingApron(depot, h.x, h.y, modules)
            : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
          const depotX = depotDock.x;
          const depotY = depotDock.y;

          // Vehicle collision radius
          const roverRadius = h.model === 'titan' ? 22 : h.model === 'heavy' ? 18 : 14;

          // Speed modifiers (dust storm slow, tech upgrades)
          let currentSpeed = h.speed * (hasTech('rover_turbo') ? 1.35 : 1.0);
          if (weather.type === 'dust_storm' && !hasTech('storm_hardening')) {
            currentSpeed *= 0.65;
          }

          // Cargo capacity bonus from tech
          const effectiveMaxCargo = Math.round(
            h.maxCargo * (hasTech('titan_holds') ? 1.5 : 1.0)
          );

          // State Machine
          if (h.autoHarvest) {
            // Check if cargo full
            if (updated.cargo >= effectiveMaxCargo && updated.state !== 'unloading') {
              updated.state = 'returning_to_depot';
              updated.targetX = depotX;
              updated.targetY = depotY;
              updated.waypoints = findNavigationPath(updated.x, updated.y, depotX, depotY, modules);
            }

            // IDLE: Seek closest spice patch with spice available
            if (updated.state === 'idle') {
              const availablePatches = spicePatches.filter((p) => p.amount > 10);
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
                updated.waypoints = findNavigationPath(updated.x, updated.y, nearest.x, nearest.y, modules);
              }
            }

            // MOVING TO SPICE
            if (updated.state === 'moving_to_spice') {
              const targetSpice = spicePatches.find((sp) => sp.id === updated.targetSpiceId);
              if (!targetSpice || targetSpice.amount <= 0) {
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
                      modules
                    );
                  }

                  const currentGoal =
                    updated.waypoints && updated.waypoints.length > 0
                      ? updated.waypoints[0]
                      : { x: targetSpice.x, y: targetSpice.y };

                  if (
                    Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y) < 26 &&
                    updated.waypoints &&
                    updated.waypoints.length > 1
                  ) {
                    updated.waypoints = updated.waypoints.slice(1);
                  }

                  // Steer around buildings and resolve collisions
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
                    roverRadius
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
              const targetSpice = spicePatches.find((sp) => sp.id === updated.targetSpiceId);
              if (!targetSpice || targetSpice.amount <= 0) {
                // Spice patch dried up
                updated.state = 'idle';
                updated.targetSpiceId = null;
                updated.waypoints = [];
              } else {
                const minedAmount = Math.min(
                  targetSpice.amount,
                  Math.min(effectiveMaxCargo - updated.cargo, updated.harvestRate * dt)
                );
                updated.cargo += minedAmount;

                // Decrement from patch
                setSpicePatches((prevPatches) =>
                  prevPatches.map((p) =>
                    p.id === targetSpice.id
                      ? { ...p, amount: Math.max(0, p.amount - minedAmount) }
                      : p
                  )
                );

                // Play occasional pulse sound
                if (Math.random() < 0.2) {
                  sound.playMiningPulse();
                }

                if (updated.cargo >= effectiveMaxCargo) {
                  updated.state = 'returning_to_depot';
                  updated.targetX = depotX;
                  updated.targetY = depotY;
                  updated.waypoints = findNavigationPath(updated.x, updated.y, depotX, depotY, modules);
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
                  updated.waypoints = findNavigationPath(updated.x, updated.y, depotX, depotY, modules);
                }

                const currentGoal =
                  updated.waypoints && updated.waypoints.length > 0
                    ? updated.waypoints[0]
                    : { x: depotX, y: depotY };

                if (
                  Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y) < 26 &&
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
                  roverRadius
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
                // Deposit spice into colony stockpile!
                const delivered = updated.cargo;
                setStats((prevStats) => ({
                  ...prevStats,
                  spice: Math.min(prevStats.spiceCapacity, prevStats.spice + delivered),
                  totalSpiceMined: prevStats.totalSpiceMined + delivered,
                }));

                sound.playSpiceDelivered();
                addLog(
                  'success',
                  'Spice Delivered',
                  `${updated.name} delivered ${Math.round(delivered)}kg Spice Melange to refinery.`
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
                    modules
                  );
                }

                const currentGoal =
                  updated.waypoints && updated.waypoints.length > 0
                    ? updated.waypoints[0]
                    : { x: updated.targetX, y: updated.targetY };

                if (
                  Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y) < 26 &&
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
                  roverRadius
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
    const depot =
      modules.find((m) => m.type === 'depot') ||
      modules.find((m) => m.type === 'command') ||
      modules[0];
    const dock = depot
      ? findDockingApron(depot, WORLD_WIDTH / 2 + 120, WORLD_HEIGHT / 2, modules)
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
          const depot =
            modules.find((m) => m.id === h.homeDepotId) ||
            modules.find((m) => m.type === 'depot') ||
            modules.find((m) => m.type === 'command') ||
            modules[0];
          const dock = depot
            ? findDockingApron(depot, h.x, h.y, modules)
            : { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
          return {
            ...h,
            state: 'returning_to_depot',
            targetX: dock.x,
            targetY: dock.y,
            targetSpiceId: null,
            waypoints: findNavigationPath(h.x, h.y, dock.x, dock.y, modules),
          };
        }
        return h;
      })
    );
    addLog('info', 'Harvester Recalled', 'Harvester ordered to return immediately to base depot.');
  };

  // Toggle Auto-harvest
  const handleToggleAutoHarvest = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => (h.id === harvesterId ? { ...h, autoHarvest: !h.autoHarvest } : h))
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

  // Sell Spice Melange
  const handleSellSpice = (amount: number) => {
    if (amount <= 0 || stats.spice < amount) return;
    const mult = hasTech('spice_centrifuge') ? 1.4 : 1.0;
    const pricePerKg = 2.5 * mult;
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
              waypoints: findNavigationPath(h.x, h.y, clickedSpice.x, clickedSpice.y, modules),
              autoHarvest: true,
            };
          } else {
            return {
              ...h,
              state: 'moving_to_spice',
              targetSpiceId: null,
              targetX: worldX,
              targetY: worldY,
              waypoints: findNavigationPath(h.x, h.y, worldX, worldY, modules),
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
        spicePatches={spicePatches}
        weather={weather}
        timeOfDay={stats.timeOfDay}
        selectedModule={selectedModule}
        selectedHarvester={selectedHarvester}
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
        module={selectedModule}
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
        harvester={selectedHarvester}
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
    </div>
  );
}
