import type { AnimationTrack, Keyframe } from '../types';

// Apply easing factor to normalized time t (0..1)
export function applyEasing(t: number, easing: Keyframe['easing']): number {
  switch (easing) {
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return t * (2 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'constant':
      return 0; // Steps at the boundary
    case 'linear':
    default:
      return t;
  }
}

// Linearly interpolate between two numbers
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Interpolate array of numbers
export function interpolateValues(val1: number[], val2: number[], t: number): number[] {
  const result: number[] = [];
  const len = Math.min(val1.length, val2.length);
  for (let i = 0; i < len; i++) {
    result.push(lerp(val1[i], val2[i], t));
  }
  return result;
}

// Get the interpolated value for an animation track at a specific frame
export function getInterpolatedValue(
  track: AnimationTrack,
  frame: number,
  defaultValue: number[]
): number[] {
  const keyframes = [...track.keyframes].sort((a, b) => a.frame - b.frame);

  if (keyframes.length === 0) {
    return defaultValue;
  }

  // If frame is before or at the first keyframe
  if (frame <= keyframes[0].frame) {
    return keyframes[0].value;
  }

  // If frame is after or at the last keyframe
  if (frame >= keyframes[keyframes.length - 1].frame) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find the bounding keyframes
  let prev: Keyframe = keyframes[0];
  let next: Keyframe = keyframes[0];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (frame >= keyframes[i].frame && frame <= keyframes[i + 1].frame) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  if (prev === next) {
    return prev.value;
  }

  // Calculate interpolation factor
  const frameDelta = next.frame - prev.frame;
  const tRaw = (frame - prev.frame) / frameDelta;
  const t = applyEasing(tRaw, prev.easing);

  // If constant easing, stay at prev value until next frame
  if (prev.easing === 'constant') {
    return prev.value;
  }

  return interpolateValues(prev.value, next.value, t);
}
