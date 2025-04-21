const axios = require('axios');
const config = require('../utils/load_config.js')();
const { truncate_number } = require('../utils/truncate_number.js');

module.exports = {
    info: {
        name: 'CoinMarketCap',
        type: 'crypto'
    },
    parseCurrencies: async () => {
        const promises = config['currency']['crypto'].map(fromCurrency => {
            return config['currency']['crypto'].map(convCurrency => {
                if (fromCurrency === convCurrency) return Promise.resolve(null);

                const coinmarketcap = config['currency']['services']['coinmarketcap'];
                const serviceName = module.exports.info.name;

                return axios.get(
                    coinmarketcap['base_url'],
                    {
                        params: {
                            symbol: fromCurrency,
                            convert: convCurrency,
                        },
                        headers: {
                            'X-CMC_PRO_API_KEY': coinmarketcap['api_key'],
                        }
                    }
                )
                .then((res) => {
                    const data = res.data.data[fromCurrency].quote[convCurrency];
                    const truncatedPriceStr = truncate_number(data.price, 3);
                    const rate = parseFloat(truncatedPriceStr);

                    console.log(`Data fetched from ${serviceName}: ${fromCurrency} -> ${convCurrency}, Rate: ${rate}`);

                    return {
                        from_currency: fromCurrency,
                        conv_currency: convCurrency,
                        rate: rate,
                        date: new Date(data['last_updated']).toISOString().substring(0, 10),
                    };
                })
                .catch((err) => {
                    console.error(err);
                    return null;
                });
            });
        });

        const flattenedPromises = promises.flat();
        const results = await Promise.all(flattenedPromises);

        return results.filter(result => result !== null);
    }
};
