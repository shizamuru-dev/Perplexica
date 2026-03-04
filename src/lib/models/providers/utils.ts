/**
 * Checks whether a model's capability descriptor indicates vision support.
 *
 * Handles two common shapes returned by OpenAI-compatible /v1/models endpoints:
 *   - Array form:  capabilities: ["vision", ...]
 *   - Object form: capabilities: { vision: true, ... }
 */
export const checkVisionCapability = (caps: any): boolean =>
  (Array.isArray(caps) && caps.includes('vision')) ||
  (caps !== null && typeof caps === 'object' && caps.vision === true);
