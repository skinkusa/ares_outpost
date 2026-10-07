import React, { useState } from 'react';
import { ColonyEventLog, ColonyStats } from '../types/colony';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Droplets,
  Heart,
  HeartPulse,
  Activity,
  Radio,
  Shield,
  Smile,
  Users,
  Utensils,
  Wind,
  Zap,
} from 'lucide-react';

interface ColonyLogProps {
  logs: ColonyEventLog[];
  stats: ColonyStats;
  onOpenTradeRocket?: () => void;
}

export const ColonyLog: React.FC<ColonyLogProps> = ({
  logs,
  stats,
  onOpenTradeRocket,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'crew'>('telemetry');

  // Check critical thresholds
  const isO2Critical = stats.oxygen < 80;
  const isO2Severe = stats.oxygen < 35;
  const isWaterCritical = stats.water < 70;
  const isWaterSevere = stats.water < 30;
  const isFoodCritical = stats.food < 60;
  const isFoodSevere = stats.food < 25;
  const isPowerBlackout = stats.powerNet < 0 && stats.powerStored <= 0;
  const isMoraleCritical = stats.morale < 40;
  const isMoraleStrained = stats.morale < 65;

  const colonistHealth = stats.colonistHealth ?? 95;
  const isHealthCritical = colonistHealth < 40;
  const isHealthStrained = colonistHealth < 70;

  const hasAnyCriticalVital =
    isO2Critical ||
    isWaterCritical ||
    isFoodCritical ||
    isPowerBlackout ||
    isMoraleCritical ||
    isHealthCritical;

  // Morale tier label & color
  let moraleLabel = 'OPTIMAL';
  let moraleColor = 'text-emerald-400';
  let moraleBg = 'bg-emerald-950/60 border-emerald-700/60';
  let moraleQuote = 'Life support systems are stable. Crew is thriving and productive.';

  if (stats.morale < 35) {
    moraleLabel = 'CRITICAL RISK';
    moraleColor = 'text-red-400';
    moraleBg = 'bg-red-950/80 border-red-500 animate-pulse';
    moraleQuote = 'Life support failure imminent! Crew is in severe distress and near revolt.';
  } else if (stats.morale < 60) {
    moraleLabel = 'STRAINED';
    moraleColor = 'text-amber-400';
    moraleBg = 'bg-amber-950/60 border-amber-600/70';
    moraleQuote = 'Ration shortages or low reserves detected. Crew anxiety is rising.';
  } else if (stats.morale < 80) {
    moraleLabel = 'CONTENT';
    moraleColor = 'text-cyan-400';
    moraleBg = 'bg-cyan-950/50 border-cyan-700/60';
    moraleQuote = 'Basic amenities secured. Standard colony operations proceeding.';
  }

  // Colonist Health tier label & color
  let healthLabel = 'OPTIMAL VIGOR';
  let healthColor = 'text-emerald-400';
  let healthBg = 'bg-emerald-950/60 border-emerald-700/60';
  let healthQuote = 'Crew physiological vitals nominal. Cellular regeneration balanced.';

  if (colonistHealth < 40) {
    healthLabel = 'CRITICAL SICKNESS';
    healthColor = 'text-red-400';
    healthBg = 'bg-red-950/80 border-red-500 animate-pulse';
    healthQuote = 'Severe radiation sickness & physical collapse! Deploy Medical Bay immediately.';
  } else if (colonistHealth < 70) {
    healthLabel = 'STRAINED';
    healthColor = 'text-amber-400';
    healthBg = 'bg-amber-950/60 border-amber-600/70';
    healthQuote = 'Cellular fatigue and radiation exposure detected. Medical care recommended.';
  } else if (colonistHealth < 85) {
    healthLabel = 'STABLE';
    healthColor = 'text-cyan-400';
    healthBg = 'bg-cyan-950/50 border-cyan-700/60';
    healthQuote = 'Standard physical stamina maintained. Normal baseline vitals.';
  }

  // Latest log message for preview banner
  const latestLog = logs[logs.length - 1];

  return (
    <div className="absolute top-24 left-4 z-20 w-80 sm:w-96 select-none font-sans">
      {/* Collapsed Alert / Status Banner */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`cursor-pointer backdrop-blur-md border p-2.5 rounded-lg shadow-xl flex items-center justify-between gap-2 text-xs transition-all ${
          hasAnyCriticalVital
            ? 'bg-red-950/90 border-red-500/80 text-red-200 glow-orange'
            : 'bg-stone-950/90 border-stone-800 hover:border-orange-700/60 text-stone-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {hasAnyCriticalVital ? (
            <div className="p-1 rounded bg-red-900 border border-red-700 text-white animate-bounce flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="p-1 rounded bg-stone-900 border border-stone-800 text-orange-400 flex-shrink-0">
              <Radio className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex flex-col overflow-hidden">
            {hasAnyCriticalVital ? (
              <span className="font-title font-bold text-xs text-red-300 tracking-wide truncate">
                ⚠️ CREW MORALE: {Math.round(stats.morale)}% ({isO2Critical ? 'O2 LOW' : isWaterCritical ? 'H2O LOW' : isFoodCritical ? 'FOOD LOW' : 'BLACKOUT'})
              </span>
            ) : (
              <span className="font-mono text-[11px] text-stone-300 truncate">
                {latestLog ? latestLog.message : 'Telemetry operational.'}
              </span>
            )}
            <span className="text-[10px] text-stone-400 font-mono">
              Crew: {stats.population}/{stats.maxPopulation} • Morale: {Math.round(stats.morale)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-900/80 border border-stone-800 text-stone-400">
            {isExpanded ? 'CLOSE' : 'OPEN'}
          </span>
          <button className="text-stone-400 hover:text-white p-0.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Tab Drawer */}
      {isExpanded && (
        <div className="mt-1.5 bg-stone-950/95 backdrop-blur-md border border-stone-800 p-3.5 rounded-lg shadow-2xl flex flex-col gap-3 max-h-96 overflow-y-auto">
          {/* Header Tab Switcher */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-2.5 py-1 rounded text-xs font-title font-semibold tracking-wider transition-colors ${
                  activeTab === 'telemetry'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                TELEMETRY LOGS ({logs.length})
              </button>
              <button
                onClick={() => setActiveTab('crew')}
                className={`px-2.5 py-1 rounded text-xs font-title font-semibold tracking-wider flex items-center gap-1.5 transition-colors ${
                  activeTab === 'crew'
                    ? 'bg-fuchsia-700 text-white shadow-sm'
                    : hasAnyCriticalVital
                    ? 'text-red-400 hover:bg-red-950/40 border border-red-800/60 animate-pulse'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>CREW & HEALTH</span>
              </button>
            </div>
          </div>

          {/* TAB 1: POPULATION & HEALTH STATUS DISPLAY */}
          {activeTab === 'crew' ? (
            <div className="flex flex-col gap-3 text-xs">
              {/* Colonist Health & Vitality Banner */}
              <div className={`p-3 rounded-lg border ${healthBg} flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-title font-bold">
                    <HeartPulse
                      className={`w-4 h-4 ${
                        isHealthCritical ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                      }`}
                    />
                    <span className="text-stone-200">COLONIST HEALTH & RECOVERY</span>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${healthColor} bg-black/40`}
                  >
                    {healthLabel} ({Math.round(colonistHealth)}%)
                  </span>
                </div>

                {/* Health Bar */}
                <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      colonistHealth < 40
                        ? 'bg-red-500'
                        : colonistHealth < 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, colonistHealth))}%` }}
                  />
                </div>

                <p className="text-[11px] text-stone-300 italic leading-snug">
                  "{healthQuote}"
                </p>

                {/* Real-time Health Diagnostics & Medical Bay Status */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] pt-1 border-t border-stone-800/80">
                  <div className="flex items-center justify-between bg-black/30 p-1.5 rounded">
                    <span className="text-stone-400">Vitality Drift:</span>
                    <span
                      className={`font-bold ${
                        stats.healthRecoveryRate >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {stats.healthRecoveryRate >= 0 ? '+' : ''}
                      {stats.healthRecoveryRate?.toFixed(2) ?? '0.00'}%/s
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-black/30 p-1.5 rounded">
                    <span className="text-stone-400">Absorbed Rads:</span>
                    <span
                      className={`font-bold ${
                        stats.effectiveRadiationDose > 2.0
                          ? 'text-red-400'
                          : stats.effectiveRadiationDose > 1.0
                          ? 'text-amber-400'
                          : 'text-stone-300'
                      }`}
                    >
                      {stats.effectiveRadiationDose?.toFixed(2) ?? '0.65'} mSv/h
                    </span>
                  </div>
                </div>

                {/* Medical Bay Active Intervention Badge */}
                <div
                  className={`p-2 rounded border text-[11px] font-mono flex items-center justify-between ${
                    (stats.medicalBayCount || 0) > 0
                      ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                      : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Activity
                      className={`w-3.5 h-3.5 ${
                        (stats.medicalBayCount || 0) > 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    />
                    <span>
                      {(stats.medicalBayCount || 0) > 0
                        ? `Medical Bay: ${stats.medicalBayCount} Online (+${(
                            (stats.medicalBayCount || 0) * 1.2
                          ).toFixed(1)}%/s Recovery)`
                        : 'No Active Medical Bay (Full Degradation Risk)'}
                    </span>
                  </div>
                  <span className="font-bold text-[10px]">
                    {(stats.medicalBayCount || 0) > 0 ? 'DECONTAMINATED' : 'UNSHIELDED'}
                  </span>
                </div>
              </div>
              {/* Morale Level Banner */}
              <div className={`p-3 rounded-lg border ${moraleBg} flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-title font-bold">
                    <Heart className="w-4 h-4 text-red-400 fill-red-400/40" />
                    <span className="text-stone-200">COLONY MORALE</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${moraleColor} bg-black/40`}>
                    {moraleLabel} ({Math.round(stats.morale)}%)
                  </span>
                </div>

                {/* Morale Bar */}
                <div className="w-full bg-stone-900 rounded-full h-2 overflow-hidden border border-stone-800">
                  <div
                    className={`h-full transition-all duration-500 ${
                      stats.morale < 40
                        ? 'bg-red-500'
                        : stats.morale < 65
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, stats.morale))}%` }}
                  />
                </div>

                <p className="text-[11px] text-stone-300 italic leading-snug">
                  "{moraleQuote}"
                </p>
              </div>

              {/* Population Capacity & Vital Metrics Grid */}
              <div className="bg-stone-900/80 p-3 rounded-lg border border-stone-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Active Colonists:
                  </span>
                  <span className="text-purple-300 font-bold">
                    {stats.population} / {stats.maxPopulation} Habitat Cap
                  </span>
                </div>

                {/* Vitals Breakdown */}
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1 border-t border-stone-800">
                  {/* Oxygen Vital */}
                  <div
                    className={`p-2 rounded border flex flex-col justify-between ${
                      isO2Severe
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : isO2Critical
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-stone-950/60 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3 text-cyan-400" /> O2
                      </span>
                      <span className={isO2Critical ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {isO2Critical ? 'LOW' : 'OK'}
                      </span>
                    </div>
                    <div className="font-bold mt-1 text-cyan-300">
                      {Math.round(stats.oxygen)}m³
                    </div>
                  </div>

                  {/* Water Vital */}
                  <div
                    className={`p-2 rounded border flex flex-col justify-between ${
                      isWaterSevere
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : isWaterCritical
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-stone-950/60 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" /> H2O
                      </span>
                      <span className={isWaterCritical ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {isWaterCritical ? 'LOW' : 'OK'}
                      </span>
                    </div>
                    <div className="font-bold mt-1 text-blue-300">
                      {Math.round(stats.water)}L
                    </div>
                  </div>

                  {/* Food Vital */}
                  <div
                    className={`p-2 rounded border flex flex-col justify-between ${
                      isFoodSevere
                        ? 'bg-red-950/80 border-red-500 text-red-200'
                        : isFoodCritical
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-stone-950/60 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1">
                        <Utensils className="w-3 h-3 text-emerald-400" /> FOOD
                      </span>
                      <span className={isFoodCritical ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {isFoodCritical ? 'LOW' : 'OK'}
                      </span>
                    </div>
                    <div className="font-bold mt-1 text-emerald-300">
                      {Math.round(stats.food)}
                    </div>
                  </div>
                </div>

                {/* Blackout warning if power is dead */}
                {isPowerBlackout && (
                  <div className="p-2 rounded bg-red-950/90 border border-red-500 text-red-200 text-[11px] font-mono flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 animate-pulse" />
                    <span>GRID FAILURE: Batteries drained! Life support scrubbing halted.</span>
                  </div>
                )}
              </div>

              {/* Action buttons if vitals are strained */}
              {hasAnyCriticalVital && onOpenTradeRocket && (
                <button
                  onClick={onOpenTradeRocket}
                  className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded font-title font-bold text-xs tracking-wide shadow-md active:scale-95 transition-transform"
                >
                  CALL EARTH EMERGENCY SHUTTLE (RATIONS / WATER)
                </button>
              )}
            </div>
          ) : (
            /* TAB 2: TELEMETRY LOGS FEED */
            <div className="flex flex-col gap-1.5 font-mono text-[11px]">
              {logs
                .slice(-15)
                .reverse()
                .map((log) => {
                  let tagColor = 'text-stone-400';
                  let icon = <Radio className="w-3 h-3 text-stone-500 flex-shrink-0" />;

                  const isUrgency = log.type === 'urgency' || Boolean(log.urgency);
                  if (isUrgency) {
                    tagColor = 'text-red-200 font-bold';
                    icon = <AlertOctagon className="w-3.5 h-3.5 text-red-400 animate-pulse flex-shrink-0" />;
                  } else if (log.type === 'spice') {
                    tagColor = 'text-fuchsia-300 font-bold';
                    icon = <Zap className="w-3 h-3 text-fuchsia-400 flex-shrink-0" />;
                  } else if (log.type === 'danger') {
                    tagColor = 'text-red-400 font-bold';
                    icon = <AlertOctagon className="w-3 h-3 text-red-400 flex-shrink-0" />;
                  } else if (log.type === 'warning') {
                    tagColor = 'text-amber-300';
                    icon = <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />;
                  } else if (log.type === 'success') {
                    tagColor = 'text-emerald-300 font-semibold';
                    icon = <Smile className="w-3 h-3 text-emerald-400 flex-shrink-0" />;
                  }

                  return (
                    <div
                      key={log.id}
                      className={`flex gap-2 items-start leading-tight p-2 rounded border transition-all ${
                        isUrgency
                          ? 'bg-red-950/70 border-red-500/90 shadow-md animate-critical-pulse'
                          : 'bg-stone-900/40 border-stone-850 hover:border-stone-750'
                      }`}
                    >
                      {icon}
                      <span className="text-stone-500 text-[10px] whitespace-nowrap mt-0.5">
                        [{log.timeStr}]
                      </span>
                      <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isUrgency && (
                            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-extrabold uppercase bg-red-600 text-white border border-red-300 shadow-sm animate-pulse tracking-wider">
                              URGENCY: {log.urgency || 'CRITICAL'}
                            </span>
                          )}
                          {log.title && (
                            <span className="font-title font-bold text-[11px] text-stone-200">
                              {log.title}
                            </span>
                          )}
                        </div>
                        <span className={tagColor}>{log.message}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
