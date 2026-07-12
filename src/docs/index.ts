import { Application, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { buildOpenApiDocument } from './openapi';

// Built once, lazily, on first mount.
let cachedDoc: ReturnType<typeof buildOpenApiDocument> | null = null;
const getDoc = () => (cachedDoc ??= buildOpenApiDocument());

const safeEqual = (a: string, b: string): boolean => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

/**
 * Optional HTTP Basic Auth for the docs. Only enforced when both DOCS_USER and
 * DOCS_PASSWORD are configured (recommended in production).
 */
const docsBasicAuth = (req: Request, res: Response, next: NextFunction): void => {
  const { user, password } = config.docs;
  if (!user || !password) return next();

  const header = req.header('authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [u, p] = Buffer.from(encoded, 'base64').toString().split(':');
    if (u && p && safeEqual(u, user) && safeEqual(p, password)) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="SkillSwap API Docs"').status(401).send('Authentication required');
};

/**
 * Serve Swagger UI at `${prefix}/docs` and the raw spec at `${prefix}/docs.json`.
 * Disabled entirely when `config.docs.enabled` is false (production default).
 */
export function mountDocs(app: Application, prefix: string): void {
  if (!config.docs.enabled) {
    logger.info('API docs disabled (set ENABLE_DOCS=true to serve them)');
    return;
  }

  const doc = getDoc();

  app.get(`${prefix}/docs.json`, docsBasicAuth, (_req, res) => {
    res.json(doc);
  });

  app.use(
    `${prefix}/docs`,
    docsBasicAuth,
    swaggerUi.serve,
    swaggerUi.setup(doc, { customSiteTitle: 'SkillSwap API' }),
  );

  logger.info(`API docs available at ${prefix}/docs`);
}
