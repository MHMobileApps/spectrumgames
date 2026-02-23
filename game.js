(() => {
  const app = document.getElementById('app');

  const towns = ['A', 'B', 'C', 'D', 'E'];

  const gangRoster = [
    { id: 'jax', name: 'Jax Cutter', desc: 'tall, black hat, silver tooth, rasping voice' },
    { id: 'reed', name: 'Reed "Dust" Malloy', desc: 'short, red coat, limp, soft whisper' },
    { id: 'boone', name: 'Boone Harker', desc: 'broad shoulders, eye scar, brown duster, deep growl' },
    { id: 'viper', name: 'Eli "Viper" Quill', desc: 'thin beard, green neckerchief, quick laugh, narrow eyes' },
    { id: 'mags', name: 'Mags Rowe', desc: 'long braid, gray hat, high voice, missing left glove' },
    { id: 'rutt', name: 'Rutt Kincaid', desc: 'heavy beard, blue coat, broken nose, gravel voice' }
  ];

  const difficultyConfig = {
    1: { label: 'Easy', pinkertonStayMin: 2, pinkertonStayMax: 4, arrestBase: 0.12, duelPenalty: 0.9, staleRumor: 0.1, travelRisk: 0.2 },
    2: { label: 'Medium', pinkertonStayMin: 1, pinkertonStayMax: 3, arrestBase: 0.2, duelPenalty: 1.0, staleRumor: 0.25, travelRisk: 0.35 },
    3: { label: 'Hard', pinkertonStayMin: 1, pinkertonStayMax: 2, arrestBase: 0.32, duelPenalty: 1.15, staleRumor: 0.45, travelRisk: 0.5 }
  };

  const travelEvents = [
    { text: 'Dust storm! You lose 1 water.', effect: (s) => (s.water = Math.max(0, s.water - 1)) },
    { text: 'You find an abandoned canteen: +1 water.', effect: (s) => (s.water += 1) },
    { text: 'Broken axle delays you. +1 day passes.', effect: (s) => (s.day += 1) },
    { text: 'Bandit warning shots. You lose 10 strength.', effect: (s) => (s.strength = Math.max(0, s.strength - 10)) },
    { text: 'A rancher shares jerky: +1 food.', effect: (s) => (s.food += 1) },
    { text: 'Horse throws a shoe. Pay $8 for repair.', effect: (s) => (s.money = Math.max(0, s.money - 8)) },
    { text: 'Quiet travel. No incident.', effect: () => {} },
    { text: 'Bad river crossing. Lose 1 food and 1 water.', effect: (s) => { s.food = Math.max(0, s.food - 1); s.water = Math.max(0, s.water - 1); } },
    { text: 'You pick up dropped cartridges: +15 ammo.', effect: (s) => (s.ammo += 15) },
    { text: 'Ambush at dusk! You spend 12 ammo escaping.', effect: (s) => (s.ammo = Math.max(0, s.ammo - 12)) },
    { text: 'Medicine wagon passes by: +8 strength.', effect: (s) => (s.strength = Math.min(120, s.strength + 8)) },
    { text: 'You lose your trail map. +1 day.', effect: (s) => (s.day += 1) },
    { text: 'Lucky card hand with drifters: +$12.', effect: (s) => (s.money += 12) },
    { text: 'Heat exhaustion. -12 strength.', effect: (s) => (s.strength = Math.max(0, s.strength - 12)) },
    { text: 'Supply crate discovered: +2 food, +2 water.', effect: (s) => { s.food += 2; s.water += 2; } },
    { text: 'Snakebite panic. Pay $10 for treatment.', effect: (s) => (s.money = Math.max(0, s.money - 10)) },
    { text: 'Gun jam drill costs 8 ammo.', effect: (s) => (s.ammo = Math.max(0, s.ammo - 8)) },
    { text: 'Short-cut through canyon: save a day.', effect: (s) => (s.day = Math.max(1, s.day - 1)) },
    { text: 'Bad weather ruins rations: -1 food.', effect: (s) => (s.food = Math.max(0, s.food - 1)) },
    { text: 'You help settlers and earn $15.', effect: (s) => (s.money += 15) },
    { text: 'Wild horse joins your herd. +6 strength.', effect: (s) => (s.strength = Math.min(120, s.strength + 6)) },
    { text: 'Night raiders steal 1 water and 10 ammo.', effect: (s) => { s.water = Math.max(0, s.water - 1); s.ammo = Math.max(0, s.ammo - 10); } }
  ];

  function createRng(seed = Date.now()) {
    let x = seed >>> 0;
    return {
      next() {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        return ((x >>> 0) % 1000000) / 1000000;
      },
      int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
      },
      pick(list) {
        return list[this.int(0, list.length - 1)];
      }
    };
  }

  const state = {
    screen: 'title',
    rng: createRng(),
    difficulty: 1,
    day: 1,
    score: 0,
    money: 70,
    food: 6,
    water: 6,
    ammo: 50,
    gunLevel: 1,
    strength: 60,
    currentTown: 'A',
    pinkertonTown: 'E',
    pinkertonTurnsLeft: 2,
    gangLocations: {},
    murdererId: null,
    clueOpening: '',
    clues: [],
    captive: null,
    deadProof: null,
    log: [],
    pendingEncounter: null,
    duel: null,
    poker: null,
    gameOverReason: ''
  };

  function appendLog(line) {
    state.log.unshift(line);
    state.log = state.log.slice(0, 7);
  }

  function startRun(seed = Date.now()) {
    state.rng = createRng(seed);
    const cfg = difficultyConfig[state.difficulty];
    state.day = 1;
    state.score = 0;
    state.money = 70;
    state.food = 6;
    state.water = 6;
    state.ammo = 50;
    state.gunLevel = 1;
    state.strength = 60;
    state.currentTown = 'A';
    state.pinkertonTown = state.rng.pick(towns);
    state.pinkertonTurnsLeft = state.rng.int(cfg.pinkertonStayMin, cfg.pinkertonStayMax);
    state.captive = null;
    state.deadProof = null;
    state.clues = [];
    state.log = [];
    state.pendingEncounter = null;

    for (const g of gangRoster) state.gangLocations[g.id] = state.rng.pick(towns);

    const murderer = state.rng.pick(gangRoster);
    state.murdererId = murderer.id;
    const parts = murderer.desc.split(',').map((p) => p.trim());
    state.clueOpening = `${parts[state.rng.int(0, parts.length - 1)]}; ${parts[state.rng.int(0, parts.length - 1)]}`;
    state.screen = 'introClue';
  }

  function movePinkerton() {
    const cfg = difficultyConfig[state.difficulty];
    state.pinkertonTurnsLeft -= 1;
    if (state.pinkertonTurnsLeft > 0) return;
    state.pinkertonTown = state.rng.pick(towns.filter((t) => t !== state.pinkertonTown));
    state.pinkertonTurnsLeft = state.rng.int(cfg.pinkertonStayMin, cfg.pinkertonStayMax);
  }

  function moveGang() {
    for (const g of gangRoster) if (state.rng.next() < 0.45) state.gangLocations[g.id] = state.rng.pick(towns);
  }

  function consumeSupplies() {
    state.food = Math.max(0, state.food - 1);
    state.water = Math.max(0, state.water - 1);
    if (state.food === 0 || state.water === 0) {
      state.strength = Math.max(0, state.strength - 14);
      appendLog('Short on food/water: strength drops hard.');
    }
    if (state.strength <= 0) loseGame('You collapse on the trail.');
  }

  function triggerTravelEvent() {
    const cfg = difficultyConfig[state.difficulty];
    if (state.rng.next() < 0.75 + cfg.travelRisk * 0.2) {
      const ev = state.rng.pick(travelEvents);
      ev.effect(state);
      appendLog(`Travel event: ${ev.text}`);
    }
  }

  function enterTown(town) {
    state.currentTown = town;
    state.day += 1;
    state.strength = Math.min(120, state.strength + 6);
    state.score += 3;
    consumeSupplies();
    if (state.screen === 'gameOver') return;

    triggerTravelEvent();
    movePinkerton();
    moveGang();

    if (state.currentTown === state.pinkertonTown) {
      loseGame('Pinkerton Agent was already in town. Immediate arrest.');
      return;
    }

    appendLog(`You enter Town ${town}. Strength rises with resolve (+6).`);
    state.screen = 'town';
  }

  function getGangHere() {
    return gangRoster.filter((g) => state.gangLocations[g.id] === state.currentTown);
  }

  function maybeSaloonEncounter() {
    const gangHere = getGangHere();
    if (gangHere.length && state.rng.next() < 0.65) {
      state.pendingEncounter = { type: 'gang', member: state.rng.pick(gangHere) };
      state.screen = 'encounter';
      return;
    }
    if (state.rng.next() < 0.35) {
      state.pendingEncounter = { type: 'innocent' };
      state.screen = 'encounter';
      return;
    }
    appendLog('No one useful at the bar this time.');
  }

  function startPoker() {
    if (state.money < 10) return appendLog('Need $10 ante to play poker.');
    state.money -= 10;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const suits = ['♠', '♥', '♦', '♣'];
    const pVal = state.rng.int(0, 12);
    const dVal = state.rng.int(0, 12);
    state.poker = {
      playerCard: `${ranks[pVal]}${state.rng.pick(suits)}`,
      dealerCard: `${ranks[dVal]}${state.rng.pick(suits)}`,
      pVal,
      dVal,
      resolved: false,
      result: ''
    };
    state.screen = 'poker';
  }

  function resolvePoker() {
    if (!state.poker || state.poker.resolved) return;
    const { pVal, dVal } = state.poker;
    if (pVal > dVal) {
      const gain = 20 + (pVal - dVal) * 3;
      state.money += gain;
      state.score += 8;
      state.poker.result = `You win the hand. +$${gain}`;
    } else if (pVal < dVal) {
      state.poker.result = 'Dealer takes the pot. You lose your ante.';
    } else {
      state.money += 10;
      state.poker.result = 'Draw. Ante returned.';
    }
    state.poker.resolved = true;
  }

  function loseGame(reason) {
    state.gameOverReason = reason;
    state.screen = 'gameOver';
  }

  function startDuel(member, mode) {
    if (state.ammo <= 0) {
      appendLog('No ammo. You cannot duel.');
      state.screen = 'town';
      return;
    }

    state.screen = 'duel';
    state.duel = {
      member,
      mode,
      phase: 'standby',
      startTime: 0,
      timeout: null,
      message: 'STAND BY... WAIT FOR "HE MOVES!" THEN PRESS ANY KEY.'
    };

    state.duel.timeout = setTimeout(() => {
      if (!state.duel || state.duel.phase !== 'standby') return;
      state.duel.phase = 'cue';
      state.duel.startTime = performance.now();
      state.duel.message = 'HE MOVES! PRESS ANY KEY NOW!';
      render();
    }, state.rng.int(900, 2600));
  }

  function finishDuel(reactionMs) {
    const cfg = difficultyConfig[state.difficulty];
    const target = (560 - state.gunLevel * 55 - Math.min(90, state.strength) * 0.77) * cfg.duelPenalty;

    state.ammo = Math.max(0, state.ammo - 1);
    let outcome = 'draw';
    if (reactionMs < target * 0.82) outcome = 'win';
    else if (reactionMs > target * 1.18) outcome = 'lose';

    if (outcome === 'win') {
      if (state.duel.mode === 'shoot') {
        state.deadProof = state.duel.member;
        state.score += 140;
        appendLog(`You shot ${state.duel.member.name}. Bring proof to Sheriff for max points.`);
      } else {
        state.captive = state.duel.member;
        state.score += 95;
        appendLog(`You captured ${state.duel.member.name} alive.`);
      }
      state.gangLocations[state.duel.member.id] = 'JAILED';
    } else if (outcome === 'lose') {
      state.strength = Math.max(0, state.strength - 28);
      appendLog(`You were hit (${Math.round(reactionMs)} ms). -28 strength.`);
      if (state.strength <= 0) return loseGame('You died in a duel.');
      if (state.rng.next() < cfg.arrestBase) return loseGame('Pinkerton arrives during chaos. You are arrested.');
    } else {
      state.money = Math.max(0, state.money - 12);
      appendLog(`Draw at ${Math.round(reactionMs)} ms. Target escaped. -$12.`);
    }

    state.duel = null;
    state.screen = 'town';
  }

  function earlyDuelPenalty() {
    if (state.duel?.timeout) clearTimeout(state.duel.timeout);
    state.duel = null;
    if (state.rng.next() < 0.55) loseGame('You fired early before he moved. Sheriff arrests you.');
    else loseGame('You fired early and were dropped instantly.');
  }

  function rumorForGang() {
    const cfg = difficultyConfig[state.difficulty];
    const member = state.rng.pick(gangRoster);
    const stale = state.rng.next() < cfg.staleRumor;
    const shownTown = stale ? state.rng.pick(towns) : state.gangLocations[member.id];
    const text = `Rumor: ${member.name} seen near Town ${shownTown}.` + (stale ? ' (Might be stale.)' : '');
    state.clues.push(text);
    appendLog(text);
  }

  function clueForPinkerton() {
    const text = `Wire: Pinkerton Agent currently reported in Town ${state.pinkertonTown}.`;
    state.clues.push(text);
    appendLog(text);
  }

  function reviewCluesText() {
    if (!state.clues.length) return 'No clues collected.';
    return state.clues.map((c, i) => `${i + 1}. ${c}`).join('\n');
  }

  function tryTurnIn() {
    if (!state.captive && !state.deadProof) return appendLog('No captive or proof to turn in.');
    const suspect = state.captive || state.deadProof;
    if (suspect.id === state.murdererId) {
      state.score += 250 + (state.deadProof ? 120 : 60);
      state.screen = 'win';
      return;
    }
    state.money = Math.max(0, state.money - 20);
    state.day += 1;
    state.score = Math.max(0, state.score - 30);
    appendLog(`Wrong suspect: ${suspect.name}. Sheriff fines you $20.`);
    state.pinkertonTown = state.currentTown;
    state.pinkertonTurnsLeft = 1;
    state.captive = null;
    state.deadProof = null;
  }

  function buyStore(item) {
    if (item === 'food' && state.money >= 6) {
      state.money -= 6;
      state.food += 1;
      appendLog('Bought 1 food for $6.');
    } else if (item === 'water' && state.money >= 5) {
      state.money -= 5;
      state.water += 1;
      appendLog('Bought 1 water for $5.');
    } else if (item === 'ammo' && state.money >= 18) {
      state.money -= 18;
      state.ammo += 50;
      appendLog('Bought ammo box (50) for $18.');
    } else if (item === 'gun' && state.money >= 55 && state.gunLevel < 3) {
      state.money -= 55;
      state.gunLevel += 1;
      appendLog(`Bought better gun. Gun level now ${state.gunLevel}.`);
    } else {
      appendLog('Cannot buy: insufficient money or maxed item.');
    }
  }

  function statusBar() {
    const cfg = difficultyConfig[state.difficulty];
    return `<div class="meta">
  <span>DAY ${state.day}</span><span>TOWN ${state.currentTown}</span><span>DIFF ${state.difficulty} (${cfg.label})</span>
  <span>SCORE ${state.score}</span><span>$${state.money}</span><span>FOOD ${state.food}</span><span>WATER ${state.water}</span>
  <span>AMMO ${state.ammo}</span><span>GUN ${state.gunLevel}</span><span>STR ${state.strength}</span>
</div>`;
  }

  function logPanel() {
    return state.log.length ? `<div class="screen small">${state.log.join('\n')}</div>` : '';
  }

  function render() {
    const restartHint = '<div class="footer">Press R anytime to restart · Menu uses keys 1-9.</div>';
    let html = '';

    if (state.screen === 'title') {
      html = `<h1 class="title">THE WILD BUNCH</h1>
<div class="screen">1984-style ZX Spectrum inspired western manhunt.

You are framed for murder.
Hunt the real killer among six outlaws.
Avoid the Pinkerton Agent.

1) START GAME
2) START WITH FIXED SEED (1984)</div>${restartHint}`;
    }

    if (state.screen === 'difficulty') {
      html = `<h1 class="title">SELECT DIFFICULTY</h1>
<div class="screen menu">1) EASY\n2) MEDIUM\n3) HARD\n\nDifficulty affects Pinkerton speed/stay and arrest checks.</div>${restartHint}`;
    }

    if (state.screen === 'introClue') {
      html = `<h1 class="title">DYING MAN'S LAST WORDS</h1>${statusBar()}
<div class="screen warn">"Remember this... the killer was: ${state.clueOpening}."\n\nMEMORIZE THIS DESCRIPTION.\n\n1) BEGIN MANHUNT (MAP)</div>${restartHint}`;
    }

    if (state.screen === 'map') {
      html = `<h1 class="title">MAP - CHOOSE TOWN</h1>${statusBar()}
<div class="screen menu">Travel consumes food/water and advances time.\nIf Pinkerton is already there, you are arrested immediately.\n\n1) Town A\n2) Town B\n3) Town C\n4) Town D\n5) Town E\n6) View Status</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'town') {
      html = `<h1 class="title">TOWN ${state.currentTown}</h1>${statusBar()}
<div class="screen menu">1) Sheriff's Office\n2) Saloon\n3) General Store\n4) Telegraph Office\n5) Leave Town (Map)\n6) View Status</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'sheriff') {
      const suspect = state.captive ? `Captive: ${state.captive.name}` : state.deadProof ? `Dead proof: ${state.deadProof.name}` : 'No suspect held.';
      html = `<h1 class="title">SHERIFF'S OFFICE</h1>${statusBar()}
<div class="screen menu">${suspect}\n\n1) Turn in suspect/proof\n2) Review clues\n3) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'clues') {
      html = `<h1 class="title">CASE NOTES</h1>${statusBar()}
<div class="screen">OPENING CLUE: ${state.clueOpening}\n\n${reviewCluesText()}\n\n1) Back to Sheriff's Office</div>${restartHint}`;
    }

    if (state.screen === 'saloon') {
      html = `<h1 class="title">SALOON</h1>${statusBar()}
<div class="screen menu">1) Play Poker ($10 ante)\n2) Buy drink ($4, +8 strength)\n3) Look for trouble / rumors\n4) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'encounter') {
      if (state.pendingEncounter?.type === 'gang') {
        const m = state.pendingEncounter.member;
        html = `<h1 class="title">SALOON ENCOUNTER</h1>${statusBar()}
<div class="screen warn">You spot ${m.name}.\nDescription: ${m.desc}\n\n1) ATTEMPT CAPTURE\n2) SHOOT\n3) WALK AWAY</div>${restartHint}`;
      } else {
        html = `<h1 class="title">SALOON ENCOUNTER</h1>${statusBar()}
