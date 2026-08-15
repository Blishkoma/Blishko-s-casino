/* =========================================
   ETAT GLOBAL ET ROUTAGE
========================================= */
let state = {
    balance: 10.00,
    history: [10.00],
    stats: { wagered: 0, biggestWin: 0, profits: {}, resets: 0 },
    chartObj: null,
    currentGame: null
};

const games = [
    { id: 'poulet', name: 'Poulet', icon: '🐔' },
    { id: 'mines', name: 'Mines', icon: '💣' },
    { id: 'blackjack', name: 'Blackjack', icon: '🃏' },
    { id: 'crash', name: 'Crash', icon: '📈' },
    { id: 'plinko', name: 'Plinko', icon: '🎯' },
    { id: 'dino', name: 'Dino', icon: '🦕' },
    { id: 'dice', name: 'Dice', icon: '🎲' },
    { id: 'roulette', name: 'Roulette', icon: '🎡' },
    { id: 'baccarat', name: 'Baccarat', icon: '🏦' },
    { id: 'keno', name: 'Keno', icon: '🎱' },
    { id: 'limbo', name: 'Limbo', icon: '🚀' },
    { id: 'hilo', name: 'HiLo', icon: '🃏' }
];

document.addEventListener('DOMContentLoaded', () => {
    updateBalanceDisplay();
    renderGames();
});

function renderGames() {
    const list = document.getElementById('games-list');
    games.forEach(g => {
        let div = document.createElement('div');
        div.className = 'game-card';
        div.onclick = () => loadGame(g);
        div.innerHTML = `<div class="game-icon">${g.icon}</div><div class="game-name">${g.name}</div>`;
        list.appendChild(div);
    });
}

function loadGame(game) {
    state.currentGame = game.id;
    document.getElementById('home-view').style.display = 'none';
    const view = document.getElementById('game-view');
    view.style.display = 'block';
    
    let html = `<div class="game-nav"><button class="back-btn" onclick="goHome()">◀ Retour</button><h2>${game.icon} ${game.name}</h2></div>`;
    
    switch(game.id) {
        case 'blackjack': html += renderBlackjack(); break;
        case 'poulet': html += renderPoulet(); break;
        case 'crash': html += renderCrash('crash'); break;
        case 'dino': html += renderCrash('dino'); break;
        case 'mines': html += renderMines(); break;
        case 'dice': html += renderDice(); break;
        case 'roulette': html += renderRoulette(); break;
        case 'baccarat': html += renderBaccarat(); break;
        case 'limbo': html += renderLimbo(); break;
        case 'hilo': html += renderHilo(); break;
        case 'plinko': html += renderPlinko(); break;
        case 'keno': html += renderKeno(); break;
        default: html += `<div style="text-align:center; padding: 50px; color: var(--text-muted);">Erreur de chargement.</div>`;
    }
    
    view.innerHTML = html;
    
    switch(game.id) {
        case 'blackjack': bjInit(); break;
        case 'poulet': ckInit(); break;
        case 'crash': crashInit('crash'); break;
        case 'dino': crashInit('dino'); break;
        case 'mines': minesInit(); break;
        case 'dice': diceInit(); break;
        case 'hilo': hiloInit(); break;
        case 'keno': kenoInit(); break;
    }
}

