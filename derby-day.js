(() => {
  const canvas = document.getElementById('derby-track');
  const ctx = canvas.getContext('2d');
  const panel = document.getElementById('derby-panel');
  const meta = document.getElementById('derby-meta');

  const HORSE_COLORS = ['#ff5b7f', '#64e8ff', '#ffe96a', '#93ff7b', '#d18cff', '#ffb066'];
  const HORSE_NAMES = ['Red Comet', 'Blue Thunder', 'Golden Spur', 'Green Ember', 'Violet Dash', 'Copper Star'];

  const state = {
    raceNo: 1,
    bankroll: 200,
    selectedHorse: 1,
    wager: 20,
    raceInProgress: false,
    finished: false,
    winner: null,
    horses: [],
    standings: [],
    history: [],
    announcement: 'Welcome to Derby Day. Pick horse and stake, then start the race.'
  };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createRace() {
    state.horses = [];
    const rawStrength = [];
    for (let i = 0; i < 6; i += 1) rawStrength.push(rand(0.85, 1.26));

    const totalStrength = rawStrength.reduce((a, b) => a + b, 0);

    for (let i = 0; i < 6; i += 1) {
      const rating = rawStrength[i];
      const winProb = rating / totalStrength;
      const odds = Math.max(1.55, Number((1 / winProb) * 0.9 + rand(-0.12, 0.14)).toFixed(2));

      state.horses.push({
        id: i + 1,
        name: HORSE_NAMES[i],
        rating,
        odds,
        x: 55,
        laneY: 32 + i * 54,
        speed: 0,
        kick: rand(0.97, 1.08),
        finishedAt: null,
        timeText: '--'
      });
    }

    state.standings = [];
    state.selectedHorse = 1;
    state.wager = Math.min(20, Math.max(10, state.bankroll));
    state.finished = false;
    state.winner = null;
    state.raceInProgress = false;
  }

  function renderMeta() {
    meta.innerHTML = `
      <span>RACE ${state.raceNo}</span>
      <span>BANKROLL $${state.bankroll.toFixed(0)}</span>
      <span>SELECTED ${state.selectedHorse}</span>
      <span>WAGER $${state.wager}</span>
    `;
  }

  function renderMenu() {
    const oddsRows = state.horses
      .map((horse) => {
        const mark = horse.id === state.selectedHorse ? '>' : ' ';
        const place = state.standings.findIndex((s) => s.id === horse.id);
        const placeTag = place >= 0 ? `  [${place + 1}${place === 0 ? 'st' : place === 1 ? 'nd' : place === 2 ? 'rd' : 'th'}]` : '';
        return `${mark} ${horse.id}) ${horse.name.padEnd(12, ' ')} Odds ${horse.odds.toFixed(2)}:1${placeTag}`;
      })
      .join('\n');

    const historyRows = state.history.length
      ? state.history
          .slice(-4)
          .reverse()
          .map((h) => `R${h.race}: ${h.winnerName} won | Bet ${h.betName} $${h.wager} | ${h.result}`)
          .join('\n')
      : 'No prior races yet.';

    const status = state.finished
      ? `Winner: ${state.winner.name}. ${state.announcement}`
      : state.announcement;

    panel.textContent =
      `ODDS BOARD\n${oddsRows}\n\n` +
      `Controls (keyboard):\n` +
      `1-6 = Select horse\n` +
      `7 = Wager -10\n` +
      `8 = Wager +10\n` +
      `9 = Start race\n` +
      `0 = Next race card\n\n` +
      `${status}\n\n` +
      `Recent Results:\n${historyRows}`;
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
      ctx.fillRect(x, y, 36, 16);
      ctx.fillStyle = '#101018';
      ctx.fillRect(x + 27, y + 2, 9, 5);
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(String(horse.id), x + 13, y + 12);

      ctx.fillStyle = '#c7d8ff';
      ctx.fillText(horse.name, 8, y + 12);
      if (horse.finishedAt !== null) {
        ctx.fillStyle = '#ffe97a';
        ctx.fillText(horse.timeText, canvas.width - 155, y + 12);
      }
    });
  }

  function recordFinish(horse) {
    const suffix = state.standings.length === 0 ? 'st' : state.standings.length === 1 ? 'nd' : state.standings.length === 2 ? 'rd' : 'th';
    const placeNum = state.standings.length + 1;
    horse.timeText = `${placeNum}${suffix}`;
    state.standings.push(horse);
  }

  function settleRace() {
    state.raceInProgress = false;
    state.finished = true;
    state.winner = state.standings[0];

    let result;
    if (state.winner.id === state.selectedHorse) {
      const payout = Math.round(state.wager * state.winner.odds);
      state.bankroll += payout;
      result = `WIN +$${payout}`;
      state.announcement = `You won! ${state.winner.name} paid $${payout}.`;
    } else {
      result = 'LOSS';
      state.announcement = `You lost. ${state.winner.name} won race ${state.raceNo}.`;
    }

    state.history.push({
      race: state.raceNo,
      winnerName: state.winner.name,
      betName: state.horses[state.selectedHorse - 1].name,
      wager: state.wager,
      result
    });

    renderMeta();
    renderMenu();
  }

  function animateRace() {
    if (!state.raceInProgress) return;

    const finishX = canvas.width - 72;

    state.horses.forEach((horse) => {
      if (horse.finishedAt !== null) return;

      const burst = rand(-0.04, 0.09);
      horse.speed = Math.max(0.62, horse.speed + burst);
      const finalKick = horse.x > canvas.width * 0.63 ? horse.kick : 1;
      const stride = horse.speed * horse.rating * finalKick + rand(0.35, 1.45);
      horse.x += stride;

      if (horse.x >= finishX) {
        horse.x = finishX;
        horse.finishedAt = performance.now();
        recordFinish(horse);
      }
    });

    drawTrack();

    if (state.standings.length === state.horses.length) {
      settleRace();
      return;
    }

    requestAnimationFrame(animateRace);
  }

  function startRace() {
    if (state.raceInProgress) return;

    if (state.bankroll <= 0) {
      state.announcement = 'Out of cash. Press 0 to load a new race card and reset bankroll to $200.';
      renderMenu();
      return;
    }
    if (state.wager < 10 || state.wager > state.bankroll) {
      state.announcement = 'Invalid wager. Keep it between $10 and your bankroll.';
      renderMenu();
      return;
    }

    state.bankroll -= state.wager;
    state.raceInProgress = true;
    state.finished = false;
    state.winner = null;
    state.standings = [];
    state.announcement = `And they are off... you backed ${state.horses[state.selectedHorse - 1].name}.`;

    state.horses.forEach((horse) => {
      horse.x = 55;
      horse.speed = rand(0.85, 1.4);
      horse.finishedAt = null;
      horse.timeText = '--';
      horse.kick = rand(0.97, 1.08);
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
    state.announcement = 'New race card loaded. Check odds, place your bet, and run race.';
    renderMeta();
    renderMenu();
    drawTrack();
  }

  function clampWager() {
    const floor = state.bankroll < 10 ? state.bankroll : 10;
    state.wager = Math.max(floor, Math.min(state.bankroll, state.wager));
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
