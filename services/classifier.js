const positiveWords = [
  'хорошо',
  'отлично',
  'быстро',
  'удобно',
  'вежливо',
  'вежливый',
  'спасибо',
  'супер',
  'нравится',
  'доволен',
  'довольна',
  'качественно',
  'прекрасно',
  'замечательно',
  'оперативно',
  'приятно',
];

const negativeWords = [
  'плохо',
  'ужасно',
  'долго',
  'медленно',
  'грубо',
  'хамство',
  'проблема',
  'жалоба',
  'опоздание',
  'задержка',
  'потеряли',
  'сломано',
  'невозможно',
  'плохой',
  'недоволен',
  'недовольна',
];

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^а-яёa-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function classifyReview(text) {
  const words = tokenize(text);

  let score = 0;

  for (const word of words) {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  }

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

module.exports = { classifyReview };