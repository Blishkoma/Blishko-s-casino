/* =========================================================
   ÉTAT GLOBAL ET MÉCANIQUES DE BASE
========================================================= */
let state = {
    balance: 10.00, history: [10.00],
    stats: { wagered: 0, biggestWin: 0, profits: {}, resets: 0 },
    chartObj: null, currentGame: null, activeLoop: null
};

const gamesList = [
    { id: 'poulet', name: 'Poulet', icon: '🐔' },
    { id: 'mines', name: 'Mines', icon: '💣' },
    { id: 'blackjack', name: 'Blackjack', icon: '🃏' },
    { id: 'crash', name: 'Crash', icon: '🚀' },
    { id: 'dino', name: 'Dino', icon: '🦖' },
    { id: 'plinko', name: 'Plinko', icon: '🎯' },
    { id: 'dice', name: 'Dice', icon: '🎲' },
    { id: 'roulette', name: 'Roulette', icon: '🎡' },
    { id: 'baccarat', name: 'Baccarat', icon: '🏦' },
    { id: 'keno', name: 'Keno', icon: '🎱' },
    { id: 'limbo', name: 'Limbo', icon: '📉' },
    { id: 'hilo', name: 'HiLo', icon: '🃏' },
    { id: 'slots', name: 'Slots', icon: '🎰' }
];

document.addEventListener('DOMContentLoaded', () => {
    updateBalance();
    const grid = document.getElementById('games-list');
    gamesList.forEach(g => {
        let div = document.createElement('div');
        div.className = 'game-card';
        div.onclick = () => openGame(g);
        div.innerHTML = `<div class="game-icon">${g.icon}</div><div class="game-name">${g.name}</div>`;
        grid.appendChild(div);
    });
});

function updateBalance() { document.getElementById('balance-amount').innerText = state.balance.toFixed(2); }

function processBet(wager, winAmt) {
    state.stats.wagered += wager;
    state.balance -= wager;
    
    let profit = winAmt - wager;
    let gid = state.currentGame || 'unknown';
    if (!state.stats.profits[gid]) state.stats.profits[gid] = 0;
    state.stats.profits[gid] += profit;

    if (winAmt > 0) {
        state.balance += winAmt;
        if (profit > state.stats.biggestWin) state.stats.biggestWin = profit;
    }
    
    state.history.push(state.balance);
    updateBalance();

    if (state.balance < 0.01) {
        setTimeout(() => document.getElementById('game-over-modal').style.display = 'flex', 600);
    }
}

function getValidBet(inputId) {
    let b = parseFloat(document.getElementById(inputId).value);
    if (isNaN(b) || b <= 0) { alert("Mise invalide"); return null; }
    if (b > state.balance) {
        if (state.balance < 1) b = state.balance; 
        else { alert("Solde insuffisant."); return null; }
    }
    return parseFloat(b.toFixed(2));
}

function resetApp() {
    state.balance = 10.00; state.history = [10.00]; state.stats.wagered = 0; state.stats.biggestWin = 0;
    state.stats.profits = {}; state.stats.resets++;
    document.getElementById('game-over-modal').style.display = 'none';
    updateBalance(); goHome();
}

function toggleWallet(show) {
    document.getElementById('wallet-view').style.display = show ? 'flex' : 'none';
    if (!show) return;
    
    document.getElementById('stat-balance').innerText = state.balance.toFixed(2) + ' €';
    document.getElementById('stat-wager').innerText = state.stats.wagered.toFixed(2) + ' €';
    document.getElementById('stat-biggest').innerText = state.stats.biggestWin.toFixed(2) + ' €';
    document.getElementById('stat-resets').innerText = state.stats.resets + ' fois';

    let best = { id: null, p: -Infinity }, worst = { id: null, p: Infinity };
    for (let id in state.stats.profits) {
        let p = state.stats.profits[id];
        if (p > best.p) { best.p = p; best.id = id; }
        if (p < worst.p) { worst.p = p; worst.id = id; }
    }

    let gn = (id) => { let x = gamesList.find(g => g.id === id); return x ? x.name : id; };
    let bel = document.getElementById('stat-best'), wel = document.getElementById('stat-worst');
    
    if (best.id && best.p > 0) { bel.innerText = `${gn(best.id)} (+${best.p.toFixed(2)}€)`; bel.style.color='var(--accent)'; } else { bel.innerText='-'; bel.style.color='var(--text-muted)'; }
    if (worst.id && worst.p < 0) { wel.innerText = `${gn(worst.id)} (${worst.p.toFixed(2)}€)`; wel.style.color='var(--danger)'; } else { wel.innerText='-'; wel.style.color='var(--text-muted)'; }
    
    const ctx = document.getElementById('balanceChart').getContext('2d');
    if (state.chartObj) state.chartObj.destroy();
    state.chartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.history.map((_, i) => i),
            datasets: [{ data: state.history, borderColor: '#b1bad3', borderWidth: 2, pointBackgroundColor: state.history.map((v, i) => (i===0 || v>=state.history[i-1]) ? '#00e701' : '#ff4444'), pointRadius: 3, fill: false, tension: 0.1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { ticks: { color: '#b1bad3' } } } }
    });
}

