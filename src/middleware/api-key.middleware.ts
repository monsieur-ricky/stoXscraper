import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['stoxscraper-api-key'];

    if (key !== process.env.API_KEY) {
      throw new ForbiddenException('The API Key is invalid.');
    }

    next();
  };
}
