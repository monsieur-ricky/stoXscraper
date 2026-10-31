import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  use = (req: Request, _res: Response, next: NextFunction) => {
    const key = req.headers['stoxscraper-api-key'];
    const expected = process.env.API_KEY;

    if (
      !expected ||
      typeof key !== 'string' ||
      Buffer.byteLength(key) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(expected))
    ) {
      throw new ForbiddenException('The API Key is invalid.');
    }

    next();
  };
}
