(() => {
  const canvas = document.getElementById('derby-track');
  const ctx = canvas.getContext('2d');
  const panel = document.getElementById('derby-panel');
  const meta = document.getElementById('derby-meta');

  const HORSE_COLORS = ['#ff5b7f', '#64e8ff', '#ffe96a', '#93ff7b', '#d18cff', '#ffb066'];

  const state = {
    raceNo: 1,
    bankroll: 200,
    selectedHorse: 1,
    wager: 20,
    raceInProgress: false,
    finished: false,
    winner: null,
    horses: [],
    announcement: 'Welcome to Derby Day. Pick horse and stake, then start the race.'
  };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createRace() {
    state.horses = [];
    for (let i = 0; i < 6; i += 1) {
      const rating = rand(0.9, 1.25);
      const odds = Number((3.7 - rating * 2 + rand(-0.15, 0.25)).toFixed(2));
      state.horses.push({
        id: i + 1,
        name: `Horse ${i + 1}`,
        rating,
        odds: Math.max(1.4, odds),
        x: 50,
        laneY: 32 + i * 54,
        speed: 0,
        finishedAt: null
      });
    }

    state.selectedHorse = 1;
    state.wager = Math.min(20, state.bankroll);
    state.finished = false;
    state.winner = null;
    state.raceInProgress = false;
  }

  function renderMeta() {
    meta.innerHTML = `
      <span>RACE ${state.raceNo}</span>
      <span>BANKROLL $${state.bankroll.toFixed(0)}</span>
      <span>SELECTED HORSE ${state.selectedHorse}</span>
      <span>WAGER $${state.wager}</span>
    `;
  }

  function renderMenu() {
    const oddsRows = state.horses
      .map((h) => {
        const mark = h.id === state.selectedHorse ? '>' : ' ';
        return `${mark} ${h.id}) ${h.name.padEnd(8, ' ')}  Odds ${h.odds.toFixed(2)}:1`;
      })
      .join('\n');

    const status = state.finished
      ? `Winner: Horse ${state.winner.id}. ${state.announcement}`
      : state.announcement;

    panel.textContent =
      `ODDS BOARD\n${oddsRows}\n\n` +
      `Controls (keyboard):\n` +
      `1-6 = Select horse\n` +
      `7 = Wager -10\n` +
      `8 = Wager +10\n` +
      `9 = Start race\n` +
      `0 = Next race\n\n` +
      `${status}`;
  }

  function drawTrack() {
    ctx.fillStyle = '#091426';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#36573f';
    ctx.fillRect(0, 0, 42, canvas.height);
    ctx.fillRect(canvas.width - 65, 0, 65, canvas.height);

    for (let i = 0; i < 6; i += 1) {
      const y = 12 + i * 54;
      ctx.fillStyle = i % 2 === 0 ? '#1a2b4a' : '#172642';
      ctx.fillRect(42, y, canvas.width - 107, 50);
      ctx.strokeStyle = '#5f73c6';
      ctx.strokeRect(42, y, canvas.width - 107, 50);
    }

    ctx.strokeStyle = '#f3f4ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 70, 0);
    ctx.lineTo(canvas.width - 70, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#f6f39d';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('FINISH', canvas.width - 63, 16);

    state.horses.forEach((horse, idx) => {
      const y = horse.laneY;
      const x = horse.x;
      ctx.fillStyle = HORSE_COLORS[idx];
      ctx.fillRect(x, y, 34, 16);
      ctx.fillStyle = '#101018';
      ctx.fillRect(x + 26, y + 2, 8, 5);
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(String(horse.id), x + 12, y + 12);
    });
  }

  function settleRace() {
    state.raceInProgress = false;
    state.finished = true;
    state.winner = [...state.horses].sort((a, b) => a.finishedAt - b.finishedAt)[0];

    if (state.winner.id === state.selectedHorse) {
      const payout = Math.round(state.wager * state.winner.odds);
      state.bankroll += payout;
      state.announcement = `You won! Payout $${payout}.`;
    } else {
      state.announcement = `You lost the wager. Winner was Horse ${state.winner.id}.`;
    }

    renderMeta();
    renderMenu();
  }

  function animateRace() {
    if (!state.raceInProgress) return;

    let doneCount = 0;
    const finishX = canvas.width - 72;

    state.horses.forEach((horse) => {
      if (horse.finishedAt !== null) {
        doneCount += 1;
        return;
      }

      const burst = rand(-0.03, 0.08);
      horse.speed = Math.max(0.6, horse.speed + burst);
      const stride = horse.speed * horse.rating + rand(0.4, 1.5);
      horse.x += stride;

      if (horse.x >= finishX) {
        horse.x = finishX;
        horse.finishedAt = performance.now();
        doneCount += 1;
      }
    });

    drawTrack();

    if (doneCount === state.horses.length) {
      settleRace();
      return;
    }

    requestAnimationFrame(animateRace);
  }

  function startRace() {
    if (state.raceInProgress) return;
    if (state.bankroll <= 0) {
      state.announcement = 'You are out of money. Press 0 for a fresh race card and +$200 stake.';
      renderMenu();
      return;
    }
    if (state.wager < 10 || state.wager > state.bankroll) {
      state.announcement = 'Invalid wager. Keep it between $10 and bankroll.';
      renderMenu();
      return;
    }

    state.bankroll -= state.wager;
    state.raceInProgress = true;
    state.finished = false;
    state.winner = null;
    state.announcement = `Race underway... you backed Horse ${state.selectedHorse}.`;

    state.horses.forEach((h) => {
      h.x = 50;
      h.speed = rand(0.8, 1.4);
      h.finishedAt = null;
    });

    renderMeta();
    renderMenu();
    drawTrack();
    requestAnimationFrame(animateRace);
  }

  function nextRace() {
    state.raceNo += 1;
    if (state.bankroll <= 0) state.bankroll = 200;
    createRace();
    state.announcement = 'New race card loaded. Check odds and place your bet.';
    renderMeta();
    renderMenu();
    drawTrack();
  }

  function clampWager() {
    state.wager = Math.max(10, Math.min(state.bankroll, state.wager));
  }

  window.addEventListener('keydown', (event) => {
    if (state.raceInProgress) return;

    if (/^[1-6]$/.test(event.key)) {
      state.selectedHorse = Number(event.key);
    } else if (event.key === '7') {
      state.wager -= 10;
      clampWager();
    } else if (event.key === '8') {
      state.wager += 10;
      clampWager();
    } else if (event.key === '9') {
      startRace();
      return;
    } else if (event.key === '0') {
      nextRace();
      return;
    } else {
      return;
    }

    renderMeta();
    renderMenu();
    drawTrack();
  });

  createRace();
  renderMeta();
  renderMenu();
  drawTrack();
})();
