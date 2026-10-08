import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# 1. Add workers to state
old_harvesters_state = """  const [harvesters, setHarvesters] = useState<Harvester[]>([
    {"""
new_harvesters_state = """  const [workers, setWorkers] = useState<ColonistWorker[]>([]);
  const [harvesters, setHarvesters] = useState<Harvester[]>([
    {"""
code = code.replace(old_harvesters_state, new_harvesters_state)

# 2. Add workers update logic right after harvesters update logic
old_harvester_tick = """      // 4. Update Game Time & Weather"""
new_harvester_tick = """      // 3.5 Colonist Workers (EVA Suits) Update
      setWorkers((prevWorkers) => {
        let updatedWorkers = prevWorkers.map((w) => {
          let updated = { ...w };
          if (updated.state === 'idle') {
            updated.timer -= dt;
            if (updated.timer <= 0) {
              // Pick a random building to walk to
              if (modules.length > 0) {
                const targetMod = modules[Math.floor(Math.random() * modules.length)];
                // Target a point slightly outside the building
                const tx = targetMod.x * 48 + 24 + (Math.random() * 40 - 20);
                const ty = targetMod.y * 48 + 24 + (Math.random() * 40 - 20);
                updated.targetX = tx;
                updated.targetY = ty;
                updated.waypoints = findNavigationPath(updated.x, updated.y, tx, ty, modules, []);
                updated.state = 'walking';
              } else {
                updated.timer = 5;
              }
            }
          } else if (updated.state === 'walking') {
            const currentGoal =
              updated.waypoints && updated.waypoints.length > 0
                ? updated.waypoints[0]
                : { x: updated.targetX || updated.x, y: updated.targetY || updated.y };

            const dist = Math.hypot(currentGoal.x - updated.x, currentGoal.y - updated.y);
            if (dist < 4) {
              if (updated.waypoints && updated.waypoints.length > 1) {
                updated.waypoints = updated.waypoints.slice(1);
              } else {
                updated.state = 'idle';
                updated.timer = Math.random() * 10 + 5; // Idle 5-15s
                updated.waypoints = [];
              }
            } else {
              // Move towards goal
              const angle = Math.atan2(currentGoal.y - updated.y, currentGoal.x - updated.x);
              // Workers steer smoothly
              const angleDiff = angle - updated.angle;
              const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
              updated.angle += normalizedDiff * 5 * dt;

              const speed = 14; // Slow walk speed
              updated.x += Math.cos(updated.angle) * speed * dt;
              updated.y += Math.sin(updated.angle) * speed * dt;
            }
          }
          return updated;
        });

        // Spawn logic (max 1 worker per 2 population, up to 25)
        const maxWorkers = Math.min(25, Math.floor(prevStats.population / 2));
        if (updatedWorkers.length < maxWorkers && Math.random() < 0.2 * dt && modules.length > 0) {
          const spawnMod = modules[Math.floor(Math.random() * modules.length)];
          const spawnX = spawnMod.x * 48 + 24;
          const spawnY = spawnMod.y * 48 + 24;
          updatedWorkers.push({
            id: `worker_${Date.now()}_${Math.random()}`,
            x: spawnX + (Math.random() * 20 - 10),
            y: spawnY + (Math.random() * 20 - 10),
            targetX: null,
            targetY: null,
            waypoints: [],
            angle: Math.random() * Math.PI * 2,
            state: 'idle',
            timer: Math.random() * 5 + 2,
          });
        }
        
        // Despawn logic (if population dropped)
        if (updatedWorkers.length > maxWorkers) {
           updatedWorkers = updatedWorkers.slice(0, maxWorkers);
        }

        return updatedWorkers;
      });

      // 4. Update Game Time & Weather"""
code = code.replace(old_harvester_tick, new_harvester_tick)

# 3. Add workers to MarsCanvas props
old_canvas_prop = """        harvesters={harvesters}
        powerLines={powerLines}"""
new_canvas_prop = """        harvesters={harvesters}
        workers={workers}
        powerLines={powerLines}"""
code = code.replace(old_canvas_prop, new_canvas_prop)

with open('src/App.tsx', 'w') as f:
    f.write(code)

