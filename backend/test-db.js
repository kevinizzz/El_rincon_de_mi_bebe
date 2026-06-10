const db = require('./base_datos/database');

async function test() {
    try {
        const [rows] = await db.query('SELECT 1+1 as result');
        console.log('✅ Conexión exitosa:', rows);
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}
test();