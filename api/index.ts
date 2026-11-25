import 'dotenv/config';
import type { IncomingMessage, ServerResponse } from 'http';
import { getInitializedApp } from '../server/app.ts';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getInitializedApp();
  await new Promise<void>((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    res.once('error', reject);
    app(req as unknown as Parameters<typeof app>[0], res as unknown as Parameters<typeof app>[1]);
  });
}
