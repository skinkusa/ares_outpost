import React, { useEffect, useState } from 'react';
import { ModuleCategory, ModuleType } from '../types/colony';
import { MODULE_BLUEPRINTS } from '../utils/constants';
import { sound } from '../utils/audio';
import {
  Atom,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  Cpu,
  Droplets,
  Factory,
  Hammer,
  HeartPulse,
  Home,
  Layers,
  Radio,
  Rocket,
  Scan,
  ShieldAlert,
  Sprout,
  Sun,
  Truck,
  Warehouse,
  Wind,
  Zap,
} from 'lucide-react';

interface BuildMenuProps {
  currentCredits: number;
  currentAlloy: number;
  activePlacingType: ModuleType | null;
  onSelectPlacingType: (type: ModuleType | null) => void;
  onOpenHarvesterBay: () => void;
  harvesterCount: number;
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  currentCredits,
  currentAlloy,
  activePlacingType,
  onSelectPlacingType,
  onOpenHarvesterBay,
  harvesterCount,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategory>('power');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Keyboard shortcut: Press 'B' to toggle minimize/maximize the build menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.key === 'b' || e.key === 'B') {
        setIsMinimized((prev) => !prev);
        sound.playClick(650);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories: Array<{ id: ModuleCategory; label: string; icon: React.ReactNode }> = [
    { id: 'command', label: 'COMMAND', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'power', label: 'POWER', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'life_support', label: 'LIFE SUPPORT', icon: <Wind className="w-3.5 h-3.5" /> },
    { id: 'industry', label: 'INDUSTRY & SPICE', icon: <Factory className="w-3.5 h-3.5" /> },
    { id: 'research', label: 'RESEARCH', icon: <Atom className="w-3.5 h-3.5" /> },
  ];

  const getModuleIcon = (type: ModuleType) => {
    switch (type) {
      case 'command': return <Radio className="w-4 h-4 text-sky-400" />;
      case 'solar': return <Sun className="w-4 h-4 text-amber-400" />;
      case 'rtg': return <Zap className="w-4 h-4 text-orange-400" />;
      case 'fusion': return <Zap className="w-4 h-4 text-cyan-300" />;
      case 'battery': return <BatteryCharging className="w-4 h-4 text-emerald-400" />;
      case 'scrubber': return <Wind className="w-4 h-4 text-cyan-400" />;
      case 'vaporator': return <Droplets className="w-4 h-4 text-blue-400" />;
      case 'greenhouse': return <Sprout className="w-4 h-4 text-green-400" />;
      case 'habitat': return <Home className="w-4 h-4 text-purple-400" />;
      case 'refinery': return <Factory className="w-4 h-4 text-fuchsia-400" />;
      case 'depot': return <Truck className="w-4 h-4 text-rose-400" />;
      case 'storage': return <Warehouse className="w-4 h-4 text-amber-400" />;
      case 'research': return <Atom className="w-4 h-4 text-indigo-400" />;
      case 'launchpad': return <Rocket className="w-4 h-4 text-amber-400" />;
      case 'radar': return <Scan className="w-4 h-4 text-teal-400" />;
      case 'medbay': return <HeartPulse className="w-4 h-4 text-emerald-400" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  const filteredBlueprints = Object.values(MODULE_BLUEPRINTS).filter(
    (bp) => bp.category === selectedCategory
  );

  return (
    <div className="absolute bottom-2 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-4xl z-20 flex flex-col items-center transition-all duration-300 select-none">
      {/* If Minimized: Compact HUD Toolbar */}
      {isMinimized ? (
        <div className="flex items-center gap-2 bg-stone-950/95 backdrop-blur-md border border-orange-900/80 px-3 py-1.5 rounded-lg shadow-2xl">
          <button
            onClick={() => {
              setIsMinimized(false);
              sound.playClick(750);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-title font-bold text-xs tracking-wider transition-all shadow-md active:scale-95 glow-orange"
            title="Expand construction deck (Hotkey: B)"
          >
            <ChevronUp className="w-4 h-4 animate-bounce" />
            <Hammer className="w-3.5 h-3.5 inline" />
            <span>CONSTRUCT MODULES</span>
            <span className="font-mono text-[10px] bg-orange-700/80 px-1 py-0.2 rounded text-orange-200 ml-1">
              [B]
            </span>
          </button>

          {/* Quick-switch category icons that expand the menu */}
          <div className="hidden sm:flex items-center gap-1 border-l border-stone-800 pl-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setIsMinimized(false);
                  sound.playClick(800);
                }}
                className={`p-1.5 rounded text-xs transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-stone-800 text-orange-400'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
                title={`Open ${cat.label}`}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Fleet quick launcher */}
          <button
            onClick={onOpenHarvesterBay}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold tracking-wider bg-fuchsia-950/90 hover:bg-fuchsia-900 text-fuchsia-200 border border-fuchsia-700/70 transition-transform active:scale-95 ml-1"
          >
            <Truck className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>FLEET ({harvesterCount})</span>
          </button>
        </div>
      ) : (
        /* If Expanded: Full Category Bar & Blueprints Card Carousel */
        <>
          {/* Category selector pill & quick harvester launcher + minimize control */}
          <div className="flex items-center gap-1.5 bg-stone-950/90 backdrop-blur-md border border-stone-800 p-1 rounded-t-lg shadow-xl mb-1 flex-wrap justify-center">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  sound.playClick(850);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold tracking-wider transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}

            {/* Highlighting Deploy Harvester Fleet */}
            <button
              onClick={onOpenHarvesterBay}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold tracking-wider bg-fuchsia-950 hover:bg-fuchsia-900 text-fuchsia-200 border border-fuchsia-600/70 shadow-md ml-1 transition-transform active:scale-95"
            >
              <Truck className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
              <span>HARVESTER FLEET ({harvesterCount})</span>
            </button>

            {/* Minimize / Collapse Button */}
            <button
              onClick={() => {
                setIsMinimized(true);
                sound.playClick(600);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-stone-400 hover:text-white hover:bg-stone-800/90 border border-stone-800 transition-colors ml-1"
              title="Minimize construction deck (Hotkey: B)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">MINIMIZE [B]</span>
            </button>
          </div>

          {/* Blueprints carousel card row */}
          <div className="w-full bg-stone-950/95 backdrop-blur-md border border-orange-950/70 p-2.5 rounded-lg shadow-2xl flex items-stretch gap-2.5 overflow-x-auto">
            {filteredBlueprints.map((bp) => {
              const canAfford = currentAlloy >= bp.costAlloy && currentCredits >= bp.costCredits;
              const isSelected = activePlacingType === bp.type;

              return (
                <button
                  key={bp.type}
                  onClick={() => {
                    if (isSelected) {
                      onSelectPlacingType(null);
                    } else {
                      onSelectPlacingType(bp.type);
                    }
                  }}
                  className={`flex-shrink-0 w-44 p-2.5 rounded border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/40 glow-orange scale-[1.02]'
                      : canAfford
                      ? 'border-stone-800 bg-stone-900/80 hover:border-orange-700/80 hover:bg-stone-900'
                      : 'border-stone-900 bg-stone-950/70 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="p-1 rounded bg-stone-800/80 border border-stone-700/60">
                        {getModuleIcon(bp.type)}
                      </div>
                      <span className="font-mono text-[10px] text-stone-400">
                        {bp.width}x{bp.height} TILE
                      </span>
                    </div>

                    <div className="font-title font-bold text-xs text-stone-100 truncate">
                      {bp.name}
                    </div>

                    <p className="text-[10px] text-stone-400 line-clamp-2 mt-0.5 leading-tight">
                      {bp.description}
                    </p>
                  </div>

                  {/* Resource Delta & Costs */}
                  <div className="mt-2 pt-1.5 border-t border-stone-800/80">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      {bp.powerDelta !== 0 && (
                        <span
                          className={bp.powerDelta > 0 ? 'text-yellow-400 font-bold' : 'text-stone-400'}
                        >
                          {bp.powerDelta > 0 ? `+${bp.powerDelta}` : bp.powerDelta}kW
                        </span>
                      )}
                      {bp.o2Delta !== 0 && (
                        <span className={bp.o2Delta > 0 ? 'text-cyan-400 font-bold' : 'text-stone-400'}>
                          {bp.o2Delta > 0 ? `+${bp.o2Delta}` : bp.o2Delta} O2
                        </span>
                      )}
                      {bp.waterDelta !== 0 && (
                        <span className={bp.waterDelta > 0 ? 'text-blue-400 font-bold' : 'text-stone-400'}>
                          {bp.waterDelta > 0 ? `+${bp.waterDelta}` : bp.waterDelta} H2O
                        </span>
                      )}
                      {bp.foodDelta !== 0 && (
                        <span className={bp.foodDelta > 0 ? 'text-emerald-400 font-bold' : 'text-stone-400'}>
                          {bp.foodDelta > 0 ? `+${bp.foodDelta}` : bp.foodDelta} Food
                        </span>
                      )}
                      {bp.batteryCapacity && (
                        <span className="text-green-400 font-bold">+{bp.batteryCapacity} Cap</span>
                      )}
                      {bp.spiceCapacity && (
                        <span className="text-fuchsia-400 font-bold">+{bp.spiceCapacity} Spice</span>
                      )}
                      {bp.oreCapacity && (
                        <span className="text-amber-400 font-bold">+{bp.oreCapacity} Ore</span>
                      )}
                      {bp.alloyCapacity && (
                        <span className="text-orange-400 font-bold">+{bp.alloyCapacity} Alloy</span>
                      )}
                      {bp.foodCapacity && (
                        <span className="text-emerald-400 font-bold">+{bp.foodCapacity} Food</span>
                      )}
                      {bp.waterCapacity && (
                        <span className="text-blue-400 font-bold">+{bp.waterCapacity} Water</span>
                      )}
                    </div>

                    {/* Cost Requirements */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span
                        className={
                          currentAlloy >= bp.costAlloy ? 'text-orange-300' : 'text-red-400 font-bold'
                        }
                      >
                        {bp.costAlloy} Alloy
                      </span>
                      <span
                        className={
                          currentCredits >= bp.costCredits ? 'text-amber-300' : 'text-red-400 font-bold'
                        }
                      >
                        ₡{bp.costCredits}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
