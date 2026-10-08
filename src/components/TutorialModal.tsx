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
                Deploy <strong>Scout, Heavy, or Titan</strong> harvesters from the fleet bay. They find a vein on their own, mine with lasers, and drive home when the hold is full. The fleet <strong>MINE</strong> toggle assigns each rover to spice or ore. Spice unloads at a Spice Refinery, Garage, or the Command Outpost. Ore unloads at an <strong>Ore Smelter</strong>, which turns ore into alloy. A <strong>Storage Depot</strong> raises the ore, alloy, food, and water caps. Right-click a selected rover to send it somewhere.
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
                Solar arrays produce power in daylight and nothing at night. <strong>Battery Substations</strong> store the surplus. <strong>RTG Nuclear Cells</strong> run day and night. Crew consume oxygen, water, and food on their own. <strong>MOXIE Scrubbers</strong> make oxygen, <strong>Vaporators</strong> make water, and <strong>Hydroponic Bio-Domes</strong> make food but drink water. The outpost starts with a bio-dome beside the habitat, and that dome is what keeps the crew fed. Habitats and medical bays draw extra life support. A blackout collapses morale, and <strong>Medical Bays</strong> heal the crew and cut radiation dose.
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
                Watch the weather banner on the HUD. A dust veil dims solar output. A severe dust storm cuts it to a fraction and slows rovers. A <strong>Seismic & Storm Radar</strong> softens both penalties. <strong>Electrostatic Dust Deflectors</strong>, researched from the Research screen, stop the rover slow and restore most of the lost solar power. Seismic tremors uncover new spice veins. Solar flares boost solar output and spike radiation. Recall harvesters if a storm gets too rough.
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
                Sell spice for Galactic Credits (₡) from the trade shuttle. Without an <strong>Orbital Trade Launchpad</strong>, emergency drones take a 15% cut. A launchpad pays full price and can auto-launch when the stockpile hits a threshold. Credits buy specialist crew (+4 colonists and alloy), titanium alloy, and survival stores (food and water). <strong>Science Labs</strong> earn tech points. The last research is the <strong>Atmospheric Genesis Engine</strong>.
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
