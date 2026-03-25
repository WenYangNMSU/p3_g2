const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Store multiple games: { roomID: { board, currentPlayer, player1Id, player2Id, gameActive } }
const games = {};

// Route: Serve index.html for any room URL (Bonus: Multiple Games Support)
app.get('/:room', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Win Logic Helper
function checkWin(board, row, col, player) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            let r = row + dr * i, c = col + dc * i;
            if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) count++; else break;
        }
        for (let i = 1; i < 4; i++) {
            let r = row - dr * i, c = col - dc * i;
            if (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) count++; else break;
        }
        if (count >= 4) return true;
    }
    return false;
}

io.on('connection', (socket) => {
    socket.on('joinRoom', (roomID) => {
        socket.join(roomID);

        // Initialize unique game state for this room
        if (!games[roomID]) {
            games[roomID] = {
                board: Array(6).fill(null).map(() => Array(7).fill(0)),
                currentPlayer: 1,
                gameActive: true,
                lastMove: { r: -1, c: -1 },
                player1Id: null,
                player2Id: null
            };
        }

        const game = games[roomID];
        let role = 0; // Spectator by default

        if (!game.player1Id) {
            game.player1Id = socket.id;
            role = 1;
        } else if (!game.player2Id) {
            game.player2Id = socket.id;
            role = 2;
        }

        socket.emit('assignRole', role);
        io.to(roomID).emit('stateUpdate', game);

        socket.on('makeMove', (colIndex) => {
            if (!game.gameActive) return;

            // Role validation
            const authId = (game.currentPlayer === 1) ? game.player1Id : game.player2Id;
            if (socket.id !== authId) return;

            let rowToPlace = -1;
            for (let r = 5; r >= 0; r--) {
                if (game.board[r][colIndex] === 0) { rowToPlace = r; break; }
            }

            if (rowToPlace !== -1) {
                game.board[rowToPlace][colIndex] = game.currentPlayer;
                game.lastMove = { r: rowToPlace, c: colIndex };
                
                if (checkWin(game.board, rowToPlace, colIndex, game.currentPlayer)) {
                    game.gameActive = false;
                    io.to(roomID).emit('gameEnd', { winner: game.currentPlayer });
                } else if (game.board[0].every(cell => cell !== 0)) {
                    game.gameActive = false;
                    io.to(roomID).emit('gameEnd', { winner: 'Draw' });
                } else {
                    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
                }
                io.to(roomID).emit('stateUpdate', game);
            }
        });

        socket.on('resetRequest', () => {
            Object.assign(game, {
                board: Array(6).fill(null).map(() => Array(7).fill(0)),
                currentPlayer: 1,
                gameActive: true,
                lastMove: { r: -1, c: -1 }
            });
            io.to(roomID).emit('stateUpdate', game);
        });

        socket.on('disconnect', () => {
            if (socket.id === game.player1Id) game.player1Id = null;
            if (socket.id === game.player2Id) game.player2Id = null;
        });
    });
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));