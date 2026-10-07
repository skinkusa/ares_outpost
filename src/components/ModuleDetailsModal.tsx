import React from 'react';
import { ColonyModule } from '../types/colony';
import { MODULE_BLUEPRINTS } from '../utils/constants';
import {
  ArrowUpCircle,
  BatteryCharging,
  Power,
  RotateCcw,
  Shield,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface ModuleDetailsModalProps {
  module: ColonyModule | null;
  onClose: () => void;
  currentCredits: number;
  currentAlloy: number;
  onToggleActive: (moduleId: string) => void;
  onUpgradeModule: (moduleId: string) => void;
  onRepairModule: (moduleId: string) => void;
  onDemolishModule: (moduleId: string) => void;
}

export const ModuleDetailsModal: React.FC<ModuleDetailsModalProps> = ({
  module,
  onClose,
  currentCredits,
  currentAlloy,
  onToggleActive,
  onUpgradeModule,
  onRepairModule,
  onDemolishModule,
}) => {
  if (!module) return null;

  const bp = MODULE_BLUEPRINTS[module.type];
  if (!bp) return null;

  // Level multipliers
  const levelMultiplier = 1 + (module.level - 1) * 0.5;
  const upgradeCostAlloy = Math.round(bp.costAlloy * 0.8 * module.level);
  const upgradeCostCredits = Math.round(bp.costCredits * 0.8 * module.level);
  const canAffordUpgrade =
    currentAlloy >= upgradeCostAlloy && currentCredits >= upgradeCostCredits && module.level < 3;

  const repairCostAlloy = Math.round(bp.costAlloy * 0.2);
  const isDamaged = module.health < module.maxHealth;
  const canAffordRepair = currentAlloy >= repairCostAlloy && isDamaged;

  return (
    <div className="absolute top-20 right-4 z-40 w-80 bg-stone-950/95 backdrop-blur-md border border-orange-700/60 rounded-xl shadow-2xl p-4 text-stone-100 flex flex-col gap-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-title font-bold text-sm text-stone-100 uppercase tracking-wide">
              {bp.name}
            </h3>
            <span className="font-mono text-xs px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700/60">
              T{module.level}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 capitalize">{bp.category.replace('_', ' ')} Module</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/60 p-2.5 rounded border border-stone-800/80">
        {bp.description}
      </p>

      {/* Health & Status */}
      <div className="flex flex-col gap-1.5 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="text-stone-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Structural Integrity:
          </span>
          <span
            className={
              module.health > 70
                ? 'text-emerald-300 font-bold'
                : module.health > 30
                ? 'text-amber-300 font-bold'
                : 'text-red-400 font-bold'
            }
          >
            {Math.round(module.health)} / {module.maxHealth} HP
          </span>
        </div>
        <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full ${
              module.health > 70
                ? 'bg-emerald-500'
                : module.health > 30
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${(module.health / module.maxHealth) * 100}%` }}
          />
        </div>
      </div>

      {/* Performance Outputs */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
        {bp.powerDelta !== 0 && (
          <div className="bg-stone-900/80 p-2 rounded border border-stone-800">
            <div className="text-[10px] text-stone-400">Power Matrix:</div>
            <div
              className={`font-bold ${
                bp.powerDelta > 0 ? 'text-yellow-400' : 'text-stone-300'
              }`}
            >
              {bp.powerDelta > 0 ? '+' : ''}
              {Math.round(bp.powerDelta * levelMultiplier)} kW
            </div>
          </div>
        )}

        {bp.o2Delta !== 0 && (
          <div className="bg-stone-900/80 p-2 rounded border border-stone-800">
            <div className="text-[10px] text-stone-400">Atmosphere O2:</div>
            <div className="text-cyan-400 font-bold">
              {bp.o2Delta > 0 ? '+' : ''}
              {Math.round(bp.o2Delta * levelMultiplier)} m³/h
            </div>
          </div>
        )}

        {bp.waterDelta !== 0 && (
          <div className="bg-stone-900/80 p-2 rounded border border-stone-800">
            <div className="text-[10px] text-stone-400">Hydration H2O:</div>
            <div className="text-blue-400 font-bold">
              {bp.waterDelta > 0 ? '+' : ''}
              {Math.round(bp.waterDelta * levelMultiplier)} L/h
            </div>
          </div>
        )}

        {bp.foodDelta !== 0 && (
          <div className="bg-stone-900/80 p-2 rounded border border-stone-800">
            <div className="text-[10px] text-stone-400">Hydroponic Crop:</div>
            <div className="text-emerald-400 font-bold">
              +{Math.round(bp.foodDelta * levelMultiplier)} Food/h
            </div>
          </div>
        )}

        {bp.spiceCapacity && (
          <div className="bg-stone-900/80 p-2 rounded border border-stone-800 col-span-2">
            <div className="text-[10px] text-fuchsia-400">Spice Silo Capacity:</div>
            <div className="text-fuchsia-300 font-bold">
              +{Math.round(bp.spiceCapacity * levelMultiplier)} kg
            </div>
          </div>
        )}

        {module.type === 'medbay' && (
          <div className="bg-emerald-950/40 p-2 rounded border border-emerald-800/80 col-span-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                Bio-Stasis Trauma Pods:
              </span>
              <span className="text-emerald-300 font-bold">
                +{(1.2 * levelMultiplier).toFixed(1)}% Health/s
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-stone-300">
              <span className="text-stone-400">Cellular Radiation Decontamination:</span>
              <span className="text-cyan-300 font-bold">
                -{Math.min(90, Math.round(50 * levelMultiplier))}% Dose
              </span>
            </div>
            <div className="text-[9px] text-emerald-400/80 italic">
              Halves long-term degradation from low morale and toxic dust exposure.
            </div>
          </div>
        )}
      </div>

      {/* Action Controls: Toggle Power, Repair, Upgrade, Demolish */}
      <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
        <div className="flex items-center gap-2">
          {/* Toggle Online/Offline */}
          <button
            onClick={() => onToggleActive(module.id)}
            className={`flex-1 py-1.5 px-3 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              module.isActive
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900'
                : 'bg-stone-900 text-stone-400 border border-stone-700 hover:bg-stone-800'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{module.isActive ? 'ONLINE' : 'STANDBY'}</span>
          </button>

          {/* Repair */}
          {isDamaged && (
            <button
              onClick={() => onRepairModule(module.id)}
              disabled={!canAffordRepair}
              className={`py-1.5 px-3 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                canAffordRepair
                  ? 'bg-amber-950 text-amber-200 border border-amber-600/70 hover:bg-amber-900'
                  : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
              }`}
              title={`Repair for ${repairCostAlloy} Alloy`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>REPAIR ({repairCostAlloy}A)</span>
            </button>
          )}
        </div>

        {/* Upgrade Tier */}
        {module.level < 3 && (
          <button
            onClick={() => onUpgradeModule(module.id)}
            disabled={!canAffordUpgrade}
            className={`w-full py-2 px-3 rounded text-xs font-title font-bold flex items-center justify-between transition-colors ${
              canAffordUpgrade
                ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                : 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ArrowUpCircle className="w-4 h-4" /> UPGRADE TO TIER {module.level + 1}
            </span>
            <span className="font-mono text-[10px]">
              {upgradeCostAlloy}A / ₡{upgradeCostCredits}
            </span>
          </button>
        )}

        {/* Demolish */}
        <button
          onClick={() => onDemolishModule(module.id)}
          className="w-full py-1.5 px-3 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-stone-800 hover:border-red-800/60 flex items-center justify-center gap-1.5 font-mono transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>DECONSTRUCT (REFUND 60% ALLOY)</span>
        </button>
      </div>
    </div>
  );
};
