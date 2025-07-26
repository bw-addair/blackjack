/*  ASCII Blackjack – all logic in vanilla JS
    Features: 6-deck shoe, double, split, 3:2 BJ, 10 000 chips start
*/

const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const cardValue = {
  A: 11, J: 10, Q: 10, K: 10,
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10
};

let shoe = [];
let chips = 10000;

const $ = id => document.getElementById(id);
const log = msg => {
  const pre = $('log');
  pre.textContent += msg + '\n';
  pre.scrollTop = pre.scrollHeight;
};

function shuffle() {
  shoe = [];
  for (let i = 0; i < 6; i++) shoe.push(...ranks, ...ranks, ...ranks, ...ranks);
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
}

function draw() {
  if (shoe.length < 20) {
    shuffle();
    log('Shuffling new shoe…\n');
  }
  return shoe.pop();
}

function handValue(hand) {
  let v = 0, aces = 0;
  for (const c of hand) {
    v += cardValue[c];
    if (c === 'A') aces++;
  }
  while (v > 21 && aces) {
    v -= 10; aces--;
  }
  return v;
}

/* -------- card sprite sheet -------- */
const suitOrder = { S:0, H:1, D:2, C:3 };
const spriteMap = {
  A:0, 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:7, 9:8, 10:9, J:10, Q:11, K:12
};

function cardEl(card, faceDown = false) {
  const div = document.createElement('div');
  div.className = faceDown ? 'card back' : 'card ' + card;
  div.title = faceDown ? '??' : card;
  return div;
}

function renderHand(hand, hideFirst = false) {
  const box = document.createElement('div');
  box.style.display = 'flex';
  box.style.gap = '4px';
  box.style.margin = '4px 0';
  hand.forEach((c, i) => box.appendChild(cardEl(c, hideFirst && i === 0)));
  return box;
}

function clearTable() {
  $('hands').innerHTML = '';
  $('controls').innerHTML = '';
  $('log').textContent = '';
}

async function playHand(hand, bet, idx, totalHands) {
  // Build the container for this hand
  const div = document.createElement('div');
  div.className = 'hand';
  const title = totalHands > 1 ? `Hand ${idx + 1}` : 'Player';

  div.innerHTML = `<div class="hand-title">${title}</div>`;
  const cardBox = renderHand(hand);
  div.appendChild(cardBox);
  $('hands').appendChild(div);

  // Helper to update the displayed cards
  const update = () => cardBox.replaceWith(renderHand(hand));

  // Blackjack?
  if (value(hand) === 21 && hand.length === 2) {
    log(`${title}: BLACKJACK!`);
    return Math.floor(1.5 * bet);
  }

  // Double-down allowed?
  const canDouble = hand.length === 2 && chips >= bet;
  let choice;
  while (true) {
    const opts = ['h', 's'];
    let prompt = 'Hit or stand';
    if (canDouble && hand.length === 2) {
      opts.push('d');
      prompt += ' (h/s/d)';
    }
    choice = await promptPlayer(`${title}: ${prompt}? `, opts);

    if (choice === 's') break;

    if (choice === 'd') {
      bet *= 2;
      hand.push(draw());
      update();
      log(`${title}: doubled → ${hand.join(' ')} (value ${value(hand)})`);
      break;
    }

    // Hit
    hand.push(draw());
    update();
    if (value(hand) >= 21) break;
  }

  const finalVal = value(hand);
  if (finalVal > 21) {
    log(`${title}: BUST!`);
    return -bet;
  }

  // Return the hand object so caller can finish it off
  return { hand, bet };
}

  while (true) {
    const val = handValue(hand);
    if (val > 21) { log(`${title}: BUST`); return -bet; }
    if (val === 21) break;

    const canDouble = hand.length === 2 && chips >= bet;
    const choice = await promptPlayer(
      `Hit, stand${canDouble ? ', double' : ''}?`,
      canDouble ? ['h','s','d'] : ['h','s']
    );
    if (choice === 's') break;
    if (choice === 'd') {
      bet *= 2;
      hand.push(draw());
      div.querySelector('.cards').textContent = renderHand(hand);
      log(`${title}: doubled → ${renderHand(hand)}`);
      if (handValue(hand) > 21) { log(`${title}: BUST`); return -bet; }
      break;
    }
    hand.push(draw());
    div.querySelector('.cards').textContent = renderHand(hand);
  }
  return { hand, bet };
}

function promptPlayer(message, opts) {
  return new Promise(res => {
    const box = $('controls');
    box.innerHTML = '';
    const input = document.createElement('input');
    input.placeholder = message;
    box.appendChild(input);
    input.focus();
    input.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      if (opts.includes(key)) {
        box.innerHTML = '';
        res(key);
      }
    });
  });
}

async function playRound() {
  clearTable();

  const betInput = $('betInput');
  const bet = parseInt(betInput.value, 10);
  if (!bet || bet <= 0 || bet > chips) {
    log('Invalid bet.');
    return;
  }
  betInput.value = '';

  let playerHand = [draw(), draw()];
  const dealerHand = [draw(), draw()];

  // offer split
  let hands = [playerHand];
  let bets = [bet];
  if (playerHand[0] === playerHand[1] && chips >= bet) {
    const split = await promptPlayer('Split identical cards? (y/n)', ['y','n']);
    if (split === 'y') {
      hands = [[playerHand[0], draw()], [playerHand[1], draw()]];
      bets = [bet, bet];
    }
  }

  // play each hand
  const results = [];
  for (let i = 0; i < hands.length; i++) {
    const result = await playHand(hands[i], bets[i], i, hands.length);
    if (typeof result === 'number') {
      results.push(result);
    } else { // object {hand, bet}
      results.push(result);
    }
  }
  const finalHands = results.map(r => (typeof r === 'number' ? null : r.hand));
  const finalBets = results.map(r => (typeof r === 'number' ? bets[results.indexOf(r)] : r.bet));

  // dealer turn
  log('\nDealer: ' + renderHand(dealerHand, true));
  while (handValue(dealerHand) < 17) {
    dealerHand.push(draw());
    log('Dealer hits: ' + renderHand(dealerHand));
  }
  log('Dealer final: ' + renderHand(dealerHand));

  // settle
  const dVal = handValue(dealerHand);
  let net = 0;
  finalHands.forEach((hand, i) => {
    if (!hand) return; // already handled blackjack/bust
    const pVal = handValue(hand);
    const b = finalBets[i];
    let res;
    if (pVal > 21) res = -b;
    else if (dVal > 21 || pVal > dVal) res = b;
    else if (pVal < dVal) res = -b;
    else res = 0;
    net += res;
    log(`Hand ${i+1}: ${res > 0 ? '+' + res : res}`);
  });

  chips += net;
  $('chips').textContent = chips;
  if (chips <= 0) {
    log(red + 'You are broke! Reload next paycheck.' + reset);
    $('dealBtn').disabled = true;
  }
}

// wire up
$('dealBtn').addEventListener('click', playRound);
shuffle();