function goHome() {
    if (ck && ck.loop) clearInterval(ck.loop);
    if (crData && crData.loop) clearInterval(crData.loop);
    document.getElementById('game-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

function resetApp() {
    state.balance = 10.00;
    state.history = [10.00];
    state.stats.wagered = 0;
    state.stats.biggestWin = 0;
    state.stats.profits = {};
    state.stats.resets += 1;
    
    document.getElementById('game-over-modal').style.display = 'none';
    updateBalanceDisplay();
    goHome();
}

/* =========================================
   GESTION FINANCIÈRE ET WALLET
========================================= */
function updateBalanceDisplay() {
    document.getElementById('balance-amount').innerText = state.balance.toFixed(2);
}

function processBet(wager, winAmount) {
    state.stats.wagered += wager;
    state.balance -= wager;
    
    let profit = winAmount - wager;
    let gId = state.currentGame || 'inconnu';
    if (!state.stats.profits[gId]) state.stats.profits[gId] = 0;
    state.stats.profits[gId] += profit;

    if (winAmount > 0) {
        state.balance += winAmount;
        if (profit > state.stats.biggestWin) state.stats.biggestWin = profit;
    }
    
    state.history.push(state.balance);
    updateBalanceDisplay();
    
    // Vérification du Game Over (seuil stricte sous 0.01)
    if (state.balance < 0.01) {
        setTimeout(() => {
            document.getElementById('game-over-modal').style.display = 'flex';
        }, 500); // Petit délai pour laisser le joueur voir sa défaite
    }
}

function toggleWallet(show) {
    document.getElementById('wallet-view').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('stat-balance').innerText = state.balance.toFixed(2) + ' €';
        document.getElementById('stat-wager').innerText = state.stats.wagered.toFixed(2) + ' €';
        document.getElementById('stat-biggest').innerText = state.stats.biggestWin.toFixed(2) + ' €';
        document.getElementById('stat-resets').innerText = state.stats.resets;

        // Calcul Meilleur / Pire Jeu
        let bestGame = { id: null, profit: -Infinity };
        let worstGame = { id: null, profit: Infinity };

        for (let id in state.stats.profits) {
            let p = state.stats.profits[id];
            if (p > bestGame.profit) { bestGame.profit = p; bestGame.id = id; }
            if (p < worstGame.profit) { worstGame.profit = p; worstGame.id = id; }
        }

        let getName = (id) => { let g = games.find(x => x.id === id); return g ? g.name : id; };

        let bestEl = document.getElementById('stat-best');
        if (bestGame.id && bestGame.profit > 0) {
            bestEl.innerText = `🔥 ${getName(bestGame.id)} (+${bestGame.profit.toFixed(2)} €)`;
            bestEl.style.color = 'var(--accent)';
        } else {
            bestEl.innerText = "-";
            bestEl.style.color = 'var(--text-muted)';
        }

        let worstEl = document.getElementById('stat-worst');
        if (worstGame.id && worstGame.profit < 0) {
            worstEl.innerText = `📉 ${getName(worstGame.id)} (${worstGame.profit.toFixed(2)} €)`;
            worstEl.style.color = 'var(--danger)';
        } else {
            worstEl.innerText = "-";
            worstEl.style.color = 'var(--text-muted)';
        }

        renderChart();
    }
}

function renderChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (state.chartObj) state.chartObj.destroy();
    
    let pointColors = state.history.map((v, i) => i===0 ? '#00e701' : (v >= state.history[i-1] ? '#00e701' : '#ff4444'));

    state.chartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.history.map((_, i) => i),
            datasets: [{
                data: state.history,
                borderColor: '#b1bad3',
                borderWidth: 2,
                pointBackgroundColor: pointColors,
                pointRadius: 4,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { ticks: { color: '#b1bad3' } } }
        }
    });
}

/* =========================================
   MOTEURS DE JEUX
========================================= */

/* --- BLACKJACK --- */
let bj = { deck: [], pHand: [], dHand: [], bet: 0, active: false };

function renderBlackjack() {
    return `
    <div class="bj-container">
        <div class="bj-table">
            <div class="bj-hand">
                <div class="bj-label">Croupier <span id="bj-dlr-val"></span></div>
                <div id="bj-dlr-cards" class="cards-row"></div>
            </div>
            <div class="bj-msg" id="bj-msg"></div>
            <div class="bj-hand">
                <div class="bj-label">Joueur <span id="bj-plr-val"></span></div>
                <div id="bj-plr-cards" class="cards-row"></div>
            </div>
        </div>
        <div class="bet-controls" id="bj-start-ctrl">
            <div class="bet-input-wrap">
                <input type="number" id="bj-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
            </div>
            <button class="btn-large" onclick="bjDeal()">Miser</button>
        </div>
        <div class="bet-controls" id="bj-act-ctrl" style="display:none;">
            <div class="btn-row">
                <button class="btn-large btn-hit" onclick="bjHit()">Tirer</button>
                <button class="btn-large btn-stand" onclick="bjStand()">Rester</button>
            </div>
            <button class="btn-large btn-double" onclick="bjDouble()">Doubler</button>
        </div>
    </div>`;
}

function bjInit() { bj.active = false; }
function bjGetDeck() {
    let d = [];
    ['♥','♦','♣','♠'].forEach(s => ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].forEach(v => d.push({s,v})));
    return d.sort(() => Math.random() - 0.5);
}
function bjScore(h) {
    let sc=0, ac=0;
    h.forEach(c => {
        if(['J','Q','K'].includes(c.v)) sc+=10;
        else if(c.v==='A') { sc+=11; ac++; }
        else sc+=parseInt(c.v);
    });
    while(sc>21 && ac>0){ sc-=10; ac--; }
    return sc;
}
function bjDrawCard(c, hidden=false) {
    if(hidden) return `<div class="card hidden"></div>`;
    let color = (c.s==='♥'||c.s==='♦') ? 'red' : '';
    return `<div class="card ${color}">${c.v}${c.s}</div>`;
}
function bjUpdate(hide=true) {
    document.getElementById('bj-plr-cards').innerHTML = bj.pHand.map(c=>bjDrawCard(c)).join('');
    document.getElementById('bj-plr-val').innerText = `(${bjScore(bj.pHand)})`;
    
    let dHtml = bjDrawCard(bj.dHand[0]);
    if(hide && bj.dHand.length>1) dHtml += bjDrawCard(bj.dHand[1], true);
    else if(!hide) dHtml = bj.dHand.map(c=>bjDrawCard(c)).join('');
    
    document.getElementById('bj-dlr-cards').innerHTML = dHtml;
    document.getElementById('bj-dlr-val').innerText = hide ? `(?)` : `(${bjScore(bj.dHand)})`;
}

