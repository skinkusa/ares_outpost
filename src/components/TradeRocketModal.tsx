import React, { useState } from 'react';
import { ColonyModule } from '../types/colony';
import {
  Coins,
  DollarSign,
  PackageCheck,
  Rocket,
  Send,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface TradeRocketModalProps {
  isOpen: boolean;
  onClose: () => void;
  spiceAmount: number;
  credits: number;
  modules: ColonyModule[];
  spicePriceMultiplier: number; // default 1.0, upgraded via tech
  onSellSpice: (amount: number) => void;
  onImportSupply: (type: 'crew' | 'alloy' | 'supplies') => void;
  autoExportSpice: boolean;
  autoExportThreshold: number;
  onToggleAutoExport: () => void;
  onChangeAutoExportThreshold: (val: number) => void;
}

export const TradeRocketModal: React.FC<TradeRocketModalProps> = ({
  isOpen,
  onClose,
  spiceAmount,
  credits,
  modules,
  spicePriceMultiplier,
  onSellSpice,
  onImportSupply,
  autoExportSpice,
  autoExportThreshold,
  onToggleAutoExport,
  onChangeAutoExportThreshold,
}) => {
  const [spiceToSell, setSpiceToSell] = useState<number>(100);

  if (!isOpen) return null;

  const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
  const tariff = hasLaunchpad ? 1.0 : 0.85;
  const basePricePerKg = 2.5 * spicePriceMultiplier * tariff;
  const currentSellRevenue = Math.round(spiceToSell * basePricePerKg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-stone-950 border border-amber-600/60 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-amber-950/70 border-b border-amber-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950 border border-amber-600/60">
              <Rocket className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="font-title text-lg font-bold text-stone-100 tracking-wider">
                EARTH TRADE & CARGO SHUTTLE
              </h2>
              <p className="text-xs text-stone-400">
                Export raw Martian spice to Earth and order critical supplies
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

        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Automated Export (Requires Launchpad) */}
          {hasLaunchpad && (
            <div className="bg-stone-900/80 border border-stone-800 p-3 rounded-lg flex items-center justify-between">
              <div>
                <h4 className="text-amber-400 font-title font-bold text-xs flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5" /> AUTOMATED LOGISTICS
                </h4>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Automatically launch shuttle when cargo reaches threshold.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-500 font-mono">THRESHOLD:</span>
                  <select
                    value={autoExportThreshold}
                    onChange={(e) => onChangeAutoExportThreshold(Number(e.target.value))}
                    disabled={!autoExportSpice}
                    className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-stone-300 font-mono focus:outline-none focus:border-amber-700/50 disabled:opacity-50"
                  >
                    <option value={50}>50kg</option>
                    <option value={100}>100kg</option>
                    <option value={250}>250kg</option>
                    <option value={500}>500kg</option>
                  </select>
                </div>
                <button
                  onClick={onToggleAutoExport}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoExportSpice ? 'bg-amber-600' : 'bg-stone-800'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      autoExportSpice ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Launchpad Status Callout */}
          {!hasLaunchpad && (
            <div className="p-3 bg-amber-950/40 border border-amber-600/60 rounded-lg text-xs text-amber-200 flex items-center gap-3 font-mono">
              <Rocket className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                Tip: Construct an <strong>Orbital Trade Launchpad</strong> in Industry tab for direct zero-fee cargo launches. (Emergency orbital drone routing is currently active at 15% tariff).
              </span>
            </div>
          )}

          {/* Spice Export Section */}
          <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-title font-bold text-sm text-fuchsia-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-fuchsia-400" /> EXPORT SPICE TO EARTH
              </h3>
              <span className="font-mono text-xs text-stone-400">
                Rate: <strong className="text-amber-300">₡{basePricePerKg.toFixed(1)}</strong> / kg
              </span>
            </div>

            <div className="flex items-center justify-between bg-stone-950/90 p-3 rounded-lg border border-stone-800 font-mono text-xs">
              <span className="text-stone-400">Colony Spice Stockpile:</span>
              <span className="text-fuchsia-300 font-bold text-sm">
                {Math.round(spiceAmount)} kg
              </span>
            </div>

            {/* Slider / Preset Amount */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-stone-400">Shipment Weight:</span>
                <span className="text-stone-100 font-bold">{Math.round(spiceToSell)} kg</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(10, Math.floor(spiceAmount))}
                value={Math.min(spiceToSell, Math.floor(spiceAmount))}
                onChange={(e) => setSpiceToSell(Number(e.target.value))}
                className="w-full accent-fuchsia-500 cursor-pointer"
              />

              <div className="flex gap-2 mt-1">
                {[50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSpiceToSell(Math.min(amt, Math.floor(spiceAmount)))}
                    disabled={spiceAmount < amt}
                    className="flex-1 py-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 text-xs font-mono transition-colors"
                  >
                    {amt}kg
                  </button>
                ))}
                <button
                  onClick={() => setSpiceToSell(Math.floor(spiceAmount))}
                  disabled={spiceAmount <= 0}
                  className="flex-1 py-1 rounded bg-fuchsia-950 hover:bg-fuchsia-900 border border-fuchsia-700/60 text-fuchsia-200 text-xs font-mono font-bold transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Payout & Launch CTA */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <div className="font-mono text-xs">
                <span className="text-stone-400">Estimated Revenue: </span>
                <span className="text-amber-300 font-bold text-sm">
                  +₡{currentSellRevenue}
                </span>
              </div>

              <button
                onClick={() => {
                  onSellSpice(spiceToSell);
                  setSpiceToSell(0);
                }}
                disabled={spiceToSell <= 0 || spiceAmount < spiceToSell}
                className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-title font-bold text-xs tracking-wider transition-all flex items-center gap-2 shadow-lg active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>LAUNCH EXPORT SHUTTLE</span>
              </button>
            </div>
          </div>

          {/* Earth Supply Requisition Section */}
          <div className="bg-stone-900/80 border border-stone-800 p-4 rounded-xl flex flex-col gap-3">
            <h3 className="font-title font-bold text-sm text-amber-300 flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-amber-400" /> IMPORT EARTH SUPPLY CRATES
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Specialist Crew */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-purple-300 font-title font-bold text-xs mb-1">
                    <Users className="w-3.5 h-3.5" /> SPECIALIST CREW
                  </div>
                  <p className="text-[11px] text-stone-400">
                    +4 Trained Colonists & +20 Alloy
                  </p>
                </div>
                <button
                  onClick={() => onImportSupply('crew')}
                  disabled={credits < 180}
                  className="mt-3 w-full py-1.5 rounded bg-stone-800 hover:bg-purple-900/60 disabled:opacity-40 text-purple-200 text-xs font-mono font-bold border border-purple-800/60 transition-colors"
                >
                  BUY (₡180)
                </button>
              </div>

              {/* Alloy Crates */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-orange-300 font-title font-bold text-xs mb-1">
                    <Wrench className="w-3.5 h-3.5" /> TITANIUM ALLOY
                  </div>
                  <p className="text-[11px] text-stone-400">
                    +75 Structural Alloy Units
                  </p>
                </div>
                <button
                  onClick={() => onImportSupply('alloy')}
                  disabled={credits < 140}
                  className="mt-3 w-full py-1.5 rounded bg-stone-800 hover:bg-orange-900/60 disabled:opacity-40 text-orange-200 text-xs font-mono font-bold border border-orange-800/60 transition-colors"
                >
                  BUY (₡140)
                </button>
              </div>

              {/* Life Support Crates */}
              <div className="p-3 bg-stone-950/80 border border-stone-800 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300 font-title font-bold text-xs mb-1">
                    <PackageCheck className="w-3.5 h-3.5" /> SURVIVAL STORES
                  </div>
                  <p className="text-[11px] text-stone-400">
                    +80 Rations & +80 Liters Water
                  </p>
                </div>
                <button
                  onClick={() => onImportSupply('supplies')}
                  disabled={credits < 120}
                  className="mt-3 w-full py-1.5 rounded bg-stone-800 hover:bg-emerald-900/60 disabled:opacity-40 text-emerald-200 text-xs font-mono font-bold border border-emerald-800/60 transition-colors"
                >
                  BUY (₡120)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
