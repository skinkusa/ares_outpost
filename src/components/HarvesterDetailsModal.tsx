import React from 'react';
import { Harvester } from '../types/colony';
import { HARVESTER_SPECS } from '../utils/constants';
import {
  Compass,
  Gauge,
  RotateCcw,
  Shield,
  Trash2,
  Truck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface HarvesterDetailsModalProps {
  harvester: Harvester | null;
  onClose: () => void;
  currentAlloy: number;
  onRecall: (id: string) => void;
  onToggleAuto: (id: string) => void;
  onRepair: (id: string) => void;
  onScrap: (id: string) => void;
}

export const HarvesterDetailsModal: React.FC<HarvesterDetailsModalProps> = ({
  harvester,
  onClose,
  currentAlloy,
  onRecall,
  onToggleAuto,
  onRepair,
  onScrap,
}) => {
  if (!harvester) return null;

  const spec = HARVESTER_SPECS[harvester.model];
  const cargoPercent = Math.min(100, Math.round((harvester.cargo / harvester.maxCargo) * 100));
  const isDamaged = harvester.health < harvester.maxHealth;
  const repairCost = 15;

  let stateLabel = 'IDLE';
  let stateColor = 'text-stone-400';
  const oreRun = harvester.miningTarget === 'ore';
  if (harvester.state === 'moving_to_spice') {
    stateLabel = oreRun ? 'NAVIGATING TO ORE' : 'NAVIGATING TO SPICE VEIN';
    stateColor = 'text-blue-400';
  } else if (harvester.state === 'harvesting') {
    stateLabel = oreRun ? 'MINING ORE' : 'MINING RAW SPICE';
    stateColor = oreRun ? 'text-orange-400' : 'text-fuchsia-400';
  } else if (harvester.state === 'returning_to_depot') {
    stateLabel = oreRun ? 'RETURNING ORE TO SMELTER' : 'RETURNING TO BASE (CARGO FULL)';
    stateColor = 'text-amber-400';
  } else if (harvester.state === 'unloading') {
    stateLabel = oreRun ? 'DISCHARGING ORE AT SMELTER' : 'DISCHARGING SPICE AT DEPOT';
    stateColor = 'text-emerald-400';
  }

  return (
    <div className="absolute top-20 left-4 z-40 w-80 bg-stone-950/95 backdrop-blur-md border border-fuchsia-600/60 rounded-xl shadow-2xl p-4 text-stone-100 flex flex-col gap-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-fuchsia-950 border border-fuchsia-700/60">
            <Truck className="w-4 h-4 text-fuchsia-400" />
          </div>
          <div>
            <h3 className="font-title font-bold text-sm text-stone-100 uppercase tracking-wide">
              {harvester.name}
            </h3>
            <p className="text-[10px] text-fuchsia-400 font-mono uppercase">{spec.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live State Banner */}
      <div className="bg-stone-900/90 border border-stone-800 p-2 rounded flex items-center justify-between font-mono text-xs">
        <span className="text-stone-400">Current Task:</span>
        <span className={`font-bold ${stateColor}`}>{stateLabel}</span>
      </div>

      {/* Cargo Gauge */}
      <div className="flex flex-col gap-1.5 font-mono text-xs bg-stone-900/60 p-2.5 rounded border border-stone-800">
        <div className="flex items-center justify-between">
          <span className="text-stone-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-fuchsia-400" /> Spice Cargo Hold:
          </span>
          <span className="text-fuchsia-300 font-bold">
            {Math.round(harvester.cargo)} / {harvester.maxCargo} kg ({cargoPercent}%)
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

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="bg-stone-900/80 p-2 rounded border border-stone-800">
          <div className="text-[10px] text-stone-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-amber-400" /> Treads Speed:
          </div>
          <div className="text-amber-300 font-bold">{spec.speed} m/s</div>
        </div>

        <div className="bg-stone-900/80 p-2 rounded border border-stone-800">
          <div className="text-[10px] text-stone-400 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-cyan-400" /> Drill Extraction:
          </div>
          <div className="text-cyan-300 font-bold">{harvester.harvestRate} kg/s</div>
        </div>

        <div className="bg-stone-900/80 p-2 rounded border border-stone-800 col-span-2">
          <div className="text-[10px] text-stone-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Hull Integrity:
            </span>
            <span className="text-emerald-300 font-bold">
              {Math.round(harvester.health)} / {harvester.maxHealth} HP
            </span>
          </div>
          <div className="w-full bg-stone-950 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${(harvester.health / harvester.maxHealth) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Orders */}
      <div className="flex flex-col gap-2 pt-1 border-t border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRecall(harvester.id)}
            className="flex-1 py-1.5 px-2.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/70 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RETURN TO BASE</span>
          </button>

          <button
            onClick={() => onToggleAuto(harvester.id)}
            className={`flex-1 py-1.5 px-2.5 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              harvester.autoHarvest
                ? 'bg-fuchsia-950 text-fuchsia-200 border border-fuchsia-600/70 hover:bg-fuchsia-900'
                : 'bg-stone-900 text-stone-400 border border-stone-700'
            }`}
          >
            <span>{harvester.autoHarvest ? 'AUTO: ON' : 'MANUAL'}</span>
          </button>
        </div>

        {isDamaged && (
          <button
            onClick={() => onRepair(harvester.id)}
            disabled={currentAlloy < repairCost}
            className={`w-full py-1.5 px-2.5 rounded text-xs font-mono font-semibold flex items-center justify-center gap-1.5 ${
              currentAlloy >= repairCost
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-600/70 hover:bg-emerald-900'
                : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>FIELD REPAIR ({repairCost} ALLOY)</span>
          </button>
        )}

        <button
          onClick={() => onScrap(harvester.id)}
          className="w-full py-1 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded border border-stone-800 flex items-center justify-center gap-1 font-mono transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>DECOMMISSION (RECOVER 50% ALLOY)</span>
        </button>
      </div>
    </div>
  );
};
