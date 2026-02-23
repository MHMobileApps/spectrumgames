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
    1: {
      label: 'Easy',
      pinkertonStayMin: 2,
      pinkertonStayMax: 4,
      arrestBase: 0.12,
      duelPenalty: 0.9,
      staleRumor: 0.1,
      travelRisk: 0.2,
      closeInPerTravel: 6,
      closeInMax: 100
    },
    2: {
      label: 'Medium',
      pinkertonStayMin: 1,
      pinkertonStayMax: 3,
      arrestBase: 0.2,
      duelPenalty: 1,
      staleRumor: 0.25,
      travelRisk: 0.35,
      closeInPerTravel: 10,
      closeInMax: 100
    },
    3: {
      label: 'Hard',
      pinkertonStayMin: 1,
      pinkertonStayMax: 2,
      arrestBase: 0.32,
      duelPenalty: 1.15,
      staleRumor: 0.45,
      travelRisk: 0.5,
      closeInPerTravel: 15,
      closeInMax: 100
    }
  };

  const travelEvents = [
    { text: 'Dust storm! You lose 1 water.', effect: (s) => (s.water = Math.max(0, s.water - 1)) },
    { text: 'You find an abandoned canteen: +1 water.', effect: (s) => (s.water += 1) },
    { text: 'Broken axle delays you. +1 day passes.', effect: (s) => (s.day += 1) },
    { text: 'Bandit warning shots. You lose 10 strength.', effect: (s) => (s.strength = Math.max(0, s.strength - 10)) },
    { text: 'A rancher shares jerky: +1 food.', effect: (s) => (s.food += 1) },
    { text: 'Horse throws a shoe. Pay $8 for repair.', effect: (s) => (s.money = Math.max(0, s.money - 8)) },
    { text: 'Quiet travel. No incident.', effect: () => {} },
    {
      text: 'Bad river crossing. Lose 1 food and 1 water.',
      effect: (s) => {
        s.food = Math.max(0, s.food - 1);
        s.water = Math.max(0, s.water - 1);
      }
    },
    { text: 'You pick up dropped cartridges: +15 ammo.', effect: (s) => (s.ammo += 15) },
    { text: 'Ambush at dusk! You spend 12 ammo escaping.', effect: (s) => (s.ammo = Math.max(0, s.ammo - 12)) },
    { text: 'Medicine wagon passes by: +8 strength.', effect: (s) => (s.strength = Math.min(120, s.strength + 8)) },
    { text: 'You lose your trail map. +1 day.', effect: (s) => (s.day += 1) },
    { text: 'Lucky card hand with drifters: +$12.', effect: (s) => (s.money += 12) },
    { text: 'Heat exhaustion. -12 strength.', effect: (s) => (s.strength = Math.max(0, s.strength - 12)) },
    {
      text: 'Supply crate discovered: +2 food, +2 water.',
      effect: (s) => {
        s.food += 2;
        s.water += 2;
      }
    },
    { text: 'Snakebite panic. Pay $10 for treatment.', effect: (s) => (s.money = Math.max(0, s.money - 10)) },
    { text: 'Gun jam drill costs 8 ammo.', effect: (s) => (s.ammo = Math.max(0, s.ammo - 8)) },
    { text: 'Short-cut through canyon: save a day.', effect: (s) => (s.day = Math.max(1, s.day - 1)) },
    { text: 'Bad weather ruins rations: -1 food.', effect: (s) => (s.food = Math.max(0, s.food - 1)) },
    { text: 'You help settlers and earn $15.', effect: (s) => (s.money += 15) },
    { text: 'Wild horse joins your herd. +6 strength.', effect: (s) => (s.strength = Math.min(120, s.strength + 6)) },
    {
      text: 'Night raiders steal 1 water and 10 ammo.',
      effect: (s) => {
        s.water = Math.max(0, s.water - 1);
        s.ammo = Math.max(0, s.ammo - 10);
      }
    }
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
    fixedSeed: null,
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
    pinkertonPressure: 0,
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

  function cfg() {
    return difficultyConfig[state.difficulty];
  }

  function appendLog(line) {
    state.log.unshift(line);
    state.log = state.log.slice(0, 8);
  }

  function startRun(seed = Date.now()) {
    state.rng = createRng(seed);
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
    state.pinkertonTurnsLeft = state.rng.int(cfg().pinkertonStayMin, cfg().pinkertonStayMax);
    state.pinkertonPressure = 0;
    state.clues = [];
    state.log = [];
    state.pendingEncounter = null;
    state.captive = null;
    state.deadProof = null;

    for (const g of gangRoster) state.gangLocations[g.id] = state.rng.pick(towns);

    const murderer = state.rng.pick(gangRoster);
    state.murdererId = murderer.id;
    const parts = murderer.desc.split(',').map((p) => p.trim());
    state.clueOpening = `${parts[state.rng.int(0, parts.length - 1)]}; ${parts[state.rng.int(0, parts.length - 1)]}`;

    state.screen = 'introClue';
  }

  function loseGame(reason) {
    state.gameOverReason = reason;
    state.screen = 'gameOver';
  }

  function consumeSupplies() {
    state.food = Math.max(0, state.food - 1);
    state.water = Math.max(0, state.water - 1);
    if (state.food === 0 || state.water === 0) {
      state.strength = Math.max(0, state.strength - 14);
      appendLog('No food/water reserves: strength drops hard.');
    }
    if (state.strength <= 0) loseGame('You collapse on the trail.');
  }

  function movePinkerton() {
    state.pinkertonTurnsLeft -= 1;
    if (state.pinkertonTurnsLeft > 0) return;
    state.pinkertonTown = state.rng.pick(towns.filter((t) => t !== state.pinkertonTown));
    state.pinkertonTurnsLeft = state.rng.int(cfg().pinkertonStayMin, cfg().pinkertonStayMax);
  }

  function advancePinkertonPressure(multiplier = 1) {
    state.pinkertonPressure += cfg().closeInPerTravel * multiplier;
    if (state.pinkertonPressure >= cfg().closeInMax) {
      loseGame('Pinkerton closes in on your trail and arrests you.');
    }
  }

  function moveGang() {
    for (const g of gangRoster) if (state.rng.next() < 0.45) state.gangLocations[g.id] = state.rng.pick(towns);
  }

  function triggerTravelEvent() {
    if (state.rng.next() < 0.75 + cfg().travelRisk * 0.2) {
      const ev = state.rng.pick(travelEvents);
      ev.effect(state);
      appendLog(`Travel event: ${ev.text}`);
    }
  }

  function checkPinkertonTownArrest() {
    if (state.currentTown === state.pinkertonTown) {
      loseGame('Pinkerton Agent was already in this town. Immediate arrest.');
      return true;
    }
    return false;
  }

  function enterTown(town) {
    state.currentTown = town;
    state.day += 1;
    state.strength = Math.min(120, state.strength + 6);
    state.score += 3;

    consumeSupplies();
    if (state.screen === 'gameOver') return;

    triggerTravelEvent();
    if (state.screen === 'gameOver') return;

    movePinkerton();
    moveGang();
    advancePinkertonPressure(1);
    if (state.screen === 'gameOver') return;

    if (checkPinkertonTownArrest()) return;

    appendLog(`Entered Town ${town}. Determination hardens (+6 strength).`);
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
    appendLog('No useful faces in the saloon tonight.');
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
      state.poker.result = `You win. +$${gain}`;
    } else if (pVal < dVal) {
      state.poker.result = 'Dealer wins. You lose ante.';
    } else {
      state.money += 10;
      state.poker.result = 'Draw. Ante returned.';
    }
    state.poker.resolved = true;
  }

  function startDuel(member, mode) {
    if (state.ammo <= 0) {
      appendLog('No ammo. Buy a box of 50 at the store.');
      state.screen = 'town';
      return;
    }

    state.duel = {
      member,
      mode,
      phase: 'standby',
      startTime: 0,
      timeout: null,
      message: 'STAND BY... WAIT FOR "HE MOVES!" THEN PRESS ANY KEY.'
    };

    state.screen = 'duel';
    state.duel.timeout = setTimeout(() => {
      if (!state.duel || state.duel.phase !== 'standby') return;
      state.duel.phase = 'cue';
      state.duel.startTime = performance.now();
      state.duel.message = 'HE MOVES! PRESS ANY KEY NOW!';
      render();
    }, state.rng.int(900, 2600));
  }

  function finishDuel(reactionMs) {
    const target = (560 - state.gunLevel * 55 - Math.min(90, state.strength) * 0.77) * cfg().duelPenalty;
    state.ammo = Math.max(0, state.ammo - 1);

    let outcome = 'draw';
    if (reactionMs < target * 0.82) outcome = 'win';
    else if (reactionMs > target * 1.18) outcome = 'lose';

    if (outcome === 'win') {
      if (state.duel.mode === 'shoot') {
        state.deadProof = state.duel.member;
        state.score += 140;
        appendLog(`You shot ${state.duel.member.name}. High score bonus for lethal stop.`);
      } else {
        state.captive = state.duel.member;
        state.score += 95;
        appendLog(`You captured ${state.duel.member.name} alive.`);
      }
      state.gangLocations[state.duel.member.id] = 'JAILED';
      state.pinkertonPressure = Math.max(0, state.pinkertonPressure - 8);
    } else if (outcome === 'lose') {
      state.strength = Math.max(0, state.strength - 28);
      appendLog(`You were hit (${Math.round(reactionMs)}ms). -28 strength.`);
      if (state.strength <= 0) return loseGame('You died in a duel.');
      if (state.rng.next() < cfg().arrestBase) return loseGame('Pinkerton arrives in the chaos. You are arrested.');
    } else {
      state.money = Math.max(0, state.money - 12);
      appendLog(`Draw (${Math.round(reactionMs)}ms). Target escapes. -$12.`);
    }

    state.duel = null;
    state.screen = 'town';
  }

  function earlyDuelPenalty() {
    if (state.duel?.timeout) clearTimeout(state.duel.timeout);
    state.duel = null;
    if (state.rng.next() < 0.55) loseGame('Early shot before draw cue: arrested by sheriff.');
    else loseGame('Early shot: immediate fatal return fire.');
  }

  function clueForPinkerton() {
    const text = `Wire: Pinkerton Agent currently in Town ${state.pinkertonTown}.`;
    state.clues.push(text);
    appendLog(text);
  }

  function rumorForGang() {
    const member = state.rng.pick(gangRoster);
    const stale = state.rng.next() < cfg().staleRumor;
    const shownTown = stale ? state.rng.pick(towns) : state.gangLocations[member.id];
    const text = `Rumor: ${member.name} seen near Town ${shownTown}.` + (stale ? ' (Possibly stale.)' : '');
    state.clues.push(text);
    appendLog(text);
  }

  function reviewCluesText() {
    if (!state.clues.length) return 'No clues collected.';
    return state.clues.map((c, i) => `${i + 1}. ${c}`).join('\n');
  }

  function tryTurnIn() {
    if (!state.captive && !state.deadProof) return appendLog('No captive/proof to turn in.');

    const suspect = state.captive || state.deadProof;
    if (suspect.id === state.murdererId) {
      state.score += 250 + (state.deadProof ? 120 : 60);
      state.screen = 'win';
      return;
    }

    state.money = Math.max(0, state.money - 20);
    state.day += 1;
    state.score = Math.max(0, state.score - 30);
    state.pinkertonPressure = Math.min(cfg().closeInMax, state.pinkertonPressure + 20);
    appendLog(`Wrong suspect (${suspect.name}). Sheriff fines $20. Pinkerton closes in.`);
    state.captive = null;
    state.deadProof = null;
  }

  function buyStore(item) {
    if (item === 'food' && state.money >= 6) {
      state.money -= 6;
      state.food += 1;
      appendLog('Bought food (+1) for $6.');
      return;
    }
    if (item === 'water' && state.money >= 5) {
      state.money -= 5;
      state.water += 1;
      appendLog('Bought water (+1) for $5.');
      return;
    }
    if (item === 'ammo' && state.money >= 18) {
      state.money -= 18;
      state.ammo += 50;
      appendLog('Bought bullets: one box of 50 for $18.');
      return;
    }
    if (item === 'gun' && state.money >= 55 && state.gunLevel < 3) {
      state.money -= 55;
      state.gunLevel += 1;
      appendLog(`Bought better gun. Gun level ${state.gunLevel}.`);
      return;
    }
    appendLog('Cannot buy: insufficient cash or item maxed.');
  }

  function statusBar() {
    return `<div class="meta">
  <span>DAY ${state.day}</span><span>TOWN ${state.currentTown}</span><span>DIFF ${state.difficulty} (${cfg().label})</span>
  <span>SCORE ${state.score}</span><span>$${state.money}</span><span>FOOD ${state.food}</span><span>WATER ${state.water}</span>
  <span>AMMO ${state.ammo}</span><span>GUN ${state.gunLevel}</span><span>STR ${state.strength}</span>
  <span>PINKERTON ${Math.min(100, Math.round(state.pinkertonPressure))}%</span>
</div>`;
  }

  function logPanel() {
    return state.log.length ? `<div class="screen small">${state.log.join('\n')}</div>` : '';
  }

  function render() {
    const restartHint = '<div class="footer">Keys 1-9 for menus · Any key in duel · R restarts from any screen.</div>';
    let html = '';

    if (state.screen === 'title') {
      html = `<h1 class="title">THE WILD BUNCH</h1>
<div class="screen">You are framed for murder.
Find and deliver the real killer from six gang members.

1) START GAME
2) START WITH FIXED SEED (1984)</div>${restartHint}`;
    }

    if (state.screen === 'difficulty') {
      html = `<h1 class="title">SELECT DIFFICULTY</h1>
<div class="screen menu">1) EASY\n2) MEDIUM\n3) HARD\n\nDifficulty controls Pinkerton close-in speed, stay duration, and arrest probability.</div>${restartHint}`;
    }

    if (state.screen === 'introClue') {
      html = `<h1 class="title">DYING MAN'S LAST WORDS</h1>${statusBar()}
<div class="screen warn">"Remember this... the killer was: ${state.clueOpening}."\n\nMEMORIZE THIS DESCRIPTION.\nYou must use it later to identify the real murderer.\n\n1) BEGIN MANHUNT (MAP)</div>${restartHint}`;
    }

    if (state.screen === 'map') {
      html = `<h1 class="title">MAP - CHOOSE TOWN</h1>${statusBar()}
<div class="screen menu">Travel consumes food/water and advances time.\nEntering a town already containing Pinkerton = instant arrest.\n\n1) Town A\n2) Town B\n3) Town C\n4) Town D\n5) Town E\n6) View Status</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'town') {
      html = `<h1 class="title">TOWN ${state.currentTown}</h1>${statusBar()}
<div class="screen menu">1) Sheriff's Office\n2) Saloon\n3) General Store\n4) Telegraph Office\n5) Leave Town (Map)\n6) View Status</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'sheriff') {
      const suspect = state.captive ? `Captive: ${state.captive.name}` : state.deadProof ? `Dead proof: ${state.deadProof.name}` : 'No suspect held.';
      html = `<h1 class="title">SHERIFF'S OFFICE</h1>${statusBar()}
<div class="screen menu">${suspect}\n\n1) Turn in captive/proof\n2) Review clues\n3) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'clues') {
      html = `<h1 class="title">CASE NOTES</h1>${statusBar()}
<div class="screen">Opening clue: ${state.clueOpening}\n\n${reviewCluesText()}\n\n1) Back to Sheriff's Office</div>${restartHint}`;
    }

    if (state.screen === 'saloon') {
      html = `<h1 class="title">SALOON</h1>${statusBar()}
<div class="screen menu">1) Play Poker ($10 ante)\n2) Buy drink ($4, +8 strength)\n3) Look for gang encounter\n4) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'encounter') {
      if (state.pendingEncounter?.type === 'gang') {
        const m = state.pendingEncounter.member;
        html = `<h1 class="title">SALOON ENCOUNTER</h1>${statusBar()}
<div class="screen warn">You spot ${m.name}.\nDescriptor: ${m.desc}\n\n1) ATTEMPT CAPTURE\n2) SHOOT\n3) WALK AWAY</div>${restartHint}`;
      } else {
        html = `<h1 class="title">SALOON ENCOUNTER</h1>${statusBar()}
