import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_sun = """        if (weather.type === 'dust_storm') {
          sunFactor *= hasTech('storm_hardening') ? 0.6 : 0.25;
        } else if (weather.type === 'dust_veil') {"""

new_sun = """        const hasRadar = modules.some(m => m.type === 'radar' && m.isActive);
        if (weather.type === 'dust_storm') {
          sunFactor *= hasTech('storm_hardening') ? 0.6 : (hasRadar ? 0.4 : 0.25);
        } else if (weather.type === 'dust_veil') {"""

code = code.replace(old_sun, new_sun)

old_harv = """          // Speed modifiers (dust storm slow, tech upgrades)
          let currentSpeed = h.speed * (hasTech('rover_turbo') ? 1.35 : 1.0);
          if (weather.type === 'dust_storm' && !hasTech('storm_hardening')) {
            currentSpeed *= 0.65;
          }"""

new_harv = """          // Speed modifiers (dust storm slow, tech upgrades)
          let currentSpeed = h.speed * (hasTech('rover_turbo') ? 1.35 : 1.0);
          if (weather.type === 'dust_storm' && !hasTech('storm_hardening')) {
            const hasRadar = modules.some(m => m.type === 'radar' && m.isActive);
            currentSpeed *= hasRadar ? 0.85 : 0.65; // Radar gives early navigation warnings
          }"""

code = code.replace(old_harv, new_harv)

with open('src/App.tsx', 'w') as f:
    f.write(code)

