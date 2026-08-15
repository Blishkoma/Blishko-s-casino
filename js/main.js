// --- ÉTAT GLOBAL DE LA SPA & WALLET ---
let appState = {
    balance: 10.00,
    currentGame: null,
    history: [10.00], // Historique pour le chart
    stats: { totalWagered: 0, biggestWin: 0, profits: {} }
};

let chartInstance = null;

const games = [
    { id: 'poulet', name: 'Le Jeu du Poulet', icon: '🐔', desc: 'Traversez les routes sans vous faire écraser.' },
    { id: 'blackjack', name: 'Blackjack', icon: '🃏', desc: 'Battez le croupier sans dépasser 21.' },
    { id: 'mines', name: 'Mines', icon: '💣', desc: 'Trouvez les gemmes, esquivez les bombes.' },
    { id: 'crash', name: 'Crash', icon: '📈', desc: 'Encaissez avant que la courbe ne s\'effondre.' },
    { id: 'plinko', name: 'Plinko', icon: '🎯', desc: 'Faites tomber la balle dans les multiplicateurs.' }
];

const dom = {
    home: document.getElementById('home-view'),
    game: document.getElementById('game-view'),
    wallet: document.getElementById('wallet-view'),
    list: document.getElementById('games-list'),
    balance: document.getElementById('balance-amount')
};

// --- INIT & WALLET ---
function initApp() {
    updateBalanceDisplay();
    renderGamesList();
}

function updateBalanceDisplay() {
    dom.balance.textContent = appState.balance.toFixed(2);
}

function processTransaction(amount, isWin, gameId, wager = 0) {
    if (wager > 0) {
        appState.stats.totalWagered += wager;
        appState.balance -= wager; // Déduit la mise
    }
    
    if (amount > 0) {
        appState.balance += amount; // Ajoute les gains totaux (mise incluse si gagné)
        let profit = amount - wager;
        if (profit > appState.stats.biggestWin) appState.stats.biggestWin = profit;
        appState.stats.profits[gameId] = (appState.stats.profits[gameId] || 0) + profit;
    } else if (wager > 0) {
        appState.stats.profits[gameId] = (appState.stats.profits[gameId] || 0) - wager;
    }

    appState.history.push(appState.balance);
    updateBalanceDisplay();
}

function openWallet() {
    dom.home.style.display = 'none';
    dom.game.style.display = 'none';
    dom.wallet.style.display = 'block';
    
    document.getElementById('stat-wager').textContent = appState.stats.totalWagered.toFixed(2) + ' €';
    document.getElementById('stat-biggest-win').textContent = appState.stats.biggestWin.toFixed(2) + ' €';
    
    let bestGame = '-'; let maxP = -Infinity;
    for (let g in appState.stats.profits) {
        if (appState.stats.profits[g] > maxP) { maxP = appState.stats.profits[g]; bestGame = g; }
    }
    document.getElementById('stat-best-game').textContent = maxP > 0 ? bestGame : '-';

    renderChart();
}

function closeWallet() {
    dom.wallet.style.display = 'none';
    appState.currentGame ? (dom.game.style.display = 'flex') : (dom.home.style.display = 'block');
}

function renderChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    const colors = appState.history.map((val, i, arr) => {
        if (i === 0) return '#00e701';
        return val >= arr[i-1] ? '#00e701' : '#ff4444';
    });

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: appState.history.map((_, i) => i),
            datasets: [{
                label: 'Solde (€)',
                data: appState.history,
                borderColor: '#00e701',
                segment: { borderColor: ctx => colors[ctx.p0DataIndex + 1] },
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
                tension: 0.1
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false } } }
    });
}

function renderGamesList() {
    dom.list.innerHTML = '';
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.onclick = () => openGame(game);
        card.innerHTML = `<div class="game-icon">${game.icon}</div><div class="game-info"><h3>${game.name}</h3><p>${game.desc}</p></div>`;
        dom.list.appendChild(card);
    });
}

