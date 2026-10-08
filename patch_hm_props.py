import re

with open('src/components/HarvesterManager.tsx', 'r') as f:
    code = f.read()

old_props = """  onToggleAutoHarvest: (harvesterId: string) => void;
  onFocusHarvester: (harvester: Harvester) => void;
}

export const HarvesterManager: React.FC<HarvesterManagerProps> = ({
  isOpen,
  onClose,
  harvesters,
  modules,
  currentAlloy,
  currentCredits,
  onDeployHarvester,
  onRecallHarvester,
  onScrapHarvester,
  onToggleAutoHarvest,
  onFocusHarvester,
}) => {"""

new_props = """  onToggleAutoHarvest: (harvesterId: string) => void;
  onToggleMiningTarget: (harvesterId: string) => void;
  onFocusHarvester: (harvester: Harvester) => void;
}

export const HarvesterManager: React.FC<HarvesterManagerProps> = ({
  isOpen,
  onClose,
  harvesters,
  modules,
  currentAlloy,
  currentCredits,
  onDeployHarvester,
  onRecallHarvester,
  onScrapHarvester,
  onToggleAutoHarvest,
  onToggleMiningTarget,
  onFocusHarvester,
}) => {"""

code = code.replace(old_props, new_props)

with open('src/components/HarvesterManager.tsx', 'w') as f:
    f.write(code)

