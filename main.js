const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const cron = require('cron-validator');

const { validateCurrency } = require('./models/Currency.js');
const { create_table, pool } = require('./database/data.js');
const config = require('./utils/load_config.js')();

const services = [];
const servicesDir = path.join(__dirname, 'services');

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

        for (const srv of services) {
            const results = await srv.parseCurrencies();

            if (Array.isArray(results) && results.length > 0) {
                for (const result of results) {
                    try {
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
                    } catch (validationError) {
                        console.error(validationError);
                    }
                }
            } else {
                console.error("Data not received for writing to the database.");
            }            
        }
    });

    console.log(`Scheduled task is running on schedule: ${config['schedule']}`);
}

main().catch(console.error);
