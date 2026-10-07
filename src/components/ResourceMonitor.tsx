import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { ColonyStats, ResourceHistoryPoint } from '../types/colony';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Droplets,
  Layers,
  Minimize2,
  Minus,
  Maximize2,
  Sliders,
  Wind,
  X,
  Zap,
} from 'lucide-react';

interface ResourceMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  history: ResourceHistoryPoint[];
  currentStats: ColonyStats;
  initialFilter?: 'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'morale' | 'health';
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({
  isOpen,
  onClose,
  history,
  currentStats,
  initialFilter = 'all',
}) => {
  const [selectedResource, setSelectedResource] = useState<'all' | 'power' | 'water' | 'oxygen' | 'food' | 'alloy' | 'ore' | 'spice' | 'credits' | 'morale' | 'health'>(
    initialFilter
  );
  const [timeSpanMinutes, setTimeSpanMinutes] = useState<number>(50); // 15, 30, or 50 game minutes
  const [unitMode, setUnitMode] = useState<'pct' | 'actual'>('pct'); // % capacity vs actual units
  const [showThresholds, setShowThresholds] = useState<boolean>(true);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Format Sol time
  const currentHours = Math.floor(currentStats.timeOfDay * 24);
  const currentMins = Math.floor((currentStats.timeOfDay * 24 * 60) % 60);
  const currentTimeFormatted = `${currentHours.toString().padStart(2, '0')}:${currentMins.toString().padStart(2, '0')}`;

  // Filter history to the selected time window (15m, 30m, 50m)
  const windowedData = useMemo(() => {
    if (!history || history.length === 0) return [];
    const minMinute = -timeSpanMinutes;
    const filtered = history.filter((pt) => pt.minutesAgo >= minMinute);

    // Map for recharts with formatted display labels
    return filtered.map((pt) => ({
      ...pt,
      xLabel: pt.minutesAgo === 0 ? 'NOW' : `${pt.minutesAgo}m`,
      displayTime: pt.timeStr,
      powerActual: Math.round(pt.power),
      waterActual: Math.round(pt.water),
      oxygenActual: Math.round(pt.oxygen),
      powerCapacity: pt.powerCapacity,
      maxWater: pt.maxWater,
      maxOxygen: pt.maxOxygen,
    }));
  }, [history, timeSpanMinutes]);

  // Depletion calculations & trend vectors
  const powerTrend = useMemo(() => {
    const net = currentStats.powerNet;
    const stored = currentStats.powerStored;
    const capacity = Math.max(1, currentStats.powerCapacity);
    const pct = Math.round((stored / capacity) * 100);

    // 50-minute delta
    const oldest = windowedData[0];
    const historicalDelta = oldest ? stored - oldest.power : 0;
    const historicalDeltaPct = oldest ? pct - oldest.powerPct : 0;

    // Time to exhaustion if net < 0 (converting seconds to game minutes: 1 real second = ~8.64 game min or simulation rate)
    // In our sim, 1 Sol is 1440 game minutes. dayCycleSpeed is 0.006/scaled-sec, so 1 game min is ~0.115 sec.
    // Net power is kW/scaled-sec. Stored power is in kW-seconds of capacity.
    let timeToCriticalMins: number | null = null;
    if (net < -0.1 && stored > 0) {
      const secondsLeft = stored / Math.abs(net);
      timeToCriticalMins = Math.round((secondsLeft * 8.64) * 10) / 10;
    }

    return {
      net,
      stored,
      capacity,
      pct,
      historicalDelta,
      historicalDeltaPct,
      timeToCriticalMins,
      isDraining: net < -0.5,
      isCritical: stored <= 10 && net < 0,
      isWarning: stored < capacity * 0.25 && net < 0,
    };
  }, [currentStats, windowedData]);

  const waterTrend = useMemo(() => {
    const delta = currentStats.currentWaterDelta;
    const current = currentStats.water;
    const capacity = Math.max(1, currentStats.maxWater);
    const pct = Math.round((current / capacity) * 100);

    const oldest = windowedData[0];
    const historicalDelta = oldest ? current - oldest.water : 0;
    const historicalDeltaPct = oldest ? pct - oldest.waterPct : 0;

    // Water rationing threshold is 70 L
    let timeToCriticalMins: number | null = null;
    if (delta < -0.1 && current > 70) {
      const margin = current - 70;
      const secondsLeft = margin / Math.abs(delta);
      timeToCriticalMins = Math.round((secondsLeft * 8.64) * 10) / 10;
    } else if (delta < -0.1 && current > 0) {
      const secondsLeft = current / Math.abs(delta);
      timeToCriticalMins = Math.round((secondsLeft * 8.64) * 10) / 10;
    }

    return {
      delta,
      current,
      capacity,
      pct,
      historicalDelta,
      historicalDeltaPct,
      timeToCriticalMins,
      isDraining: delta < -0.2,
      isCritical: current < 70,
      isSevere: current < 30,
      isWarning: current < 150 && delta < 0,
    };
  }, [currentStats, windowedData]);

  const oxygenTrend = useMemo(() => {
    const delta = currentStats.currentO2Delta;
    const current = currentStats.oxygen;
    const capacity = Math.max(1, currentStats.maxOxygen);
    const pct = Math.round((current / capacity) * 100);

    const oldest = windowedData[0];
    const historicalDelta = oldest ? current - oldest.oxygen : 0;
    const historicalDeltaPct = oldest ? pct - oldest.oxygenPct : 0;

    // O2 warning threshold is 80 m³, asphyxiation at 35 m³
    let timeToCriticalMins: number | null = null;
    if (delta < -0.1 && current > 80) {
      const margin = current - 80;
      const secondsLeft = margin / Math.abs(delta);
      timeToCriticalMins = Math.round((secondsLeft * 8.64) * 10) / 10;
    } else if (delta < -0.1 && current > 0) {
      const secondsLeft = current / Math.abs(delta);
      timeToCriticalMins = Math.round((secondsLeft * 8.64) * 10) / 10;
    }

    return {
      delta,
      current,
      capacity,
      pct,
      historicalDelta,
      historicalDeltaPct,
      timeToCriticalMins,
      isDraining: delta < -0.2,
      isCritical: current < 80,
      isSevere: current < 35,
      isWarning: current < 200 && delta < 0,
    };
  }, [currentStats, windowedData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div
        className={`w-full ${
          isMaximized ? 'max-w-7xl h-[94vh]' : 'max-w-5xl max-h-[90vh]'
        } bg-stone-950 border border-stone-800 rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-title text-base sm:text-lg font-bold text-stone-100 tracking-wider">
                  RESOURCE CONSUMPTION & TELEMETRY MONITOR
                </h2>
                <span className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-stone-400 font-sans">
                Real-time 50-game-minute trajectory analysis for power, water, and atmospheric oxygen reserves.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Colony Sol Time Display */}
            <div className="hidden sm:flex items-center gap-2 bg-stone-900/90 border border-stone-800 px-3 py-1 rounded font-mono text-xs text-stone-300">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>SOL {currentStats.sol}</span>
              <span className="text-stone-500">·</span>
              <span className="text-orange-300 font-semibold">{currentTimeFormatted}</span>
            </div>

            {/* Maximize Toggle */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
              title={isMaximized ? 'Restore Size' : 'Maximize Window'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
              title="Close Monitor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* Top Row: Predictive Trend Horizon Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">
            {/* 1. POWER GRID CARD */}
            <div
              onClick={() => setSelectedResource(selectedResource === 'power' ? 'all' : 'power')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                powerTrend.isCritical
                  ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500/50'
                  : powerTrend.isDraining
                  ? 'bg-amber-950/30 border-amber-600/60'
                  : 'bg-stone-900/80 border-stone-800 hover:border-yellow-600/50'
              } ${selectedResource === 'power' ? 'ring-2 ring-yellow-500/70' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-sans font-bold text-stone-200">
                  <Zap className="w-4 h-4 text-yellow-400" /> POWER GRID
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    powerTrend.isCritical
                      ? 'bg-red-900/80 text-red-200 animate-pulse'
                      : powerTrend.isDraining
                      ? 'bg-amber-900/80 text-amber-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {powerTrend.isCritical
                    ? 'CRITICAL BLACKOUT'
                    : powerTrend.isDraining
                    ? 'DISCHARGING'
                    : 'SURPLUS CHARGING'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-xl font-extrabold text-yellow-300">
                    {Math.round(powerTrend.stored)}
                  </span>
                  <span className="text-stone-400 text-xs"> / {powerTrend.capacity} kW</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      powerTrend.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {powerTrend.net >= 0 ? `+${Math.round(powerTrend.net)}` : Math.round(powerTrend.net)} kW/s
                  </span>
                  <div className="text-[10px] text-stone-500 font-sans">NET RATE</div>
                </div>
              </div>

              {/* Depletion Horizon & Historical Delta */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                <span className="text-stone-400 flex items-center gap-1">
                  {powerTrend.historicalDeltaPct >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {powerTrend.historicalDeltaPct >= 0 ? '+' : ''}
                  {Math.round(powerTrend.historicalDeltaPct)}% over {timeSpanMinutes}m
                </span>

                {powerTrend.timeToCriticalMins !== null ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400 inline" />
                    Empty in ~{powerTrend.timeToCriticalMins}m
                  </span>
                ) : (
                  <span className="text-emerald-400">Reserves Stable</span>
                )}
              </div>
            </div>

            {/* 2. WATER RESERVES CARD */}
            <div
              onClick={() => setSelectedResource(selectedResource === 'water' ? 'all' : 'water')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                waterTrend.isCritical
                  ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500/50'
                  : waterTrend.isDraining
                  ? 'bg-amber-950/30 border-amber-600/60'
                  : 'bg-stone-900/80 border-stone-800 hover:border-blue-600/50'
              } ${selectedResource === 'water' ? 'ring-2 ring-blue-500/70' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-sans font-bold text-stone-200">
                  <Droplets className="w-4 h-4 text-blue-400" /> WATER RESERVES
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    waterTrend.isCritical
                      ? 'bg-red-900/80 text-red-200 animate-pulse'
                      : waterTrend.isDraining
                      ? 'bg-amber-900/80 text-amber-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {waterTrend.isCritical
                    ? 'RATIONING CRITICAL'
                    : waterTrend.isDraining
                    ? 'DEPLETING'
                    : 'NET POSITIVE'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-xl font-extrabold text-blue-300">
                    {Math.round(waterTrend.current)}
                  </span>
                  <span className="text-stone-400 text-xs"> / {waterTrend.capacity} L</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      waterTrend.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {waterTrend.delta >= 0 ? `+${Math.round(waterTrend.delta)}` : Math.round(waterTrend.delta)} L/s
                  </span>
                  <div className="text-[10px] text-stone-500 font-sans">DELTA RATE</div>
                </div>
              </div>

              {/* Depletion Horizon & Historical Delta */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                <span className="text-stone-400 flex items-center gap-1">
                  {waterTrend.historicalDeltaPct >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {waterTrend.historicalDeltaPct >= 0 ? '+' : ''}
                  {Math.round(waterTrend.historicalDeltaPct)}% over {timeSpanMinutes}m
                </span>

                {waterTrend.timeToCriticalMins !== null ? (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400 inline" />
                    Rationing in ~{waterTrend.timeToCriticalMins}m
                  </span>
                ) : (
                  <span className="text-emerald-400">Reserves Growing</span>
                )}
              </div>
            </div>

            {/* 3. OXYGEN ATMOSPHERE CARD */}
            <div
              onClick={() => setSelectedResource(selectedResource === 'oxygen' ? 'all' : 'oxygen')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                oxygenTrend.isCritical
                  ? 'bg-red-950/40 border-red-500/80 ring-1 ring-red-500/50'
                  : oxygenTrend.isDraining
                  ? 'bg-amber-950/30 border-amber-600/60'
                  : 'bg-stone-900/80 border-stone-800 hover:border-cyan-600/50'
              } ${selectedResource === 'oxygen' ? 'ring-2 ring-cyan-500/70' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-sans font-bold text-stone-200">
                  <Wind className="w-4 h-4 text-cyan-400" /> OXYGEN ATMOSPHERE
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    oxygenTrend.isCritical
                      ? 'bg-red-900/80 text-red-200 animate-pulse'
                      : oxygenTrend.isDraining
                      ? 'bg-amber-900/80 text-amber-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {oxygenTrend.isCritical
                    ? 'ASPHYXIATION ALERT'
                    : oxygenTrend.isDraining
                    ? 'DEFICIT DRAIN'
                    : 'ATMOSPHERE SECURE'}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-xl font-extrabold text-cyan-300">
                    {Math.round(oxygenTrend.current)}
                  </span>
                  <span className="text-stone-400 text-xs"> / {oxygenTrend.capacity} m³</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      oxygenTrend.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {oxygenTrend.delta >= 0 ? `+${Math.round(oxygenTrend.delta)}` : Math.round(oxygenTrend.delta)} m³/s
                  </span>
                  <div className="text-[10px] text-stone-500 font-sans">DELTA RATE</div>
                </div>
              </div>

              {/* Depletion Horizon & Historical Delta */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                <span className="text-stone-400 flex items-center gap-1">
                  {oxygenTrend.historicalDeltaPct >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {oxygenTrend.historicalDeltaPct >= 0 ? '+' : ''}
                  {Math.round(oxygenTrend.historicalDeltaPct)}% over {timeSpanMinutes}m
                </span>

                {oxygenTrend.timeToCriticalMins !== null ? (
                  <span className="text-red-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400 inline" />
                    Critical in ~{oxygenTrend.timeToCriticalMins}m
                  </span>
                ) : (
                  <span className="text-emerald-400">Atmosphere Optimal</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Chart Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/70 border border-stone-800/90 p-2.5 rounded-lg text-xs">
            {/* Left: Filter Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-stone-400 font-mono text-[11px] mr-1 hidden sm:inline">SERIES:</span>
              <button
                onClick={() => setSelectedResource('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedResource === 'all'
                    ? 'bg-stone-700 text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                All Vitals
              </button>
              <button
                onClick={() => setSelectedResource('power')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedResource === 'power'
                    ? 'bg-yellow-900/80 text-yellow-200 border border-yellow-700 font-semibold'
                    : 'text-yellow-400 hover:bg-yellow-950/40'
                }`}
              >
                <Zap className="w-3 h-3" /> Power
              </button>
              <button
                onClick={() => setSelectedResource('water')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedResource === 'water'
                    ? 'bg-blue-900/80 text-blue-200 border border-blue-700 font-semibold'
                    : 'text-blue-400 hover:bg-blue-950/40'
                }`}
              >
                <Droplets className="w-3 h-3" /> Water
              </button>
              <button
                onClick={() => setSelectedResource('oxygen')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedResource === 'oxygen'
                    ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700 font-semibold'
                    : 'text-cyan-400 hover:bg-cyan-950/40'
                }`}
              >
                <Wind className="w-3 h-3" /> Oxygen
              </button>
            </div>

            {/* Right: Display Options (Scale Unit, Time Span, Thresholds) */}
            <div className="flex flex-wrap items-center gap-2 font-mono">
              {/* Unit Toggle */}
              <div className="flex items-center bg-stone-950 border border-stone-800 rounded p-0.5">
                <button
                  onClick={() => setUnitMode('pct')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    unitMode === 'pct'
                      ? 'bg-stone-800 text-orange-300 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Normalize all series to % of capacity (0-100%)"
                >
                  % CAP
                </button>
                <button
                  onClick={() => setUnitMode('actual')}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    unitMode === 'actual'
                      ? 'bg-stone-800 text-orange-300 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Display raw physical units (kW, L, m³)"
                >
                  UNITS
                </button>
              </div>

              {/* Time Window Buttons */}
              <div className="flex items-center bg-stone-950 border border-stone-800 rounded p-0.5">
                <button
                  onClick={() => setTimeSpanMinutes(15)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    timeSpanMinutes === 15
                      ? 'bg-orange-950 border border-orange-700 text-orange-200 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  15m
                </button>
                <button
                  onClick={() => setTimeSpanMinutes(30)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    timeSpanMinutes === 30
                      ? 'bg-orange-950 border border-orange-700 text-orange-200 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  30m
                </button>
                <button
                  onClick={() => setTimeSpanMinutes(50)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    timeSpanMinutes === 50
                      ? 'bg-orange-950 border border-orange-700 text-orange-200 font-bold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  50m
                </button>
              </div>

              {/* Safety Reference Lines Toggle */}
              <button
                onClick={() => setShowThresholds(!showThresholds)}
                className={`px-2.5 py-1 rounded border text-[11px] transition-colors flex items-center gap-1 ${
                  showThresholds
                    ? 'bg-red-950/40 border-red-700 text-red-300'
                    : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
                }`}
                title="Toggle critical warning danger thresholds on graph"
              >
                <AlertOctagon className="w-3 h-3" />
                <span className="hidden sm:inline">SAFETY LIMITS</span>
              </button>
            </div>
          </div>

          {/* Main Recharts Telemetry Line Chart */}
          <div className="bg-stone-950/90 border border-stone-800 rounded-lg p-3 sm:p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-stone-400 font-mono px-1">
              <span>
                HISTORICAL TELEMETRY ·{' '}
                <span className="text-orange-400">LAST {timeSpanMinutes} GAME MINUTES</span>
              </span>
              <span>
                SCALE:{' '}
                <span className="text-stone-200">
                  {unitMode === 'pct' ? '0% - 100% OF CAPACITY' : 'ABSOLUTE PHYSICAL VALUE'}
                </span>
              </span>
            </div>

            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={windowedData}
                  margin={{ top: 12, right: 24, left: 0, bottom: 6 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis
                    dataKey="xLabel"
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#44403c' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={unitMode === 'pct' ? [0, 100] : [0, 'auto']}
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={{ stroke: '#44403c' }}
                    unit={unitMode === 'pct' ? '%' : ''}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as ResourceHistoryPoint & {
                        xLabel: string;
                        displayTime: string;
                      };
                      return (
                        <div className="bg-stone-900/95 border border-stone-700/80 p-3 rounded-lg shadow-2xl font-mono text-xs backdrop-blur-md flex flex-col gap-1.5 min-w-[210px]">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-1 text-stone-300">
                            <span className="text-orange-400 font-bold">SOL {pt.sol} · {pt.displayTime}</span>
                            <span className="text-stone-400 text-[10px]">{pt.minutesAgo === 0 ? 'CURRENT TIME' : `${Math.abs(pt.minutesAgo)}m ago`}</span>
                          </div>

                          {/* Power Reading */}
                          <div className="flex items-center justify-between text-yellow-300">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-yellow-400" /> Power:
                            </span>
                            <span className="font-bold">
                              {Math.round(pt.power)} kW ({Math.round(pt.powerPct)}%)
                            </span>
                          </div>

                          {/* Water Reading */}
                          <div className="flex items-center justify-between text-blue-300">
                            <span className="flex items-center gap-1">
                              <Droplets className="w-3 h-3 text-blue-400" /> Water:
                            </span>
                            <span className="font-bold">
                              {Math.round(pt.water)} L ({Math.round(pt.waterPct)}%)
                            </span>
                          </div>

                          {/* Oxygen Reading */}
                          <div className="flex items-center justify-between text-cyan-300">
                            <span className="flex items-center gap-1">
                              <Wind className="w-3 h-3 text-cyan-400" /> Oxygen:
                            </span>
                            <span className="font-bold">
                              {Math.round(pt.oxygen)} m³ ({Math.round(pt.oxygenPct)}%)
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
                  />

                  {/* Critical Safety Reference Lines */}
                  {showThresholds && unitMode === 'pct' && (
                    <>
                      <ReferenceLine
                        y={10}
                        stroke="#ef4444"
                        strokeDasharray="4 4"
                        label={{
                          value: 'CRITICAL VITALS THRESHOLD (10%)',
                          fill: '#f87171',
                          fontSize: 9,
                          position: 'insideBottomRight',
                          fontFamily: 'monospace',
                        }}
                      />
                      <ReferenceLine
                        y={25}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        label={{
                          value: 'WARNING LEVEL (25%)',
                          fill: '#fbbf24',
                          fontSize: 9,
                          position: 'insideTopRight',
                          fontFamily: 'monospace',
                        }}
                      />
                    </>
                  )}

                  {/* Power Line */}
                  {(selectedResource === 'all' || selectedResource === 'power') && (
                    <Line
                      type="monotone"
                      dataKey={unitMode === 'pct' ? 'powerPct' : 'powerActual'}
                      name="Power Grid"
                      stroke="#eab308"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#eab308', stroke: '#1c1917', strokeWidth: 2 }}
                    />
                  )}

                  {/* Water Line */}
                  {(selectedResource === 'all' || selectedResource === 'water') && (
                    <Line
                      type="monotone"
                      dataKey={unitMode === 'pct' ? 'waterPct' : 'waterActual'}
                      name="Water Reserves"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#3b82f6', stroke: '#1c1917', strokeWidth: 2 }}
                    />
                  )}

                  {/* Oxygen Line */}
                  {(selectedResource === 'all' || selectedResource === 'oxygen') && (
                    <Line
                      type="monotone"
                      dataKey={unitMode === 'pct' ? 'oxygenPct' : 'oxygenActual'}
                      name="Oxygen Atmosphere"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#06b6d4', stroke: '#1c1917', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Diagnostic Advisory & Early Warning System */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-title font-semibold text-stone-200">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>EARLY WARNING & PREDICTIVE CONSUMPTION ADVISORY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Power Diagnosis */}
              <div
                className={`p-2.5 rounded border ${
                  powerTrend.isCritical
                    ? 'bg-red-950/40 border-red-700/80 text-red-200'
                    : powerTrend.isDraining
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-stone-950/80 border-stone-800 text-stone-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1 text-yellow-300">
                  <Zap className="w-3.5 h-3.5" /> Power Trajectory
                </div>
                <p className="text-[11px] leading-relaxed">
                  {powerTrend.net < -0.5 ? (
                    <>
                      Grid deficit detected ({Math.round(powerTrend.net)} kW/s). At current consumption, batteries will deplete in{' '}
                      <strong className="text-amber-300 font-mono">
                        ~{powerTrend.timeToCriticalMins ?? '10'} minutes
                      </strong>
                      . Construct Solar Arrays or RTG Nuclear Cells before blackout.
                    </>
                  ) : (
                    <>
                      Generation meets demand (+{Math.round(powerTrend.net)} kW/s). Battery reserves at{' '}
                      <strong className="text-yellow-300 font-mono">{powerTrend.pct}%</strong> capacity.
                    </>
                  )}
                </p>
              </div>

              {/* Water Diagnosis */}
              <div
                className={`p-2.5 rounded border ${
                  waterTrend.isCritical
                    ? 'bg-red-950/40 border-red-700/80 text-red-200'
                    : waterTrend.isDraining
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-stone-950/80 border-stone-800 text-stone-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-300">
                  <Droplets className="w-3.5 h-3.5" /> Water Trajectory
                </div>
                <p className="text-[11px] leading-relaxed">
                  {waterTrend.delta < -0.2 ? (
                    <>
                      Consumption exceeds moisture recapture ({Math.round(waterTrend.delta)} L/s). Water rationing threshold will be reached in{' '}
                      <strong className="text-red-300 font-mono">
                        ~{waterTrend.timeToCriticalMins ?? '15'} minutes
                      </strong>
                      . Deploy additional Atmospheric Vaporators immediately.
                    </>
                  ) : (
                    <>
                      Water recapture is positive (+{Math.round(waterTrend.delta)} L/s). Colony moisture stores at{' '}
                      <strong className="text-blue-300 font-mono">{waterTrend.pct}%</strong>.
                    </>
                  )}
                </p>
              </div>

              {/* Oxygen Diagnosis */}
              <div
                className={`p-2.5 rounded border ${
                  oxygenTrend.isCritical
                    ? 'bg-red-950/40 border-red-700/80 text-red-200'
                    : oxygenTrend.isDraining
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-stone-950/80 border-stone-800 text-stone-300'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 mb-1 text-cyan-300">
                  <Wind className="w-3.5 h-3.5" /> Oxygen Trajectory
                </div>
                <p className="text-[11px] leading-relaxed">
                  {oxygenTrend.delta < -0.2 ? (
                    <>
                      Colony population breathing rate outpaces MOXIE scrubber output ({Math.round(oxygenTrend.delta)} m³/s). Asphyxiation danger in{' '}
                      <strong className="text-red-300 font-mono">
                        ~{oxygenTrend.timeToCriticalMins ?? '20'} minutes
                      </strong>
                      . Expand Carbon Scrubber capacity to avoid crew casualties.
                    </>
                  ) : (
                    <>
                      Atmospheric scrubbers fully supply breathable air (+{Math.round(oxygenTrend.delta)} m³/s). Oxygen reserves at{' '}
                      <strong className="text-cyan-300 font-mono">{oxygenTrend.pct}%</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-mono text-[11px]">TELEMETRY SAMPLING INTERVAL: 1 GAME MINUTE</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium transition-colors"
          >
            Close Telemetry
          </button>
        </div>
      </div>
    </div>
  );
};
