import re

with open('src/components/TradeRocketModal.tsx', 'r') as f:
    code = f.read()

old_props = """  onImportSupply: (type: 'crew' | 'alloy' | 'supplies') => void;
  modules: ColonyModule[];
  spicePriceMultiplier: number;
}"""

new_props = """  onImportSupply: (type: 'crew' | 'alloy' | 'supplies') => void;
  modules: ColonyModule[];
  spicePriceMultiplier: number;
  autoExportSpice: boolean;
  autoExportThreshold: number;
  onToggleAutoExport: () => void;
  onChangeAutoExportThreshold: (val: number) => void;
}"""

code = code.replace(old_props, new_props)

old_fc = """export const TradeRocketModal: React.FC<TradeRocketModalProps> = ({
  isOpen,
  onClose,
  spiceAmount,
  credits,
  onSellSpice,
  onImportSupply,
  modules,
  spicePriceMultiplier,
}) => {"""

new_fc = """export const TradeRocketModal: React.FC<TradeRocketModalProps> = ({
  isOpen,
  onClose,
  spiceAmount,
  credits,
  onSellSpice,
  onImportSupply,
  modules,
  spicePriceMultiplier,
  autoExportSpice,
  autoExportThreshold,
  onToggleAutoExport,
  onChangeAutoExportThreshold,
}) => {"""

code = code.replace(old_fc, new_fc)

old_ui = """          {/* Launchpad Status Callout */}
          {!hasLaunchpad && ("""

new_ui = """          {/* Automated Export (Requires Launchpad) */}
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
                      autoExportSpice ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Launchpad Status Callout */}
          {!hasLaunchpad && ("""

code = code.replace(old_ui, new_ui)

with open('src/components/TradeRocketModal.tsx', 'w') as f:
    f.write(code)