function openGame(game) {
    appState.currentGame = game.id;
    dom.home.style.display = 'none';
    dom.wallet.style.display = 'none';
    dom.game.style.display = 'flex';
    
    let gameHTML = `<div class="game-header"><button class="back-btn" onclick="goBack()">&larr; Retour</button><h2 style="font-size: 1.2rem;">${game.icon} ${game.name}</h2></div>`;
    
    if (game.id === 'blackjack') gameHTML += renderBlackjackUI();
    else if (game.id === 'poulet') gameHTML += renderChickenUI();
    else gameHTML += `<div class="blackjack-table" style="justify-content:center; color:#94a3b8">Bientôt disponible...</div>`;
    
    dom.game.innerHTML = gameHTML;
    window.scrollTo(0, 0);

    if (game.id === 'blackjack') initBlackjack();
    if (game.id === 'poulet') initChicken();
}

function goBack() {
    if (chickenInterval) clearInterval(chickenInterval);
    appState.currentGame = null;
    dom.game.innerHTML = '';
    dom.game.style.display = 'none';
    dom.home.style.display = 'block';
}

// --- LOGIQUE BLACKJACK ---
let bj = { deck: [], player: [], dealer: [], bet: 0, state: 'betting' };

function renderBlackjackUI() {
    return `
    <div class="blackjack-table">
        <div class="bj-area dealer-area">
            <h4>Croupier <span id="dlr-score"></span></h4>
            <div id="dlr-cards" class="cards-container"></div>
        </div>
        <div id="bj-msg" class="msg-overlay">Placez votre mise</div>
        <div class="bj-area player-area">
            <h4>Vous <span id="plr-score"></span></h4>
            <div id="plr-cards" class="cards-container"></div>
        </div>
    </div>
    <div class="controls" id="bj-bet-ctrl">
        <input type="number" id="bj-bet-input" class="bet-input" value="1.00" step="0.50" min="0.50">
        <button class="action-btn" onclick="bjDeal()">Miser & Jouer</button>
    </div>
    <div class="controls" id="bj-act-ctrl" style="display:none;">
        <button class="action-btn" style="background:#3b82f6" onclick="bjHit()">Tirer</button>
        <button class="action-btn" style="background:#ef4444" onclick="bjStand()">Rester</button>
        <button class="action-btn" style="background:#eab308" onclick="bjDouble()">Doubler</button>
    </div>`;
}

function initBlackjack() { bj.state = 'betting'; }

function getDeck() {
    const suits = ['♥', '♦', '♣', '♠']; const vals = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    let deck = [];
    suits.forEach(s => vals.forEach(v => deck.push({s, v})));
    return deck.sort(() => Math.random() - 0.5);
}

