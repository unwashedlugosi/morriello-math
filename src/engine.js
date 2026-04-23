// Divide Fractions engine (Ms. Morriello's Chapter 12 / textbook Chapter 10)
// 12.1 Fractions as Division
// 12.2 Mixed Numbers as Quotients
// 12.3 Divide Whole Numbers by Unit Fractions
// 12.4 Divide Unit Fractions by Whole Numbers
// 12.5 Problem Solving with Fraction Division

// ===== MATH UTILITIES =====

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

export function simplifyFrac(num, den) {
  if (num === 0) return { num: 0, den: 1 };
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export function toMixed(num, den) {
  const s = simplifyFrac(num, den);
  const whole = Math.floor(s.num / s.den);
  const rem = s.num - whole * s.den;
  if (rem === 0) return { whole, num: 0, den: 1 };
  const rs = simplifyFrac(rem, s.den);
  return { whole, num: rs.num, den: rs.den };
}

export function formatFrac(whole, num, den) {
  if (num === 0 && whole === 0) return '0';
  if (num === 0) return `${whole}`;
  if (whole === 0) return `${num}/${den}`;
  return `${whole} ${num}/${den}`;
}

export function formatFracObj(f) {
  return formatFrac(f.whole || 0, f.num, f.den);
}

// ===== RANDOM HELPERS =====

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== TOPICS =====

export const TOPICS = {
  'fractions-as-division': { name: 'Fractions as Division', icon: '=' },
  'mixed-quotients': { name: 'Mixed Number Quotients', icon: '#' },
  'whole-by-unit-frac': { name: 'Whole ÷ Unit Fraction', icon: '!' },
  'unit-frac-by-whole': { name: 'Unit Fraction ÷ Whole', icon: '?' },
  'word-problems': { name: 'Word Problems', icon: 'W' },
};

export const TOPIC_LIST = Object.keys(TOPICS);

// ===== LEVELS & XP =====

export const LEVELS = [
  { level: 1, name: 'Learner', xp: 0 },
  { level: 2, name: 'Student', xp: 30 },
  { level: 3, name: 'Solver', xp: 75 },
  { level: 4, name: 'Expert', xp: 150 },
  { level: 5, name: 'Scholar', xp: 250 },
  { level: 6, name: 'Master', xp: 400 },
  { level: 7, name: 'Champion', xp: 600 },
  { level: 8, name: 'Legend', xp: 850 },
  { level: 9, name: 'Sage', xp: 1200 },
];

export function getLevelForXP(xp) {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) level = l;
  }
  return level;
}

export function getXPProgress(xp) {
  const current = getLevelForXP(xp);
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  const xpInLevel = next ? xp - current.xp : 0;
  const xpForLevel = next ? next.xp - current.xp : 1;
  const progress = next ? xpInLevel / xpForLevel : 1;
  return { current, next, progress, xpInLevel, xpForLevel };
}

export function calculateXP({ correct, difficulty, firstTry, timeMs, streak }) {
  if (!correct) return 1; // participation XP
  let xp = 5;
  if (difficulty >= 2) xp += 3;
  if (firstTry) xp += 2;
  if (streak >= 5) xp += 1;
  if (streak >= 10) xp += 2;
  if (timeMs < 15000) xp += 1; // speed bonus
  return xp;
}

export function getStreakMessage(streak) {
  if (streak >= 10) return 'LEGENDARY!';
  if (streak >= 7) return 'UNSTOPPABLE!';
  if (streak >= 5) return 'On fire!';
  if (streak >= 3) return 'Hat trick!';
  return null;
}

// ===== TOPIC HISTORY & MASTERY =====

export function updateTopicHistory(history, topic, correct, difficulty) {
  const h = { ...history };
  if (!h[topic]) h[topic] = { results: [], easy_correct: 0, hard_correct: 0, total: 0 };
  h[topic] = { ...h[topic] };
  h[topic].results = [...h[topic].results.slice(-9), correct];
  h[topic].total++;
  if (correct) {
    if (difficulty >= 2) h[topic].hard_correct++;
    else h[topic].easy_correct++;
  }
  return h;
}

