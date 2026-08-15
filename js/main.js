/* ETAT GLOBAL */
let state = {
    balance: 10.00,
    history: [10.00],
    stats: { wagered: 0, biggestWin: 0 },
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

/* INIT ET ROUTAGE */
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
    
    if (game.id === 'blackjack') html += renderBlackjack();
    else if (game.id === 'poulet') html += renderPoulet();
    else html += `<div style="text-align:center; padding: 50px; color: var(--text-muted);">Jeu en développement...</div>`;
    
    view.innerHTML = html;
    if (game.id === 'blackjack') bjInit();
    if (game.id === 'poulet') ckInit();
}

function goHome() {
    if (ck.loop) clearInterval(ck.loop);
    document.getElementById('game-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

/* GESTION FINANCIERE */
function updateBalanceDisplay() {
    document.getElementById('balance-amount').innerText = state.balance.toFixed(2);
}

function processBet(wager, winAmount) {
    state.stats.wagered += wager;
    state.balance -= wager;
    if (winAmount > 0) {
        state.balance += winAmount;
        let profit = winAmount - wager;
        if (profit > state.stats.biggestWin) state.stats.biggestWin = profit;
    }
    state.history.push(state.balance);
    updateBalanceDisplay();
}

/* WALLET & CHART */
function toggleWallet(show) {
    document.getElementById('wallet-view').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('stat-balance').innerText = state.balance.toFixed(2) + ' €';
        document.getElementById('stat-wager').innerText = state.stats.wagered.toFixed(2) + ' €';
        document.getElementById('stat-biggest').innerText = state.stats.biggestWin.toFixed(2) + ' €';
        renderChart();
    }
}

function renderChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (state.chartObj) state.chartObj.destroy();
    
    // Couleurs des points : vert si monte ou stagne, rouge si descend
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

/* ---------------- BLACKJACK ---------------- */
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
                <input type="number" id="bj-bet" class="bet-input" value="1.00" min="0.10" step="0.50">
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
            processBet(bj.bet, bj.bet); // Remboursé
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

/* ---------------- JEU DU POULET (CROSSY) ---------------- */
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
                <input type="number" id="ck-bet" class="bet-input" value="1.00" min="0.10" step="0.50">
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
    ck.py = 4; // Ligne du bas (0 = haut, 4 = bas)
    ck.obs = [];
    
    document.getElementById('ck-start-ctrl').style.display = 'none';
    document.getElementById('ck-act-ctrl').style.display = 'flex';
    document.getElementById('ck-mult').innerText = '1.00';
    
    let p = document.getElementById('ck-player');
    p.style.display = 'block';
    ckDrawPlayer();
    
    // Nettoyer anciens obstacles
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
    if(ck.py === 0) ckCashout(); // Gagné (arrivé en haut)
}

function ckCashout() {
    if(!ck.active) return;
    ckEnd(true);
}

function ckEngine() {
    if(!ck.active) return;
    let grid = document.getElementById('ck-grid');
    let gridW = grid.clientWidth;
    let gridH = grid.clientHeight;
    let laneH = gridH / 5;

    // Spawn obstacles sur les lignes 1, 2, 3
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
    
    // Move obstacles
    for(let i = ck.obs.length-1; i>=0; i--) {
        let ob = ck.obs[i];
        ob.x -= 8;
        ob.el.style.left = ob.x + 'px';
        
        // Check collision si sur la même ligne
        if(ob.l === ck.py) {
            let pX = gridW / 2; // Joueur au centre
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

