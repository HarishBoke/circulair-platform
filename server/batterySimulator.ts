/**
 * batterySimulator.ts
 * Physics-based battery telemetry simulator for Circul-AI-r Platform.
 *
 * Models realistic electrochemical behaviour per chemistry:
 *   - NMC  (Nickel Manganese Cobalt)   — 3.0–4.2 V/cell, 96s packs
 *   - LFP  (Lithium Iron Phosphate)    — 2.5–3.65 V/cell, 120s packs
 *   - NCA  (Nickel Cobalt Aluminium)   — 3.0–4.2 V/cell, 96s packs
 *   - LCO  (Lithium Cobalt Oxide)      — 3.0–4.2 V/cell, 72s packs
 *   - LMO  (Lithium Manganese Oxide)   — 3.0–4.2 V/cell, 84s packs
 *
 * Each battery instance maintains independent state:
 *   SoC (%), SoH (%), cycle count, temperature, current direction.
 * Degradation is applied per reading (very slow, realistic over thousands of cycles).
 * Anomaly injection: thermal spikes, voltage sag, high-current events.
 */

// ─── Chemistry profiles ───────────────────────────────────────────────────────

export type Chemistry = "NMC" | "LFP" | "NCA" | "LCO" | "LMO" | "LEAD_ACID" | "Unknown";

interface ChemistryProfile {
  /** Nominal cell voltage (V) */
  vNominal: number;
  /** Minimum cell voltage (V) — fully discharged */
  vMin: number;
  /** Maximum cell voltage (V) — fully charged */
  vMax: number;
  /** Number of cells in series */
  seriesCells: number;
  /** Typical max continuous discharge current (A) */
  iMaxDischarge: number;
  /** Typical max charge current (A) */
  iMaxCharge: number;
  /** Base internal resistance (mΩ) */
  irBase: number;
  /** Thermal coefficient — temperature rise per amp (°C/A) */
  thermalCoeff: number;
  /** Cycle life at 80% DoD (approximate) */
  cycleLife: number;
  /** Capacity fade per cycle (% SOH loss per full cycle) */
  capacityFadePerCycle: number;
}

const CHEMISTRY_PROFILES: Record<string, ChemistryProfile> = {
  NMC: {
    vNominal: 3.65, vMin: 3.0, vMax: 4.2, seriesCells: 96,
    iMaxDischarge: 150, iMaxCharge: 80,
    irBase: 15, thermalCoeff: 0.08, cycleLife: 1500,
    capacityFadePerCycle: 0.0067, // ~1% per 150 cycles
  },
  LFP: {
    vNominal: 3.2, vMin: 2.5, vMax: 3.65, seriesCells: 120,
    iMaxDischarge: 200, iMaxCharge: 100,
    irBase: 10, thermalCoeff: 0.05, cycleLife: 3000,
    capacityFadePerCycle: 0.0033, // ~1% per 300 cycles
  },
  NCA: {
    vNominal: 3.6, vMin: 3.0, vMax: 4.2, seriesCells: 96,
    iMaxDischarge: 180, iMaxCharge: 90,
    irBase: 12, thermalCoeff: 0.09, cycleLife: 1200,
    capacityFadePerCycle: 0.0083, // ~1% per 120 cycles
  },
  LCO: {
    vNominal: 3.7, vMin: 3.0, vMax: 4.2, seriesCells: 72,
    iMaxDischarge: 100, iMaxCharge: 50,
    irBase: 20, thermalCoeff: 0.12, cycleLife: 800,
    capacityFadePerCycle: 0.0125, // ~1% per 80 cycles
  },
  LMO: {
    vNominal: 3.8, vMin: 3.0, vMax: 4.2, seriesCells: 84,
    iMaxDischarge: 120, iMaxCharge: 60,
    irBase: 18, thermalCoeff: 0.10, cycleLife: 1000,
    capacityFadePerCycle: 0.010, // ~1% per 100 cycles
  },
  LEAD_ACID: {
    vNominal: 2.0, vMin: 1.75, vMax: 2.4, seriesCells: 6,
    iMaxDischarge: 200, iMaxCharge: 50,
    irBase: 50, thermalCoeff: 0.15, cycleLife: 400,
    capacityFadePerCycle: 0.025,
  },
};

