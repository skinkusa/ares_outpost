import React from 'react';
import {
  ColonyStats,
  WeatherCondition,
} from '../types/colony';
import {
  Activity,
  AlertTriangle,
  Atom,
  Battery,
  BatteryCharging,
  BookOpen,
  CloudSun,
  Coins,
  Droplets,
  Flame,
  HeartPulse,
  HelpCircle,
  Image as ImageIcon,
  Pause,
  Play,
  Rocket,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';

interface TopBarProps {
  stats: ColonyStats;
  weather: WeatherCondition;
  gameSpeed: number;
  isMuted: boolean;
  onSetGameSpeed: (speed: number) => void;
  onToggleMute: () => void;
  onOpenTechTree: () => void;
  onOpenTradeRocket: () => void;
  onOpenTutorial: () => void;
  onOpenCustomAssets: () => void;
  onOpenResourceMonitor: (filter?: 'all' | 'power' | 'water' | 'oxygen') => void;
  onCycleWeather?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  stats,
  weather,
  gameSpeed,
  isMuted,
  onSetGameSpeed,
  onToggleMute,
  onOpenTechTree,
  onOpenTradeRocket,
  onOpenTutorial,
  onOpenCustomAssets,
  onOpenResourceMonitor,
  onCycleWeather,
}) => {
  // Sol time string formatted e.g. "14:20"
  const hours = Math.floor(stats.timeOfDay * 24);
  const minutes = Math.floor((stats.timeOfDay * 24 * 60) % 60);
  const timeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const isNight = stats.timeOfDay > 0.5;

  // Critical Threshold Checks for UI Attention Animations
  const isO2Critical = stats.oxygen < 80;
  const isO2Severe = stats.oxygen < 35;
  const isWaterCritical = stats.water < 70;
  const isWaterSevere = stats.water < 30;
  const isFoodCritical = stats.food < 60;
  const isFoodSevere = stats.food < 25;
  const isPowerBlackout = stats.powerNet < 0 && stats.powerStored <= 0;

  return (
    <header className="absolute top-0 left-0 right-0 z-30 bg-stone-950/90 backdrop-blur-md border-b border-orange-950/60 px-4 py-2 text-stone-100 flex flex-col gap-2 select-none shadow-xl">
      {/* Upper row: Colony Identity, Sol Clock, Weather Alert, Game Speed & Modals */}
      <div className="flex items-center justify-between gap-4">
        {/* Colony Brand & Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-900/60 to-red-950/40 border border-orange-700/50 px-3 py-1 rounded-md">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="font-title font-bold text-sm tracking-wider text-orange-200">
              ARES OUTPOST
            </span>
          </div>

          <div className="flex items-center gap-2 bg-stone-900/80 border border-stone-800 px-3 py-1 rounded-md font-mono text-xs">
            <span className="text-stone-400">SOL {stats.sol}</span>
            <span className="text-orange-400 font-semibold">{timeFormatted}</span>
            {isNight ? (
              <span className="text-indigo-400 text-[10px] flex items-center gap-1">
                <CloudSun className="w-3 h-3 inline" /> NIGHT
              </span>
            ) : (
              <span className="text-amber-400 text-[10px] flex items-center gap-1">
                <Sun className="w-3 h-3 inline" /> DAY
              </span>
            )}
          </div>

          {/* Dynamic Weather Banner */}
          <button
            onClick={onCycleWeather}
            title="Click to cycle Martian weather conditions (Clear, Dust Veil, Severe Dust Storm, Seismic Tremor, Solar Flare)"
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98] ${
              weather.type === 'dust_storm'
                ? 'bg-red-950/80 border-red-500 text-red-200 animate-pulse hover:bg-red-900'
                : weather.type === 'seismic_tremor'
                ? 'bg-purple-950/80 border-purple-500 text-purple-200 hover:bg-purple-900'
                : weather.type === 'solar_flare'
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 hover:bg-cyan-900'
                : weather.type === 'dust_veil'
                ? 'bg-amber-950/80 border-amber-500 text-amber-200 hover:bg-amber-900'
                : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {weather.type === 'dust_storm' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            ) : weather.type === 'seismic_tremor' ? (
              <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            ) : weather.type === 'solar_flare' ? (
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Wind className="w-3.5 h-3.5 text-orange-400" />
            )}
            <span>{weather.name.toUpperCase()}</span>
            <span className="font-mono text-[10px] text-stone-400">
              ({Math.round(weather.duration)}s)
            </span>
            <span className="text-[10px] text-stone-500 hover:text-stone-300">⇄</span>
          </button>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2">
          {/* Tech Research Button */}
          <button
            onClick={onOpenTechTree}
            className="flex items-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-3 py-1 rounded-md text-xs text-indigo-200 transition-colors shadow-sm"
          >
            <Atom className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-title font-semibold tracking-wide">RESEARCH</span>
            <span className="font-mono text-[10px] bg-indigo-800/80 px-1.5 py-0.2 rounded text-indigo-100">
              {Math.floor(stats.techPoints)} TP
            </span>
          </button>

          {/* Resource Telemetry Monitor */}
          <button
            onClick={() => onOpenResourceMonitor('all')}
            className="flex items-center gap-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700/60 px-3 py-1 rounded-md text-xs text-cyan-200 transition-colors shadow-sm"
            title="Open Historical 50-Minute Resource Consumption Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-title font-semibold tracking-wide">MONITOR</span>
          </button>

          {/* Trade Rocket / Earth Shuttle */}
          <button
            onClick={onOpenTradeRocket}
            className="flex items-center gap-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 px-3 py-1 rounded-md text-xs text-amber-200 transition-colors shadow-sm"
          >
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-title font-semibold tracking-wide">EARTH SHUTTLE</span>
          </button>

          {/* Mission Briefing / Tutorial */}
          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-md text-xs text-stone-300 transition-colors"
            title="Commander Briefing & Goals"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">GUIDE</span>
          </button>

          {/* Custom Graphics / Sprites Manager */}
          <button
            onClick={onOpenCustomAssets}
            className="flex items-center gap-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 px-2.5 py-1 rounded-md text-xs text-stone-300 transition-colors"
            title="Manage Custom Building PNG Sprites & Textures"
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">SPRITES</span>
          </button>

          {/* Audio Synthesizer Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              isMuted
                ? 'bg-stone-900 border-stone-800 text-stone-500'
                : 'bg-stone-900 border-orange-700/70 text-orange-400'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Speed Controls */}
          <div className="flex items-center bg-stone-900/90 border border-stone-800 rounded-md p-0.5">
            <button
              onClick={() => onSetGameSpeed(0)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                gameSpeed === 0 ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
              title="Pause"
            >
              <Pause className="w-3 h-3" />
            </button>
            <button
              onClick={() => onSetGameSpeed(1)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                gameSpeed === 1 ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
              title="Normal Speed (1x)"
            >
              1x
            </button>
            <button
              onClick={() => onSetGameSpeed(2)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                gameSpeed === 2 ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
              title="Fast Speed (2x)"
            >
              2x
            </button>
            <button
              onClick={() => onSetGameSpeed(4)}
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                gameSpeed === 4 ? 'bg-orange-600 text-white' : 'text-stone-400 hover:text-white'
              }`}
              title="Hyper Speed (4x)"
            >
              4x
            </button>
          </div>
        </div>
      </div>

      {/* Lower Row: Tactical Resource Dash */}
      <div className="flex flex-wrap justify-center sm:justify-between gap-1.5 font-mono text-xs w-full">
        {/* Power Grid */}
        <div
          onClick={() => onOpenResourceMonitor('power')}
          className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded transition-all cursor-pointer hover:border-yellow-500/70 hover:bg-stone-900 ${
            isPowerBlackout
              ? 'border-red-500 bg-red-950/70 text-red-200 animate-critical-pulse'
              : 'bg-stone-900/90 border-stone-800 text-stone-200'
          }`}
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-yellow-400 mb-1">Power Grid</div>
            <div className="flex justify-between"><span>Generation:</span> <span>{Math.round(stats.currentPowerProd)} kW</span></div>
            <div className="flex justify-between"><span>Consumption:</span> <span>{Math.round(stats.currentPowerCons)} kW</span></div>
            <div className="flex justify-between border-t border-stone-700 mt-1 pt-1"><span>Battery:</span> <span>{Math.round(stats.powerStored)}/{stats.powerCapacity} kW</span></div>
            <p className="mt-2 text-stone-400 text-[10px]">Produced by Solar Arrays & RTGs.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans">
              <Zap className="w-3 h-3 text-yellow-400" /> POWER
            </span>
            <span
              className={
                stats.powerNet >= 0
                  ? 'text-green-400 font-bold'
                  : 'text-red-400 font-bold'
              }
            >
              {stats.powerNet >= 0 ? `+${Math.round(stats.powerNet)}` : Math.round(stats.powerNet)}kW
            </span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className="text-yellow-300">{Math.round(stats.powerStored)}</span>
            <span className="text-stone-500 text-[10px]">/{stats.powerCapacity}kW</span>
          </div>
        </div>

        {/* Oxygen (with subtle shake & pulse animation when critical) */}
        <div
          onClick={() => onOpenResourceMonitor('oxygen')}
          className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded transition-all cursor-pointer hover:border-cyan-500/70 hover:bg-stone-900 ${
            isO2Critical
              ? 'border-red-500 bg-red-950/80 text-red-200 animate-critical-vitals'
              : 'bg-stone-900/90 border-stone-800 text-stone-200'
          }`}
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-cyan-400 mb-1">Oxygen Atmosphere</div>
            <div className="flex justify-between"><span>Current:</span> <span>{Math.round(stats.oxygen)}/{stats.maxOxygen} m³</span></div>
            <div className="flex justify-between"><span>Delta:</span> <span>{stats.currentO2Delta >= 0 ? '+' : ''}{Math.round(stats.currentO2Delta)}/s</span></div>
            {isO2Critical && <div className="border-t border-stone-700 mt-1 pt-1 text-red-400 font-bold">CRITICAL RESERVE ALERT</div>}
            <p className="mt-2 text-stone-400 text-[10px]">Produced by Scrubbers & Bio-Domes. Consumed by Habitats.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans font-bold">
              {isO2Critical ? (
                <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />
              ) : (
                <Wind className="w-3 h-3 text-cyan-400" />
              )}
              <span className={isO2Critical ? 'text-red-300' : ''}>OXYGEN</span>
            </span>
            <span
              className={
                isO2Critical
                  ? 'text-red-400 font-extrabold animate-pulse'
                  : stats.currentO2Delta >= 0
                  ? 'text-green-400 font-bold'
                  : 'text-red-400 font-bold'
              }
            >
              {isO2Critical ? 'CRITICAL' : stats.currentO2Delta >= 0 ? `+${Math.round(stats.currentO2Delta)}` : Math.round(stats.currentO2Delta)}
            </span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className={isO2Critical ? 'text-red-200 text-sm' : 'text-cyan-300'}>
              {Math.round(stats.oxygen)}
            </span>
            <span className="text-stone-500 text-[10px]">/{stats.maxOxygen}m³</span>
          </div>
        </div>

        {/* Water (with subtle shake & pulse animation when critical) */}
        <div
          onClick={() => onOpenResourceMonitor('water')}
          className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded transition-all cursor-pointer hover:border-blue-500/70 hover:bg-stone-900 ${
            isWaterCritical
              ? 'border-red-500 bg-red-950/80 text-red-200 animate-critical-vitals'
              : 'bg-stone-900/90 border-stone-800 text-stone-200'
          }`}
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-blue-400 mb-1">Water Reserves</div>
            <div className="flex justify-between"><span>Current:</span> <span>{Math.round(stats.water)}/{stats.maxWater} L</span></div>
            <div className="flex justify-between"><span>Delta:</span> <span>{stats.currentWaterDelta >= 0 ? '+' : ''}{Math.round(stats.currentWaterDelta)}/s</span></div>
            {isWaterCritical && <div className="border-t border-stone-700 mt-1 pt-1 text-red-400 font-bold">CRITICAL DEHYDRATION ALERT</div>}
            <p className="mt-2 text-stone-400 text-[10px]">Extracted by Moisture Vaporators. Consumed by Habitats & Bio-Domes.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans font-bold">
              {isWaterCritical ? (
                <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />
              ) : (
                <Droplets className="w-3 h-3 text-blue-400" />
              )}
              <span className={isWaterCritical ? 'text-red-300' : ''}>WATER</span>
            </span>
            <span
              className={
                isWaterCritical
                  ? 'text-red-400 font-extrabold animate-pulse'
                  : stats.currentWaterDelta >= 0
                  ? 'text-green-400 font-bold'
                  : 'text-red-400 font-bold'
              }
            >
              {isWaterCritical ? 'CRITICAL' : stats.currentWaterDelta >= 0 ? `+${Math.round(stats.currentWaterDelta)}` : Math.round(stats.currentWaterDelta)}
            </span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className={isWaterCritical ? 'text-red-200 text-sm' : 'text-blue-300'}>
              {Math.round(stats.water)}
            </span>
            <span className="text-stone-500 text-[10px]">/{stats.maxWater}L</span>
          </div>
        </div>

        {/* Food (with subtle shake & pulse animation when critical) */}
        <div
          onClick={() => onOpenResourceMonitor('all')}
          className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded transition-all cursor-pointer hover:border-emerald-500/70 hover:bg-stone-900 ${
            isFoodCritical
              ? 'border-red-500 bg-red-950/80 text-red-200 animate-critical-vitals'
              : 'bg-stone-900/90 border-stone-800 text-stone-200'
          }`}
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-emerald-400 mb-1">Food Reserves</div>
            <div className="flex justify-between"><span>Current:</span> <span>{Math.round(stats.food)}/{stats.maxFood}</span></div>
            <div className="flex justify-between"><span>Delta:</span> <span>{stats.currentFoodDelta >= 0 ? '+' : ''}{Math.round(stats.currentFoodDelta)}/s</span></div>
            {isFoodCritical && <div className="border-t border-stone-700 mt-1 pt-1 text-red-400 font-bold">CRITICAL MALNUTRITION ALERT</div>}
            <p className="mt-2 text-stone-400 text-[10px]">Grown in Hydroponic Bio-Domes. Consumed by Habitats.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans font-bold">
              {isFoodCritical ? (
                <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />
              ) : (
                <Flame className="w-3 h-3 text-emerald-400" />
              )}
              <span className={isFoodCritical ? 'text-red-300' : ''}>FOOD</span>
            </span>
            <span
              className={
                isFoodCritical
                  ? 'text-red-400 font-extrabold animate-pulse'
                  : stats.currentFoodDelta >= 0
                  ? 'text-green-400 font-bold'
                  : 'text-red-400 font-bold'
              }
            >
              {isFoodCritical ? 'CRITICAL' : stats.currentFoodDelta >= 0 ? `+${Math.round(stats.currentFoodDelta)}` : Math.round(stats.currentFoodDelta)}
            </span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className={isFoodCritical ? 'text-red-200 text-sm' : 'text-emerald-300'}>
              {Math.round(stats.food)}
            </span>
            <span className="text-stone-500 text-[10px]">/{stats.maxFood}</span>
          </div>
        </div>


        {/* Colonists / Pop */}
        <div
          onClick={() => onOpenResourceMonitor('all')}
          className="relative group flex-1 min-w-[80px] flex flex-col bg-stone-900/90 border border-stone-800 px-2.5 py-1 rounded cursor-pointer hover:border-purple-500/70 hover:bg-stone-900 transition-colors"
          title={`Colonists: ${stats.population}/${stats.maxPopulation} | Morale: ${Math.round(stats.morale)}%\n(Import new Specialist Crew via the Earth Trade Shuttle)`}
        >
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans">
              <Users className="w-3 h-3 text-purple-400" /> CREW
            </span>
            <span className="text-purple-300 font-bold">{Math.round(stats.morale)}% MRL</span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className="text-purple-200">{stats.population}</span>
            <span className="text-stone-500 text-[10px]">/{stats.maxPopulation} CAP</span>
          </div>
        </div>

        {/* Colonist Health & Radiation Exposure */}
        {(() => {
          const health = stats.colonistHealth ?? 95;
          const rad = stats.effectiveRadiationDose ?? 0.65;
          const isCrit = health < 40;
          const isStrained = health < 70;
          return (
            <div
              onClick={() => onOpenResourceMonitor('all')}
              className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded cursor-pointer hover:border-emerald-500/70 hover:bg-stone-900 transition-colors ${
                isCrit
                  ? 'bg-red-950/90 border-red-500 shadow-md animate-pulse'
                  : isStrained
                  ? 'bg-amber-950/70 border-amber-600/80'
                  : 'bg-stone-900/90 border-stone-800'
              }`}
              title={`Colonist Health: ${Math.round(health)}% | Vitality Drift: ${stats.healthRecoveryRate >= 0 ? '+' : ''}${stats.healthRecoveryRate?.toFixed(2) ?? '0.00'}%/s | Radiation Dose: ${rad.toFixed(1)} mSv/h (Env: ${(stats.radiationLevel ?? 1.3).toFixed(1)} mSv/h) | Medical Bays: ${stats.medicalBayCount || 0} online`}
            >
              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span className="flex items-center gap-1 font-sans font-bold">
                  <HeartPulse
                    className={`w-3 h-3 ${
                      isCrit
                        ? 'text-red-400 animate-bounce'
                        : isStrained
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  />
                  <span className={isCrit ? 'text-red-300' : 'text-stone-300'}>HEALTH</span>
                </span>
                <span
                  className={`font-mono text-[9px] font-bold ${
                    isCrit
                      ? 'text-red-400'
                      : isStrained
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {isCrit ? 'CRIT' : isStrained ? 'STRAINED' : 'OPTIMAL'}
                </span>
              </div>
              <div className="flex items-center justify-between font-bold mt-0.5">
                <span
                  className={
                    isCrit
                      ? 'text-red-300'
                      : isStrained
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }
                >
                  {Math.round(health)}%
                </span>
                <span
                  className={`text-[9px] font-mono ${
                    rad > 2.5
                      ? 'text-red-400 font-bold'
                      : rad > 1.1
                      ? 'text-amber-400'
                      : 'text-stone-400'
                  }`}
                >
                  {rad.toFixed(1)} rad
                </span>
              </div>
            </div>
          );
        })()}

        {/* Construction Alloy */}
        <div
          onClick={() => onOpenResourceMonitor('all')}
          className="relative group flex-1 min-w-[80px] flex flex-col bg-stone-900/90 border border-stone-800 px-2.5 py-1 rounded cursor-pointer hover:border-orange-500/70 hover:bg-stone-900 transition-colors"
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-orange-400 mb-1">Structural Alloy</div>
            <p>Structural Alloy for building modules and heavy harvesters.</p>
            <p className="mt-2 text-stone-400 text-[10px]">Produced by Ore Smelter Refineries from Ore.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans">
              <Battery className="w-3 h-3 text-orange-400" /> ALLOY
            </span>
            <span className="text-orange-400 font-semibold">MT</span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className="text-orange-300">{Math.round(stats.alloy)}</span>
            <span className="text-stone-500 text-[10px]">UNITS</span>
          </div>
        </div>

        {/* Raw Iron Ore */}
        <div
          onClick={() => onOpenResourceMonitor('all')}
          className="relative group flex-1 min-w-[80px] flex flex-col bg-stone-900/90 border border-stone-800 px-2.5 py-1 rounded cursor-pointer hover:border-amber-500/70 hover:bg-stone-900 transition-colors"
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-amber-900 mb-1">Raw Iron Ore</div>
            <p>Raw iron ore extracted from the Martian crust.</p>
            <p className="mt-2 text-stone-400 text-[10px]">Mined by Ore Extraction Miners.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans">
              <Atom className="w-3 h-3 text-amber-900" /> ORE
            </span>
            <span className="text-amber-900 font-semibold">RAW</span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className="text-amber-800">{Math.round(stats.ore)}</span>
            <span className="text-stone-500 text-[10px]">UNITS</span>
          </div>
        </div>

        {/* SPICE (Key Feature!) */}
        <div
          className="relative group flex flex-col bg-gradient-to-r from-purple-950/80 to-fuchsia-950/60 border border-fuchsia-600/70 px-2.5 py-1 rounded shadow-lg glow-purple"
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-fuchsia-400 mb-1">Martian Spice</div>
            <div className="flex justify-between"><span>Current:</span> <span>{Math.round(stats.spice)}/{stats.spiceCapacity} kg</span></div>
            <p className="mt-1 text-stone-400">Refine or trade for credits.</p>
            <p className="mt-2 text-stone-400 text-[10px]">Mined by Harvesters. Stored in Refineries.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-fuchsia-300">
            <span className="flex items-center gap-1 font-sans font-bold">
              <Zap className="w-3 h-3 text-fuchsia-400" /> SPICE
            </span>
            <span className="text-fuchsia-400 font-bold animate-pulse">SPICE</span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className="text-fuchsia-200 text-sm">{Math.round(stats.spice)}</span>
            <span className="text-fuchsia-400/80 text-[10px]">/{stats.spiceCapacity}kg</span>
          </div>
        </div>

        {/* Galactic Credits */}
        <div
          className="relative group flex flex-col bg-stone-900/90 border border-stone-800 px-2.5 py-1 rounded"
        >
          {/* Custom Tooltip */}
          <div className="absolute top-full left-0 mt-2 p-3 bg-stone-900/95 border border-stone-700 text-stone-200 text-xs rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none w-64">
            <div className="font-bold text-amber-400 mb-1">Galactic Credits</div>
            <p>Galactic Colony Credits (₡). Earned by selling Spice to Earth or completing milestones.</p>
            <p className="mt-2 text-stone-400 text-[10px]">Earned by trading refined spice.</p>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1 font-sans">
              <Coins className="w-3 h-3 text-amber-400" /> CREDITS
            </span>
            <span className="text-amber-400 font-bold">₡</span>
          </div>
          <div className="flex items-center justify-between font-bold mt-0.5">
            <span className="text-amber-300 text-sm">₡{Math.round(stats.credits)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
