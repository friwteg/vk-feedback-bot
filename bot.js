const { VK } = require('vk-io');
const { handleMessage } = require('./handlers/onMessage');
const { handleStart } = require('./handlers/onStart');

// Создаём VK-клиент с токеном из .env
const vk = new VK({
  token: process.env.VK_TOKEN,
});

async function startBot() {
  const { updates } = vk;

  updates.on('message_new', async (context) => {
    // Игнорируем исходящие сообщения и беседы
    if (context.isOutbox) return;
    if (context.peerType !== 'user') return;

    const text = context.text?.trim().toLowerCase() || '';

    // Приветствие при первом запуске или команде /start
    if (text === 'начать' || text === '/start' || context.eventType === 'message_new' && !context.text) {
      return handleStart(context);
    }

    // Все остальные сообщения передаём основному обработчику
    return handleMessage(context, vk);
  });

  // Запускаем Long Poll — бот начинает слушать события от ВК
  await updates.startPolling();
  console.log('Бот запущен и слушает сообщения...');
}

module.exports = { startBot, vk };