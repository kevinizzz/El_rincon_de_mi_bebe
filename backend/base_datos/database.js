const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'acela.proxy.rlwy.net',
    user: 'root',
    password: 'EddrQHvBFthYZIVoLmMWoaQlpXNxJqNl',
    database: 'railway',
    port: 49567
});

module.exports = pool;