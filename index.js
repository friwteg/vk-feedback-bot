// Загружаем переменные окружения из .env
require('dotenv').config();
console.log('ADMIN_ID =', process.env.ADMIN_ID);
const { startBot } = require('./bot');

startBot();