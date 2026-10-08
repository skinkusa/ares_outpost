import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_sell = """  // Sell Spice Melange
  const handleSellSpice = (amount: number) => {
    if (amount <= 0 || stats.spice < amount) return;
    const mult = hasTech('spice_centrifuge') ? 1.4 : 1.0;
    const pricePerKg = 2.5 * mult;
    const revenue = Math.round(amount * pricePerKg);"""

new_sell = """  // Sell Spice Melange
  const handleSellSpice = (amount: number) => {
    if (amount <= 0 || stats.spice < amount) return;
    const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
    const tariff = hasLaunchpad ? 1.0 : 0.85;
    const mult = hasTech('spice_centrifuge') ? 1.4 : 1.0;
    const pricePerKg = 2.5 * mult * tariff;
    const revenue = Math.round(amount * pricePerKg);"""

code = code.replace(old_sell, new_sell)

with open('src/App.tsx', 'w') as f:
    f.write(code)

with open('src/components/TradeRocketModal.tsx', 'r') as f:
    code_modal = f.read()

old_modal = """  const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
  const basePricePerKg = 2.5 * spicePriceMultiplier;
  const currentSellRevenue = Math.round(spiceToSell * basePricePerKg);"""

new_modal = """  const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
  const tariff = hasLaunchpad ? 1.0 : 0.85;
  const basePricePerKg = 2.5 * spicePriceMultiplier * tariff;
  const currentSellRevenue = Math.round(spiceToSell * basePricePerKg);"""

code_modal = code_modal.replace(old_modal, new_modal)

with open('src/components/TradeRocketModal.tsx', 'w') as f:
    f.write(code_modal)