<div class="screen">An old drifter says one of them has a gravelly voice.\n\n1) Add clue and return</div>${restartHint}`;
      }
    }

    if (state.screen === 'poker') {
      const p = state.poker;
      html = `<h1 class="title">POKER TABLE</h1>${statusBar()}
<div class="screen">Only significant cards shown.
<div class="card-row"><div class="card">YOUR CARD\n${p.playerCard}</div><div class="card">DEALER CARD\n${p.dealerCard}</div></div>
${p.resolved ? `<span class="gold">${p.result}</span>` : '1) Call hand\n2) Fold (lose ante)'}
\n${p.resolved ? '1) Back to Saloon' : ''}</div>${restartHint}`;
    }

    if (state.screen === 'store') {
      html = `<h1 class="title">GENERAL STORE</h1>${statusBar()}
<div class="screen menu">1) Buy food (+1) .......... $6\n2) Buy water (+1) ......... $5\n3) Buy ammo box (+50) ..... $18\n4) Buy better gun ......... $55\n5) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'telegraph') {
      html = `<h1 class="title">TELEGRAPH OFFICE</h1>${statusBar()}
<div class="screen menu">1) Pay $12 for Pinkerton location wire\n2) Pay $14 for Wild Bunch rumor\n3) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'status') {
      html = `<h1 class="title">STATUS</h1>${statusBar()}
<div class="screen">Opening clue: ${state.clueOpening}\nKnown clues: ${state.clues.length}\nPinkerton movement check in: ${state.pinkertonTurnsLeft}\n\nGang roster:\n${gangRoster.map((g) => `- ${g.name}: ${g.desc}`).join('\n')}\n\n1) Back</div>${restartHint}`;
    }

    if (state.screen === 'duel') {
      html = `<h1 class="title">DUEL</h1>${statusBar()}
