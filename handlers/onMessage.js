const { mainKeyboard } = require('../keyboards/mainKeyboard');
const { STATES, getState, setState, resetState } = require('../states/dialogFSM');
const { Keyboard } = require('vk-io');

const categoryKeyboard = Keyboard.builder()
  .textButton({ label: '🚚 Доставка', payload: { command: 'category', value: 'Доставка' }, color: Keyboard.PRIMARY_COLOR })
  .textButton({ label: '👤 Сотрудник', payload: { command: 'category', value: 'Сотрудник' }, color: Keyboard.PRIMARY_COLOR })
  .row()
  .textButton({ label: '🏢 Отделение', payload: { command: 'category', value: 'Отделение' }, color: Keyboard.PRIMARY_COLOR })
  .oneTime(false);

const ratingKeyboard = Keyboard.builder()
  .textButton({ label: '1 ⭐', payload: { command: 'rating', value: 1 }, color: Keyboard.NEGATIVE_COLOR })
  .textButton({ label: '2 ⭐', payload: { command: 'rating', value: 2 }, color: Keyboard.NEGATIVE_COLOR })
  .textButton({ label: '3 ⭐', payload: { command: 'rating', value: 3 }, color: Keyboard.SECONDARY_COLOR })
  .textButton({ label: '4 ⭐', payload: { command: 'rating', value: 4 }, color: Keyboard.POSITIVE_COLOR })
  .textButton({ label: '5 ⭐', payload: { command: 'rating', value: 5 }, color: Keyboard.POSITIVE_COLOR })
  .oneTime(true);

// Кнопка «Пропустить» для необязательных шагов
const skipKeyboard = Keyboard.builder()
  .textButton({ label: '⏭ Пропустить', payload: { command: 'skip' }, color: Keyboard.SECONDARY_COLOR })
  .oneTime(true);

const removeKeyboard = Keyboard.keyboard([]);


