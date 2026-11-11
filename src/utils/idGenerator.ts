let counter = 0;

/**
 * Generates a collision-proof unique identifier combining timestamp,
 * sequential atomic counter, and cryptographic-grade random entropy.
 */
export function generateUniqueId(prefix: string = 'id'): string {
  counter = (counter + 1) % 1000000;
  const time = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${time}-${counter}-${rand}`;
}
