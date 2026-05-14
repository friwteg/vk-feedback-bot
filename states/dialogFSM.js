const userStates = new Map();

const STATES = {
  IDLE: 'IDLE',
  WAITING_CATEGORY: 'WAITING_CATEGORY',

  // Доставка
  WAITING_DELIVERY_TRACK: 'WAITING_DELIVERY_TRACK',
  WAITING_DELIVERY_DATE: 'WAITING_DELIVERY_DATE',

  // Отделение
  WAITING_OFFICE_ADDRESS: 'WAITING_OFFICE_ADDRESS',
  WAITING_OFFICE_DATE: 'WAITING_OFFICE_DATE',

  // Сотрудник
  WAITING_STAFF_NAME: 'WAITING_STAFF_NAME',
  WAITING_STAFF_ADDRESS: 'WAITING_STAFF_ADDRESS',
  WAITING_STAFF_DATETIME: 'WAITING_STAFF_DATETIME',

  // Общие шаги
  WAITING_RATING: 'WAITING_RATING',
  WAITING_TEXT: 'WAITING_TEXT',
};

function getState(userId) {
  return userStates.get(userId) || { step: STATES.IDLE, data: {} };
}

function setState(userId, step, data = {}) {
  userStates.set(userId, { step, data });
}

function resetState(userId) {
  userStates.delete(userId);
}

module.exports = { STATES, getState, setState, resetState };