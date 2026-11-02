import { describe, it, expect } from 'vitest';
import { parseTelemetryEvent } from './index.js';

describe('parseTelemetryEvent', () => {
  it('accepts a well-formed event', () => {
    const event = parseTelemetryEvent({
      type: 'metric',
      service: 'payment-service',
      timestamp: '2026-10-18T14:32:18.000Z',
      name: 'http.latency.ms',
      value: 1240,
    });
    expect(event.service).toBe('payment-service');
  });

  it('rejects an invalid type', () => {
    expect(() => parseTelemetryEvent({ type: 'nope', service: 'x', timestamp: '2026-01-01', name: 'y' })).toThrow(
      /invalid telemetry type/,
    );
  });

  it('rejects a missing service', () => {
    expect(() => parseTelemetryEvent({ type: 'log', timestamp: '2026-01-01', name: 'y' })).toThrow(/service/);
  });

  it('rejects a bad timestamp', () => {
    expect(() =>
      parseTelemetryEvent({ type: 'log', service: 'x', timestamp: 'not-a-date', name: 'y' }),
    ).toThrow(/timestamp/);
  });

  it('rejects a non-object', () => {
    expect(() => parseTelemetryEvent('oops')).toThrow(/must be an object/);
  });

  it('rejects NaN and Infinity values', () => {
    const base = {
      type: 'metric',
      service: 'payment-service',
      timestamp: '2026-10-18T14:32:18.000Z',
      name: 'http.latency.ms',
    };
    expect(() => parseTelemetryEvent({ ...base, value: NaN })).toThrow(/finite number/);
    expect(() => parseTelemetryEvent({ ...base, value: Infinity })).toThrow(/finite number/);
    expect(() => parseTelemetryEvent({ ...base, value: -Infinity })).toThrow(/finite number/);
  });
});