function calcScore(hand) {
    let score = 0, aces = 0;
    hand.forEach(c => {
        if (['J','Q','K'].includes(c.v)) score += 10;
        else if (c.v === 'A') { score += 11; aces++; }
        else score += parseInt(c.v);
    });
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function drawCard(c, hidden = false) {
    if (hidden) return `<div class="playing-card" style="background: repeating-linear-gradient(45deg, #2563eb, #2563eb 10px, #1e40af 10px, #1e40af 20px);"></div>`;
    let color = (c.s === '♥' || c.s === '♦') ? 'red' : '';
    return `<div class="playing-card ${color}">${c.v}${c.s}</div>`;
}

function updateBjUI(hideDealer = true) {
    let pScore = calcScore(bj.player);
    let dScore = hideDealer ? calcScore([bj.dealer[0]]) : calcScore(bj.dealer);
    
    document.getElementById('plr-cards').innerHTML = bj.player.map(c => drawCard(c)).join('');
    document.getElementById('plr-score').innerText = `(${pScore})`;
    
    let dHtml = drawCard(bj.dealer[0]);
    if (hideDealer && bj.dealer.length > 1) dHtml += drawCard(bj.dealer[1], true);
    else if (!hideDealer) dHtml = bj.dealer.map(c => drawCard(c)).join('');
    
    document.getElementById('dlr-cards').innerHTML = dHtml;
    document.getElementById('dlr-score').innerText = hideDealer ? `(${dScore} + ?)` : `(${dScore})`;
}

function bjDeal() {
    let bet = parseFloat(document.getElementById('bj-bet-input').value);
    if (isNaN(bet) || bet <= 0 || bet > appState.balance) { alert("Mise invalide ou solde insuffisant."); return; }
    
    bj.bet = bet;
    appState.balance -= bet; // Retrait temporaire (hors transaction pour instantanéité UI)
    updateBalanceDisplay();

    bj.deck = getDeck();
    bj.player = [bj.deck.pop(), bj.deck.pop()];
    bj.dealer = [bj.deck.pop(), bj.deck.pop()];
    bj.state = 'playing';
    
    document.getElementById('bj-msg').innerText = "";
    document.getElementById('bj-bet-ctrl').style.display = 'none';
    document.getElementById('bj-act-ctrl').style.display = 'flex';
    
    updateBjUI();
    if (calcScore(bj.player) === 21) bjEndGame();
}

function bjHit() {
    if (bj.state !== 'playing') return;
    bj.player.push(bj.deck.pop());
    updateBjUI();
    if (calcScore(bj.player) > 21) bjEndGame();
}

function bjStand() {
    if (bj.state !== 'playing') return;
    bjEndGame();
}

function bjDouble() {
    if (bj.state !== 'playing' || appState.balance < bj.bet) return;
    appState.balance -= bj.bet; updateBalanceDisplay();
    bj.bet *= 2;
    bj.player.push(bj.deck.pop());
    updateBjUI();
    bjEndGame();
}

function bjEndGame() {
    bj.state = 'resolved';
    let pScore = calcScore(bj.player);
    let msg = ""; let wonAmt = 0;

    if (pScore > 21) {
        msg = "Bust ! Vous perdez.";
        processTransaction(0, false, 'blackjack', bj.bet);
    } else {
        while (calcScore(bj.dealer) < 17) bj.dealer.push(bj.deck.pop());
        let dScore = calcScore(bj.dealer);
        
        if (dScore > 21 || pScore > dScore) {
            msg = pScore === 21 && bj.player.length === 2 ? "Blackjack !" : "Vous Gagnez !";
            let mult = (pScore === 21 && bj.player.length === 2) ? 2.5 : 2;
            wonAmt = bj.bet * mult;
            msg += ` (+${(wonAmt-bj.bet).toFixed(2)}€)`;
            processTransaction(wonAmt, true, 'blackjack', bj.bet);
        } else if (pScore === dScore) {
            msg = "Égalité (Push)";
            processTransaction(bj.bet, true, 'blackjack', bj.bet); // Remboursement
        } else {
            msg = "Le Croupier Gagne.";
            processTransaction(0, false, 'blackjack', bj.bet);
        }
    }
    
    updateBjUI(false);
    document.getElementById('bj-msg').innerText = msg;
    document.getElementById('bj-act-ctrl').style.display = 'none';
    document.getElementById('bj-bet-ctrl').style.display = 'flex';
}

// --- LOGIQUE POULET (PRÉPARATION CROSSY) ---
let chickenInterval;
let ckState = { playing: false, bet: 0, mult: 1.0, x: 10, y: 150, cars: [] };

function renderChickenUI() {
    return `
    <div class="chicken-hud">
        <span>Mult: <span id="ck-mult">1.00</span>x</span>
        <span>Gain Potentiel: <span id="ck-win">0.00</span> €</span>
    </div>
    <div class="chicken-game-area" id="ck-area">
        <div class="lane" style="top: 50px;"></div>
        <div class="lane" style="top: 150px;"></div>
        <div class="lane" style="top: 250px;"></div>
        <div id="player-chicken" style="left:10px; top:150px;">🐔</div>
    </div>
    <div class="controls" id="ck-bet-ctrl">
        <input type="number" id="ck-bet" class="bet-input" value="1.00" step="0.50">
        <button class="action-btn" onclick="ckStart()">Jouer</button>
    </div>
    <div class="controls" id="ck-act-ctrl" style="display:none;">
        <button class="action-btn" style="background:#3b82f6; width:50%;" onclick="ckMove()">Avancer ➡️</button>
        <button class="action-btn" style="background:#f97316; width:50%;" onclick="ckCashout()">Cashout</button>
    </div>`;
}

function initChicken() { ckState.playing = false; }

function ckStart() {
    let bet = parseFloat(document.getElementById('ck-bet').value);
    if (isNaN(bet) || bet <= 0 || bet > appState.balance) return alert("Fonds insuffisants");
    
    ckState = { playing: true, bet: bet, mult: 1.0, x: 10, y: 150, cars: [] };
    appState.balance -= bet; updateBalanceDisplay();
    
    document.getElementById('ck-bet-ctrl').style.display = 'none';
    document.getElementById('ck-act-ctrl').style.display = 'flex';
    document.getElementById('player-chicken').style.left = ckState.x + 'px';
    document.querySelectorAll('.car').forEach(e => e.remove());
    
    updateCkHUD();
    chickenInterval = setInterval(ckLoop, 50);
}

function ckMove() {
    if (!ckState.playing) return;
    ckState.x += 40; // Avance
    ckState.mult += 0.2; // Augmente le multiplicateur
    document.getElementById('player-chicken').style.left = ckState.x + 'px';
    updateCkHUD();
    
    // Si on arrive au bout (succès)
    let areaWidth = document.getElementById('ck-area').clientWidth;
    if (ckState.x > areaWidth - 40) ckCashout();
}

function ckCashout() {
    if (!ckState.playing) return;
    clearInterval(chickenInterval);
    ckState.playing = false;
    let win = ckState.bet * ckState.mult;
    processTransaction(win, true, 'poulet', ckState.bet);
    alert(`Cashout réussi ! Gain : ${win.toFixed(2)} €`);
    resetCkUI();
}

function ckLoop() {
    let area = document.getElementById('ck-area');
    // Spawn aléatoire de voitures
    if (Math.random() < 0.08) {
        let laneY = [50, 150, 250][Math.floor(Math.random()*3)];
        let car = document.createElement('div');
        car.className = 'car'; car.innerText = '🚗';
        car.style.top = laneY + 'px'; car.style.left = area.clientWidth + 'px';
        area.appendChild(car);
        ckState.cars.push({ el: car, x: area.clientWidth, y: laneY });
    }
    
    // Mouvement et collisions
    for (let i = ckState.cars.length - 1; i >= 0; i--) {
        let c = ckState.cars[i];
        c.x -= 8; // Vitesse
        c.el.style.left = c.x + 'px';
        
        // Collision basique
        if (Math.abs(c.x - ckState.x) < 30 && Math.abs(c.y - ckState.y) < 30) {
            clearInterval(chickenInterval);
            ckState.playing = false;
            c.el.innerText = '💥';
            processTransaction(0, false, 'poulet', ckState.bet);
            setTimeout(() => { alert("Écrasé ! Mise perdue."); resetCkUI(); }, 300);
            return;
        }
        
        if (c.x < -50) { c.el.remove(); ckState.cars.splice(i, 1); }
    }
}

function updateCkHUD() {
    document.getElementById('ck-mult').innerText = ckState.mult.toFixed(2);
    document.getElementById('ck-win').innerText = (ckState.bet * ckState.mult).toFixed(2);
}

function resetCkUI() {
    document.getElementById('ck-bet-ctrl').style.display = 'flex';
    document.getElementById('ck-act-ctrl').style.display = 'none';
    document.getElementById('player-chicken').style.left = '10px';
    document.querySelectorAll('.car').forEach(e => e.remove());
}

document.addEventListener('DOMContentLoaded', initApp);
