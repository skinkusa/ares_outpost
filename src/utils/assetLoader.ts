/**
 * Asset Loader & Sprite Cache Manager
 * Handles loading custom PNG images from /public/buildings/ and /public/harvesters/,
 * as well as user-uploaded custom textures saved in localStorage/runtime memory.
 */

type AssetCategory = 'building' | 'harvester';

interface AssetCacheEntry {
  img: HTMLImageElement;
  status: 'loading' | 'loaded' | 'failed';
  source: 'public' | 'custom';
}

const cache: Map<string, AssetCacheEntry> = new Map();
const listeners: Set<() => void> = new Set();

const STORAGE_PREFIX = 'ares_custom_asset_';

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in asset listener', e);
    }
  });
};

const getCacheKey = (category: AssetCategory, id: string): string => `${category}:${id}`;

/**
 * Retrieve cached HTMLImageElement if already loaded and valid.
 * Triggers asynchronous background load if not yet requested.
 */
export const getBuildingSprite = (type: string): HTMLImageElement | null => {
  return getSprite('building', type, `/buildings/${type}.png`);
};

export const getHarvesterSprite = (model: string): HTMLImageElement | null => {
  return getSprite('harvester', model, `/harvesters/${model}.png`);
};

const getSprite = (category: AssetCategory, id: string, defaultPublicUrl: string): HTMLImageElement | null => {
  const key = getCacheKey(category, id);
  const entry = cache.get(key);

  if (entry) {
    if (entry.status === 'loaded') {
      return entry.img;
    }
    return null; // either loading or failed
  }

  // Check if user uploaded a custom texture override in localStorage
  let srcToLoad = defaultPublicUrl;
  let isCustom = false;

  try {
    const savedCustom = localStorage.getItem(`${STORAGE_PREFIX}${category}_${id}`);
    if (savedCustom) {
      srcToLoad = savedCustom;
      isCustom = true;
    }
  } catch {
    // localStorage may be unavailable or restricted
  }

  // Initialize loading entry
  const img = new Image();
  const newEntry: AssetCacheEntry = {
    img,
    status: 'loading',
    source: isCustom ? 'custom' : 'public',
  };
  cache.set(key, newEntry);

  img.onload = () => {
    newEntry.status = 'loaded';
    notifyListeners();
  };

  img.onerror = () => {
    // If custom image failed to load, try public fallback if we haven't yet
    if (isCustom) {
      const fallbackImg = new Image();
      newEntry.img = fallbackImg;
      newEntry.source = 'public';
      fallbackImg.onload = () => {
        newEntry.status = 'loaded';
        notifyListeners();
      };
      fallbackImg.onerror = () => {
        newEntry.status = 'failed';
        notifyListeners();
      };
      fallbackImg.src = defaultPublicUrl;
    } else {
      newEntry.status = 'failed';
      notifyListeners();
    }
  };

  img.src = srcToLoad;
  return null;
};

/**
 * Set a custom texture via Base64 data URL (e.g. from file input or drag-and-drop)
 */
export const setCustomSprite = (category: AssetCategory, id: string, dataUrl: string) => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${category}_${id}`, dataUrl);
  } catch (err) {
    console.warn('Failed to save custom sprite to localStorage:', err);
  }

  const key = getCacheKey(category, id);
  const img = new Image();
  const entry: AssetCacheEntry = {
    img,
    status: 'loading',
    source: 'custom',
  };
  cache.set(key, entry);

  img.onload = () => {
    entry.status = 'loaded';
    notifyListeners();
  };
  img.onerror = () => {
    entry.status = 'failed';
    notifyListeners();
  };
  img.src = dataUrl;
};

/**
 * Remove custom override and revert back to public folder / procedural fallback
 */
export const clearCustomSprite = (category: AssetCategory, id: string) => {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${category}_${id}`);
  } catch {}

  const key = getCacheKey(category, id);
  cache.delete(key);
  notifyListeners();
};

/**
 * Check the current loading or existence status of a sprite
 */
export const getSpriteStatus = (category: AssetCategory, id: string): 'loaded-custom' | 'loaded-public' | 'procedural' | 'loading' => {
  const key = getCacheKey(category, id);
  const entry = cache.get(key);
  if (!entry) {
    // Trigger lazy check
    if (category === 'building') {
      getBuildingSprite(id);
    } else {
      getHarvesterSprite(id);
    }
    return 'loading';
  }

  if (entry.status === 'loaded') {
    return entry.source === 'custom' ? 'loaded-custom' : 'loaded-public';
  }
  if (entry.status === 'loading') {
    return 'loading';
  }
  return 'procedural';
};

/**
 * Hook or subscription to trigger canvas or UI re-render when assets finish loading
 */
export const subscribeToAssetChanges = (callback: () => void): (() => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