export function checkSlidingMastery(history, topic) {
  const h = history[topic];
  if (!h || h.results.length < 3) return null;
  const last5 = h.results.slice(-5);
  const correct5 = last5.filter(Boolean).length;
  if (correct5 >= 4 && h.hard_correct >= 1) return 'mastered';
  if (correct5 >= 3) return 'learning';
  if (correct5 <= 1) return 'needs-work';
  return null;
}

export function selectSessionTopic(mastery, history, recentTopics) {
  // Weight topics — word problems get heavy emphasis once everything is mastered
  const allMastered = TOPIC_LIST.every(t => mastery[t] === 'mastered');
  const weights = {};
  for (const topic of TOPIC_LIST) {
    const m = mastery[topic] || 'untested';
    if (m === 'needs-work') weights[topic] = 5;
    else if (m === 'learning') weights[topic] = 3;
    else if (m === 'untested') weights[topic] = 4;
    else if (allMastered && topic === 'word-problems') weights[topic] = 6;
    else weights[topic] = 1;
  }
  // Reduce weight of recently seen topics
  for (const t of recentTopics.slice(-2)) {
    if (weights[t]) weights[t] = Math.max(1, weights[t] - 2);
  }
  // Weighted random pick
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [topic, w] of entries) {
    r -= w;
    if (r <= 0) return topic;
  }
  return entries[0][0];
}

// ===== BADGES =====

export const BADGE_DEFS = [
  { id: 'first-session', name: 'First Session', desc: 'Complete your first practice session' },
  { id: 'streak-5', name: 'Hot Streak', desc: 'Get 5 in a row' },
  { id: 'streak-10', name: 'On Fire', desc: 'Get 10 in a row' },
  { id: 'perfect-session', name: 'Flawless', desc: 'Get every problem right in a session' },
  { id: 'speed-demon', name: 'Speed Demon', desc: 'Answer 3 correctly in under 10 seconds each' },
];

export function checkNewBadges(profile, sessionData) {
  const existing = new Set(profile.badges || []);
  const newBadges = [];
  if (!existing.has('first-session')) newBadges.push('first-session');
  if (!existing.has('streak-5') && sessionData.streak >= 5) newBadges.push('streak-5');
  if (!existing.has('streak-10') && sessionData.streak >= 10) newBadges.push('streak-10');
  if (!existing.has('perfect-session') && sessionData.totalCorrect === sessionData.totalAttempted && sessionData.totalAttempted >= 10) {
    newBadges.push('perfect-session');
  }
  return newBadges;
}

// ===== ANSWER CHECKING =====

export function checkProblemAnswer(problem, answer) {
  const expected = problem.answer;

  if (problem.inputType === 'number') {
    const userNum = parseFloat(String(answer).replace(/,/g, ''));
    if (isNaN(userNum)) return false;
    return Math.abs(userNum - expected) < 0.001;
  }

  if (problem.inputType === 'fraction') {
    const uw = parseInt(answer.whole) || 0;
    const un = parseInt(answer.num) || 0;
    const ud = parseInt(answer.den) || 1;
    if (ud === 0) return false;

    const ew = expected.whole || 0;
    const en = expected.num;
    const ed = expected.den;

    // Convert both to improper fractions for comparison
    const userImproper = uw * ud + un;
    const expectedImproper = ew * ed + en;

    if (userImproper * ed === expectedImproper * ud) {
      // Check if simplified
      if (problem.requireSimplified) {
        const g = gcd(un, ud);
        if (g > 1 && un > 0) return 'not-simplified';
      }
      // Check if mixed number form when needed
      if (problem.requireMixed && un >= ud && uw === 0) return 'not-mixed';
      return true;
    }
    return false;
  }

  if (problem.inputType === 'choice') {
    return String(answer) === String(expected);
  }

  return false;
}

// ===== PROBLEM ID =====

let problemCounter = 0;
function makeId() {
  return `p_${Date.now()}_${problemCounter++}`;
}

// ===== 10.1: FRACTIONS AS DIVISION =====

