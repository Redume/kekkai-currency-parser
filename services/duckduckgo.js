const axios = require('axios');
const config = require('../utils/load_config.js')();
const { truncate_number } = require('../utils/truncate_number.js');

module.exports = {
    info: {
        name: 'DuckDuckGo',
    },
    parseCurrencies: async () => {
        const promises = config['currency']['fiat'].map(fromCurrency => {
            return config['currency']['fiat'].map(convCurrency => {
                if (fromCurrency === convCurrency) return Promise.resolve(null);

                const serviceName = module.exports.info.name;

                return axios.get(
                    `${config['currency']['services']['duckduckgo']['base_url']}${fromCurrency}/${convCurrency}`,
                )
                .then((res) => {
                    const regExp = new RegExp('\\(\\s*(.*)\\s*\\);$', 'mg');
                    const data = JSON.parse(
                        Array.from(res.data.matchAll(regExp))[0][1],
                    );
                    const truncatedPriceStr = truncate_number(data['to'][0]['mid'], 3);
                    const rate = parseFloat(truncatedPriceStr);

                    console.log(`Data fetched from ${serviceName}: ${fromCurrency} -> ${convCurrency}, Rate: ${rate}`);

                    return {
                        from_currency: fromCurrency,
                        conv_currency: convCurrency,
                        rate: rate,
                        date: new Date(data['timestamp']).toISOString().substring(0, 10),
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
