// utils/dbTest.js
const pool = require('../config/db');

function testDbConnection() {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database:', err);
            return;
        }
        console.log('Connected to the database successfully.');

            connection.query('SELECT message FROM test_table WHERE id = 1', (selectErr, results) => {
                connection.release();

                if (selectErr) {
                    console.error('Error retrieving message:', selectErr);
                    return;
                }

                console.log('Retrieved message:', results[0].message);
            });
      
    });
}

module.exports = testDbConnection;
