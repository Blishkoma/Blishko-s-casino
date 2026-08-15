// --- ÉTAT GLOBAL DE LA SPA ---
let appState = {
    balance: 10.00,
    currentGame: null
};

// --- BASE DE DONNÉES DES JEUX ---
const games = [
    { id: 'poulet', name: 'Le Jeu du Poulet', icon: '🍗', desc: 'Soulevez les cloches, évitez les os.' },
    { id: 'mines', name: 'Mines', icon: '💣', desc: 'Trouvez les gemmes, esquivez les bombes.' },
    { id: 'blackjack', name: 'Blackjack', icon: '🃏', desc: 'Battez la banque sans dépasser 21.' },
    { id: 'crash', name: 'Crash', icon: '📈', desc: 'Encaissez avant que la courbe ne s\'effondre.' },
    { id: 'plinko', name: 'Plinko', icon: '🎯', desc: 'Faites tomber la balle dans les gros multiplicateurs.' },
    { id: 'dino', name: 'Dino', icon: '🦖', desc: 'Courez le plus loin possible avant l\'astéroïde.' },
    { id: 'dice', name: 'Dice', icon: '🎲', desc: 'Ajustez vos probabilités et lancez les dés.' },
    { id: 'roulette', name: 'Roulette', icon: '🎡', desc: 'Placez vos jetons et faites tourner la roue.' },
    { id: 'baccarat', name: 'Baccarat', icon: '🏦', desc: 'Pariez sur le joueur, la banque ou l\'égalité.' },
    { id: 'keno', name: 'Keno', icon: '🎱', desc: 'Sélectionnez vos numéros de chance.' }
];

// --- RÉFÉRENCES DOM ---
const homeView = document.getElementById('home-view');
const gameView = document.getElementById('game-view');
const gamesListContainer = document.getElementById('games-list');
const balanceDisplay = document.getElementById('balance-amount');

// --- INITIALISATION ---
function initApp() {
    updateBalanceDisplay();
    renderGamesList();
}

// Formatage et mise à jour du solde
function updateBalanceDisplay() {
    balanceDisplay.textContent = appState.balance.toFixed(2);
}

// Génération dynamique du hub (Vue Accueil)
function renderGamesList() {
    gamesListContainer.innerHTML = '';
    
    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        // Attache l'événement de routage au clic
        card.onclick = () => openGame(game);
        
        card.innerHTML = `
            <div class="game-icon">${game.icon}</div>
            <div class="game-info">
                <h3>${game.name}</h3>
                <p>${game.desc}</p>
            </div>
        `;
        
        gamesListContainer.appendChild(card);
    });
}

// --- LOGIQUE DE ROUTAGE ---

// Transition vers l'interface d'un jeu
function openGame(game) {
    appState.currentGame = game.id;
    
    // Bascule de l'affichage (Masque l'accueil, montre le jeu)
    homeView.style.display = 'none';
    gameView.style.display = 'flex';
    
    // Construction dynamique de l'interface du jeu sélectionné
    gameView.innerHTML = `
        <div class="game-header">
            <button class="back-btn" onclick="goBackToHome()">&larr; Retour</button>
            <h2 style="font-size: 1.2rem;">${game.icon} ${game.name}</h2>
        </div>
        
        <!-- Emplacement futur pour le script de logique spécifique au jeu -->
        <div class="game-placeholder" id="canvas-${game.id}">
            Moteur de jeu : ${game.name} (en cours de développement)
        </div>
    `;
    
    window.scrollTo(0, 0); // Remonte tout en haut lors de l'ouverture du jeu
}

// Retour au Hub principal
function goBackToHome() {
    appState.currentGame = null;
    
    // Nettoyage du DOM du jeu pour libérer la mémoire (SPA)
    gameView.innerHTML = '';
    
    // Bascule de l'affichage inverse
    gameView.style.display = 'none';
    homeView.style.display = 'block';
}

// Lancement au chargement du script
document.addEventListener('DOMContentLoaded', initApp);

