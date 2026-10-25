import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../context/request-context';

const MAX_USER_AGENT_LENGTH = 255;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    requestContext.run(
      {
        requestId: (req as Request & { requestId?: string }).requestId ?? 'req_unknown',
        ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
        userAgent: (req.headers['user-agent'] ?? 'unknown').slice(0, MAX_USER_AGENT_LENGTH),
        hasExplicitAudit: false,
      },
      next,
    );
  }
}
