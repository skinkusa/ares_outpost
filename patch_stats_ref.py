import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Find stats definition
old_stats_def = """  const [stats, setStats] = useState<ColonyStats>({
    sol: 1,
    timeOfDay: 0.15,"""

new_stats_def = """  const statsRef = useRef<ColonyStats | null>(null);
  const [stats, setStats] = useState<ColonyStats>({
    sol: 1,
    timeOfDay: 0.15,"""

code = code.replace(old_stats_def, new_stats_def)

# Find useEffect for stats
old_stats_effect = """  // Sound Engine Setup on first interaction"""

new_stats_effect = """  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Sound Engine Setup on first interaction"""

code = code.replace(old_stats_effect, new_stats_effect)

# Find worker maxWorkers logic
old_workers_max = """        // Spawn logic (max 1 worker per 2 population, up to 25)
        // Accessing stats is tricky here since stats is a dependency...
        // Wait, stats is NOT in the dependency array for this effect! 
        // Let's use a safe fallback: we'll check stats state from a ref or just use 10 workers for now.
        // Actually, we can just use 10 workers for now.
        const maxWorkers = 15;"""

new_workers_max = """        // Spawn logic (max 1 worker per 2 population, up to 25)
        const pop = statsRef.current?.population || 8;
        const maxWorkers = Math.min(25, Math.max(0, Math.floor(pop / 2)));"""

code = code.replace(old_workers_max, new_workers_max)

with open('src/App.tsx', 'w') as f:
    f.write(code)

