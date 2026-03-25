const socket = io();

// Extract Room ID from the URL path
const roomID = window.location.pathname.split('/')[1] || 'default-room';
socket.emit('joinRoom', roomID);

let myRole = 0;
let board = [];
let currentPlayer = 1;
let gameActive = true;
let lastMove = { r: -1, c: -1 };

socket.on('assignRole', (role) => {
    myRole = role;
    updateStatus();
});

socket.on('stateUpdate', (data) => {
    board = data.board;
    currentPlayer = data.currentPlayer;
    gameActive = data.gameActive;
    lastMove = data.lastMove;
    updateStatus();
    renderBoard();
});

socket.on('gameEnd', (data) => {
    const status = document.getElementById('status-text');
    status.innerText = data.winner === 'Draw' ? "It's a Draw!" : `Player ${data.winner} Wins!`;
    if (data.winner !== 'Draw') status.style.color = data.winner === 1 ? '#e74c3c' : '#f1c40f';
});

function handleMove(colIndex) {
    if (gameActive && myRole === currentPlayer) {
        socket.emit('makeMove', colIndex);
    }
}

function renderBoard() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = ''; 

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 7; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            
            if (board[r] && board[r][c] !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece', board[r][c] === 1 ? 'p1' : 'p2');
                if (r === lastMove.r && c === lastMove.c) piece.classList.add('new-piece');
                cell.appendChild(piece);
            }
            
            cell.addEventListener('click', () => handleMove(c));
            
            cell.addEventListener('mouseenter', () => {
                if(gameActive && myRole === currentPlayer && board[0][c] === 0) {
                    cell.style.backgroundColor = "#d5dbdb";
                }
            });
            cell.addEventListener('mouseleave', () => {
                cell.style.backgroundColor = "var(--empty-color)";
            });
            
            boardElement.appendChild(cell);
        }
    }
}

function updateStatus() {
    const status = document.getElementById('status-text');
    let roleName = myRole === 1 ? " (You: Red)" : myRole === 2 ? " (You: Yellow)" : " (Spectator)";
    
    if (gameActive) {
        status.innerText = `Room: ${roomID} | Player ${currentPlayer}'s Turn ${roleName}`;
        status.style.color = currentPlayer === 1 ? '#e74c3c' : '#f1c40f';
    }
}

document.getElementById('reset-btn').addEventListener('click', () => socket.emit('resetRequest'));