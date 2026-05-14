const { mainKeyboard } = require('../keyboards/mainKeyboard');
const { STATES, getState, setState, resetState } = require('../states/dialogFSM');
const { Keyboard } = require('vk-io');
const { classifyReview } = require('../services/classifier');
const { saveReview, getStats, getAllReviews } = require('../services/storage');
const fs = require('fs');
const path = require('path');

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


// ─── FAQ: данные ─────────────────────────────────────────────────────────

const faqData = {
  'Отправка и доставка': [
    {
      id: 'delivery_1',
      question: 'Как отследить посылку?',
      shortLabel: '1. Отследить посылку',
      answer: 'Отследить отправление можно на официальном сайте «Почты России» по трек-номеру в разделе отслеживания.',
    },
    {
      id: 'delivery_2',
      question: 'Почему посылка задерживается?',
      shortLabel: '2. Задержка посылки',
      answer: 'Срок доставки может увеличиться из-за погодных условий, высокой нагрузки на сортировочные центры или неточностей в адресных данных.',
    },
    {
      id: 'delivery_3',
      question: 'Что делать, если посылка не пришла в срок?',
      shortLabel: '3. Посылка не пришла',
      answer: 'Рекомендуется проверить статус отправления по трек-номеру. Если срок доставки существенно превышен, следует обратиться в службу поддержки или подать обращение.',
    },
    {
      id: 'delivery_4',
      question: 'Можно ли изменить адрес доставки?',
      shortLabel: '4. Изменить адрес',
      answer: 'Изменение адреса доставки возможно не для всех отправлений. Актуальную информацию лучше уточнить через официальный сайт или службу поддержки.',
    },
    {
      id: 'delivery_5',
      question: 'Где узнать срок хранения посылки?',
      shortLabel: '5. Срок хранения',
      answer: 'Срок хранения можно посмотреть в извещении, в личном кабинете на сайте или уточнить в отделении почтовой связи.',
    },
  ],

  'Отделения': [
    {
      id: 'office_1',
      question: 'Как узнать режим работы отделения?',
      shortLabel: '1. Режим работы',
      answer: 'Режим работы отделений можно посмотреть на официальном сайте «Почты России» в разделе поиска отделений.',
    },
    {
      id: 'office_2',
      question: 'Как найти ближайшее отделение?',
      shortLabel: '2. Найти отделение',
      answer: 'Ближайшее отделение можно найти на сайте «Почты России» по адресу или индексу.',
    },
    {
      id: 'office_3',
      question: 'Что делать, если отделение закрыто?',
      shortLabel: '3. Отделение закрыто',
      answer: 'Если отделение временно закрыто, рекомендуется проверить информацию на сайте и обратиться в ближайшее доступное отделение.',
    },
    {
      id: 'office_4',
      question: 'Можно ли получить посылку в другом отделении?',
      shortLabel: '4. Другое отделение',
      answer: 'Возможность получения в другом отделении зависит от типа отправления и условий доставки.',
    },
    {
      id: 'office_5',
      question: 'Какие услуги доступны в отделении?',
      shortLabel: '5. Услуги отделения',
      answer: 'В отделении доступны отправка и получение писем и посылок, денежные переводы, оформление подписки и ряд дополнительных услуг.',
    },
  ],

  'Получение и оформление': [
    {
      id: 'receive_1',
      question: 'Какие документы нужны для получения посылки?',
      shortLabel: '1. Документы для получения',
      answer: 'Обычно требуется документ, удостоверяющий личность. В некоторых случаях может понадобиться извещение или код получения.',
    },
    {
      id: 'receive_2',
      question: 'Можно ли получить посылку без извещения?',
      shortLabel: '2. Без извещения',
      answer: 'Да, в ряде случаев получить отправление можно по паспорту и трек-номеру или по коду из SMS.',
    },
    {
      id: 'receive_3',
      question: 'Как оформить отправку посылки?',
      shortLabel: '3. Оформить отправку',
      answer: 'Для отправки нужно подготовить отправление, указать адрес получателя и передать его оператору в отделении либо оформить через онлайн-сервисы.',
    },
    {
      id: 'receive_4',
      question: 'Можно ли отправить посылку за границу?',
      shortLabel: '4. Отправка за границу',
      answer: 'Да, международные отправления доступны, но перечень стран и условия отправки нужно уточнять дополнительно.',
    },
    {
      id: 'receive_5',
      question: 'Что нельзя отправлять по почте?',
      shortLabel: '5. Запрещённые вложения',
      answer: 'Запрещены к пересылке опасные вещества, оружие, скоропортящиеся продукты и другие предметы, ограниченные правилами пересылки.',
    },
  ],
};

