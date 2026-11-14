import { access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPool } from './db.js';

afterEach(() => {
  vi.restoreAllMocks();
});

it('importing ingestion does not create a pool or start a listener', async () => {
  vi.resetModules();
  const db = await import('./db.js');
  const express = (await import('express')).default;
  const pool = vi.spyOn(db, 'createPool').mockImplementation(() => {
    throw new Error('import-only code must not create a pool');
  });
  const listen = vi.spyOn(express.application, 'listen').mockImplementation(() => {
    throw new Error('import-only code must not listen');
  });

  await import('./index.js');

  expect(pool).not.toHaveBeenCalled();
  expect(listen).not.toHaveBeenCalled();
});

describe.skipIf(!process.env['POSTGRES_HOST'])('compiled ingestion entry point', () => {
  it('initializes a fresh database, serves health, and persists telemetry', async () => {
    const entry = fileURLToPath(new URL('../dist/index.js', import.meta.url));
    await access(entry).catch(() => {
      throw new Error('Run npm run build before the PostgreSQL startup integration test');
    });
    const database = `tracelens_startup_${randomUUID().replaceAll('-', '')}`;
    const admin = createPool();
    let created = false;
    let child: ReturnType<typeof spawn> | undefined;
    let exited: Promise<void> | undefined;
    let exit: { code: number | null; signal: NodeJS.Signals | null } | undefined;
    let output = '';
    try {
      await admin.query(`CREATE DATABASE "${database}"`);
      created = true;
      const reservation = createServer();
      await new Promise<void>((resolve, reject) => {
        reservation.once('error', reject);
        reservation.listen(0, '127.0.0.1', resolve);
      });
      const address = reservation.address();
      if (!address || typeof address === 'string') throw new Error('No fixture port allocated');
      const port = address.port;
      await new Promise<void>((resolve) => reservation.close(() => resolve()));
      child = spawn(process.execPath, [entry], {
        env: {
          ...process.env,
          POSTGRES_DB: database,
          INGESTION_PORT: String(port),
          INGESTION_API_KEY: 'startup-test-key',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout?.on('data', (data: Buffer) => {
        output = (output + data.toString()).slice(-8192);
      });
      child.stderr?.on('data', (data: Buffer) => {
        output = (output + data.toString()).slice(-8192);
      });
      exited = new Promise<void>((resolve) => {
        child!.once('exit', (code, signal) => {
          exit = { code, signal };
          resolve();
        });
      });
      const until = Date.now() + 10_000;
      for (;;) {
        if (exit) throw new Error(`Compiled entry exited ${exit.code}/${exit.signal}: ${output}`);
        try {
          const health = await fetch(`http://127.0.0.1:${port}/health`, {
            signal: AbortSignal.timeout(1000),
          });
          if (health.status === 200) {
            expect(await health.json()).toMatchObject({
              status: 'ok',
              service: 'tracelens-ingestion',
            });
            break;
          }
        } catch (error) {
          if (Date.now() >= until) throw error;
        }
        if (Date.now() >= until) throw new Error(`Compiled entry never became healthy: ${output}`);
        await pause(50);
      }
      const response = await fetch(`http://127.0.0.1:${port}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'startup-test-key' },
        body: JSON.stringify({
          type: 'metric',
          service: 'startup-fixture',
          timestamp: new Date().toISOString(),
          name: 'startup.probe',
          value: 1,
        }),
        signal: AbortSignal.timeout(3000),
      });
      expect(response.status).toBe(201);
      const body = (await response.json()) as { id: unknown };
      expect(String(body.id)).toMatch(/^[1-9]\d*$/);
    } finally {
      if (child && !exit) {
        child.kill('SIGTERM');
        await Promise.race([exited, pause(3000)]);
        if (!exit) {
          child.kill('SIGKILL');
          await exited;
        }
      }
      try {
        if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
      } finally {
        await admin.end();
      }
    }
  }, 20_000);
});
