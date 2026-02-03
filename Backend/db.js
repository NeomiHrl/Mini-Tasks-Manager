const mysql = require('mysql');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root', // שנה במידת הצורך
  password: '123456', // שנה במידת הצורך
  database: 'mini_task_manager',
});

module.exports = pool;