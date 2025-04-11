const pg = require('pg');
const fs = require('fs');
const hjson = require('hjson');

const config = hjson.parse(fs.readFileSync('config.hjson', 'utf-8'));

const pool = new pg.Pool({
  user: config['database']['user'],
  host: config['database']['host'],
  database: config['database']['name'],
  password: config['database']['password'],
  port: 5432
});

async function create_table() {
  const schema = fs.readFileSync(
      '/database/schemas/data.sql',
      'utf8',
  );

  const queries = schema
      .split(';')
      .map((query) => query.trim())
      .filter((query) => query);

  for (const query of queries) {
      try {
          await pool.query(query);
      } catch (err) {
          console.error(err);
      }
  }
}


module.exports = { pool, create_table };
