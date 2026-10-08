import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_jsx = """      <TradeRocketModal
        isOpen={isTradeRocketOpen}
        onClose={() => setIsTradeRocketOpen(false)}
        spiceAmount={stats.spice}
        credits={stats.credits}
        modules={modules}
        spicePriceMultiplier={hasTech('spice_centrifuge') ? 1.4 : 1.0}
        onSellSpice={handleSellSpice}
        onImportSupply={handleImportSupply}
      />"""

new_jsx = """      <TradeRocketModal
        isOpen={isTradeRocketOpen}
        onClose={() => setIsTradeRocketOpen(false)}
        spiceAmount={stats.spice}
        credits={stats.credits}
        modules={modules}
        spicePriceMultiplier={hasTech('spice_centrifuge') ? 1.4 : 1.0}
        onSellSpice={handleSellSpice}
        onImportSupply={handleImportSupply}
        autoExportSpice={stats.autoExportSpice || false}
        autoExportThreshold={stats.autoExportThreshold || 100}
        onToggleAutoExport={() => setStats(s => ({ ...s, autoExportSpice: !s.autoExportSpice }))}
        onChangeAutoExportThreshold={(val) => setStats(s => ({ ...s, autoExportThreshold: val }))}
      />"""

code = code.replace(old_jsx, new_jsx)

with open('src/App.tsx', 'w') as f:
    f.write(code)

