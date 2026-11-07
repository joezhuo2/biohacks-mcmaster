import physionet from '../data/physionet-strides.json';

const { controlStrideCv } = physionet;

export const clamp =(value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function stabilityScore(input: {
  clearance: number; dorsi: number; baselineDorsi: number; strideMean: number;
  strideStddev: number; stairSteps: number; stairNearTrips: number; assist: number;
}) {
  const clearance = clamp(input.clearance / 20);
  const dorsi = clamp(input.dorsi / Math.max(1, input.baselineDorsi));
  const rhythm = clamp(1 - (input.strideStddev / Math.max(1, input.strideMean) - controlStrideCv) / (3 * controlStrideCv));
  const stairs = clamp(1 - input.stairNearTrips * 100 / Math.max(1, input.stairSteps) / 5);
  const assist = 1 - clamp(input.assist / 100);
  return Math.round(100 * (0.35 * clearance + 0.2 * dorsi + 0.2 * rhythm + 0.15 * stairs + 0.1 * assist));
}
