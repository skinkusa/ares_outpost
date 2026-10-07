import React from 'react';
import { TechNode } from '../types/colony';
import {
  Atom,
  CheckCircle2,
  Lock,
  Sparkles,
  Unlock,
  X,
  Zap,
} from 'lucide-react';

interface TechTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  techNodes: TechNode[];
  techPoints: number;
  onUnlockTech: (techId: string) => void;
}

export const TechTreeModal: React.FC<TechTreeModalProps> = ({
  isOpen,
  onClose,
  techNodes,
  techPoints,
  onUnlockTech,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-4xl bg-stone-950 border border-indigo-700/60 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-indigo-950/70 border-b border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950 border border-indigo-600/60">
              <Atom className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-title text-lg font-bold text-stone-100 tracking-wider">
                ARES SCIENTIFIC & TECH MATRIX
              </h2>
              <p className="text-xs text-stone-400">
                Unlock breakthroughs in spice refinement, rover treads, photovoltaics, and life support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/70 px-3.5 py-1.5 rounded-lg font-mono text-sm">
              <span className="text-indigo-400 font-bold">TECH RESERVES:</span>
              <span className="text-white font-bold">{Math.floor(techPoints)} TP</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tech Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techNodes.map((tech) => {
            const isUnlocked = tech.unlocked;
            const prereqsMet = tech.requires.every((reqId) => {
              const req = techNodes.find((t) => t.id === reqId);
              return req && req.unlocked;
            });
            const canAfford = techPoints >= tech.cost;
            const canUnlock = !isUnlocked && prereqsMet && canAfford;

            return (
              <div
                key={tech.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  isUnlocked
                    ? 'bg-indigo-950/40 border-indigo-600/60 glow-cyan'
                    : prereqsMet
                    ? 'bg-stone-900/70 border-stone-700/80 hover:border-indigo-500/70'
                    : 'bg-stone-950/80 border-stone-850 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                      {tech.category.replace('_', ' ')}
                    </span>
                    {isUnlocked ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> RESEARCHED
                      </span>
                    ) : !prereqsMet ? (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-stone-500">
                        <Lock className="w-3.5 h-3.5" /> LOCKED
                      </span>
                    ) : (
                      <span className="font-mono text-xs font-bold text-indigo-300">
                        {tech.cost} TP
                      </span>
                    )}
                  </div>

                  <h4 className="font-title font-bold text-sm text-stone-100 mb-1">
                    {tech.name}
                  </h4>

                  <p className="text-xs text-stone-400 leading-relaxed mb-3">
                    {tech.description}
                  </p>
                </div>

                {/* Effect Badge & Unlock Button */}
                <div className="pt-2 border-t border-stone-800/80 flex flex-col gap-2">
                  <div className="text-[11px] font-mono font-semibold text-emerald-300 bg-emerald-950/50 border border-emerald-800/50 px-2 py-1 rounded">
                    ★ {tech.effectLabel}
                  </div>

                  {!isUnlocked && (
                    <button
                      onClick={() => onUnlockTech(tech.id)}
                      disabled={!canUnlock}
                      className={`w-full py-2 rounded-lg font-title font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        canUnlock
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>RESEARCH ({tech.cost} TP)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