function gen_10_1(hard = false) {
  if (hard) {
    // Harder: which division gives this fraction?
    const den = pick([3, 4, 5, 6, 7, 8, 9, 10]);
    const num = randInt(1, den - 1);
    const s = simplifyFrac(num, den);
    return {
      id: makeId(), topic: 'fractions-as-division', type: 'computation',
      difficulty: 2,
      question: `${s.num}/${s.den} is the same as which division problem?`,
      inputType: 'choice',
      choices: [`${s.num} ÷ ${s.den}`, `${s.den} ÷ ${s.num}`, `${s.num} × ${s.den}`, `1 ÷ ${s.num * s.den}`],
      answer: `${s.num} ÷ ${s.den}`,
      explanation: [
        `A fraction is another way to write division.`,
        `${s.num}/${s.den} means ${s.num} ÷ ${s.den}.`,
        `The numerator is the dividend (what gets divided) and the denominator is the divisor (what you divide by).`,
      ],
      hint: `The numerator is the number being divided. The denominator is what you divide by.`,
    };
  }

  // Basic: a ÷ b = ?  (where a < b so answer is a fraction)
  const b = pick([2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const a = randInt(1, b - 1);
  const s = simplifyFrac(a, b);
  return {
    id: makeId(), topic: 'fractions-as-division', type: 'computation',
    difficulty: 1,
    question: `${a} ÷ ${b} = ?`,
    inputType: 'fraction',
    answer: { whole: 0, num: s.num, den: s.den },
    requireSimplified: true,
    explanation: [
      `When you divide ${a} by ${b}, you get the fraction ${a}/${b}.`,
      a !== s.num ? `Simplify: ${a}/${b} = ${s.num}/${s.den}.` : `${a}/${b} is already in simplest form.`,
    ],
    hint: `Dividing a smaller number by a larger number gives you a fraction. The dividend becomes the numerator.`,
  };
}

// ===== 10.2: MIXED NUMBERS AS QUOTIENTS =====

function gen_10_2(hard = false) {
  const divisors = hard ? [3, 4, 5, 6, 7, 8, 9] : [2, 3, 4, 5, 6];
  const b = pick(divisors);
  // Make sure a > b and doesn't divide evenly
  let a;
  do {
    a = randInt(b + 1, hard ? b * 8 : b * 5);
  } while (a % b === 0);

  const mixed = toMixed(a, b);

  if (hard && Math.random() < 0.4) {
    // Comparison word problem
    const whole = Math.floor(a / b);
    const compareVal = whole + (Math.random() < 0.5 ? 0 : 1);
    const actualDecimal = a / b;
    let correctAnswer;
    if (actualDecimal > compareVal) correctAnswer = 'greater than';
    else if (actualDecimal < compareVal) correctAnswer = 'less than';
    else correctAnswer = 'equal to';

    return {
      id: makeId(), topic: 'mixed-quotients', type: 'word-problem',
      difficulty: 2,
      question: `${a} ÷ ${b} is ${correctAnswer === 'greater than' ? '___' : correctAnswer === 'less than' ? '___' : '___'} ${compareVal}. Is the quotient greater than, less than, or equal to ${compareVal}?`,
      inputType: 'choice',
      choices: ['greater than', 'less than', 'equal to'],
      answer: correctAnswer,
      explanation: [
        `${a} ÷ ${b} = ${formatFracObj(mixed)}.`,
        `${formatFracObj(mixed)} is ${correctAnswer} ${compareVal}.`,
      ],
      hint: `First divide ${a} by ${b} to get a mixed number, then compare.`,
    };
  }

  return {
    id: makeId(), topic: 'mixed-quotients', type: 'computation',
    difficulty: hard ? 2 : 1,
    question: `${a} ÷ ${b} = ? (Write as a mixed number)`,
    inputType: 'fraction',
    answer: mixed,
    requireSimplified: true,
    requireMixed: true,
    explanation: [
      `Divide: ${a} ÷ ${b}.`,
      `${b} goes into ${a} ${Math.floor(a / b)} times (${Math.floor(a / b)} × ${b} = ${Math.floor(a / b) * b}).`,
      `Remainder: ${a} - ${Math.floor(a / b) * b} = ${a % b}.`,
      `So ${a} ÷ ${b} = ${formatFracObj(mixed)}.`,
    ],
    hint: `How many times does ${b} go into ${a}? The leftover becomes the fraction.`,
  };
}

// ===== 12.3: DIVIDE WHOLE NUMBER BY UNIT FRACTION =====

function gen_10_3(hard = false) {
  const dens = hard ? [2, 3, 4, 5, 6, 8, 10, 12] : [2, 3, 4, 5, 6];
  const den = pick(dens);
  const whole = hard ? randInt(5, 20) : randInt(1, 8);
  const answer = whole * den;

  // Word problem variants for hard mode
  if (hard && Math.random() < 0.5) {
    const scenarios = [
      {
        q: `A rope is ${whole} feet long. You cut it into pieces that are each 1/${den} of a foot long. How many pieces do you get?`,
        hint: `How many 1/${den}-foot pieces fit into ${whole} feet?`,
      },
      {
        q: `You have ${whole} pizzas. Each person eats 1/${den} of a pizza. How many people can eat?`,
        hint: `How many servings of 1/${den} pizza are in ${whole} whole pizzas?`,
      },
      {
        q: `A trail is ${whole} miles long. There are markers every 1/${den} of a mile. How many markers are there?`,
        hint: `How many 1/${den}-mile sections fit in ${whole} miles?`,
      },
      {
        q: `You have ${whole} cups of flour. Each batch of cookies needs 1/${den} cup. How many batches can you make?`,
        hint: `How many 1/${den}-cup portions are in ${whole} cups?`,
      },
    ];
    const scenario = pick(scenarios);
    return {
      id: makeId(), topic: 'whole-by-unit-frac', type: 'word-problem',
      difficulty: 2,
      question: scenario.q,
      inputType: 'number',
      answer,
      explanation: [
        `This is ${whole} ÷ 1/${den}.`,
        `To divide by a unit fraction, multiply by the denominator.`,
        `${whole} ÷ 1/${den} = ${whole} × ${den} = ${answer}.`,
      ],
      hint: scenario.hint,
    };
  }

  return {
    id: makeId(), topic: 'whole-by-unit-frac', type: 'computation',
    difficulty: hard ? 2 : 1,
    question: `${whole} ÷ 1/${den} = ?`,
    inputType: 'number',
    answer,
    explanation: [
      `To divide by a unit fraction, flip it and multiply.`,
      `1/${den} flipped is ${den}/1 = ${den}.`,
      `${whole} × ${den} = ${answer}.`,
      `Think about it: how many 1/${den}-size pieces fit in ${whole} wholes? ${answer}!`,
    ],
    hint: `Dividing by 1/${den} is the same as multiplying by ${den}. How many 1/${den} pieces fit in ${whole}?`,
  };
}

// ===== 12.4: DIVIDE UNIT FRACTION BY WHOLE NUMBER =====

function gen_10_4(hard = false) {
  const dens = hard ? [2, 3, 4, 5, 6, 8, 10, 12] : [2, 3, 4, 5, 6];
  const den = pick(dens);
  const whole = hard ? randInt(3, 10) : randInt(2, 5);
  const answerDen = den * whole;
  // Simplify answer
  const s = simplifyFrac(1, answerDen);

  if (hard && Math.random() < 0.5) {
    const scenarios = [
      {
        q: `You have 1/${den} of a pound of trail mix. You share it equally among ${whole} friends. How much does each friend get?`,
        hint: `Divide 1/${den} into ${whole} equal parts.`,
      },
      {
        q: `A piece of fabric is 1/${den} of a yard long. You cut it into ${whole} equal pieces. How long is each piece?`,
        hint: `What is 1/${den} ÷ ${whole}?`,
      },
      {
        q: `You have 1/${den} of a gallon of paint. You pour it equally into ${whole} cans. How much is in each can?`,
        hint: `Split 1/${den} into ${whole} equal parts.`,
      },
    ];
    const scenario = pick(scenarios);
    return {
      id: makeId(), topic: 'unit-frac-by-whole', type: 'word-problem',
      difficulty: 2,
      question: scenario.q,
      inputType: 'fraction',
      answer: { whole: 0, num: s.num, den: s.den },
      requireSimplified: true,
      explanation: [
        `This is 1/${den} ÷ ${whole}.`,
        `To divide a fraction by a whole number, multiply the denominator by that number.`,
        `1/${den} ÷ ${whole} = 1/${answerDen}${answerDen !== s.den ? ` = ${s.num}/${s.den}` : ''}.`,
      ],
      hint: scenario.hint,
    };
  }

  return {
    id: makeId(), topic: 'unit-frac-by-whole', type: 'computation',
    difficulty: hard ? 2 : 1,
    question: `1/${den} ÷ ${whole} = ?`,
    inputType: 'fraction',
    answer: { whole: 0, num: s.num, den: s.den },
    requireSimplified: true,
    explanation: [
      `To divide a unit fraction by a whole number, multiply the denominator by the whole number.`,
      `1/${den} ÷ ${whole} = 1/(${den} × ${whole}) = 1/${answerDen}.`,
      answerDen !== s.den ? `Simplify: 1/${answerDen} = ${s.num}/${s.den}.` : `1/${answerDen} is already simplified.`,
      `Think: if you take 1/${den} and split it into ${whole} equal parts, each part is 1/${answerDen}.`,
    ],
    hint: `When dividing a unit fraction by a whole number, keep the 1 on top and multiply the bottom by the whole number.`,
  };
}

// ===== 10.5: WORD PROBLEMS (multi-step) =====

function gen_10_5(hard = false) {
  const type = randInt(1, hard ? 12 : 4);

  if (type === 1) {
    // Nurse/schedule type: total hours ÷ fraction of hour
    const hours = randInt(3, 8);
    const den = pick([2, 3, 4]);
    const answer = hours * den;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: hard ? 2 : 1,
      question: `A nurse works ${hours} hours. She checks on her patients every 1/${den} hour. How many times does she check on her patients?`,
      inputType: 'number', answer,
      explanation: [
        `We need to find how many 1/${den}-hour periods fit in ${hours} hours.`,
        `${hours} ÷ 1/${den} = ${hours} × ${den} = ${answer}.`,
      ],
      hint: `This is a "whole number ÷ unit fraction" problem. How many 1/${den}-hour slots in ${hours} hours?`,
    };
  }

  if (type === 2) {
    // Sharing type: amount ÷ number of people
    const den = pick([2, 3, 4, 5, 6]);
    const people = randInt(2, 6);
    const answerDen = den * people;
    const s = simplifyFrac(1, answerDen);
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: hard ? 2 : 1,
      question: `${people} friends share 1/${den} of a pound of candy equally. How much does each friend get?`,
      inputType: 'fraction',
      answer: { whole: 0, num: s.num, den: s.den },
      requireSimplified: true,
      explanation: [
        `We need 1/${den} ÷ ${people}.`,
        `Divide the fraction by the whole number: 1/${den} ÷ ${people} = 1/${answerDen}${answerDen !== s.den ? ` = ${s.num}/${s.den}` : ''}.`,
      ],
      hint: `Divide the fraction by the number of friends.`,
    };
  }

  if (type === 3) {
    // How many pieces type
    const totalFeet = randInt(4, 12);
    const pieceDen = pick([2, 3, 4]);
    const pieces = totalFeet * pieceDen;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: hard ? 2 : 1,
      question: `A carpenter has a board that is ${totalFeet} feet long. He cuts it into pieces that are each 1/${pieceDen} foot long. How many pieces does he cut?`,
      inputType: 'number', answer: pieces,
      explanation: [
        `How many 1/${pieceDen}-foot pieces in ${totalFeet} feet?`,
        `${totalFeet} ÷ 1/${pieceDen} = ${totalFeet} × ${pieceDen} = ${pieces}.`,
      ],
      hint: `Divide the total length by the length of each piece.`,
    };
  }

  if (type === 4) {
    // Two-resource problem
    const cups1 = randInt(2, 5);
    const cups2 = randInt(2, 5);
    const total = cups1 + cups2;
    const servingDen = pick([2, 3, 4]);
    const servings = total * servingDen;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `A teacher has ${cups1} cups of red paint and ${cups2} cups of blue paint. She pours 1/${servingDen} cup into each container. How many containers can she fill?`,
      inputType: 'number', answer: servings,
      explanation: [
        `Total paint: ${cups1} + ${cups2} = ${total} cups.`,
        `${total} ÷ 1/${servingDen} = ${total} × ${servingDen} = ${servings} containers.`,
      ],
      hint: `First add up all the paint, then divide by 1/${servingDen}.`,
    };
  }

  if (type === 5) {
    // Rate problem
    const miles = randInt(5, 20);
    const den = pick([2, 3, 4]);
    const hours = miles * den;
    // Wait, that doesn't work. Let me think...
    // "A trucker drives 10 miles in 1/3 hour. How many miles in 7 hours?"
    const milesPerFrac = randInt(2, 8);
    const fracDen = pick([2, 3, 4]);
    const milesPerHour = milesPerFrac * fracDen;
    const totalHours = randInt(3, 8);
    const totalMiles = milesPerHour * totalHours;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `A trucker drives ${milesPerFrac} miles every 1/${fracDen} hour. He drives the same speed. How many miles can he drive in ${totalHours} hours?`,
      inputType: 'number', answer: totalMiles,
      explanation: [
        `First find the speed per hour: ${milesPerFrac} miles per 1/${fracDen} hour.`,
        `${milesPerFrac} ÷ 1/${fracDen} = ${milesPerFrac} × ${fracDen} = ${milesPerHour} miles per hour.`,
        `In ${totalHours} hours: ${milesPerHour} × ${totalHours} = ${totalMiles} miles.`,
      ],
      hint: `First figure out how many miles per full hour, then multiply by the number of hours.`,
    };
  }

  if (type === 6) {
    // Money/deli style
    const totalPounds = randInt(4, 10);
    const servingDen = pick([3, 4, 5]);
    const servings = totalPounds * servingDen;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `A shop has ${totalPounds} pounds of cheese. Each serving is 1/${servingDen} pound. How many servings can they make?`,
      inputType: 'number', answer: servings,
      explanation: [
        `How many 1/${servingDen}-pound servings in ${totalPounds} pounds?`,
        `${totalPounds} ÷ 1/${servingDen} = ${totalPounds} × ${servingDen} = ${servings} servings.`,
      ],
      hint: `Divide the total amount by the serving size.`,
    };
  }

  if (type === 7) {
    // Money multi-step: servings × price
    const totalPounds = randInt(4, 10);
    const servingDen = pick([3, 4, 5]);
    const servings = totalPounds * servingDen;
    const price = pick([2, 3, 4, 5]);
    const totalMoney = servings * price;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `A deli has ${totalPounds} pounds of turkey. Each sandwich uses 1/${servingDen} pound and sells for $${price}. How much money can they earn from all the sandwiches?`,
      inputType: 'number', answer: totalMoney,
      explanation: [
        `First find the number of sandwiches: ${totalPounds} ÷ 1/${servingDen} = ${totalPounds} × ${servingDen} = ${servings}.`,
        `Then multiply by price: ${servings} × $${price} = $${totalMoney}.`,
      ],
      hint: `Two steps: first find how many sandwiches, then multiply by the price.`,
    };
  }

  if (type === 8) {
    // Compare two quantities
    const amount1 = randInt(3, 8);
    const den1 = pick([2, 3, 4]);
    const result1 = amount1 * den1;
    const amount2 = randInt(3, 8);
    const den2 = pick([2, 3, 4]);
    const result2 = amount2 * den2;
    const answer = result1 + result2;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `A baker cuts ${amount1} loaves of bread into slices that are 1/${den1} of a loaf each, and ${amount2} cakes into pieces that are 1/${den2} of a cake each. How many total pieces does the baker have?`,
      inputType: 'number', answer,
      explanation: [
        `Bread slices: ${amount1} ÷ 1/${den1} = ${amount1} × ${den1} = ${result1}.`,
        `Cake pieces: ${amount2} ÷ 1/${den2} = ${amount2} × ${den2} = ${result2}.`,
        `Total: ${result1} + ${result2} = ${answer}.`,
      ],
      hint: `Find the pieces for each item separately, then add them together.`,
    };
  }

  if (type === 9) {
    // Leftover/remainder problem
    const total = randInt(5, 12);
    const servingDen = pick([3, 4, 5]);
    const servings = total * servingDen;
    const eaten = randInt(2, Math.floor(servings / 2));
    const remaining = servings - eaten;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `You have ${total} granola bars. You cut each into pieces that are 1/${servingDen} of a bar. You eat ${eaten} pieces. How many pieces are left?`,
      inputType: 'number', answer: remaining,
      explanation: [
        `Total pieces: ${total} ÷ 1/${servingDen} = ${total} × ${servingDen} = ${servings}.`,
        `After eating ${eaten}: ${servings} - ${eaten} = ${remaining} pieces left.`,
      ],
      hint: `First find the total number of pieces, then subtract what was eaten.`,
    };
  }

  if (type === 10) {
    // Sharing then comparing — fraction answer
    const den = pick([3, 4, 5, 6]);
    const people1 = randInt(2, 4);
    const people2 = people1 + randInt(1, 3);
    const ans1Den = den * people1;
    const ans2Den = den * people2;
    const s1 = simplifyFrac(1, ans1Den);
    const s2 = simplifyFrac(1, ans2Den);
    // Ask which group gets more
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `Group A has ${people1} friends sharing 1/${den} of a pizza. Group B has ${people2} friends sharing 1/${den} of a pizza. Which group's members each get more pizza?`,
      inputType: 'choice',
      choices: ['Group A', 'Group B', 'They get the same'],
      answer: 'Group A',
      explanation: [
        `Group A: 1/${den} ÷ ${people1} = 1/${ans1Den}${ans1Den !== s1.den ? ` = ${s1.num}/${s1.den}` : ''}.`,
        `Group B: 1/${den} ÷ ${people2} = 1/${ans2Den}${ans2Den !== s2.den ? ` = ${s2.num}/${s2.den}` : ''}.`,
        `1/${ans1Den} > 1/${ans2Den} because fewer people means bigger shares.`,
        `Group A gets more.`,
      ],
      hint: `Divide the same fraction by different numbers of people. Fewer people = bigger share.`,
    };
  }

  if (type === 11) {
    // Time + division: total work hours across days
    const hoursPerDay = randInt(4, 9);
    const days = randInt(3, 6);
    const totalHours = hoursPerDay * days;
    const taskDen = pick([2, 3, 4]);
    const tasks = totalHours * taskDen;
    return {
      id: makeId(), topic: 'word-problems', type: 'word-problem',
      difficulty: 2,
      question: `A worker works ${hoursPerDay} hours each day for ${days} days. Each task takes 1/${taskDen} hour. How many tasks can they complete?`,
      inputType: 'number', answer: tasks,
      explanation: [
        `Total hours: ${hoursPerDay} × ${days} = ${totalHours} hours.`,
        `Tasks: ${totalHours} ÷ 1/${taskDen} = ${totalHours} × ${taskDen} = ${tasks}.`,
      ],
      hint: `First find total hours worked, then divide by the time per task.`,
    };
  }

  // type === 12: Two-operation with fraction result
  const wholePounds = randInt(2, 6);
  const splitDen = pick([3, 4, 5, 6]);
  const pieces = wholePounds * splitDen;
  const groups = pick([2, 3, 4, 5]);
  const perGroup = Math.floor(pieces / groups);
  const leftover = pieces - perGroup * groups;
  return {
    id: makeId(), topic: 'word-problems', type: 'word-problem',
    difficulty: 2,
    question: `You cut ${wholePounds} feet of ribbon into pieces that are each 1/${splitDen} foot. You then divide the pieces equally among ${groups} friends. How many pieces does each friend get?`,
    inputType: 'number', answer: perGroup,
    explanation: [
      `Total pieces: ${wholePounds} ÷ 1/${splitDen} = ${wholePounds} × ${splitDen} = ${pieces}.`,
      `Each friend: ${pieces} ÷ ${groups} = ${perGroup}${leftover > 0 ? ` with ${leftover} left over` : ''}.`,
    ],
    hint: `First find total pieces, then divide evenly among friends.`,
  };
}

