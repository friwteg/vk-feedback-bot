// Загружаем переменные окружения из .env
require('dotenv').config();

const { startBot } = require('./bot');

startBot();