import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class DomainRestrictionMiddleware implements NestMiddleware {
  private readonly allowedDomains = ['your-domain.com', 'localhost'];

  use = (req: Request, _res: Response, next: NextFunction) => {
    const origin = req.headers.origin || req.headers.referer;

    if (!origin || !this.isDomainAllowed(origin)) {
      throw new ForbiddenException('Access from this domain is not allowed.');
    }

    next();
  };

  private isDomainAllowed(domain: string): boolean {
    try {
      const url = new URL(domain);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        this.allowedDomains.includes(url.hostname)
      );
    } catch {
      return false;
    }
  }
}