function bjDeal() {
    let b = parseFloat(document.getElementById('bj-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    
    bj.bet = b; bj.active = true; bj.deck = bjGetDeck();
    bj.pHand = [bj.deck.pop(), bj.deck.pop()];
    bj.dHand = [bj.deck.pop(), bj.deck.pop()];
    
    document.getElementById('bj-start-ctrl').style.display='none';
    document.getElementById('bj-act-ctrl').style.display='flex';
    document.getElementById('bj-msg').innerText='';
    
    bjUpdate();
    if(bjScore(bj.pHand)===21) bjResolve();
}
function bjHit() {
    if(!bj.active) return;
    bj.pHand.push(bj.deck.pop());
    bjUpdate();
    if(bjScore(bj.pHand)>21) bjResolve();
}
function bjStand() { if(bj.active) bjResolve(); }
function bjDouble() {
    if(!bj.active || bj.bet > state.balance) return;
    bj.bet *= 2;
    bj.pHand.push(bj.deck.pop());
    bjUpdate();
    bjResolve();
}
function bjResolve() {
    bj.active = false;
    let pSc = bjScore(bj.pHand);
    let msg="", win=0;
    
    if(pSc > 21) {
        msg = "Bust ! (Perdu)";
        processBet(bj.bet, 0);
    } else {
        while(bjScore(bj.dHand) < 17) bj.dHand.push(bj.deck.pop());
        let dSc = bjScore(bj.dHand);
        
        if(dSc > 21 || pSc > dSc) {
            msg = (pSc===21 && bj.pHand.length===2) ? "Blackjack !" : "Gagné !";
            win = bj.bet * (msg==="Blackjack !" ? 2.5 : 2);
            processBet(bj.bet, win);
        } else if(pSc === dSc) {
            msg = "Égalité";
            processBet(bj.bet, bj.bet);
        } else {
            msg = "Perdu";
            processBet(bj.bet, 0);
        }
    }
    
    bjUpdate(false);
    document.getElementById('bj-msg').innerText = msg;
    document.getElementById('bj-act-ctrl').style.display='none';
    document.getElementById('bj-start-ctrl').style.display='flex';
}

/* --- POULET (CROSSY ROAD) --- */
let ck = { bet: 0, mult: 1.0, active: false, loop: null, px: 50, py: 4, lanes: [], obs: [] };

function renderPoulet() {
    return `
    <div class="ck-container">
        <div class="ck-grid" id="ck-grid">
            <div class="ck-hud">x<span id="ck-mult">1.00</span></div>
            <div class="ck-lane"></div><div class="ck-lane"></div><div class="ck-lane"></div><div class="ck-lane"></div><div class="ck-lane" style="border:none;"></div>
            <div id="ck-player" class="ck-actor" style="display:none;">🐔</div>
        </div>
        <div class="bet-controls" id="ck-start-ctrl">
            <div class="bet-input-wrap">
                <input type="number" id="ck-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
            </div>
            <button class="btn-large" onclick="ckStart()">Jouer</button>
        </div>
        <div class="bet-controls" id="ck-act-ctrl" style="display:none;">
            <button class="btn-large btn-hit" onclick="ckMove()">Avancer ⬆️</button>
            <button class="btn-large btn-stand" onclick="ckCashout()">Cashout</button>
        </div>
    </div>`;
}

function ckInit() { ck.active = false; if(ck.loop) clearInterval(ck.loop); }

function ckStart() {
    let b = parseFloat(document.getElementById('ck-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    
    ck.bet = b; ck.mult = 1.0; ck.active = true;
    ck.py = 4;
    ck.obs = [];
    
    document.getElementById('ck-start-ctrl').style.display = 'none';
    document.getElementById('ck-act-ctrl').style.display = 'flex';
    document.getElementById('ck-mult').innerText = '1.00';
    
    let p = document.getElementById('ck-player');
    p.style.display = 'block';
    ckDrawPlayer();
    
    document.querySelectorAll('.ck-obs').forEach(e=>e.remove());
    ck.loop = setInterval(ckEngine, 50);
}

function ckDrawPlayer() {
    let p = document.getElementById('ck-player');
    let gridH = document.getElementById('ck-grid').clientHeight;
    let laneH = gridH / 5;
    p.style.left = '50%';
    p.style.top = (ck.py * laneH + laneH/2) + 'px';
}

function ckMove() {
    if(!ck.active) return;
    if(ck.py > 0) {
        ck.py--;
        ck.mult += 0.3;
        document.getElementById('ck-mult').innerText = ck.mult.toFixed(2);
        ckDrawPlayer();
    }
    if(ck.py === 0) ckCashout();
}

function ckCashout() { if(!ck.active) return; ckEnd(true); }

function ckEngine() {
    if(!ck.active) return;
    let grid = document.getElementById('ck-grid');
    let gridW = grid.clientWidth;
    let gridH = grid.clientHeight;
    let laneH = gridH / 5;

    if(Math.random() < 0.1) {
        let l = Math.floor(Math.random() * 3) + 1;
        let o = document.createElement('div');
        o.className = 'ck-actor ck-obs';
        o.innerText = '🚗';
        o.style.top = (l * laneH + laneH/2) + 'px';
        o.style.left = gridW + 20 + 'px';
        grid.appendChild(o);
        ck.obs.push({ el: o, l: l, x: gridW + 20 });
    }
    
    for(let i = ck.obs.length-1; i>=0; i--) {
        let ob = ck.obs[i];
        ob.x -= 8;
        ob.el.style.left = ob.x + 'px';
        
        if(ob.l === ck.py) {
            let pX = gridW / 2;
            if(Math.abs(ob.x - pX) < 30) {
                ob.el.innerText = '💥';
                ckEnd(false);
                return;
            }
        }
        if(ob.x < -30) { ob.el.remove(); ck.obs.splice(i,1); }
    }
}

function ckEnd(won) {
    ck.active = false;
    clearInterval(ck.loop);
    
    if(won) {
        let win = ck.bet * ck.mult;
        processBet(ck.bet, win);
        setTimeout(() => alert(`Cashout ! Gain: ${win.toFixed(2)}€`), 100);
    } else {
        processBet(ck.bet, 0);
        setTimeout(() => alert("Écrasé ! Mise perdue."), 100);
    }
    
    document.getElementById('ck-act-ctrl').style.display = 'none';
    document.getElementById('ck-start-ctrl').style.display = 'flex';
}

/* --- CRASH & DINO --- */
let crData = { bet: 0, mult: 1.0, target: 1.0, active: false, loop: null, type: 'crash' };

function renderCrash(type = 'crash') {
    let icon = type === 'dino' ? '🦕' : '🚀';
    return `
    <div class="crash-display">
        <div style="font-size:2rem; position:absolute; top:10px;">${icon}</div>
        <div class="crash-mult" id="cr-mult">1.00x</div>
    </div>
    <div class="bet-controls" id="cr-start-ctrl">
        <div class="bet-input-wrap"><input type="number" id="cr-bet" class="bet-input" value="1.00" min="0.01" step="0.01"></div>
        <button class="btn-large" onclick="crStart()">Parier</button>
    </div>
    <div class="bet-controls" id="cr-act-ctrl" style="display:none;">
        <button class="btn-large btn-double" onclick="crCashout()">Encaisser</button>
    </div>`;
}
function crashInit(type) { crData.type = type; crData.active = false; if(crData.loop) clearInterval(crData.loop); }
function crStart() {
    let b = parseFloat(document.getElementById('cr-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    crData.bet = b; crData.mult = 1.0; crData.active = true;
    crData.target = Math.max(1.00, (0.99 / Math.random()));
    
    document.getElementById('cr-start-ctrl').style.display = 'none';
    document.getElementById('cr-act-ctrl').style.display = 'flex';
    document.getElementById('cr-mult').className = 'crash-mult';
    
    crData.loop = setInterval(() => {
        crData.mult += (crData.mult * 0.01) + 0.01;
        if(crData.mult >= crData.target) { crEnd(false); } 
        else { document.getElementById('cr-mult').innerText = crData.mult.toFixed(2) + 'x'; }
    }, 50);
}
function crCashout() { if(crData.active) crEnd(true); }
function crEnd(won) {
    crData.active = false; clearInterval(crData.loop);
    let el = document.getElementById('cr-mult');
    if(won) {
        let win = crData.bet * crData.mult;
        processBet(crData.bet, win);
        el.className = 'crash-mult won';
        el.innerText = 'Gagné! ' + crData.mult.toFixed(2) + 'x';
    } else {
        processBet(crData.bet, 0);
        el.className = 'crash-mult crashed';
        el.innerText = 'Crash! ' + crData.target.toFixed(2) + 'x';
    }
    document.getElementById('cr-act-ctrl').style.display = 'none';
    document.getElementById('cr-start-ctrl').style.display = 'flex';
}

/* --- MINES --- */
let mn = { bet: 0, active: false, grid: [], mines: 3, clicks: 0, mult: 1.0 };
function renderMines() {
    let gridHtml = '';
    for(let i=0; i<25; i++) gridHtml += `<div class="grid-btn" id="mn-btn-${i}"></div>`;
    return `
    <div class="dice-stats"><span>Mult: <span id="mn-mult-txt">1.00</span>x</span><span>Mines: <input type="number" id="mn-count" value="3" min="1" max="24" style="width:50px; background:var(--bg-panel); color:white; border:none; text-align:center;"></span></div>
    <div class="grid-5x5" id="mn-grid">${gridHtml}</div>
    <div class="bet-controls" id="mn-start-ctrl">
        <div class="bet-input-wrap"><input type="number" id="mn-bet" class="bet-input" value="1.00" min="0.01" step="0.01"></div>
        <button class="btn-large" onclick="mnStart()">Jouer</button>
    </div>
    <div class="bet-controls" id="mn-act-ctrl" style="display:none;">
        <button class="btn-large btn-double" onclick="mnCashout()">Encaisser</button>
    </div>`;
}
function minesInit() { mn.active = false; }
function mnStart() {
    let b = parseFloat(document.getElementById('mn-bet').value);
    mn.mines = parseInt(document.getElementById('mn-count').value);
    if(b > state.balance || b <= 0 || mn.mines < 1 || mn.mines > 24) return alert("Mise ou mines invalide.");
    
    mn.bet = b; mn.active = true; mn.clicks = 0; mn.mult = 1.0; mn.grid = Array(25).fill(false);
    
    let mPlaced = 0;
    while(mPlaced < mn.mines) {
        let r = Math.floor(Math.random()*25);
        if(!mn.grid[r]) { mn.grid[r] = true; mPlaced++; }
    }
    
    for(let i=0; i<25; i++) {
        let btn = document.getElementById(`mn-btn-${i}`);
        btn.className = 'grid-btn'; btn.innerText = '';
        btn.onclick = () => mnClick(i);
    }
    
    document.getElementById('mn-start-ctrl').style.display = 'none';
    document.getElementById('mn-act-ctrl').style.display = 'flex';
    document.getElementById('mn-mult-txt').innerText = '1.00';
}
function mnClick(i) {
    if(!mn.active) return;
    let btn = document.getElementById(`mn-btn-${i}`);
    if(btn.innerText !== '') return;
    
    if(mn.grid[i]) {
        btn.className = 'grid-btn revealed-mine'; btn.innerText = '💣';
        mnEnd(false);
    } else {
        btn.className = 'grid-btn revealed-safe'; btn.innerText = '💎';
        mn.clicks++;
        mn.mult *= (25 - mn.clicks + 1) / (25 - mn.clicks + 1 - mn.mines) * 0.99;
        document.getElementById('mn-mult-txt').innerText = mn.mult.toFixed(2);
        if(mn.clicks === 25 - mn.mines) mnEnd(true);
    }
}
function mnCashout() { if(mn.active && mn.clicks > 0) mnEnd(true); }
function mnEnd(won) {
    mn.active = false;
    for(let i=0; i<25; i++) {
        let btn = document.getElementById(`mn-btn-${i}`);
        if(mn.grid[i] && btn.innerText === '') btn.innerText = '💣';
    }
    if(won) {
        let win = mn.bet * mn.mult;
        processBet(mn.bet, win);
        setTimeout(() => alert(`Cashout ! Gain: ${win.toFixed(2)}€`), 200);
    } else {
        processBet(mn.bet, 0);
    }
    document.getElementById('mn-act-ctrl').style.display = 'none';
    document.getElementById('mn-start-ctrl').style.display = 'flex';
}

/* --- DICE --- */
let di = { bet: 0, chance: 50, isOver: true };
function renderDice() {
    return `
    <div class="dice-slider-container">
        <div class="dice-stats">
            <span>Mult: <span id="di-mult">1.98</span>x</span>
            <span>Chance: <span id="di-chance">50</span>%</span>
        </div>
        <div style="font-size:3rem; text-align:center; font-weight:900; margin:10px 0;" id="di-result">50.00</div>
        <input type="range" id="di-slider" min="2" max="98" value="50" oninput="diUpdate()">
        <div class="btn-row" style="margin-bottom: 15px;">
            <button class="btn-large btn-hit" id="di-btn-under" onclick="diToggle(false)" style="background:#333;">Moins de 50</button>
            <button class="btn-large btn-hit" id="di-btn-over" onclick="diToggle(true)">Plus de 50</button>
        </div>
    </div>
    <div class="bet-controls">
        <input type="number" id="di-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
        <button class="btn-large" onclick="diRoll()">Lancer les Dés</button>
    </div>`;
}
function diceInit() { diUpdate(); }
function diToggle(over) {
    di.isOver = over;
    document.getElementById('di-btn-over').style.background = over ? 'var(--btn-action)' : '#333';
    document.getElementById('di-btn-under').style.background = !over ? 'var(--btn-action)' : '#333';
    diUpdate();
}
function diUpdate() {
    let val = parseInt(document.getElementById('di-slider').value);
    di.chance = di.isOver ? 100 - val : val;
    let mult = 99 / di.chance;
    document.getElementById('di-chance').innerText = di.chance;
    document.getElementById('di-mult').innerText = mult.toFixed(2);
    document.getElementById('di-btn-over').innerText = 'Plus de ' + val;
    document.getElementById('di-btn-under').innerText = 'Moins de ' + val;
}
function diRoll() {
    let b = parseFloat(document.getElementById('di-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    let val = parseInt(document.getElementById('di-slider').value);
    let roll = (Math.random() * 100).toFixed(2);
    document.getElementById('di-result').innerText = roll;
    
    let win = false;
    if(di.isOver && parseFloat(roll) > val) win = true;
    if(!di.isOver && parseFloat(roll) < val) win = true;
    
    let el = document.getElementById('di-result');
    if(win) {
        el.style.color = 'var(--accent)';
        processBet(b, b * (99 / di.chance));
    } else {
        el.style.color = 'var(--danger)';
        processBet(b, 0);
    }
}

/* --- LIMBO --- */
function renderLimbo() {
    return `
    <div class="crash-display">
        <div style="font-size:1.5rem; color:var(--text-muted); position:absolute; top:10px;">Résultat</div>
        <div class="crash-mult" id="lb-result">1.00x</div>
    </div>
    <div class="dice-stats"><span>Multiplicateur Cible :</span></div>
    <input type="number" id="lb-target" class="bet-input" value="2.00" min="1.01" step="0.50" style="margin-bottom:15px; width:100%;">
    <div class="bet-controls">
        <input type="number" id="lb-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
        <button class="btn-large" onclick="lbRoll()">Parier</button>
    </div>`;
}
function limboInit() {}
function lbRoll() {
    let b = parseFloat(document.getElementById('lb-bet').value);
    let t = parseFloat(document.getElementById('lb-target').value);
    if(b > state.balance || b <= 0 || t <= 1) return alert("Paramètres invalides.");
    
    let roll = Math.max(1.00, (0.99 / Math.random()));
    let el = document.getElementById('lb-result');
    el.innerText = roll.toFixed(2) + 'x';
    
    if(roll >= t) {
        el.style.color = 'var(--accent)';
        processBet(b, b * t);
    } else {
        el.style.color = 'var(--danger)';
        processBet(b, 0);
    }
}

/* --- ROULETTE --- */
function renderRoulette() {
    return `
    <div class="table-game">
        <div class="roulette-result" id="ro-result">🎡</div>
        <div id="ro-msg" style="color:var(--text-muted); min-height:20px;">Faites vos jeux</div>
        <div class="roulette-bets">
            <button class="r-btn r-red" onclick="roPlay('red')">ROUGE (2x)</button>
            <button class="r-btn r-black" onclick="roPlay('black')">NOIR (2x)</button>
            <button class="r-btn r-even" onclick="roPlay('even')">PAIR (2x)</button>
            <button class="r-btn r-odd" onclick="roPlay('odd')">IMPAIR (2x)</button>
        </div>
    </div>
    <div class="bet-controls">
        <input type="number" id="ro-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
    </div>`;
}
function rouletteInit() {}
function roPlay(betType) {
    let b = parseFloat(document.getElementById('ro-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    
    let num = Math.floor(Math.random() * 37);
    let reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    let isRed = reds.includes(num);
    let isBlack = num !== 0 && !isRed;
    let isEven = num !== 0 && num % 2 === 0;
    let isOdd = num !== 0 && num % 2 !== 0;
    
    let el = document.getElementById('ro-result');
    el.innerText = num;
    el.style.color = num === 0 ? 'var(--accent)' : (isRed ? '#dc2626' : '#fff');
    
    let won = false;
    if(betType === 'red' && isRed) won = true;
    if(betType === 'black' && isBlack) won = true;
    if(betType === 'even' && isEven) won = true;
    if(betType === 'odd' && isOdd) won = true;
    
    if(won) {
        document.getElementById('ro-msg').innerText = "Gagné !";
        processBet(b, b * 2);
    } else {
        document.getElementById('ro-msg').innerText = "Perdu.";
        processBet(b, 0);
    }
}

/* --- BACCARAT --- */
function renderBaccarat() {
    return `
    <div class="table-game" style="background:#0f6b36;">
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <div><h3 style="color:#aaa;">JOUEUR</h3><div id="ba-p" style="font-size:2rem; font-weight:bold; color:white;">-</div></div>
            <div><h3 style="color:#aaa;">BANQUIER</h3><div id="ba-b" style="font-size:2rem; font-weight:bold; color:white;">-</div></div>
        </div>
        <div id="ba-msg" style="color:gold; font-weight:bold; min-height:20px; font-size:1.2rem;"></div>
        <div class="roulette-bets" style="grid-template-columns: 1fr 1fr 1fr;">
            <button class="r-btn" style="background:#3b82f6;" onclick="baPlay('P')">JOUEUR (2x)</button>
            <button class="r-btn" style="background:#16a34a;" onclick="baPlay('T')">ÉGALITÉ (9x)</button>
            <button class="r-btn" style="background:#ef4444;" onclick="baPlay('B')">BANQUE (1.95x)</button>
        </div>
    </div>
    <div class="bet-controls"><input type="number" id="ba-bet" class="bet-input" value="1.00" min="0.01" step="0.01"></div>`;
}
function baccaratInit() {}
function baVal(c) { let v = c%13; return v >= 10 ? 0 : v+1; }
function baPlay(type) {
    let b = parseFloat(document.getElementById('ba-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    
    let pCards = [Math.floor(Math.random()*52), Math.floor(Math.random()*52)];
    let bCards = [Math.floor(Math.random()*52), Math.floor(Math.random()*52)];
    let pSc = (baVal(pCards[0]) + baVal(pCards[1])) % 10;
    let bSc = (baVal(bCards[0]) + baVal(bCards[1])) % 10;
    
    if(pSc < 5) pSc = (pSc + baVal(Math.floor(Math.random()*52))) % 10;
    if(bSc < 5) bSc = (bSc + baVal(Math.floor(Math.random()*52))) % 10;
    
    document.getElementById('ba-p').innerText = pSc;
    document.getElementById('ba-b').innerText = bSc;
    
    let res = pSc > bSc ? 'P' : (bSc > pSc ? 'B' : 'T');
    
    if(type === res) {
        document.getElementById('ba-msg').innerText = "Gagné !";
        let mult = type === 'T' ? 9 : (type === 'B' ? 1.95 : 2);
        processBet(b, b * mult);
    } else {
        document.getElementById('ba-msg').innerText = "Perdu.";
        processBet(b, 0);
    }
}

/* --- PLINKO --- */
function renderPlinko() {
    return `
    <div class="plinko-board">
        <div class="plinko-path" id="pk-path">Prêt</div>
        <div class="plinko-buckets">
            <div class="plinko-bucket" style="background:#dc2626;">29x</div>
            <div class="plinko-bucket" style="background:#f97316;">4x</div>
            <div class="plinko-bucket" style="background:#eab308;">1.5x</div>
            <div class="plinko-bucket" style="background:#22c55e;">0.3x</div>
            <div class="plinko-bucket" style="background:#22c55e;">0.2x</div>
            <div class="plinko-bucket" style="background:#22c55e;">0.3x</div>
            <div class="plinko-bucket" style="background:#eab308;">1.5x</div>
            <div class="plinko-bucket" style="background:#f97316;">4x</div>
            <div class="plinko-bucket" style="background:#dc2626;">29x</div>
        </div>
    </div>
    <div class="bet-controls">
        <input type="number" id="pk-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
        <button class="btn-large" id="pk-btn" onclick="pkDrop()">Lâcher la bille</button>
    </div>`;
}
function plinkoInit() {}
function pkDrop() {
    let b = parseFloat(document.getElementById('pk-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    
    document.getElementById('pk-btn').disabled = true;
    let path = []; let rights = 0;
    for(let i=0; i<8; i++) {
        let r = Math.random() > 0.5;
        path.push(r ? '↘' : '↙');
        if(r) rights++;
    }
    
    let mults = [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29];
    let mult = mults[rights];
    
    let pathEl = document.getElementById('pk-path');
    pathEl.innerText = '';
    let step = 0;
    
    let dropAnim = setInterval(() => {
        if(step < 8) {
            pathEl.innerText += path[step] + ' ';
            step++;
        } else {
            clearInterval(dropAnim);
            pathEl.innerText = `Atterrissage: ${mult}x !`;
            processBet(b, b * mult);
            document.getElementById('pk-btn').disabled = false;
        }
    }, 150);
}

/* --- HILO --- */
let hl = { bet: 0, mult: 1.0, card: 7, active: false };
function renderHilo() {
    return `
    <div class="hilo-stats">Multiplicateur : <span id="hl-mult">1.00</span>x</div>
    <div class="hilo-card-display"><div class="hilo-card" id="hl-card">7</div></div>
    <div class="bet-controls" id="hl-start-ctrl">
        <input type="number" id="hl-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
        <button class="btn-large" onclick="hlStart()">Jouer</button>
    </div>
    <div class="bet-controls" id="hl-act-ctrl" style="display:none;">
        <div class="btn-row">
            <button class="btn-large btn-hit" onclick="hlGuess(true)">Plus Haut ou =</button>
            <button class="btn-large btn-stand" onclick="hlGuess(false)">Plus Bas ou =</button>
        </div>
        <button class="btn-large btn-double" onclick="hlCashout()" style="margin-top:10px;">Encaisser</button>
    </div>`;
}
function hiloInit() { hl.active = false; document.getElementById('hl-card').innerText = '?'; }
function hlStart() {
    let b = parseFloat(document.getElementById('hl-bet').value);
    if(b > state.balance || b <= 0) return alert("Solde insuffisant.");
    hl.bet = b; hl.mult = 1.0; hl.active = true;
    hl.card = Math.floor(Math.random()*13) + 1;
    document.getElementById('hl-card').innerText = hl.card;
    document.getElementById('hl-mult').innerText = '1.00';
    document.getElementById('hl-start-ctrl').style.display = 'none';
    document.getElementById('hl-act-ctrl').style.display = 'block';
}
function hlGuess(isHigh) {
    if(!hl.active) return;
    let next = Math.floor(Math.random()*13) + 1;
    let won = false;
    
    if(isHigh && next >= hl.card) won = true;
    if(!isHigh && next <= hl.card) won = true;
    
    hl.card = next;
    document.getElementById('hl-card').innerText = hl.card;
    
    if(won) {
        hl.mult *= 1.35;
        document.getElementById('hl-mult').innerText = hl.mult.toFixed(2);
    } else {
        processBet(hl.bet, 0);
        hlEnd();
    }
}
function hlCashout() { if(hl.active) { processBet(hl.bet, hl.bet * hl.mult); hlEnd(); } }
function hlEnd() {
    hl.active = false;
    document.getElementById('hl-act-ctrl').style.display = 'none';
    document.getElementById('hl-start-ctrl').style.display = 'block';
}

/* --- KENO --- */
let kn = { sel: [] };
function renderKeno() {
    let h = '';
    for(let i=1; i<=40; i++) h += `<div class="grid-btn" style="font-size:1rem;" id="kn-btn-${i}" onclick="knToggle(${i})">${i}</div>`;
    return `
    <div class="dice-stats"><span>Sélectionnés : <span id="kn-count">0</span>/10</span></div>
    <div class="grid-8x5">${h}</div>
    <div class="bet-controls">
        <input type="number" id="kn-bet" class="bet-input" value="1.00" min="0.01" step="0.01">
        <button class="btn-large" onclick="knPlay()">Tirer au sort</button>
    </div>`;
}
function kenoInit() { kn.sel = []; }
function knToggle(n) {
    let idx = kn.sel.indexOf(n);
    let btn = document.getElementById(`kn-btn-${n}`);
    if(idx > -1) { kn.sel.splice(idx, 1); btn.classList.remove('active'); }
    else if(kn.sel.length < 10) { kn.sel.push(n); btn.classList.add('active'); }
    document.getElementById('kn-count').innerText = kn.sel.length;
}
function knPlay() {
    let b = parseFloat(document.getElementById('kn-bet').value);
    if(b > state.balance || b <= 0 || kn.sel.length === 0) return alert("Sélectionnez au moins 1 numéro.");
    
    for(let i=1; i<=40; i++) document.getElementById(`kn-btn-${i}`).className = 'grid-btn' + (kn.sel.includes(i) ? ' active' : '');
    
    let drawn = [];
    while(drawn.length < 10) {
        let r = Math.floor(Math.random()*40) + 1;
        if(!drawn.includes(r)) drawn.push(r);
    }
    
    let hits = 0;
    drawn.forEach(d => {
        let btn = document.getElementById(`kn-btn-${d}`);
        if(kn.sel.includes(d)) { hits++; btn.style.background = 'var(--accent)'; btn.style.color = 'black'; }
        else { btn.style.background = '#666'; }
    });
    
    let mult = 0;
    if(hits >= 2) mult = hits * 1.5;
    if(hits === 0 && kn.sel.length > 5) mult = 2;
    
    if(mult > 0) {
        processBet(b, b * mult);
        setTimeout(()=>alert(`Vous avez eu ${hits} correspondances ! Gain: ${(b*mult).toFixed(2)}€`), 500);
    } else {
        processBet(b, 0);
    }
}
