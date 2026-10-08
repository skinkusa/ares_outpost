import React, { useState } from 'react';
import {
  ColonyModule,
  Harvester,
  HarvesterModel,
  HarvesterModelSpec,
} from '../types/colony';
import { HARVESTER_SPECS } from '../utils/constants';
import {
  AlertTriangle,
  Compass,
  Crosshair,
  Gauge,
  Plus,
  RotateCcw,
  Shield,
  Trash2,
  Truck,
  X,
  Zap,
} from 'lucide-react';

interface HarvesterManagerProps {
  isOpen: boolean;
  onClose: () => void;
  harvesters: Harvester[];
  modules: ColonyModule[];
  currentAlloy: number;
  currentCredits: number;
  onDeployHarvester: (model: HarvesterModel) => void;
  onRecallHarvester: (harvesterId: string) => void;
  onScrapHarvester: (harvesterId: string) => void;
  onToggleAutoHarvest: (harvesterId: string) => void;
  onToggleMiningTarget: (harvesterId: string) => void;
  onFocusHarvester: (harvester: Harvester) => void;
}

export const HarvesterManager: React.FC<HarvesterManagerProps> = ({
  isOpen,
  onClose,
  harvesters,
  modules,
  currentAlloy,
  currentCredits,
  onDeployHarvester,
  onRecallHarvester,
  onScrapHarvester,
  onToggleAutoHarvest,
  onToggleMiningTarget,
  onFocusHarvester,
}) => {
  const [selectedDeployModel, setSelectedDeployModel] = useState<HarvesterModel>('heavy');

  if (!isOpen) return null;

  const depots = modules.filter((m) => m.type === 'depot');
  const oreRefineries = modules.filter((m) => m.type === 'refinery');
  const commandOutposts = modules.filter((m) => m.type === 'command');
  const hasBase = depots.length > 0 || commandOutposts.length > 0;
  const hasRefinery = oreRefineries.length > 0;
  const isOre = selectedDeployModel === 'ore_rover';
  const hasRequiredBase = isOre ? hasRefinery : hasBase;

  const currentSpec = HARVESTER_SPECS[selectedDeployModel];
  const canAffordDeploy =
    currentAlloy >= currentSpec.costAlloy && currentCredits >= currentSpec.costCredits;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-4xl bg-stone-950 border border-fuchsia-700/60 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-purple-950/70 border-b border-fuchsia-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fuchsia-950 border border-fuchsia-600/60">
              <Truck className="w-6 h-6 text-fuchsia-400" />
            </div>
            <div>
              <h2 className="font-title text-lg font-bold text-stone-100 tracking-wider">
                AUTONOMOUS ROVER DEPLOYMENT BAY
              </h2>
              <p className="text-xs text-stone-400">
                Deploy and oversee heavy all-terrain rovers harvesting Martian resources
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split into Deploy Panel & Active Fleet Roster */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Harvester Deployment Specs */}
          <div className="md:col-span-5 flex flex-col gap-4 bg-stone-900/60 p-4 rounded-lg border border-stone-800">
            <h3 className="font-title text-sm font-bold text-amber-300 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" /> DEPLOY NEW HARVESTER
            </h3>

            {/* Model Selector Tabs */}
            <div className="grid grid-cols-4 gap-2">
              {(['scout', 'heavy', 'titan', 'ore_rover'] as HarvesterModel[]).map((m) => {
                const spec = HARVESTER_SPECS[m];
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedDeployModel(m)}
                    className={`p-2 rounded border text-center transition-all ${
                      selectedDeployModel === m
                        ? 'border-fuchsia-500 bg-fuchsia-950/60 text-fuchsia-200 shadow-md'
                        : 'border-stone-800 bg-stone-900/90 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="font-title font-bold text-xs uppercase">{m}</div>
                    <div className="text-[10px] text-stone-500 font-mono">{spec.maxCargo}kg cap</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Spec Details */}
            <div className="bg-stone-950/90 border border-stone-800/80 p-3.5 rounded-lg flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-title font-bold text-sm text-stone-200">
                  {currentSpec.name}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-800/60">
                  {currentSpec.harvestRate} kg/s drill
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                {currentSpec.description}
              </p>

              {/* Stat Gauges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between bg-stone-900/70 p-2 rounded">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" /> Max Cargo:
                  </span>
                  <span className="text-fuchsia-300 font-bold">{currentSpec.maxCargo} kg</span>
                </div>
                <div className="flex items-center justify-between bg-stone-900/70 p-2 rounded">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-amber-400" /> Speed:
                  </span>
                  <span className="text-amber-300 font-bold">{currentSpec.speed} m/s</span>
                </div>
                <div className="flex items-center justify-between bg-stone-900/70 p-2 rounded">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-400" /> Harvest:
                  </span>
                  <span className="text-purple-300 font-bold">{currentSpec.harvestRate} kg/s</span>
                </div>
                <div className="flex items-center justify-between bg-stone-900/70 p-2 rounded">
                  <span className="text-stone-400 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> Hull:
                  </span>
                  <span className="text-emerald-300 font-bold">{currentSpec.maxHealth} HP</span>
                </div>
              </div>

              {/* Cost & Deploy CTA */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                <div className="font-mono text-xs">
                  <span
                    className={
                      currentAlloy >= currentSpec.costAlloy
                        ? 'text-orange-300 font-bold mr-2'
                        : 'text-red-400 font-bold mr-2'
                    }
                  >
                    {currentSpec.costAlloy} Alloy
                  </span>
                  <span
                    className={
                      currentCredits >= currentSpec.costCredits
                        ? 'text-amber-300 font-bold'
                        : 'text-red-400 font-bold'
                    }
                  >
                    ₡{currentSpec.costCredits}
                  </span>
                </div>

                <button
                  onClick={() => onDeployHarvester(selectedDeployModel)}
                  disabled={!canAffordDeploy || !hasRequiredBase}
                  className={`px-4 py-2 rounded-lg font-title font-bold text-xs tracking-wider transition-all shadow-lg ${
                    canAffordDeploy && hasRequiredBase
                      ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white glow-purple active:scale-95'
                      : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {isOre ? 'DEPLOY ROVER' : 'DEPLOY HARVESTER'}
                </button>
              </div>

              {!hasRequiredBase && (
                <div className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5" /> {isOre ? "Requires Ore Refinery" : "Requires Command Outpost or Harvester Depot"}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Fleet Roster & Live Status */}
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-title text-sm font-bold text-fuchsia-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-fuchsia-400" /> ACTIVE FLEET ({harvesters.length})
              </h3>
              <span className="text-xs text-stone-400 font-mono">
                Auto-roam enabled by default
              </span>
            </div>

            {harvesters.length === 0 ? (
              <div className="p-8 border border-dashed border-stone-800 rounded-lg text-center flex flex-col items-center justify-center text-stone-500 gap-2">
                <Truck className="w-8 h-8 text-stone-600" />
                <p className="text-sm">No harvesters currently active on the Martian surface.</p>
                <p className="text-xs text-stone-600">
                  Deploy a Scout, Heavy, or Titan harvester to reap spice melange!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {harvesters.map((h) => {
                  const cargoPercent = Math.min(100, Math.round((h.cargo / h.maxCargo) * 100));

                  let stateBadgeColor = 'bg-stone-800 text-stone-300';
                  let stateLabel = 'IDLE';
                  if (h.state === 'moving_to_spice') {
                    stateBadgeColor = 'bg-blue-950 text-blue-300 border-blue-700/60';
                    stateLabel = 'NAVIGATING TO SPICE';
                  } else if (h.state === 'harvesting') {
                    stateBadgeColor = 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-600/70 animate-pulse';
                    stateLabel = 'MINING SPICE';
                  } else if (h.state === 'returning_to_depot') {
                    stateBadgeColor = 'bg-amber-950 text-amber-300 border-amber-600/60';
                    stateLabel = 'RETURNING (FULL)';
                  } else if (h.state === 'unloading') {
                    stateBadgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-600/60';
                    stateLabel = 'UNLOADING CARGO';
                  }

                  return (
                    <div
                      key={h.id}
                      className="bg-stone-900/80 border border-stone-800 p-3.5 rounded-lg flex flex-col gap-2.5 hover:border-fuchsia-800/60 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-title font-bold text-sm text-stone-100">
                            {h.name}
                          </span>
                          <span className="font-mono text-[10px] uppercase bg-stone-800 text-stone-400 px-1.5 py-0.5 rounded">
                            {h.model}
                          </span>
                        </div>

                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${stateBadgeColor}`}
                        >
                          {stateLabel}
                        </span>
                      </div>

                      {/* Cargo meter bar */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-stone-400">Cargo Tank:</span>
                          <span className="text-fuchsia-300 font-bold">
                            {Math.round(h.cargo)} / {h.maxCargo} kg ({cargoPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-950 rounded-full h-2 overflow-hidden border border-stone-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              cargoPercent >= 90
                                ? 'bg-red-500'
                                : cargoPercent > 50
                                ? 'bg-amber-500'
                                : 'bg-fuchsia-500'
                            }`}
                            style={{ width: `${cargoPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats and Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/80">
                        <div className="text-[11px] font-mono text-stone-400">
                          Total Delivered:{' '}
                          <span className="text-amber-300 font-semibold">
                            {Math.round(h.totalSpiceDelivered)} kg
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleMiningTarget(h.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 font-mono transition-colors border ${
                              h.miningTarget === 'ore'
                                ? 'bg-amber-950 border-amber-700/60 text-amber-400 hover:bg-amber-900'
                                : 'bg-fuchsia-950 border-fuchsia-700/60 text-fuchsia-400 hover:bg-fuchsia-900'
                            }`}
                            title={`Mining: ${h.miningTarget.toUpperCase()}. Click to re-assign target.`}
                          >
                            <span>MINE: {h.miningTarget.toUpperCase()}</span>
                          </button>

                          <button
                            onClick={() => onFocusHarvester(h)}
                            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded text-xs flex items-center gap-1 font-mono transition-colors"
                            title="Center camera on this harvester"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>FOCUS</span>
                          </button>

                          <button
                            onClick={() => onRecallHarvester(h.id)}
                            className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded text-xs flex items-center gap-1 font-mono transition-colors"
                            title="Recall immediately to base depot"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>RECALL</span>
                          </button>

                          <button
                            onClick={() => onScrapHarvester(h.id)}
                            className="p-1 bg-stone-800 hover:bg-red-900/60 text-red-400 rounded text-xs transition-colors"
                            title="Scrap rover and recover alloy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
