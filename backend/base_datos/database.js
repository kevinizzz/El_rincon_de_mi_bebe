const mysql = require('mysql2/promise');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión MySQL exitosa');
        connection.release();
    } catch (error) {
        console.error('❌ Error MySQL (detalles):', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            stack: error.stack
        });
    }
})();

module.exports = pool;