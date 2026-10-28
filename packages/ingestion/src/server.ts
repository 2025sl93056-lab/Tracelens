/**
 * Express application for the ingestion service.
 *
 * Exported as a factory so tests can mount it without starting a real server.
 * The pool is injected so tests can supply a real test-DB pool or a stub.
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import { parseTelemetryEvent } from './index.js';
import { type DbPool, insertEvent, insertEvents } from './db.js';

export function createApp(pool: DbPool, apiKey: string) {
  const app = express();
  app.use(express.json());

  // --- auth middleware ---
  function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers['authorization'];
    const keyFromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const keyFromXHeader = req.headers['x-api-key'] as string | undefined;
    if (keyFromHeader === apiKey || keyFromXHeader === apiKey) {
      next();
      return;
    }
    res.status(401).json({ error: 'invalid or missing API key' });
  }

  // --- routes ---
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tracelens-ingestion', version: '0.1.0' });
  });

  app.post('/telemetry', requireApiKey, async (req: Request, res: Response): Promise<void> => {
    let event;
    try {
      event = parseTelemetryEvent(req.body);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
    try {
      const id = await insertEvent(pool, event);
      res.status(201).json({ id });
    } catch (err) {
      console.error('db insert failed', err);
      res.status(500).json({ error: 'failed to persist event' });
    }
  });

  app.post('/telemetry/batch', requireApiKey, async (req: Request, res: Response): Promise<void> => {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'request body must be an array of telemetry events' });
      return;
    }
    const events = [];
    for (let i = 0; i < req.body.length; i++) {
      try {
        events.push(parseTelemetryEvent(req.body[i]));
      } catch (err) {
        res.status(400).json({ error: `event[${i}]: ${(err as Error).message}` });
        return;
      }
    }
    try {
      const ids = await insertEvents(pool, events);
      res.status(201).json({ ids });
    } catch (err) {
      console.error('db batch insert failed', err);
      res.status(500).json({ error: 'failed to persist events' });
    }
  });

  return app;
}
