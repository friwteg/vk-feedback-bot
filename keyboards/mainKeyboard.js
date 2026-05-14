const { Keyboard } = require('vk-io');

const mainKeyboard = Keyboard.builder()
  .textButton({
    label: '📝 Оставить отзыв',
    payload: { command: 'start_review' },
    color: Keyboard.PRIMARY_COLOR,
  })
  .row()
  .textButton({
    label: '❓ Помощь',
    payload: { command: 'help' },
    color: Keyboard.SECONDARY_COLOR,
  })
  .urlButton({
    label: '🌐 Наш сайт',
    url: 'https://www.pochta.ru',
  })
  .oneTime(false);

module.exports = { mainKeyboard };