const fs = require('fs');
const path = require('path');
const hjson = require('hjson');
const schedule = require('node-schedule');
const cron = require('cron-validator');

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


        if (typeof moduleLoaded.parseCurrencies === 'function') {
            services.push(moduleLoaded);
        }
    }

    console.log('Loaded parser services:', serviceFiles);

    schedule.scheduleJob(config['schedule'], async () => {
        console.log('Running scheduled task at:', new Date());

        for (const srv of services) {
            try {
                const result = await srv.parseCurrencies();
                if (result)
                    console.log(`Result from ${srv.name || 'someService'}:`, result);
            } catch (err) {
                console.error(`Error in service ${srv.name || 'unknown'}:`, err);
            }
        }
    });

    console.log(`Scheduled task is running on schedule: ${config['schedule']}`);
}

main().catch(console.error);