<div class="screen">A drifter mutters:\n"One of them talks with a gravel voice."\n\n1) Note clue and return</div>${restartHint}`;
      }
    }

    if (state.screen === 'poker') {
      const p = state.poker;
      html = `<h1 class="title">POKER TABLE</h1>${statusBar()}
<div class="screen">Only significant cards are shown.
<div class="card-row"><div class="card">YOUR CARD\n${p.playerCard}</div><div class="card">DEALER CARD\n${p.dealerCard}</div></div>
${p.resolved ? `<span class="gold">${p.result}</span>` : '1) Call hand\n2) Fold (lose ante)'}\n
${p.resolved ? '1) Back to Saloon' : ''}</div>${restartHint}`;
    }

    if (state.screen === 'store') {
      html = `<h1 class="title">GENERAL STORE</h1>${statusBar()}
<div class="screen menu">1) Buy food (+1) .......... $6\n2) Buy water (+1) ......... $5\n3) Buy ammo box (+50) ..... $18\n4) Buy better gun ......... $55 (max L3)\n5) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'telegraph') {
      html = `<h1 class="title">TELEGRAPH OFFICE</h1>${statusBar()}
<div class="screen menu">1) Pay $12 for Pinkerton location\n2) Pay $14 for Wild Bunch rumor\n3) Back to town</div>${logPanel()}${restartHint}`;
    }

    if (state.screen === 'status') {
      html = `<h1 class="title">STATUS</h1>${statusBar()}
<div class="screen">Opening clue: ${state.clueOpening}\nKnown clues: ${state.clues.length}\nPinkerton location unknown unless telegraphed.\n\nGang descriptors:\n${gangRoster.map((g) => `- ${g.name}: ${g.desc}`).join('\n')}\n\n1) Back</div>${restartHint}`;
    }

    if (state.screen === 'duel' && state.duel) {
      html = `<h1 class="title">DUEL</h1>${statusBar()}
<div class="screen warn">Opponent: ${state.duel.member.name}\nMode: ${state.duel.mode.toUpperCase()}\n\n${state.duel.message}\n\nAny key too early = immediate heavy penalty.</div>${restartHint}`;
    }

    if (state.screen === 'win') {
      html = `<h1 class="title">YOU WIN</h1>${statusBar()}
<div class="screen gold">You delivered the real murderer to the sheriff.\n\n${state.deadProof ? 'You shot the killer: extra points awarded.' : 'You captured the killer alive.'}\n\nFinal score: ${state.score}\n\n1) Play again</div>`;
    }

    if (state.screen === 'gameOver') {
      html = `<h1 class="title">GAME OVER</h1>${statusBar()}
<div class="screen warn">${state.gameOverReason}\n\n1) Restart</div>`;
    }

    app.innerHTML = html;
  }

  function handleNumeric(n) {
    if (state.screen === 'title') {
      if (n === 1) state.screen = 'difficulty';
      if (n === 2) {
        state.fixedSeed = 1984;
        state.screen = 'difficulty';
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
          appendLog('Drink bought (+8 strength).');
        } else appendLog('Not enough money for drink.');
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

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'r') {
      state.screen = 'title';
      return render();
    }

    if (state.screen === 'duel' && state.duel) {
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

    if (/^[1-9]$/.test(event.key)) {
      handleNumeric(Number(event.key));
    }
  });

  state.screen = 'title';
  render();
})();