<div class="screen warn">Opponent: ${state.duel.member.name}\nMode: ${state.duel.mode.toUpperCase()}\n\n${state.duel.message}\n\nEarly key press = immediate penalty.</div>${restartHint}`;
    }

    if (state.screen === 'win') {
      html = `<h1 class="title">YOU WIN</h1>${statusBar()}
<div class="screen gold">You delivered the true murderer to the sheriff.\n\n${state.deadProof ? 'You shot the killer: bonus score awarded.' : 'You captured the killer alive.'}\n\nFinal score: ${state.score}\n\n1) Play again</div>`;
    }

    if (state.screen === 'gameOver') {
      html = `<h1 class="title">GAME OVER</h1>${statusBar()}<div class="screen warn">${state.gameOverReason}\n\n1) Restart</div>`;
    }

    app.innerHTML = html;
  }

  function handleNumeric(n) {
    if (state.screen === 'title') {
      if (n === 1) state.screen = 'difficulty';
      if (n === 2) {
        state.screen = 'difficulty';
        state.fixedSeed = 1984;
      }
      return render();
    }

    if (state.screen === 'difficulty') {
      if ([1, 2, 3].includes(n)) {
        state.difficulty = n;
        startRun(state.fixedSeed || Date.now());
        state.fixedSeed = null;
      }
      return render();
    }

    if (state.screen === 'introClue') {
      if (n === 1) state.screen = 'map';
      return render();
    }

    if (state.screen === 'map') {
      if (n >= 1 && n <= 5) enterTown(towns[n - 1]);
      if (n === 6) state.screen = 'status';
      return render();
    }

    if (state.screen === 'town') {
      if (n === 1) state.screen = 'sheriff';
      if (n === 2) state.screen = 'saloon';
      if (n === 3) state.screen = 'store';
      if (n === 4) state.screen = 'telegraph';
      if (n === 5) state.screen = 'map';
      if (n === 6) state.screen = 'status';
      return render();
    }

    if (state.screen === 'sheriff') {
      if (n === 1) tryTurnIn();
      if (n === 2) state.screen = 'clues';
      if (n === 3) state.screen = 'town';
      return render();
    }

    if (state.screen === 'clues') {
      if (n === 1) state.screen = 'sheriff';
      return render();
    }

    if (state.screen === 'saloon') {
      if (n === 1) startPoker();
      if (n === 2) {
        if (state.money >= 4) {
          state.money -= 4;
          state.strength = Math.min(120, state.strength + 8);
          appendLog('Drink bought. +8 strength.');
        } else appendLog('Not enough money for a drink.');
      }
      if (n === 3) maybeSaloonEncounter();
      if (n === 4) state.screen = 'town';
      return render();
    }

    if (state.screen === 'encounter') {
      if (state.pendingEncounter?.type === 'gang') {
        const member = state.pendingEncounter.member;
        if (n === 1) startDuel(member, 'capture');
        if (n === 2) startDuel(member, 'shoot');
        if (n === 3) {
          appendLog(`You avoid trouble with ${member.name}.`);
          state.screen = 'saloon';
        }
      } else if (n === 1) {
        state.clues.push('Drifter clue: one suspect has a gravelly voice.');
        state.screen = 'saloon';
      }
      state.pendingEncounter = null;
      return render();
    }

    if (state.screen === 'poker') {
      if (!state.poker.resolved) {
        if (n === 1) resolvePoker();
        if (n === 2) {
          state.poker.resolved = true;
          state.poker.result = 'You fold and keep your pride.';
        }
      } else if (n === 1) {
        state.screen = 'saloon';
        state.poker = null;
      }
      return render();
    }

    if (state.screen === 'store') {
      if (n === 1) buyStore('food');
      if (n === 2) buyStore('water');
      if (n === 3) buyStore('ammo');
      if (n === 4) buyStore('gun');
      if (n === 5) state.screen = 'town';
      return render();
    }

    if (state.screen === 'telegraph') {
      if (n === 1) {
        if (state.money >= 12) {
          state.money -= 12;
          clueForPinkerton();
          state.score += 4;
        } else appendLog('Not enough money.');
      }
      if (n === 2) {
        if (state.money >= 14) {
          state.money -= 14;
          rumorForGang();
          state.score += 5;
        } else appendLog('Not enough money.');
      }
      if (n === 3) state.screen = 'town';
      return render();
    }

    if (state.screen === 'status') {
      if (n === 1) state.screen = state.currentTown ? 'town' : 'map';
      return render();
    }

    if (state.screen === 'win' || state.screen === 'gameOver') {
      if (n === 1) state.screen = 'title';
      return render();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') {
      state.screen = 'title';
      return render();
    }

    if (state.screen === 'duel') {
      if (state.duel.phase === 'standby') {
        earlyDuelPenalty();
        return render();
      }
      if (state.duel.phase === 'cue') {
        finishDuel(performance.now() - state.duel.startTime);
        return render();
      }
      return;
    }

    if (/^[1-9]$/.test(e.key)) handleNumeric(Number(e.key));
  });

  state.screen = 'title';
  render();
})();