function getProfile(chemistry: string): ChemistryProfile {
  return CHEMISTRY_PROFILES[chemistry] ?? CHEMISTRY_PROFILES["NMC"]!;
}

// ─── Per-battery state ────────────────────────────────────────────────────────

export interface BatterySimState {
  bpan: string;
  chemistry: string;
  /** State of Charge 0–100 */
  soc: number;
  /** State of Health 0–100 */
  soh: number;
  /** Cumulative full-equivalent cycles */
  cycleCount: number;
  /** Current pack temperature (°C) */
  tPack: number;
  /** Ambient temperature (°C) */
  tAmbient: number;
  /** Whether currently charging (true) or discharging (false) */
  isCharging: boolean;
  /** Ticks since last direction change */
  directionTicks: number;
  /** Anomaly injection counter — injects anomaly every N ticks */
  anomalyCountdown: number;
  /** Whether a thermal spike is currently active */
  thermalSpikeActive: boolean;
  /** Spike duration remaining (ticks) */
  spikeTicks: number;
}

const _states = new Map<string, BatterySimState>();

/**
 * Initialise or retrieve per-battery simulation state.
 * Starting SoC and SoH are randomised within realistic ranges.
 */
export function getOrCreateState(bpan: string, chemistry: string = "NMC"): BatterySimState {
  if (_states.has(bpan)) return _states.get(bpan)!;
  const state: BatterySimState = {
    bpan,
    chemistry,
    soc: 20 + Math.random() * 75,       // 20–95%
    soh: 72 + Math.random() * 25,       // 72–97%
    cycleCount: Math.floor(50 + Math.random() * 900),
    tPack: 22 + Math.random() * 8,
    tAmbient: 22 + Math.random() * 6,
    isCharging: Math.random() > 0.5,
    directionTicks: 0,
    anomalyCountdown: Math.floor(30 + Math.random() * 60), // first anomaly after 30–90 ticks
    thermalSpikeActive: false,
    spikeTicks: 0,
  };
  _states.set(bpan, state);
  return state;
}

export function clearState(bpan: string): void {
  _states.delete(bpan);
}

export function clearAllStates(): void {
  _states.clear();
}

export function getActiveStates(): Map<string, BatterySimState> {
  return _states;
}

// ─── OCV curve (SoC → cell voltage) ─────────────────────────────────────────

/**
 * Open-circuit voltage as a function of SoC using a piecewise linear model.
 * Coefficients are chemistry-specific.
 */
function ocvFromSoc(soc: number, profile: ChemistryProfile): number {
  const s = Math.max(0, Math.min(100, soc)) / 100;
  // Piecewise linear: flat plateau for LFP, sloped for NMC/NCA
  const vRange = profile.vMax - profile.vMin;
  // Simple sigmoid-like mapping: low SoC → steep drop, mid → flat, high → steep rise
  let ocv: number;
  if (s < 0.05) {
    ocv = profile.vMin + vRange * 0.05 * (s / 0.05);
  } else if (s < 0.9) {
    // Flat plateau region
    ocv = profile.vMin + vRange * (0.05 + 0.85 * ((s - 0.05) / 0.85));
  } else {
    // Steep rise near full charge
    ocv = profile.vMin + vRange * (0.90 + 0.10 * ((s - 0.9) / 0.1));
  }
  return Math.max(profile.vMin, Math.min(profile.vMax, ocv));
}

// ─── Reading generator ────────────────────────────────────────────────────────

export interface SimulatedReading {
  bpan: string;
  vPack: number;
  iPack: number;
  vMin: number;
  vMax: number;
  tPack: number;
  tMax: number;
  cycleCount: number;
  irPack: number;
  sohEstimate: number;
  thermalAnomaly: boolean;
  anomalyType?: string;
  source: "simulated";
  recordedAt: string;
  /** Extra fields for demo dashboard */
  soc: number;
  chemistry: string;
}

/**
 * Generate one telemetry reading and advance the battery state.
 */
