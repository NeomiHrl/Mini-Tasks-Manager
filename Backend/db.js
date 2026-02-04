const mysql = require('mysql');

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root', 
  password: '123456', 
  database: 'mini_task_manager',
});

module.exports = pool;