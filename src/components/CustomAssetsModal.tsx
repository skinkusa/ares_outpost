import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  FolderOpen,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { MODULE_BLUEPRINTS, HARVESTER_SPECS } from '../utils/constants';
import {
  setCustomSprite,
  clearCustomSprite,
  getSpriteStatus,
  subscribeToAssetChanges,
} from '../utils/assetLoader';

interface CustomAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomAssetsModal: React.FC<CustomAssetsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'buildings' | 'harvesters' | 'guide'>('buildings');
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToAssetChanges(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = (
    category: 'building' | 'harvester',
    id: string,
    file: File
  ) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a PNG or image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCustomSprite(category, id, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const buildingList = Object.entries(MODULE_BLUEPRINTS).map(([key, bp]) => ({
    id: key,
    name: bp.name,
    category: bp.category,
    size: `${bp.width}x${bp.height}`,
    pixelSize: `${bp.width * 48}x${bp.height * 48} px`,
    filename: `${key}.png`,
    status: getSpriteStatus('building', key),
    color: bp.color,
  }));

  const harvesterList = Object.entries(HARVESTER_SPECS).map(([key, spec]) => ({
    id: key,
    name: spec.name,
    pixelSize: key === 'titan' ? '128x128 px' : key === 'heavy' ? '96x96 px' : '64x64 px',
    filename: `${key}.png`,
    status: getSpriteStatus('harvester', key),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-stone-900 border border-stone-700/80 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-950/80 border border-orange-500/40 rounded-lg text-orange-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-title font-bold text-stone-100 flex items-center gap-2">
                Custom Graphics & Sprites Manager
              </h2>
              <p className="text-xs text-stone-400">
                Supply your custom PNG building textures and rover graphics to the colony engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-900/50 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('buildings')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'buildings'
                ? 'border-orange-500 text-orange-400 bg-stone-800/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Building Sprites ({buildingList.length})
          </button>
          <button
            onClick={() => setActiveTab('harvesters')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'harvesters'
                ? 'border-orange-500 text-orange-400 bg-stone-800/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Harvester Rovers ({harvesterList.length})
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-orange-500 text-orange-400 bg-stone-800/40'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Where to Put Files (Guide)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick Notice Banner */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3.5 flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-stone-200">How to use your PNG files:</span>
              <p className="text-stone-400 leading-relaxed">
                You can drop them permanently into <code className="text-amber-300 bg-stone-800 px-1 py-0.5 rounded">public/buildings/</code> in your repository, <strong className="text-stone-300">or</strong> upload them directly below to instantly test them in your active browser session!
              </p>
            </div>
          </div>

          {/* Buildings Tab */}
          {activeTab === 'buildings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {buildingList.map((b) => (
                <div
                  key={b.id}
                  className="bg-stone-950/80 border border-stone-800 hover:border-stone-700 rounded-lg p-3.5 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="font-title font-semibold text-stone-200 text-sm truncate">
                        {b.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                      <span className="bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800 text-amber-300">
                        {b.filename}
                      </span>
                      <span>Grid: {b.size} ({b.pixelSize})</span>
                    </div>

                    <div className="pt-0.5">
                      {b.status === 'loaded-custom' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Custom In-Browser Texture
                        </span>
                      )}
                      {b.status === 'loaded-public' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Loaded from /public/buildings/
                        </span>
                      )}
                      {b.status === 'procedural' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-3 h-3 text-orange-400" /> Procedural Vector Fallback
                        </span>
                      )}
                      {b.status === 'loading' && (
                        <span className="text-[10px] text-stone-500">Checking...</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="cursor-pointer flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-orange-500/60 text-stone-200 px-2.5 py-1.5 rounded text-xs transition-colors">
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('building', b.id, file);
                        }}
                      />
                    </label>

                    {b.status === 'loaded-custom' && (
                      <button
                        onClick={() => clearCustomSprite('building', b.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800 border border-transparent rounded transition-colors"
                        title="Revert back to default"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Harvesters Tab */}
          {activeTab === 'harvesters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {harvesterList.map((h) => (
                <div
                  key={h.id}
                  className="bg-stone-950/80 border border-stone-800 hover:border-stone-700 rounded-lg p-3.5 flex items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <span className="font-title font-semibold text-stone-200 text-sm">
                      {h.name}
                    </span>

                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono">
                      <span className="bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800 text-amber-300">
                        {h.filename}
                      </span>
                      <span>Target: {h.pixelSize} (Facing East/Right)</span>
                    </div>

                    <div className="pt-0.5">
                      {h.status === 'loaded-custom' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Custom In-Browser Texture
                        </span>
                      )}
                      {h.status === 'loaded-public' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Loaded from /public/harvesters/
                        </span>
                      )}
                      {h.status === 'procedural' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-3 h-3 text-orange-400" /> Procedural Vector Fallback
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="cursor-pointer flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-orange-500/60 text-stone-200 px-2.5 py-1.5 rounded text-xs transition-colors">
                      <Upload className="w-3.5 h-3.5 text-orange-400" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload('harvester', h.id, file);
                        }}
                      />
                    </label>

                    {h.status === 'loaded-custom' && (
                      <button
                        onClick={() => clearCustomSprite('harvester', h.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-950/40 hover:border-rose-800 border border-transparent rounded transition-colors"
                        title="Revert back to default"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-stone-300">
              <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-4 space-y-3">
                <h3 className="font-title font-bold text-sm text-stone-100 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-orange-400" />
                  Option 1: Add to Project Repository (Permanent)
                </h3>
                <p className="text-stone-400 leading-relaxed">
                  The project has a <code className="text-amber-300 bg-stone-800 px-1.5 py-0.5 rounded">public/buildings/</code> directory configured. Vite serves everything inside <code className="text-stone-200">public/</code> directly at the root URL.
                </p>
                
                <div className="bg-stone-900 border border-stone-800 rounded p-3 font-mono text-[11px] text-stone-300 space-y-1">
                  <div>ares_outpost/</div>
                  <div>├── public/</div>
                  <div className="text-orange-400">│   ├── buildings/</div>
                  <div className="text-amber-300 pl-4">│   │   ├── command.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── solar.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── rtg.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── battery.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── scrubber.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── vaporator.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── greenhouse.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── habitat.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── refinery.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── depot.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── research.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── launchpad.png</div>
                  <div className="text-amber-300 pl-4">│   │   ├── radar.png</div>
                  <div className="text-amber-300 pl-4">│   │   └── medbay.png</div>
                  <div className="text-orange-400">│   └── harvesters/</div>
                  <div className="text-amber-300 pl-4">│       ├── scout.png</div>
                  <div className="text-amber-300 pl-4">│       ├── heavy.png</div>
                  <div className="text-amber-300 pl-4">│       └── titan.png</div>
                </div>

                <p className="text-stone-400">
                  Once your files are placed in <code className="text-stone-200">public/buildings/</code>, you can commit them to GitHub:
                </p>
                <div className="bg-stone-900 border border-stone-800 rounded p-2.5 font-mono text-[11px] text-emerald-400">
                  git add public/ && git commit -m &quot;feat: add custom building and rover sprites&quot; && git push origin main
                </div>
              </div>

              <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-4 space-y-2">
                <h3 className="font-title font-bold text-sm text-stone-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  Option 2: Live In-Browser Testing (No Git Needed)
                </h3>
                <p className="text-stone-400 leading-relaxed">
                  Switch to the <strong>Building Sprites</strong> or <strong>Harvester Rovers</strong> tab above and click <strong>Upload</strong> on any item. The sprite is stored in your local browser cache and immediately rendered across the live Martian canvas in real-time.
                </p>
              </div>

              <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-4 space-y-2">
                <h3 className="font-title font-bold text-sm text-stone-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Image Format & Style Tips
                </h3>
                <ul className="list-disc list-inside text-stone-400 space-y-1">
                  <li><strong>Format:</strong> PNG with transparent background.</li>
                  <li><strong>Aspect Ratio:</strong> 1:1 square.</li>
                  <li><strong>Rover Orientation:</strong> Rovers rotate towards their movement heading, so design rover sprites facing <strong>right (East / 0°)</strong>.</li>
                  <li><strong>Fallback:</strong> Any building without a PNG automatically uses the procedural vector canvas graphics.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs text-stone-400">
          <span>Automatic graceful fallback to procedural canvas art if image is missing</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