// ─── FAQ: клавиатуры ─────────────────────────────────────────────────────

// Клавиатура выбора категории FAQ
const faqCategoryKeyboard = Keyboard.builder()
  .textButton({
    label: '📦 Отправка и доставка',
    payload: { command: 'faq_category', value: 'Отправка и доставка' },
    color: Keyboard.PRIMARY_COLOR,
  })
  .row()
  .textButton({
    label: '🏢 Отделения',
    payload: { command: 'faq_category', value: 'Отделения' },
    color: Keyboard.PRIMARY_COLOR,
  })
  .row()
  .textButton({
    label: '📄 Получение и оформление',
    payload: { command: 'faq_category', value: 'Получение и оформление' },
    color: Keyboard.PRIMARY_COLOR,
  })
  .row()
  .textButton({
    label: '⬅ Назад',
    payload: { command: 'back_to_main' },
    color: Keyboard.SECONDARY_COLOR,
  })
  .oneTime(false);

// Функция создания клавиатуры с вопросами по категории
function buildFaqQuestionsKeyboard(category) {
  const keyboard = Keyboard.builder();

  faqData[category].forEach((item, index) => {
    keyboard.textButton({
      label: item.shortLabel,
      payload: { command: 'faq_question', category, id: item.id },
      color: Keyboard.SECONDARY_COLOR,
    });

    if (index !== faqData[category].length - 1) {
      keyboard.row();
    }
  });

  keyboard
    .row()
    .textButton({
      label: '⬅ К категориям',
      payload: { command: 'faq' },
      color: Keyboard.PRIMARY_COLOR,
    })
    .row()
    .textButton({
      label: '🏠 В главное меню',
      payload: { command: 'back_to_main' },
      color: Keyboard.SECONDARY_COLOR,
    });

  return keyboard.oneTime(false);
}


const ADMIN_ID = Number(process.env.ADMIN_ID);

