import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_return = """        return {
          ...prevStats,
          sol: newSol,"""

new_return = """        // Auto Export Spice Logic
        const hasLaunchpad = modules.some((m) => m.type === 'launchpad' && m.isActive);
        let finalSpice = prevStats.spice;
        let finalCredits = prevStats.credits;
        let finalTotalEarned = prevStats.totalCreditsEarned;
        
        if (hasLaunchpad && prevStats.autoExportSpice) {
          const threshold = prevStats.autoExportThreshold || 100;
          if (finalSpice >= threshold && threshold > 0) {
            // Sell exactly 'threshold' amount or all of it? Let's sell chunks of threshold.
            // Or just sell all of it if it hits the threshold.
            const amountToSell = Math.floor(finalSpice);
            const tariff = 1.0; // Launchpad means 1.0 tariff
            const mult = hasTech('spice_centrifuge') ? 1.4 : 1.0;
            const pricePerKg = 2.5 * mult * tariff;
            const revenue = Math.round(amountToSell * pricePerKg);
            
            finalSpice -= amountToSell;
            finalCredits += revenue;
            finalTotalEarned += revenue;
            
            addLog('spice', 'Auto-Export Complete', `Automated Shuttle launched ${amountToSell}kg Spice for +₡${revenue}!`);
          }
        }

        return {
          ...prevStats,
          spice: finalSpice,
          credits: finalCredits,
          totalCreditsEarned: finalTotalEarned,
          sol: newSol,"""

code = code.replace(old_return, new_return)

with open('src/App.tsx', 'w') as f:
    f.write(code)

