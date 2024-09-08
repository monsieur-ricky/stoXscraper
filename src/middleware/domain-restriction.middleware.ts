import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DomainRestrictionMiddleware implements NestMiddleware {
  private readonly allowedDomains = ['blacklambs.net', 'localhost'];

  use = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || req.headers.referer;

    if (!origin || !this.isDomainAllowed(origin)) {
      throw new ForbiddenException('Access from this domain is not allowed.');
    }

    next();
  };

  private isDomainAllowed(domain: string): boolean {
    return this.allowedDomains.some((allowedDomain) =>
      domain.includes(allowedDomain),
    );
  }
}