async function handleMessage(context, vk) {
  const userId = context.senderId;
  const payload = context.messagePayload;
  const text = context.text?.trim() || '';
  const { step, data } = getState(userId);

  console.log('userId:', userId, '| step:', step, '| text:', text, '| payload:', payload);

     // ─── Команда администратора /stats ───────────────────────────────────
  if (text === '/stats') {
    if (userId !== ADMIN_ID) {
      return context.send({
        message: 'У вас нет доступа к этой команде.',
        keyboard: mainKeyboard,
      });
    }

    const stats = getStats();

    const positive = stats.sentiments.find((s) => s.sentiment === 'positive')?.count || 0;
    const negative = stats.sentiments.find((s) => s.sentiment === 'negative')?.count || 0;
    const neutral = stats.sentiments.find((s) => s.sentiment === 'neutral')?.count || 0;

    return context.send({
      message:
        '📊 Статистика по отзывам:\n\n' +
        `За сегодня: ${stats.today}\n` +
        `За 7 дней: ${stats.week}\n` +
        `Всего: ${stats.total}\n` +
        `Средний рейтинг: ${stats.avgRating}\n\n` +
        'Тональность:\n' +
        `🟢 Положительные: ${positive}\n` +
        `🟡 Нейтральные: ${neutral}\n` +
        `🔴 Отрицательные: ${negative}`,
      keyboard: mainKeyboard,
    });
  }

  // ─── Команда администратора /export ──────────────────────────────────
  if (text === '/export') {
    if (userId !== ADMIN_ID) {
      return context.send({
        message: 'У вас нет доступа к этой команде.',
        keyboard: mainKeyboard,
      });
    }

    try {
      const reviews = getAllReviews();

      if (!reviews.length) {
        return context.send({
          message: 'В базе пока нет отзывов для экспорта.',
          keyboard: mainKeyboard,
        });
      }

      const exportDir = path.join(__dirname, '..', 'data');
      const exportPath = path.join(exportDir, 'reviews-export.csv');

      const headers = [
        'id',
        'user_id',
        'category',
        'rating',
        'text',
        'sentiment',
        'created_at',
        'track',
        'delivery_date',
        'office_address',
        'office_date',
        'staff_name',
        'staff_address',
        'staff_datetime'
      ];

      const escapeCsv = (value) => {
        if (value === null || value === undefined) return '""';
        return `"${String(value).replace(/"/g, '""')}"`;
      };

      const csvRows = [
        headers.join(','),
        ...reviews.map((review) =>
          headers.map((header) => escapeCsv(review[header])).join(',')
        ),
      ];

      fs.writeFileSync(exportPath, csvRows.join('\n'), 'utf8');

      try {
        const attachment = await vk.upload.messageDocument({
          peer_id: context.peerId,
          timeout: 60000,
          source: {
            value: fs.createReadStream(exportPath),
            filename: 'reviews-export.csv',
            contentType: 'text/csv',
          },
        });

        return context.send({
          message: `Экспорт готов: ${reviews.length} отзыв(ов). CSV-файл прикреплён к сообщению.`,
          attachment,
          keyboard: mainKeyboard,
        });
      } catch (uploadError) {
        console.error('Ошибка загрузки документа в VK:', uploadError);

        return context.send({
          message:
            `Экспорт готов: ${reviews.length} отзыв(ов).\n` +
            `CSV сохранён локально: ${exportPath}\n` +
            `Но отправить файл в чат не удалось: у токена нет нужных прав доступа.`,
          keyboard: mainKeyboard,
        });
      }
    } catch (error) {
      console.error('Ошибка при /export:', error);

      return context.send({
        message: `Ошибка при экспорте: ${error.message}`,
        keyboard: mainKeyboard,
      });
    }
  }

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

  // ─── Кнопка «Частые вопросы» ──────────────────────────────────────────
  if (payload?.command === 'faq') {
    setState(userId, STATES.WAITING_FAQ_CATEGORY, {});
    return context.send({
      message: 'Выберите категорию вопроса:',
      keyboard: faqCategoryKeyboard,
    });
  }

  // ─── Возврат в главное меню ───────────────────────────────────────────
  if (payload?.command === 'back_to_main') {
    resetState(userId);
    return context.send({
      message: 'Вы вернулись в главное меню.',
      keyboard: mainKeyboard,
    });
  }

    // ─── FAQ: выбор категории ─────────────────────────────────────────────
  if (step === STATES.WAITING_FAQ_CATEGORY && payload?.command === 'faq_category') {
    const category = payload.value;
    setState(userId, STATES.WAITING_FAQ_QUESTION, { faqCategory: category });

    return context.send({
      message: `Выберите вопрос из категории «${category}»:`,
      keyboard: buildFaqQuestionsKeyboard(category),
    });
  }

  // ─── FAQ: выбор вопроса ───────────────────────────────────────────────
  if (step === STATES.WAITING_FAQ_QUESTION && payload?.command === 'faq_question') {
    const category = payload.category;
    const questionId = payload.id;

    const selectedQuestion = faqData[category].find((item) => item.id === questionId);

    if (!selectedQuestion) {
      return context.send({
        message: 'Не удалось найти ответ на выбранный вопрос. Попробуйте ещё раз.',
        keyboard: faqCategoryKeyboard,
      });
    }

    return context.send({
      message:
        `❓ ${selectedQuestion.question}\n\n` +
        `✅ ${selectedQuestion.answer}\n\n` +
        `Вы можете выбрать другой вопрос или вернуться в главное меню.`,
      keyboard: buildFaqQuestionsKeyboard(category),
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
    const sentiment = classifyReview(text);

    const reviewData = {
      ...data,
      user_id: userId,
      text,
      sentiment,
      created_at: new Date().toISOString(),
    };

    saveReview(reviewData);

    resetState(userId);

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