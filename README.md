# stoXscraper

**stoXscraper** is a Web API that scrapes the internet for information related to financial assets such as Stocks, ETFs, Mutual Funds, and other securities. The API allows users to retrieve up-to-date data on financial assets by scraping publicly available sources of financial information.

This is a personal open-source project that was created to serve another project called [stoXevo](https://github.com/monsieur-ricky/stoXevo).

**Important Note: This API relies on web scraping, which can be fragile and prone to breaking as websites change their structure. I recommend considering official financial data APIs from established providers for production use.**


## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

This project was created using [NestJS](https://nestjs.com) therefore make sure that [NodeJS](https://nodejs.org/en) (version >= 16) is installed on your operating system.
 

## Installation

1. Clone the repository:

    ```bash
    git clone git@github.com:monsieur-ricky/stoXscraper.git
    ```

2. Navigate to the project directory:

    ```bash
    cd stoXscraper
    ```

3. Install the dependencies:

    ```bash
    npm install
    ```

4. Set up your environment variables (see [Configuration](#configuration)).

5. Run the application:

    ```bash
    # development
    $ npm run start

    # watch mode
    $ npm run start:dev

    # production mode
    $ npm run start:prod
    ```

6. The API should now be running at `http://localhost:3000`.

## Usage

You can use **stoXscraper** to retrieve financial data by making HTTP requests to the available API endpoints. Below is an example of how to retrieve stock information:

```bash
curl -H "stoxscraper-api-key: YOUR_API_KEY" http://localhost:3000/symbol/quote/{symbol}
```

Example Response:

```json
{
    "symbol": "SYM",
    "currency": "USD",
    "price": 0,
    "changeValue": 0,
    "changePercent": 0,
    "fiftyDayAverage": 0,
    "fiftyTwoWeekHigh": 0,
    "fiftyTwoWeekLow": 0,
    "trailingAnnualDividendRate": 0,
    "regularMarketDayHigh": 0,
    "regularMarketDayLow": 0,
    "name": "Symbol, Inc.",
    "exchangeShortName": "Nasdaq"
}
```

## API Endpoints

### `/symbol/quote/{symbol}`

- **Description**: Fetches the current price information about an asset using its ticker symbol.
- **Method**: `GET`
- **Params**:
  - `symbol`: The stock ticker symbol (e.g., AAPL for Apple).
- **Response**: A JSON object containing stock information such as price, change value, currency, etc.

### `/symbol/search/{term}`

- **Description**: Searches assets based on the term.
- **Method**: `GET`
- **Params**:
  - `term`: Apple
- **Response**: A JSON array containing asset names and ticker symbols.

### `/symbol/profile/{symbol}`

- **Description**: Fetches detailed information for a specific financial asset.
- **Method**: `GET`
- **Params**:
  - `symbol`: The stock ticker symbol (e.g., AAPL for Apple).
- **Response**: A JSON object containing detailed information about the asset.

## Configuration

**stoXscraper** uses environment variables for configuration. You can specify these in a `.env` file in the project root or pass them in at runtime.

### Environment Variables

- `YAHOO_COOKIE`: Yahoo Finance cookie header
- `YAHOO_USER_AGENT`: Valid browser specific User-Agent header
- `CACHE_TTL`: Cache TTL in milliseconds
- `API_KEY`: API Key for Client App

Check example `.env` file:

```bash
YAHOO_COOKIE='yahho-finance-cookie-string'
COOKIE_EXPIRATION='yahho-finance-cookie-expiration-date'
YAHOO_USER_AGENT='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
CACHE_TTL=60000
API_KEY='your-api-key'
```

## Dependencies

- **NestJS**: A progressive Node.js framework for building efficient and scalable server-side applications.
- **Cheerio**: A jQuery-like library for DOM manipulation to parse and extract data from HTML.
  
You can view the full list of dependencies in the `package.json` file.

## Contributing

Contributions are welcome! If you'd like to improve **stoXscraper**, feel free to open a pull request or submit an issue.


---
Happy financial scraping with **stoXscraper**!
