export type MetalQuote = {
  metal: string;

  pricePerOunceEuro: number;
  pricePerOunceDollar: number;
  pricePerOuncePound: number;

  pricePerGramEuro?: number;
  pricePerGramDollar?: number;
  pricePerGramPound?: number;
};