export function generateReading(bpan: string, chemistry: string = "NMC"): SimulatedReading {
  const state = getOrCreateState(bpan, chemistry);
  const profile = getProfile(state.chemistry);

  // ── Direction logic: charge/discharge cycles ──────────────────────────────
  state.directionTicks++;
  const switchAfter = state.isCharging ? 60 + Math.floor(Math.random() * 30) : 90 + Math.floor(Math.random() * 60);
  if (state.directionTicks >= switchAfter) {
    state.isCharging = !state.isCharging;
    state.directionTicks = 0;
    if (!state.isCharging) {
      // Completed a charge → increment cycle count
      state.cycleCount += 1;
      // Apply capacity fade
      state.soh = Math.max(20, state.soh - profile.capacityFadePerCycle);
    }
  }

  // ── Current ───────────────────────────────────────────────────────────────
  const iMag = state.isCharging
    ? 10 + Math.random() * (profile.iMaxCharge * 0.8)
    : 15 + Math.random() * (profile.iMaxDischarge * 0.6);
  const iPack = parseFloat(((state.isCharging ? 1 : -1) * iMag).toFixed(1));

  // ── SoC update (Coulomb counting approximation) ───────────────────────────
  // Each tick = 2s, capacity ~50 kWh → 50000 Wh / (vPack * 3600) Ah
  const vPackApprox = profile.vNominal * profile.seriesCells;
  const capacityAh = (50 * 1000) / vPackApprox; // ~50 kWh pack
  const deltaAh = (iMag * 2) / 3600; // 2-second tick
  const deltaSoc = (deltaAh / capacityAh) * 100;
  if (state.isCharging) {
    state.soc = Math.min(100, state.soc + deltaSoc);
  } else {
    state.soc = Math.max(0, state.soc - deltaSoc);
  }

  // ── Voltage ───────────────────────────────────────────────────────────────
  const irOhm = ((profile.irBase + (100 - state.soh) * 0.4) * (1 + Math.random() * 0.05)) / 1000;
  const ocvCell = ocvFromSoc(state.soc, profile);
  const vDrop = irOhm * Math.abs(iPack);
  const vCell = state.isCharging ? ocvCell + vDrop : ocvCell - vDrop;
  const vPack = parseFloat((vCell * profile.seriesCells).toFixed(2));
  const cellSpread = 0.02 + (100 - state.soh) * 0.001; // imbalance grows with age
  const vMin = parseFloat((vCell - cellSpread / 2 - Math.random() * 0.01).toFixed(3));
  const vMax = parseFloat((vCell + cellSpread / 2 + Math.random() * 0.01).toFixed(3));

  // ── Internal resistance ───────────────────────────────────────────────────
  const irPack = parseFloat((irOhm * 1000 + Math.random() * 0.5).toFixed(3)); // mΩ

  // ── Temperature ──────────────────────────────────────────────────────────
  const loadHeat = Math.abs(iPack) * profile.thermalCoeff;
  const targetTemp = state.tAmbient + loadHeat;
  // Thermal inertia: temperature moves toward target at 10% per tick
  state.tPack = state.tPack + (targetTemp - state.tPack) * 0.1 + (Math.random() - 0.5) * 0.3;
  state.tPack = parseFloat(state.tPack.toFixed(1));

  // ── Anomaly injection ─────────────────────────────────────────────────────
  let tMax = parseFloat((state.tPack + 1 + Math.random() * 2).toFixed(1));
  let thermalAnomaly = false;
  let anomalyType: string | undefined;

  state.anomalyCountdown--;

  if (state.thermalSpikeActive) {
    // Ongoing spike
    tMax = parseFloat((55 + Math.random() * 10).toFixed(1));
    thermalAnomaly = true;
    anomalyType = `High temperature: ${tMax}°C`;
    state.spikeTicks--;
    if (state.spikeTicks <= 0) {
      state.thermalSpikeActive = false;
      state.anomalyCountdown = Math.floor(40 + Math.random() * 80);
    }
  } else if (state.anomalyCountdown <= 0) {
    // Inject a new anomaly
    const roll = Math.random();
    if (roll < 0.5) {
      // Thermal spike (most common anomaly for demo impact)
      state.thermalSpikeActive = true;
      state.spikeTicks = Math.floor(3 + Math.random() * 5); // 3–8 ticks
      tMax = parseFloat((52 + Math.random() * 8).toFixed(1));
      thermalAnomaly = true;
      anomalyType = `High temperature: ${tMax}°C`;
    } else if (roll < 0.75) {
      // Voltage sag (low SoC + high current)
      anomalyType = `Voltage sag: ${vMin.toFixed(3)} V/cell`;
    } else {
      // High current event
      anomalyType = `High current: ${Math.abs(iPack).toFixed(0)} A`;
    }
    if (!state.thermalSpikeActive) {
      state.anomalyCountdown = Math.floor(40 + Math.random() * 80);
    }
  }

  return {
    bpan,
    vPack,
    iPack,
    vMin,
    vMax,
    tPack: state.tPack,
    tMax,
    cycleCount: state.cycleCount,
    irPack,
    sohEstimate: parseFloat(state.soh.toFixed(2)),
    thermalAnomaly,
    anomalyType,
    source: "simulated",
    recordedAt: new Date().toISOString(),
    soc: parseFloat(state.soc.toFixed(1)),
    chemistry: state.chemistry,
  };
}