// ===== GENERATORS MAP =====

const GENERATORS = {
  'fractions-as-division': gen_10_1,
  'mixed-quotients': gen_10_2,
  'whole-by-unit-frac': gen_10_3,
  'unit-frac-by-whole': gen_10_4,
  'word-problems': gen_10_5,
};

// ===== DIAGNOSTIC =====

export function generateDiagnostic() {
  const problems = [];
  // 3 problems per topic (1 easy, 1 easy, 1 hard) = 15 total
  for (const topic of TOPIC_LIST) {
    const gen = GENERATORS[topic];
    problems.push(gen(false));
    problems.push(gen(false));
    problems.push(gen(true));
  }
  return shuffle(problems);
}

// ===== DRILL =====

export function generateDrill(topic, count = 5) {
  const gen = GENERATORS[topic];
  const problems = [];
  for (let i = 0; i < count; i++) {
    problems.push(gen(i >= Math.floor(count / 2)));
  }
  return problems;
}

// ===== SESSION =====

export function generateSessionProblem(topic, history) {
  const gen = GENERATORS[topic];
  const h = history[topic];
  // Force hard once mastered, otherwise ramp up gradually
  const hard = (h && h.easy_correct >= 3 && h.results.slice(-3).filter(Boolean).length >= 2)
    || (h && h.hard_correct >= 2);
  return gen(hard);
}

