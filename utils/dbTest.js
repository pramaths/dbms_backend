// utils/dbTest.js
const pool = require('../config/db');

async function testDbConnection() {
    try {
        const connection = await pool.getConnection();

        try {
            const [results] = await connection.query('SELECT message FROM test_table WHERE id = 1');
            console.log('Retrieved message:', results[0].message);
        } catch (selectErr) {
            console.error('Error retrieving message:', selectErr);
        } finally {
            connection.release(); // Always release the connection back to the pool
        }
    } catch (err) {
        console.error('Error connecting to the database:', err);
    }
}

module.exports = testDbConnection;
