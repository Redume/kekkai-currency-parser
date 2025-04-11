const axios = require('axios');
const config = require('../utils/load_config.js')();
const { truncate_number } = require('../utils/truncate_number.js');

module.exports = {
    parseCurrencies: async () => {
        const promises = config['currency']['crypto'].map(fromCurrency => {
            return config['currency']['crypto'].map(convCurrency => {
                if (fromCurrency === convCurrency) return Promise.resolve(null);

                return axios.get(
                    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
                    {
                        params: {
                            symbol: fromCurrency,
                            convert: convCurrency,
                        },
                        headers: {
                            'X-CMC_PRO_API_KEY': config['currency']['api_keys']['coinmarketcap'],
                        }
                    }
                )
                .then((res) => {
                    const data = res.data.data[fromCurrency].quote[convCurrency];
                    const truncatedPriceStr = truncate_number(data.price, 3);
                    const rate = parseFloat(truncatedPriceStr);

                    return {
                        from_currency: fromCurrency,
                        conv_currency: convCurrency,
                        rate: rate,
                        date: new Date(data['last_updated']).toISOString().substring(0, 10),
                    };
                })
                .catch((err) => {
                    console.error(err.respone.data);
                    return null;
                });
            });
        });

        const flattenedPromises = promises.flat();
        const results = await Promise.all(flattenedPromises);

        return results.filter(result => result !== null);
    }
};
