const fs = require('fs');
const path = require('path');
const hjson = require('hjson');
const schedule = require('node-schedule');
const cron = require('cron-validator');

const { validateCurrency } = require('./models/Currency.js');
const { create_table, pool } = require('./database/data.js');
const config = hjson.parse(fs.readFileSync('config.hjson', 'utf-8'));

async function main() {
    if (!config['schedule']) 
        throw new Error('The crontab schedule is not set.');
    else if (!cron.isValidCron(config['schedule'], { alias: true })) 
        throw new Error('The crontab is invalid.');
    
    const servicesDir = path.join(__dirname, 'services');
    const serviceFiles = fs.readdirSync(servicesDir)
        .filter(filename => filename.endsWith('.js'));

    const services = [];
    for (const file of serviceFiles) {
        const filePath = path.join(servicesDir, file);
        const moduleLoaded = require(filePath);

        if (typeof moduleLoaded.parseCurrencies === 'function') 
            services.push(moduleLoaded);
    }

    console.log('Loaded parser services:', serviceFiles);
    await create_table();

    schedule.scheduleJob(config['schedule'], async () => {
        console.log('Running scheduled task at:', new Date());

        for (const srv of services) {
            try {
                const result = await srv.parseCurrencies();
  
                if (result) {
                    try {
                        const currency = await validateCurrency(result);

                        await pool.query(
                            'INSERT INTO currency (from_currency, conv_currency, rate, date) ' +
                            'VALUES ($1, $2, $3, $4)', 
                            [
                                currency.from_currency,
                                currency.conv_currency,
                                currency.rate,
                                currency.date,
                            ]);
                    } catch (validationError) {
                        console.error(validationError);
                    }
                }
            } catch (err) {
                console.error(`Error in service ${srv.name || 'unknown'}:`, err);
            }
        }
    });

    console.log(`Scheduled task is running on schedule: ${config['schedule']}`);
}

main().catch(console.error);
