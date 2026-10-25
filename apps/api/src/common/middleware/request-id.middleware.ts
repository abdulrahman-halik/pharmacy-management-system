import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existingId = req.headers['x-request-id'];
    const requestId = (typeof existingId === 'string' && existingId) ? existingId : `req_${uuidv4()}`;

    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  }
}