async function handleMessage(context, vk) {
  const userId = context.senderId;
  const payload = context.messagePayload;
  const text = context.text?.trim() || '';
  const { step, data } = getState(userId);

  console.log('userId:', userId, '| step:', step, '| text:', text, '| payload:', payload);

  // ─── Кнопка «Оставить отзыв» ───────────────────────────────────────────
  if (payload?.command === 'start_review') {
    setState(userId, STATES.WAITING_CATEGORY, {});
    return context.send({ message: 'Выберите тему отзыва:', keyboard: categoryKeyboard });
  }

  // ─── Кнопка «Помощь» ───────────────────────────────────────────────────
  if (payload?.command === 'help') {
    return context.send({
      message:
        'Этот чат-бот создан для приёма отзывов о работе «Почты России».\n\n' +
        'Как оставить отзыв:\n' +
        '1. Нажмите «📝 Оставить отзыв».\n' +
        '2. Выберите тему (доставка, сотрудник или отделение).\n' +
        '3. Ответьте на уточняющие вопросы.\n' +
        '4. Поставьте оценку от 1 до 5.\n' +
        '5. Напишите комментарий.\n\n' +
        'Ваш отзыв будет сохранён и учтён при анализе качества сервиса.',
      keyboard: mainKeyboard,
    });
  }

  // ─── Шаг: выбор категории ──────────────────────────────────────────────
  if (step === STATES.WAITING_CATEGORY && payload?.command === 'category') {
    const category = payload.value;

    if (category === 'Доставка') {
      setState(userId, STATES.WAITING_DELIVERY_TRACK, { category });
      return context.send({
        message: 'Укажите трек-номер посылки.\nЕсли его нет — нажмите «Пропустить».',
        keyboard: skipKeyboard,
      });
    }

    if (category === 'Отделение') {
      setState(userId, STATES.WAITING_OFFICE_ADDRESS, { category });
      return context.send({
        message: 'Укажите адрес отделения:',
        keyboard: removeKeyboard,
      });
    }

    if (category === 'Сотрудник') {
      setState(userId, STATES.WAITING_STAFF_NAME, { category });
      return context.send({
        message: 'Укажите ФИО сотрудника:',
        keyboard: removeKeyboard,
      });
    }
  }

        // ─── Доставка: трек-номер (необязательно) ─────────────────────────────
    if (step === STATES.WAITING_DELIVERY_TRACK) {
        const track = payload?.command === 'skip' ? null : text;

        setState(userId, STATES.WAITING_DELIVERY_DATE, { ...data, track });
        return context.send({
          message: 'Укажите дату получения посылки (например, 13.05.2025).\nЕсли не помните — нажмите «Пропустить».',
          keyboard: skipKeyboard,
        });
    }

    // ─── Доставка: дата получения (необязательно) ─────────────────────────
    if (step === STATES.WAITING_DELIVERY_DATE) {
        const deliveryDate = payload?.command === 'skip' ? null : text;
        
        setState(userId, STATES.WAITING_RATING, { ...data, deliveryDate });
        return context.send({ message: 'Поставьте оценку от 1 до 5:', keyboard: ratingKeyboard });
    }

  // ─── Отделение: адрес (обязательно) ───────────────────────────────────
  if (step === STATES.WAITING_OFFICE_ADDRESS) {
    if (!text) {
      return context.send({ message: 'Пожалуйста, введите адрес отделения:' });
    }
    setState(userId, STATES.WAITING_OFFICE_DATE, { ...data, officeAddress: text });
    return context.send({
      message: 'Укажите дату последнего визита (например, 13.05.2025).\nЕсли не помните — нажмите «Пропустить».',
      keyboard: skipKeyboard,
    });
  }

  // ─── Отделение: дата (необязательно) ──────────────────────────────────
  if (step === STATES.WAITING_OFFICE_DATE) {
    const officeDate = payload?.command === 'skip' ? null : text;
    setState(userId, STATES.WAITING_RATING, { ...data, officeDate });
    return context.send({ message: 'Поставьте оценку от 1 до 5:', keyboard: ratingKeyboard });
  }

  // ─── Сотрудник: ФИО (обязательно) ────────────────────────────────────
  if (step === STATES.WAITING_STAFF_NAME) {
    if (!text) {
      return context.send({ message: 'Пожалуйста, введите ФИО сотрудника:' });
    }
    setState(userId, STATES.WAITING_STAFF_ADDRESS, { ...data, staffName: text });
    return context.send({
      message: 'Укажите адрес отделения, где работает сотрудник:',
      keyboard: removeKeyboard,
    });
  }

  // ─── Сотрудник: адрес отделения (обязательно) ────────────────────────
  if (step === STATES.WAITING_STAFF_ADDRESS) {
    if (!text) {
      return context.send({ message: 'Пожалуйста, введите адрес отделения:' });
    }
    setState(userId, STATES.WAITING_STAFF_DATETIME, { ...data, staffAddress: text });
    return context.send({
      message: 'Укажите дату обращения к сотруднику (например, 13.05.2025 14:30).\nЕсли не помните — нажмите «Пропустить».',
      keyboard: skipKeyboard,
    });
  }

  // ─── Сотрудник: дата обращения (необязательно) ────────────────────────
  if (step === STATES.WAITING_STAFF_DATETIME) {
    const staffDatetime = payload?.command === 'skip' ? null : text;
    setState(userId, STATES.WAITING_RATING, { ...data, staffDatetime });
    return context.send({ message: 'Поставьте оценку от 1 до 5:', keyboard: ratingKeyboard });
  }

  // ─── Общий шаг: оценка ────────────────────────────────────────────────
  if (step === STATES.WAITING_RATING && payload?.command === 'rating') {
    setState(userId, STATES.WAITING_TEXT, { ...data, rating: payload.value });
    return context.send({
      message: `Оценка: ${payload.value} ⭐\n\nТеперь напишите ваш комментарий:`,
      keyboard: removeKeyboard,
    });
  }

  // ─── Общий шаг: текст отзыва ──────────────────────────────────────────
  if (step === STATES.WAITING_TEXT && text) {
    const reviewData = { ...data, text };
    resetState(userId);
    console.log('Новый отзыв:', reviewData); // временный лог для проверки
    return context.send({
      message: 'Спасибо, ваш отзыв принят и будет учтён при улучшении сервиса! 🙏',
      keyboard: mainKeyboard,
    });
  }

  // ─── Любой другой случай ──────────────────────────────────────────────
  return context.send({
    message: 'Нажмите кнопку «📝 Оставить отзыв», чтобы оставить отзыв.',
    keyboard: mainKeyboard,
  });
}

module.exports = { handleMessage };