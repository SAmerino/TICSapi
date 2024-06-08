require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.HOSTDB,
    user: process.env.USERDB,
    password: process.env.PASSDB,
    database: process.env.DB,
    port: process.env.PORTDB,
});

module.exports = pool;