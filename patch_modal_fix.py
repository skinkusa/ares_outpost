import re

with open('src/components/TradeRocketModal.tsx', 'r') as f:
    code = f.read()

# Fix interface
old_interface = """  onSellSpice: (amount: number) => void;
  onImportSupply: (type: 'crew' | 'alloy' | 'supplies') => void;
}"""

new_interface = """  onSellSpice: (amount: number) => void;
  onImportSupply: (type: 'crew' | 'alloy' | 'supplies') => void;
  autoExportSpice: boolean;
  autoExportThreshold: number;
  onToggleAutoExport: () => void;
  onChangeAutoExportThreshold: (val: number) => void;
}"""

code = code.replace(old_interface, new_interface)

# Fix Component declaration
old_fc = """  onSellSpice,
  onImportSupply,
}) => {"""

new_fc = """  onSellSpice,
  onImportSupply,
  autoExportSpice,
  autoExportThreshold,
  onToggleAutoExport,
  onChangeAutoExportThreshold,
}) => {"""

code = code.replace(old_fc, new_fc)

with open('src/components/TradeRocketModal.tsx', 'w') as f:
    f.write(code)