// ─── Simulator registry ───────────────────────────────────────────────────────

/** Map of BPAN → active interval handle */
const _activeSimulators = new Map<string, ReturnType<typeof setInterval>>();
/** Map of BPAN → chemistry for running simulators */
const _simulatorChemistry = new Map<string, string>();

export interface SimulatorCallbacks {
  onReading: (reading: SimulatedReading) => void | Promise<void>;
  onAnomaly?: (reading: SimulatedReading) => void | Promise<void>;
}

/**
 * Start a physics-based simulator for a single battery.
 * Calls `callbacks.onReading` every `intervalMs` milliseconds.
 */
export function startBatterySimulator(
  bpan: string,
  chemistry: string,
  callbacks: SimulatorCallbacks,
  intervalMs: number = 2000
): void {
  if (_activeSimulators.has(bpan)) return; // already running
  _simulatorChemistry.set(bpan, chemistry);
  const handle = setInterval(async () => {
    try {
      const reading = generateReading(bpan, chemistry);
      await callbacks.onReading(reading);
      if (reading.thermalAnomaly && callbacks.onAnomaly) {
        await callbacks.onAnomaly(reading);
      }
    } catch (err) {
      console.error(`[Simulator] Error for BPAN ${bpan}:`, err);
    }
  }, intervalMs);
  _activeSimulators.set(bpan, handle);
  console.log(`[Simulator] Started for BPAN ${bpan} (${chemistry}) at ${intervalMs}ms`);
}

/**
 * Stop the simulator for a single battery.
 */
export function stopBatterySimulator(bpan: string): void {
  const handle = _activeSimulators.get(bpan);
  if (handle) {
    clearInterval(handle);
    _activeSimulators.delete(bpan);
    _simulatorChemistry.delete(bpan);
    console.log(`[Simulator] Stopped for BPAN ${bpan}`);
  }
}

/**
 * Stop all running simulators.
 */
export function stopAllSimulators(): void {
  for (const [bpan, handle] of Array.from(_activeSimulators.entries())) {
    clearInterval(handle);
    console.log(`[Simulator] Stopped for BPAN ${bpan}`);
  }
  _activeSimulators.clear();
  _simulatorChemistry.clear();
}

/**
 * Get the set of BPANs currently being simulated.
 */
export function getActiveSimulators(): string[] {
  return Array.from(_activeSimulators.keys());
}

/**
 * Check if a specific BPAN is being simulated.
 */
export function isSimulating(bpan: string): boolean {
  return _activeSimulators.has(bpan);
}

/**
 * Get simulator stats for the demo dashboard.
 */
export function getSimulatorStats(): {
  activeCount: number;
  bpans: string[];
  chemistries: Record<string, string>;
} {
  const chemistries: Record<string, string> = {};
  for (const [bpan, chem] of Array.from(_simulatorChemistry.entries())) {
    chemistries[bpan] = chem;
  }
  return {
    activeCount: _activeSimulators.size,
    bpans: Array.from(_activeSimulators.keys()),
    chemistries,
  };
}
