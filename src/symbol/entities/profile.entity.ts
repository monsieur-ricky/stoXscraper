import { Quote } from './quote.entity';
import { Symbol } from './symbol.entity';

export type Profile = Partial<Symbol> &
  Partial<Quote> & {
    companyName?: string;
    industry?: string;
    website?: string;
    description?: string;
    ceo?: string;
    sector?: string;
    country?: string;
    fullTimeEmployees?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    image?: string;
  };
