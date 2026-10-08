import React from 'react';
import {
  Atom,
  CheckCircle,
  HelpCircle,
  Rocket,
  ShieldAlert,
  Truck,
  Wind,
  X,
  Zap,
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-stone-950 border border-orange-700/60 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-orange-950/70 border-b border-orange-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-950 border border-orange-600/60">
              <HelpCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="font-title text-lg font-bold text-stone-100 tracking-wider">
                COMMANDER'S FIELD MANUAL
              </h2>
              <p className="text-xs text-stone-400">
                Protocols for establishing Ares Outpost and harvesting Martian spice
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-sm text-stone-300">
          {/* Step 1: Harvester Mechanics */}
          <div className="flex gap-3.5 bg-stone-900/70 p-3.5 rounded-lg border border-stone-800">
            <div className="p-2 rounded bg-fuchsia-950/80 border border-fuchsia-700/60 flex-shrink-0 h-fit">
              <Truck className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div>
              <h4 className="font-title font-bold text-stone-100 text-sm">
                1. Autonomous Spice Harvesters
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Deploy <strong>Scout, Heavy, or Titan</strong> harvesters from your fleet bay. They roam the Martian dunes autonomously, locate rich violet spice veins, deploy high-energy mining lasers, and return to base when their cargo holds are full to deliver their loads!
              </p>
            </div>
          </div>

          {/* Step 2: Power & Life Support */}
          <div className="flex gap-3.5 bg-stone-900/70 p-3.5 rounded-lg border border-stone-800">
            <div className="p-2 rounded bg-yellow-950/80 border border-yellow-700/60 flex-shrink-0 h-fit">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h4 className="font-title font-bold text-stone-100 text-sm">
                2. Power Grid & Life Support
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Solar arrays provide high output during daytime, but produce zero at night! Build <strong>Battery Substations</strong> to store daytime power or deploy <strong>RTG Nuclear Cells</strong> for continuous 24/7 baseload power. Keep MOXIE Scrubbers (O2) and Vaporators (H2O) powered to sustain crew morale, and build <strong>Medical Bays</strong> to purge cosmic radiation and heal injured colonists.
              </p>
            </div>
          </div>

          {/* Step 3: Weather & Dust Storms */}
          <div className="flex gap-3.5 bg-stone-900/70 p-3.5 rounded-lg border border-stone-800">
            <div className="p-2 rounded bg-red-950/80 border border-red-700/60 flex-shrink-0 h-fit">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h4 className="font-title font-bold text-stone-100 text-sm">
                3. Surviving Martian Dust Storms
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Martian dust storms block out sunlight and slow down rovers. Monitor the weather alert banner on your HUD, recall harvesters if needed, and research <strong>Electrostatic Dust Deflectors</strong> in the Tech Lab.
              </p>
            </div>
          </div>

          {/* Step 4: Earth Trade & Terraforming */}
          <div className="flex gap-3.5 bg-stone-900/70 p-3.5 rounded-lg border border-stone-800">
            <div className="p-2 rounded bg-indigo-950/80 border border-indigo-700/60 flex-shrink-0 h-fit">
              <Rocket className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="font-title font-bold text-stone-100 text-sm">
                4. Earth Commerce & Terraforming
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Export spice to Earth corporations via the <strong>Trade Shuttle</strong> for Galactic Credits (₡). You can use credits to requisition supplies, titanium alloy, and most importantly, <strong>Specialist Crew</strong> to increase your colony's population! Fund Science Labs to unlock high-yield technologies, culminating in the <strong>Atmospheric Genesis Engine</strong>!
              </p>
            </div>
          </div>

          {/* Quick Controls Info */}
          <div className="p-3 bg-stone-900/50 rounded border border-stone-800 font-mono text-xs flex justify-between items-center text-stone-400">
            <span>Left-Click: Select / Place</span>
            <span>Right-Click: Cancel / Order Rover</span>
            <span>Scroll: Zoom In/Out</span>
            <span>Drag: Pan Camera</span>
          </div>
        </div>
      </div>
    </div>
  );
};