function goHome() {
    if (state.activeLoop) { clearInterval(state.activeLoop); state.activeLoop = null; }
    document.getElementById('game-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

function openGame(game) {
    state.currentGame = game.id;
    document.getElementById('home-view').style.display = 'none';
    let view = document.getElementById('game-view');
    view.style.display = 'block';
    
    let wrap = `<div class="game-nav"><button class="back-btn" onclick="goHome()">◀ Retour</button><h2>${game.icon} ${game.name}</h2></div>`;
    let content = '';
    
    // Rendu dynamique selon le jeu
    if (game.id === 'blackjack') content = drawBlackjack();
    else if (game.id === 'poulet') content = drawPoulet();
    else if (game.id === 'crash') content = drawCrash('🚀');
    else if (game.id === 'dino') content = drawCrash('🦖');
    else if (game.id === 'mines') content = drawMines();
    else if (game.id === 'dice') content = drawDice();
    else if (game.id === 'roulette') content = drawRoulette();
    else if (game.id === 'baccarat') content = drawBaccarat();
    else if (game.id === 'limbo') content = drawLimbo();
    else if (game.id === 'hilo') content = drawHilo();
    else if (game.id === 'plinko') content = drawPlinko();
    else if (game.id === 'keno') content = drawKeno();
    else if (game.id === 'slots') content = drawSlots();
    
    view.innerHTML = wrap + content;
    window.scrollTo(0, 0);
    
    // Initialisation
    if(window[`init_${game.id}`]) window[`init_${game.id}`]();
    if(game.id === 'dino') init_crash();
}

function controlsTpl(id, startBtn, hideAct=true, acts='') {
    return `<div class="bet-controls" id="${id}-start">
        <div class="bet-input-wrap"><input type="number" id="${id}-bet" class="bet-input" value="1.00" step="0.01" min="0.01"></div>
        <button class="btn-large" onclick="${startBtn}">${hideAct ? 'Parier' : startBtn.replace('()','')}</button>
    </div>
    ${hideAct ? `<div class="bet-controls" id="${id}-act" style="display:none;">${acts}</div>` : ''}`;
}

/* =========================================================
   1. BLACKJACK
========================================================= */
let bj = { p:[], d:[], deck:[], bet:0 };
function drawBlackjack() {
    return `<div class="game-viewport card-table">
        <div class="hud-text">Croupier <span id="bj-d-sc"></span></div><div class="cards-row" id="bj-d"></div>
        <div class="hud-text" id="bj-msg" style="color:var(--accent); margin:15px 0;"></div>
        <div class="cards-row" id="bj-p"></div><div class="hud-text" style="margin-top:10px;">Joueur <span id="bj-p-sc"></span></div>
    </div>` + controlsTpl('bj', 'bjDeal()', true, `<div class="btn-row"><button class="btn-large btn-blue" onclick="bjHit()">Tirer</button><button class="btn-large btn-red" onclick="bjStand()">Rester</button></div><button class="btn-large btn-yellow" onclick="bjDouble()">Doubler</button>`);
}
function init_blackjack() {}
function bjDeal() {
    let b = getValidBet('bj-bet'); if(!b) return;
    bj.bet = b; bj.deck = [];
    ['♥','♦','♣','♠'].forEach(s => ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].forEach(v => bj.deck.push({s,v})));
    bj.deck.sort(() => Math.random() - 0.5);
    bj.p = [bj.deck.pop(), bj.deck.pop()]; bj.d = [bj.deck.pop(), bj.deck.pop()];
    document.getElementById('bj-start').style.display = 'none'; document.getElementById('bj-act').style.display = 'flex';
    document.getElementById('bj-msg').innerText = ''; bjUpd();
    if(bjSc(bj.p)===21) bjRes();
}
function bjSc(h) { let s=0, a=0; h.forEach(c=>{ if(['J','Q','K'].includes(c.v)) s+=10; else if(c.v==='A'){ s+=11; a++; } else s+=parseInt(c.v); }); while(s>21 && a>0){ s-=10; a--; } return s; }
function bjCardHtml(c, hide=false) { return hide ? `<div class="playing-card back"></div>` : `<div class="playing-card ${c.s==='♥'||c.s==='♦'?'red':''}">${c.v}${c.s}</div>`; }
function bjUpd(hide=true) {
    document.getElementById('bj-p').innerHTML = bj.p.map(c=>bjCardHtml(c)).join('');
    document.getElementById('bj-p-sc').innerText = `(${bjSc(bj.p)})`;
    document.getElementById('bj-d').innerHTML = bjCardHtml(bj.d[0]) + (hide?bjCardHtml(bj.d[1],true) : bj.d.slice(1).map(c=>bjCardHtml(c)).join(''));
    document.getElementById('bj-d-sc').innerText = hide ? `(?)` : `(${bjSc(bj.d)})`;
}
function bjHit() { bj.p.push(bj.deck.pop()); bjUpd(); if(bjSc(bj.p)>21) bjRes(); }
function bjStand() { bjRes(); }
function bjDouble() { if(bj.bet > state.balance) return alert("Fonds insuffisants."); bj.bet*=2; bj.p.push(bj.deck.pop()); bjUpd(); bjRes(); }
function bjRes() {
    let ps = bjSc(bj.p); let msg, win=0;
    if(ps > 21) { msg="Bust (Perdu)"; processBet(bj.bet, 0); }
    else {
        while(bjSc(bj.d)<17) bj.d.push(bj.deck.pop());
        let ds = bjSc(bj.d);
        if(ds>21 || ps>ds) { msg = ps===21&&bj.p.length===2?"Blackjack !":"Gagné !"; win = bj.bet*(msg==="Blackjack !"?2.5:2); processBet(bj.bet, win); }
        else if(ps===ds) { msg="Égalité"; processBet(bj.bet, bj.bet); }
        else { msg="Perdu"; processBet(bj.bet, 0); }
    }
    bjUpd(false); document.getElementById('bj-msg').innerText = msg;
    document.getElementById('bj-act').style.display='none'; document.getElementById('bj-start').style.display='flex';
}

/* =========================================================
   2. POULET (CROSSY)
========================================================= */
let ck = { bet:0, m:1, y:4 };
function drawPoulet() {
    return `<div class="game-viewport" id="ck-vp" style="justify-content:flex-start; padding-top:40px;">
        <div class="hud-text" style="position:absolute; top:10px; right:10px; z-index:10; color:var(--accent);">x<span id="ck-mult">1.00</span></div>
        <div style="width:100%; border-bottom:2px dashed rgba(255,255,255,0.1); height:18%;"></div><div style="width:100%; border-bottom:2px dashed rgba(255,255,255,0.1); height:18%;"></div><div style="width:100%; border-bottom:2px dashed rgba(255,255,255,0.1); height:18%;"></div><div style="width:100%; border-bottom:2px dashed rgba(255,255,255,0.1); height:18%;"></div>
        <div id="ck-p" class="flying-obj" style="display:none; bottom:5%; left:40%;">🐔</div>
    </div>` + controlsTpl('ck', 'ckStart()', true, `<button class="btn-large btn-blue" onclick="ckMove()">Avancer ⬆️</button><button class="btn-large btn-yellow" onclick="ckEnd(true)" style="margin-top:10px;">Cashout</button>`);
}
function init_poulet() { if(state.activeLoop) clearInterval(state.activeLoop); }
function ckStart() {
    let b = getValidBet('ck-bet'); if(!b) return; ck.bet=b; ck.m=1; ck.y=4;
    document.getElementById('ck-start').style.display='none'; document.getElementById('ck-act').style.display='flex';
    document.getElementById('ck-mult').innerText='1.00'; document.getElementById('ck-p').style.display='block'; document.getElementById('ck-p').style.bottom='5%';
    document.querySelectorAll('.ck-obs').forEach(e=>e.remove());
    if(state.activeLoop) clearInterval(state.activeLoop);
    state.activeLoop = setInterval(ckLoop, 50);
}
function ckMove() {
    if(ck.y>0) { ck.y--; ck.m+=0.3; document.getElementById('ck-mult').innerText=ck.m.toFixed(2); document.getElementById('ck-p').style.bottom = (5 + (4-ck.y)*18) + '%'; }
    if(ck.y===0) ckEnd(true);
}
function ckLoop() {
    let vp = document.getElementById('ck-vp');
    if(Math.random()<0.08) {
        let el=document.createElement('div'); el.className='flying-obj ck-obs'; el.innerText='🚗';
        let l = Math.floor(Math.random()*3)+1;
        el.style.bottom = (5 + (4-l)*18) + '%'; el.style.left = '100%'; el.dataset.l = l; el.dataset.x = 100;
        vp.appendChild(el);
    }
    document.querySelectorAll('.ck-obs').forEach(el => {
        let x = parseFloat(el.dataset.x) - 3; el.dataset.x = x; el.style.left = x + '%';
        if(parseInt(el.dataset.l) === ck.y && Math.abs(x - 40) < 10) { el.innerText='💥'; ckEnd(false); }
        if(x < -10) el.remove();
    });
}
function ckEnd(won) {
    clearInterval(state.activeLoop); state.activeLoop=null;
    if(won){ let w = ck.bet*ck.m; processBet(ck.bet, w); alert(`Gain: ${w.toFixed(2)}€`); }
    else { processBet(ck.bet, 0); alert("Écrasé !"); }
    document.getElementById('ck-act').style.display='none'; document.getElementById('ck-start').style.display='flex';
}

/* =========================================================
   3 & 4. CRASH & DINO
========================================================= */
let cr = { bet:0, m:1, t:1 };
function drawCrash(icon) {
    return `<div class="game-viewport"><div id="cr-obj" class="flying-obj" style="bottom:10%; left:10%;">${icon}</div><div class="giant-mult" id="cr-mult">1.00x</div></div>` 
    + controlsTpl('cr', 'crStart()', true, `<button class="btn-large btn-yellow" onclick="crEnd(true)">Encaisser</button>`);
}
function init_crash() { if(state.activeLoop) clearInterval(state.activeLoop); }
function crStart() {
    let b = getValidBet('cr-bet'); if(!b) return; cr.bet=b; cr.m=1;
    cr.t = Math.max(1.00, 0.99 / Math.random());
    document.getElementById('cr-start').style.display='none'; document.getElementById('cr-act').style.display='flex';
    let txt = document.getElementById('cr-mult'); txt.className='giant-mult';
    let obj = document.getElementById('cr-obj'); obj.style.bottom='10%'; obj.style.left='10%'; obj.style.transform='rotate(0deg)';
    
    if(state.activeLoop) clearInterval(state.activeLoop);
    state.activeLoop = setInterval(() => {
        cr.m += cr.m * 0.01 + 0.01;
        if(cr.m >= cr.t) crEnd(false);
        else {
            txt.innerText = cr.m.toFixed(2)+'x';
            let p = Math.min(80, (cr.m-1)*10);
            obj.style.bottom = (10+p)+'%'; obj.style.left = (10+p)+'%'; obj.style.transform = `rotate(${p/2}deg)`;
        }
    }, 50);
}
function crEnd(won) {
    clearInterval(state.activeLoop); state.activeLoop=null;
    let txt = document.getElementById('cr-mult');
    if(won){ let w = cr.bet*cr.m; processBet(cr.bet, w); txt.className='giant-mult won'; txt.innerText='Gagné '+cr.m.toFixed(2)+'x'; }
    else { processBet(cr.bet, 0); txt.className='giant-mult lost'; txt.innerText='Crash '+cr.t.toFixed(2)+'x'; document.getElementById('cr-obj').style.transform='rotate(90deg)'; }
    document.getElementById('cr-act').style.display='none'; document.getElementById('cr-start').style.display='flex';
}

/* =========================================================
   5. MINES
========================================================= */
let mn = { bet:0, m:1, c:0, g:[], n:3 };
function drawMines() {
    let h=''; for(let i=0; i<25; i++) h+=`<div class="grid-cell" id="mn-${i}" onclick="mnClick(${i})"></div>`;
    return `<div class="game-viewport" style="background:transparent; border:none; padding:0; min-height:auto;">
        <div class="hud-text" style="width:100%; display:flex; justify-content:space-between; color:var(--accent);">
            <span>Mult: <span id="mn-mult">1.00</span>x</span><span>Mines: <input type="number" id="mn-count" value="3" min="1" max="24" style="width:40px; background:var(--bg-card); color:white; border:none; text-align:center;"></span>
        </div>
        <div class="grid-5x5">${h}</div>
    </div>` + controlsTpl('mn', 'mnStart()', true, `<button class="btn-large btn-yellow" onclick="mnEnd(true)">Encaisser</button>`);
}
function init_mines() {}
function mnStart() {
    let b = getValidBet('mn-bet'); if(!b) return;
    mn.n = parseInt(document.getElementById('mn-count').value); if(mn.n<1||mn.n>24) return;
    mn.bet=b; mn.c=0; mn.m=1; mn.g=Array(25).fill(false);
    let p=0; while(p<mn.n){ let r=Math.floor(Math.random()*25); if(!mn.g[r]){ mn.g[r]=true; p++; } }
    for(let i=0; i<25; i++){ let el=document.getElementById(`mn-${i}`); el.className='grid-cell'; el.innerText=''; }
    document.getElementById('mn-start').style.display='none'; document.getElementById('mn-act').style.display='flex';
    document.getElementById('mn-mult').innerText='1.00';
}
function mnClick(i) {
    let el = document.getElementById(`mn-${i}`);
    if(el.innerText !== '' || document.getElementById('mn-act').style.display==='none') return;
    if(mn.g[i]) { el.className='grid-cell mine'; el.innerText='💣'; mnEnd(false); }
    else {
        el.className='grid-cell active'; el.innerText='💎'; mn.c++;
        mn.m *= (25-mn.c+1)/(25-mn.c+1-mn.n) * 0.99;
        document.getElementById('mn-mult').innerText=mn.m.toFixed(2);
        if(mn.c === 25-mn.n) mnEnd(true);
    }
}
function mnEnd(won) {
    for(let i=0; i<25; i++) { let el=document.getElementById(`mn-${i}`); if(mn.g[i] && el.innerText==='') el.innerText='💣'; }
    if(won){ let w = mn.bet*mn.m; processBet(mn.bet, w); alert(`Gain: ${w.toFixed(2)}€`); }
    else processBet(mn.bet, 0);
    document.getElementById('mn-act').style.display='none'; document.getElementById('mn-start').style.display='flex';
}

/* =========================================================
   6. DICE
========================================================= */
let di = { over:true, c:50 };
function drawDice() {
    return `<div class="game-viewport" style="padding:20px;">
        <div class="hud-text" style="display:flex; justify-content:space-between; width:100%;">
            <span style="color:var(--accent);">Mult: <span id="di-mult">1.98</span>x</span><span>Win: <span id="di-ch">50</span>%</span>
        </div>
        <div class="giant-mult" id="di-res">50.00</div>
        <input type="range" id="di-sl" class="dice-slider" min="2" max="98" value="50" oninput="diUpd()">
        <div class="btn-row"><button class="btn-large" id="di-bu" style="background:var(--bg-card);" onclick="diTog(false)">Moins 50</button><button class="btn-large btn-blue" id="di-bo" onclick="diTog(true)">Plus 50</button></div>
    </div>` + controlsTpl('di', 'diRoll()', false);
}
function init_dice() { diUpd(); }
function diTog(o) { di.over=o; document.getElementById('di-bo').className='btn-large '+(o?'btn-blue':''); document.getElementById('di-bu').className='btn-large '+(o?'':'btn-blue'); diUpd(); }
function diUpd() {
    let v = parseInt(document.getElementById('di-sl').value); di.c = di.over?100-v:v;
    document.getElementById('di-ch').innerText = di.c; document.getElementById('di-mult').innerText = (99/di.c).toFixed(2);
    document.getElementById('di-bo').innerText='Plus '+v; document.getElementById('di-bu').innerText='Moins '+v;
    document.getElementById('di-bu').style.background = !di.over ? 'var(--btn-blue)' : 'var(--bg-card)';
    document.getElementById('di-bo').style.background = di.over ? 'var(--btn-blue)' : 'var(--bg-card)';
}
function diRoll() {
    let b = getValidBet('di-bet'); if(!b) return;
    let v = parseInt(document.getElementById('di-sl').value); let r = (Math.random()*100).toFixed(2);
    let el = document.getElementById('di-res'); el.innerText = r; el.className = 'giant-mult';
    let win = (di.over && parseFloat(r)>v) || (!di.over && parseFloat(r)<v);
    if(win){ el.classList.add('won'); processBet(b, b*(99/di.c)); } else { el.classList.add('lost'); processBet(b, 0); }
}

/* =========================================================
   7. ROULETTE
========================================================= */
function drawRoulette() {
    return `<div class="game-viewport">
        <div class="roulette-wheel" id="ro-res">🎡</div><div class="hud-text" id="ro-msg">Faites vos jeux</div>
        <div class="roulette-board">
            <button class="btn-large btn-red" onclick="roPlay('r')">ROUGE (2x)</button><button class="btn-large" style="background:#222;" onclick="roPlay('b')">NOIR (2x)</button>
            <button class="btn-large btn-blue" onclick="roPlay('e')">PAIR (2x)</button><button class="btn-large btn-yellow" onclick="roPlay('o')">IMPAIR (2x)</button>
        </div>
    </div>` + controlsTpl('ro', 'roPlay', false).replace('<button class="btn-large" onclick="roPlay">roPlay()</button>','');
}
function init_roulette() {}
function roPlay(t) {
    let b = getValidBet('ro-bet'); if(!b) return;
    let n = Math.floor(Math.random()*37); let reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    let isR=reds.includes(n), isB=n!==0&&!isR, isE=n!==0&&n%2===0, isO=n!==0&&n%2!==0;
    
    let el = document.getElementById('ro-res');
    el.style.transform = `rotate(${Math.random()*360+720}deg)`; el.style.transition = '1s ease-out';
    
    setTimeout(() => {
        el.innerText = n; el.style.background = n===0?'var(--accent)':(isR?'var(--danger)':'#222'); el.style.color='white';
        let won = (t==='r'&&isR) || (t==='b'&&isB) || (t==='e'&&isE) || (t==='o'&&isO);
        document.getElementById('ro-msg').innerText = won ? "Gagné !" : "Perdu.";
        processBet(b, won ? b*2 : 0);
    }, 1000);
}

/* =========================================================
   8. BACCARAT
========================================================= */
function drawBaccarat() {
    return `<div class="game-viewport card-table">
        <div style="display:flex; justify-content:space-between; width:100%; padding:0 20px;">
            <div style="text-align:center;"><div class="hud-text">JOUEUR</div><div class="giant-mult" id="ba-p">-</div></div>
            <div style="text-align:center;"><div class="hud-text">BANQUIER</div><div class="giant-mult" id="ba-b">-</div></div>
        </div>
        <div class="hud-text" id="ba-msg" style="color:gold; margin:15px 0;"></div>
        <div class="btn-row"><button class="btn-large btn-blue" onclick="baPlay('P')">J (2x)</button><button class="btn-large" style="background:#16a34a;" onclick="baPlay('T')">E (9x)</button><button class="btn-large btn-red" onclick="baPlay('B')">B (1.95x)</button></div>
    </div>` + controlsTpl('ba', 'baPlay', false).replace('<button class="btn-large" onclick="baPlay">baPlay()</button>','');
}
function init_baccarat() {}
function baVal(c) { let v=c%13; return v>=10?0:v+1; }
function baPlay(t) {
    let b = getValidBet('ba-bet'); if(!b) return;
    let pSc = (baVal(Math.floor(Math.random()*52)) + baVal(Math.floor(Math.random()*52)))%10;
    let bSc = (baVal(Math.floor(Math.random()*52)) + baVal(Math.floor(Math.random()*52)))%10;
    if(pSc<5) pSc = (pSc + baVal(Math.floor(Math.random()*52)))%10;
    if(bSc<5) bSc = (bSc + baVal(Math.floor(Math.random()*52)))%10;
    
    document.getElementById('ba-p').innerText=pSc; document.getElementById('ba-b').innerText=bSc;
    let res = pSc>bSc?'P':(bSc>pSc?'B':'T');
    
    if(t===res){ document.getElementById('ba-msg').innerText="Gagné !"; processBet(b, b*(t==='T'?9:(t==='B'?1.95:2))); }
    else { document.getElementById('ba-msg').innerText="Perdu."; processBet(b, 0); }
}

/* =========================================================
   9. LIMBO
========================================================= */
function drawLimbo() {
    return `<div class="game-viewport"><div class="hud-text" style="position:absolute; top:10px;">Résultat</div><div class="giant-mult" id="lb-res">1.00x</div></div>
    <div class="bet-controls">
        <div class="hud-text">Cible :</div><div class="bet-input-wrap" style="margin-bottom:10px;"><input type="number" id="lb-t" class="bet-input" value="2.00" step="0.10" min="1.01"></div>
        <div class="hud-text">Mise :</div><div class="bet-input-wrap"><input type="number" id="lb-bet" class="bet-input" value="1.00" step="0.01" min="0.01"></div>
        <button class="btn-large" onclick="lbRoll()" style="margin-top:10px;">Parier</button>
    </div>`;
}
function init_limbo() {}
function lbRoll() {
    let b = getValidBet('lb-bet'); if(!b) return;
    let t = parseFloat(document.getElementById('lb-t').value); if(isNaN(t)||t<=1) return alert("Cible invalide");
    let r = Math.max(1.00, 0.99/Math.random());
    let el = document.getElementById('lb-res'); el.innerText = r.toFixed(2)+'x'; el.className = 'giant-mult';
    if(r>=t){ el.classList.add('won'); processBet(b, b*t); } else { el.classList.add('lost'); processBet(b, 0); }
}

/* =========================================================
   10. HILO
========================================================= */
let hl = { bet:0, m:1, c:7 };
function drawHilo() {
    return `<div class="game-viewport card-table">
        <div class="hud-text" style="color:var(--accent);">Mult: <span id="hl-mult">1.00</span>x</div>
        <div class="playing-card" id="hl-c" style="width:80px; height:120px; font-size:2.5rem; margin:20px 0;">?</div>
    </div>` + controlsTpl('hl', 'hlStart()', true, `<div class="btn-row"><button class="btn-large btn-blue" onclick="hlG(true)">Haut/Égal</button><button class="btn-large btn-red" onclick="hlG(false)">Bas/Égal</button></div><button class="btn-large btn-yellow" style="margin-top:10px;" onclick="hlEnd(true)">Encaisser</button>`);
}
function init_hilo() {}
function hlStart() {
    let b = getValidBet('hl-bet'); if(!b) return; hl.bet=b; hl.m=1; hl.c=Math.floor(Math.random()*13)+1;
    document.getElementById('hl-c').innerText=hl.c; document.getElementById('hl-mult').innerText='1.00';
    document.getElementById('hl-start').style.display='none'; document.getElementById('hl-act').style.display='block';
}
function hlG(hi) {
    let n = Math.floor(Math.random()*13)+1; let w = (hi&&n>=hl.c)||(!hi&&n<=hl.c); hl.c=n; document.getElementById('hl-c').innerText=hl.c;
    if(w){ hl.m*=1.35; document.getElementById('hl-mult').innerText=hl.m.toFixed(2); } else hlEnd(false);
}
function hlEnd(won) {
    if(won){ processBet(hl.bet, hl.bet*hl.m); alert(`Cashout: ${(hl.bet*hl.m).toFixed(2)}€`); } else processBet(hl.bet, 0);
    document.getElementById('hl-act').style.display='none'; document.getElementById('hl-start').style.display='flex'; document.getElementById('hl-c').innerText='?';
}

/* =========================================================
   11. PLINKO
========================================================= */
function drawPlinko() {
    return `<div class="game-viewport" style="padding-bottom:0;">
        <div class="hud-text" id="pk-msg" style="height:30px; letter-spacing:4px; font-size:1.5rem;">Prêt</div>
        <div style="display:flex; gap:2px; margin-top:20px; align-items:flex-end;">
            ${[29,4,1.5,0.3,0.2,0.3,1.5,4,29].map(m=>`<div style="background:${m>5?'var(--danger)':(m>1?'var(--btn-blue)':'var(--accent)')}; padding:10px 4px; font-size:0.7rem; font-weight:bold; border-radius:4px 4px 0 0;">${m}x</div>`).join('')}
        </div>
    </div>` + controlsTpl('pk', 'pkDrop()', false);
}
function init_plinko() {}
function pkDrop() {
    let b = getValidBet('pk-bet'); if(!b) return; document.querySelector('#pk-start button').disabled=true;
    let p=[], ri=0; for(let i=0;i<8;i++){ let r=Math.random()>0.5; p.push(r?'↘':'↙'); if(r)ri++; }
    let m = [29,4,1.5,0.3,0.2,0.3,1.5,4,29][ri];
    let msg = document.getElementById('pk-msg'); msg.innerText=''; let st=0;
    let anim = setInterval(()=>{
        if(st<8) { msg.innerText+=p[st]+' '; st++; }
        else { clearInterval(anim); msg.innerText=`Atterrissage: ${m}x !`; processBet(b, b*m); document.querySelector('#pk-start button').disabled=false; }
    }, 150);
}

/* =========================================================
   12. KENO
========================================================= */
let kn = { s:[] };
function drawKeno() {
    let h=''; for(let i=1;i<=40;i++) h+=`<div class="grid-cell" style="font-size:1rem;" id="kn-${i}" onclick="knTog(${i})">${i}</div>`;
    return `<div class="game-viewport" style="padding:10px; min-height:auto;">
        <div class="hud-text" style="color:var(--accent);">Sélectionnés : <span id="kn-c">0</span>/10</div>
        <div class="grid-8x5">${h}</div>
    </div>` + controlsTpl('kn', 'knPlay()', false);
}
function init_keno() { kn.s=[]; }
function knTog(n) {
    let i=kn.s.indexOf(n), el=document.getElementById(`kn-${n}`);
    if(i>-1){ kn.s.splice(i,1); el.classList.remove('keno-sel'); } else if(kn.s.length<10){ kn.s.push(n); el.classList.add('keno-sel'); }
    document.getElementById('kn-c').innerText=kn.s.length;
}
function knPlay() {
    let b = getValidBet('kn-bet'); if(!b) return; if(kn.s.length===0) return alert("Sélectionnez min 1 numéro.");
    for(let i=1;i<=40;i++) document.getElementById(`kn-${i}`).className='grid-cell '+(kn.s.includes(i)?'keno-sel':'');
    let d=[]; while(d.length<10){ let r=Math.floor(Math.random()*40)+1; if(!d.includes(r)) d.push(r); }
    let h=0; d.forEach(n=>{ let el=document.getElementById(`kn-${n}`); if(kn.s.includes(n)){ h++; el.classList.add('keno-hit'); } else el.style.background='#444'; });
    let m=h>=2?h*1.5:(h===0&&kn.s.length>5?2:0);
    processBet(b, b*m); if(m>0) setTimeout(()=>alert(`${h} hits ! Gain: ${(b*m).toFixed(2)}€`), 500);
}

/* =========================================================
   13. SLOTS
========================================================= */
function drawSlots() {
    return `<div class="game-viewport">
        <div class="slots-container">
            <div class="slot-reel" id="sl-1">🍒</div><div class="slot-reel" id="sl-2">🍋</div><div class="slot-reel" id="sl-3">🍉</div>
        </div>
        <div class="hud-text" id="sl-msg" style="color:var(--accent); min-height:20px;"></div>
    </div>` + controlsTpl('sl', 'slSpin()', false);
}
function init_slots() {}
function slSpin() {
    let b = getValidBet('sl-bet'); if(!b) return; document.querySelector('#sl-start button').disabled=true;
    let syms = ['🍒','🍋','🍉','💎','🔔'];
    let r1 = document.getElementById('sl-1'), r2 = document.getElementById('sl-2'), r3 = document.getElementById('sl-3');
    document.getElementById('sl-msg').innerText = '';
    
    let st=0; let anim = setInterval(()=>{
        r1.innerText = syms[Math.floor(Math.random()*syms.length)];
        r2.innerText = syms[Math.floor(Math.random()*syms.length)];
        r3.innerText = syms[Math.floor(Math.random()*syms.length)];
        st++;
        if(st > 10) {
            clearInterval(anim);
            let s1 = syms[Math.floor(Math.random()*syms.length)], s2 = syms[Math.floor(Math.random()*syms.length)], s3 = syms[Math.floor(Math.random()*syms.length)];
            r1.innerText=s1; r2.innerText=s2; r3.innerText=s3;
            
            let m=0;
            if(s1===s2 && s2===s3) m = (s1==='💎')?50:10;
            else if(s1===s2 || s2===s3 || s1===s3) m = 2;
            
            if(m>0){ document.getElementById('sl-msg').innerText = `Gain: ${m}x !`; processBet(b, b*m); }
            else { document.getElementById('sl-msg').innerText = "Perdu."; processBet(b, 0); }
            
            document.querySelector('#sl-start button').disabled=false;
        }
    }, 100);
}
