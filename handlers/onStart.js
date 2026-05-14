const { mainKeyboard } = require('../keyboards/mainKeyboard');

async function handleStart(context) {
  await context.send({
    message:
      'Добро пожаловать! 👋\n\n' +
      'Это бот для приёма отзывов о работе «Почты России».\n\n' +
      'Нажмите кнопку «📝 Оставить отзыв», чтобы поделиться впечатлением о доставке, сотруднике или отделении.',
    keyboard: mainKeyboard,
  });
}

module.exports = { handleStart };