import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_props = """      <TradeRocketModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        spiceAmount={stats.spice}
        credits={stats.credits}
        onSellSpice={handleSellSpice}
        onImportSupply={handleImportSupply}
        modules={modules}
        spicePriceMultiplier={hasTech('spice_centrifuge') ? 1.4 : 1.0}
      />"""

new_props = """      <TradeRocketModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        spiceAmount={stats.spice}
        credits={stats.credits}
        onSellSpice={handleSellSpice}
        onImportSupply={handleImportSupply}
        modules={modules}
        spicePriceMultiplier={hasTech('spice_centrifuge') ? 1.4 : 1.0}
        autoExportSpice={stats.autoExportSpice || false}
        autoExportThreshold={stats.autoExportThreshold || 100}
        onToggleAutoExport={() => setStats(s => ({ ...s, autoExportSpice: !s.autoExportSpice }))}
        onChangeAutoExportThreshold={(val) => setStats(s => ({ ...s, autoExportThreshold: val }))}
      />"""

code = code.replace(old_props, new_props)

with open('src/App.tsx', 'w') as f:
    f.write(code)

