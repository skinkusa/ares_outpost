import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, Volume2 } from 'lucide-react';
import { SoundCue, SoundPrefs, sound } from '../utils/audio';

const CUES: { id: SoundCue; label: string; hint: string }[] = [
  { id: 'music', label: 'Red Horizon', hint: 'Ambient score' },
  { id: 'ui', label: 'Interface', hint: 'Button clicks' },
  { id: 'build', label: 'Construction', hint: 'Build, repair, research' },
  { id: 'mining', label: 'Harvester drill', hint: 'Scooping spice or ore' },
  { id: 'delivery', label: 'Cargo delivery', hint: 'Unloading at base' },
  { id: 'alarm', label: 'Alarms', hint: 'Storms and life support' },
  { id: 'rocket', label: 'Rocket launch', hint: 'Shuttle liftoff' },
];

interface SoundMenuProps {
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SoundMenu: React.FC<SoundMenuProps> = ({ isMuted, onToggleMute }) => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<SoundPrefs>(() => sound.getPrefs());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const toggleCue = (cue: SoundCue) => {
    const next = !prefs[cue];
    sound.setCue(cue, next);
    setPrefs(sound.getPrefs());
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 bg-stone-900 hover:bg-stone-800 border px-2.5 py-1 rounded-md text-xs transition-colors ${
          open ? 'border-orange-600 text-orange-200' : 'border-stone-700 text-stone-300'
        }`}
        title="Choose which sounds play"
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
        <span className="hidden sm:inline">AUDIO</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-stone-950/95 border border-stone-700 rounded-lg shadow-2xl p-3 text-stone-200">
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-800">
            <span className="font-title text-xs tracking-wide text-orange-200">SOUND MIX</span>
            <button
              onClick={onToggleMute}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                isMuted
                  ? 'border-stone-600 text-stone-400'
                  : 'border-orange-700 text-orange-300'
              }`}
            >
              {isMuted ? 'MUTED' : 'LIVE'}
            </button>
          </div>
          <ul className="flex flex-col gap-1.5">
            {CUES.map((cue) => (
              <li key={cue.id} className="flex items-center gap-2">
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefs[cue.id]}
                    onChange={() => toggleCue(cue.id)}
                    className="accent-orange-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs leading-tight">{cue.label}</span>
                    <span className="block text-[10px] text-stone-500 leading-tight">{cue.hint}</span>
                  </span>
                </label>
                <button
                  onClick={() => sound.preview(cue.id)}
                  className="p-1 rounded border border-stone-700 text-stone-400 hover:text-orange-300 hover:border-orange-700"
                  title={`Hear ${cue.label}`}
                >
                  <Volume2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
