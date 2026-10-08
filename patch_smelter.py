import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_loop_vars = """        let foodGen = 0;
        let techGen = 0;
        let spiceCap = 600;"""

new_loop_vars = """        let foodGen = 0;
        let techGen = 0;
        let spiceCap = 600;
        let oreGen = 0;
        let oreConsRate = 0;
        let alloyGenRate = 0;"""

code = code.replace(old_loop_vars, new_loop_vars)

old_mod_loop = """          if (bp.foodDelta > 0) foodGen += bp.foodDelta * mult;
          if (bp.techRate) techGen += bp.techRate * mult;
        });"""

new_mod_loop = """          if (bp.foodDelta > 0) foodGen += bp.foodDelta * mult;
          if (bp.techRate) techGen += bp.techRate * mult;
          
          if (mod.type === 'miner') {
            oreGen += 5 * mult; // Static miner produces 5 ore per second
          }
          if (mod.type === 'refinery') {
            oreConsRate += 4 * mult; // Consumes 4 ore per sec
            alloyGenRate += 2 * mult; // Produces 2 alloy per sec (2:1 ratio)
          }
        });"""

code = code.replace(old_mod_loop, new_mod_loop)

old_resource_update = """        // Oxygen & Water & Food integration
        let newO2 = Math.min(prevStats.maxOxygen, Math.max(0, prevStats.oxygen + (o2Gen - o2Cons) * dt));
        let newWater = Math.min(prevStats.maxWater, Math.max(0, prevStats.water + (waterGen - waterCons) * dt));
        let newFood = Math.min(prevStats.maxFood, Math.max(0, prevStats.food + (foodGen - foodCons) * dt));
        let newTech = prevStats.techPoints + techGen * dt;"""

new_resource_update = """        // Ore & Alloy processing
        let availableOreRate = prevStats.ore / dt + oreGen;
        let actualOreConsRate = Math.min(oreConsRate, availableOreRate);
        let actualAlloyGenRate = oreConsRate > 0 ? alloyGenRate * (actualOreConsRate / oreConsRate) : 0;
        
        let newOre = Math.min(prevStats.maxOre, Math.max(0, prevStats.ore + (oreGen - actualOreConsRate) * dt));
        let newAlloy = prevStats.alloy + actualAlloyGenRate * dt;

        // Oxygen & Water & Food integration
        let newO2 = Math.min(prevStats.maxOxygen, Math.max(0, prevStats.oxygen + (o2Gen - o2Cons) * dt));
        let newWater = Math.min(prevStats.maxWater, Math.max(0, prevStats.water + (waterGen - waterCons) * dt));
        let newFood = Math.min(prevStats.maxFood, Math.max(0, prevStats.food + (foodGen - foodCons) * dt));
        let newTech = prevStats.techPoints + techGen * dt;"""

code = code.replace(old_resource_update, new_resource_update)

old_return_stats = """          techPoints: newTech,
          morale: newMorale,
          colonistHealth: newHealth,
          maxPopulation: popCap,"""

new_return_stats = """          techPoints: newTech,
          morale: newMorale,
          colonistHealth: newHealth,
          maxPopulation: popCap,
          ore: newOre,
          alloy: newAlloy,"""

code = code.replace(old_return_stats, new_return_stats)

with open('src/App.tsx', 'w') as f:
    f.write(code)