// ===== SESSION FEEDBACK =====

export function generateSessionFeedback(results, history, mastery) {
  const lines = [];
  const total = results.length;
  const correct = results.filter(r => r.correct).length;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;

  if (pct >= 90) lines.push('Outstanding session! You really know this material.');
  else if (pct >= 75) lines.push('Strong performance. A few spots to tighten up.');
  else if (pct >= 60) lines.push('Good effort. The problems you missed show exactly where to focus.');
  else lines.push('This session found some gaps — and that\'s the whole point. Now you know what to drill.');

  // Find weakest topic in this session
  const topicStats = {};
  for (const r of results) {
    if (!topicStats[r.topic]) topicStats[r.topic] = { correct: 0, total: 0 };
    topicStats[r.topic].total++;
    if (r.correct) topicStats[r.topic].correct++;
  }

  let worstTopic = null;
  let worstPct = 100;
  for (const [topic, stats] of Object.entries(topicStats)) {
    const p = Math.round(stats.correct / stats.total * 100);
    if (p < worstPct && stats.total >= 2) {
      worstPct = p;
      worstTopic = topic;
    }
  }

  if (worstTopic && worstPct < 70) {
    lines.push(`Focus area: ${TOPICS[worstTopic].name} (${worstPct}%). Hit "Another Session" to practice more.`);
  }

  // Check for 10.3/10.4 confusion
  const s3 = topicStats['whole-by-unit-frac'];
  const s4 = topicStats['unit-frac-by-whole'];
  if (s3 && s4 && s3.total >= 2 && s4.total >= 2) {
    const pct3 = s3.correct / s3.total;
    const pct4 = s4.correct / s4.total;
    if (pct3 < 0.6 || pct4 < 0.6) {
      lines.push('Remember the key difference: whole ÷ unit fraction → multiply by the denominator. Unit fraction ÷ whole → multiply the denominator by the whole number.');
    }
  }

  return lines;
}

// ===== MASTERY HELPERS =====

export function calculateMastery(results) {
  const mastery = {};
  for (const topic of TOPIC_LIST) {
    const r = results[topic];
    if (!r || r.total === 0) { mastery[topic] = 'untested'; continue; }
    const pct = r.correct / r.total;
    if (pct >= 0.8) mastery[topic] = 'mastered';
    else if (pct >= 0.5) mastery[topic] = 'learning';
    else mastery[topic] = 'needs-work';
  }
  return mastery;
}

export function getWeakTopics(mastery) {
  return TOPIC_LIST.filter(t => mastery[t] === 'needs-work' || mastery[t] === 'learning');
}

export function isFinalBossReady(mastery) {
  return TOPIC_LIST.every(t => mastery[t] === 'mastered');
}

export function generateFinalBoss() {
  const problems = [];
  for (const topic of TOPIC_LIST) {
    problems.push(GENERATORS[topic](true));
    problems.push(GENERATORS[topic](true));
  }
  return shuffle(problems);
}

export function generateSimilar(topic) {
  return GENERATORS[topic](false);
}
