const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const cron = require('cron-validator');

const { validateCurrency } = require('./models/Currency.js');
const { create_table, pool } = require('./database/data.js');
const config = require('./utils/load_config.js')();

const services = [];
const servicesDir = path.join(__dirname, 'services');

let fiatFetched = false;
let cryptoFetched = false;

async function main() {
    if (!config['schedule']) 
        throw new Error('The crontab schedule is not set.');
    else if (!cron.isValidCron(config['schedule'], { alias: true })) 
        throw new Error('The crontab is invalid.');

    console.log('Loading services...');
    config['currency']['services']['enabled'].forEach(serviceName => {
        const servicePath = path.join(servicesDir, `${serviceName}.js`);
        if (fs.existsSync(servicePath)) {
            const serviceModule = require(servicePath);

            services.push(serviceModule);
            console.log(`Service ${serviceName} loaded successfully`);
        } else {
            console.error(`Service file for ${serviceName} not found at ${servicePath}`);
        }
    });

    await create_table();

    schedule.scheduleJob(config['schedule'], async () => {
        console.log('Running scheduled task at:', new Date());

        fiatFetched = false;
        cryptoFetched = false;

        for (const srv of services) {
            const results = await srv.parseCurrencies();

            if (Array.isArray(results) && results.length > 0) {
                console.log(`Data received from ${srv.info.name || 'unknown service'}:`, results.length, 'items');

                for (const result of results) {
                    try {
                        if (srv.info.type === 'fiat' && fiatFetched) {
                            console.log('Skipping fiat currency collection as data has already been fetched.');
                            continue;
                        }

                        if (srv.info.type === 'crypto' && cryptoFetched) {
                            console.log('Skipping crypto currency collection as data has already been fetched.');
                            continue;
                        }

                        const currency = await validateCurrency(result);
            
                        await pool.query(
                            'INSERT INTO currency (from_currency, conv_currency, rate, date) VALUES ($1, $2, $3, $4)', 
                            [
                                currency.from_currency,
                                currency.conv_currency,
                                currency.rate,
                                currency.date,
                            ]
                        );
                        console.log(`Inserted data for ${currency.from_currency} -> ${currency.conv_currency}, Rate: ${currency.rate}`);
                    } catch (validationError) {
                        console.error('Validation failed for data:', result);
                        console.error(validationError);
                    }
                }

                if (srv.info.type === 'crypto') {
                    cryptoFetched = true;
                    console.log('Crypto currency data fetched successfully.');
                }

                if (srv.info.type === 'fiat') {
                    fiatFetched = true;
                    console.log('Fiat currency data fetched successfully.');
                } 
            } else {
                console.error("Data not received for writing to the database.");
            }            
        }
    });

    console.log(`Scheduled task is running on schedule: ${config['schedule']}`);
}

main().catch(console.error);
