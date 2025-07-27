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
  for (let i = 0; i < 6; i++) {
    for (const rank of ranks) {
      shoe.push(rank + 'S', rank + 'H', rank + 'D', rank + 'C');
    }
  }
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
}

function draw() {
  if (shoe.length < 20) {
    shuffle();
    log('Shuffling new shoe…');
  }
  return shoe.pop();
}

function handValue(hand) {
  let v = 0, aces = 0;
  for (const c of hand) {
    const rank = c.slice(0, -1);
    v += cardValue[rank];
    if (rank === 'A') aces++;
  }
  while (v > 21 && aces) {
    v -= 10;
    aces--;
  }
  return v;
}

function cardEl(card, faceDown = false) {
  const div = document.createElement('div');
  div.className = faceDown ? 'card back' : 'card ' + card;
  div.title = faceDown ? '??' : card;
  return div;
}

function renderHand(hand, hideFirst = false) {
  const box = document.createElement('div');
  box.className = 'cards';
  hand.forEach((c, i) => box.appendChild(cardEl(c, hideFirst && i === 0)));
  return box;
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

async function playHand(hand, bet, idx, totalHands) {
  const div = document.createElement('div');
  div.className = 'hand';
  const title = totalHands > 1 ? `Hand ${idx + 1}` : 'Player';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'hand-title';
  titleDiv.textContent = title;
  div.appendChild(titleDiv);

  const cardRow = renderHand(hand);
  div.appendChild(cardRow);
  $('hands').appendChild(div);

  const refresh = () => {
    const newRow = renderHand(hand);
    cardRow.replaceWith(newRow);
    cardRow.innerHTML = newRow.innerHTML;
  };

  // blackjack
  if (handValue(hand) === 21 && hand.length === 2) {
    log(`${title}: BLACKJACK!`);
    return Math.floor(1.5 * bet);
  }

  while (true) {
    const val = handValue(hand);
    if (val > 21) {
      log(`${title}: BUST`);
      return -bet;
    }
    if (val === 21) break;

    const canDouble = hand.length === 2 && chips >= bet;
    const opts = ['h', 's'];
    let prompt = `${title}: Hit or stand`;
    if (canDouble) {
      opts.push('d');
      prompt += ' (h/s/d)';
    }
    const choice = await promptPlayer(prompt + '?', opts);

    if (choice === 's') break;

    if (choice === 'd') {
      bet *= 2;
      hand.push(draw());
      refresh();
      log(`${title}: doubled → ${hand.join(' ')} (${handValue(hand)})`);
      if (handValue(hand) > 21) {
        log(`${title}: BUST`);
        return -bet;
      }
      break;
    }

    hand.push(draw());
    refresh();
  }

  return { hand, bet };
}

// simulate dealer logic
function dealerPlay(dealerHand) {
  while (handValue(dealerHand) < 17) {
    dealerHand.push(draw());
  }
  return dealerHand;
}

async function playRound() {
  clearTable();

  const bet = parseInt($('betInput').value);
  if (isNaN(bet) || bet < 1 || bet > chips) {
    log('Invalid bet amount.');
    return;
  }

  let playerHand = [draw(), draw()];
  let dealerHand = [draw(), draw()];
  let result = await playHand(playerHand, bet, 0, 1);

  const dealerDiv = document.createElement('div');
  dealerDiv.className = 'hand';
  dealerDiv.innerHTML = `<div class="hand-title">Dealer</div>`;
  const dealerCards = renderHand(dealerHand, true);
  dealerDiv.appendChild(dealerCards);
  $('hands').appendChild(dealerDiv);

  // reveal dealer's hand
  await new Promise(r => setTimeout(r, 1000));
  dealerCards.replaceWith(renderHand(dealerPlay(dealerHand)));

  const dealerVal = handValue(dealerHand);
  log(`Dealer: ${dealerHand.join(' ')} (${dealerVal})`);

  let payout = 0;
  if (typeof result === 'number') {
    payout = result;
  } else {
    const playerVal = handValue(result.hand);
    if (playerVal > 21) payout = -result.bet;
    else if (dealerVal > 21 || playerVal > dealerVal) payout = result.bet;
    else if (playerVal < dealerVal) payout = -result.bet;
    else payout = 0; // push
  }

  chips += payout;
  $('chips').textContent = chips;
  log(payout >= 0 ? `You win ${payout} chips.` : `You lose ${-payout} chips.`);
}

function clearTable() {
  $('hands').innerHTML = '';
  $('controls').innerHTML = '';
  $('log').textContent = '';
}

function boot() {
  $('pressEnter').textContent = 'Press Enter to start round…';
  document.addEventListener('keydown', async function onEnter(e) {
    if (e.key !== 'Enter') return;
    document.removeEventListener('keydown', onEnter);
    await playRound();
    if (chips > 0) boot();
    else log('Out of chips!');
  });
}

boot();
