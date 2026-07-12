import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

type EntityIdResolver = (req: Request) => string | string[] | undefined;

const defaultEntityId: EntityIdResolver = (req) => req.params.id;

/**
 * Records an immutable audit trail entry for an admin mutation. The row is only
 * written AFTER the response finishes with a 2xx status, so failed or rejected
 * requests never produce a misleading "action performed" log.
 *
 * It captures the acting admin (`req.user.sub`), the client IP and the target
 * entity id. By default the entity id is read from `req.params.id`; pass a
 * resolver for routes that key off a different param or the body (e.g. the
 * credit-adjust endpoint, which targets `body.userId`).
 */
export const audit = (
  action: string,
  entity: string,
  getEntityId: EntityIdResolver = defaultEntityId,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const raw = getEntityId(req);
      const entityId = Array.isArray(raw) ? raw[0] : raw;
      if (!entityId) return;

      void prisma.auditLog
        .create({
          data: {
            actorId: req.user?.sub ?? null,
            action,
            entity,
            entityId,
            ipAddress: req.ip ?? null,
          },
        })
        .catch((err) =>
          logger.error({ msg: 'Failed to write audit log', action, entity, entityId, err }),
        );
    });

    next();
  };
};
