"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
let AppGateway = class AppGateway {
    server;
    logger = new common_1.Logger('AppGateway');
    gameState = {
        players: [
            {
                id: 1,
                name: 'Jogador 1',
                hand: [],
                position: 'bottom',
                originalHand: [],
            },
            {
                id: 2,
                name: 'Jogador 2',
                hand: [],
                position: 'left',
                originalHand: [],
            },
            { id: 3, name: 'Jogador 3', hand: [], position: 'top', originalHand: [] },
            {
                id: 4,
                name: 'Jogador 4',
                hand: [],
                position: 'right',
                originalHand: [],
            },
        ],
        table: [],
        shackles: [],
        overallScore: { nos: 0, eles: 0 },
        score: { rounds: 0, winners: [0, 0, 0] },
        deckId: null,
    };
    async createDeck() {
        try {
            const response = await fetch('https://truco-blnx.onrender.com/truco/newDeck');
            const data = await response.json();
            this.gameState.deckId = data.deck_id;
            this.server.emit('deckCreated', data);
        }
        catch (error) {
            this.logger.error('Erro ao criar o baralho: ', error);
        }
    }
    async shuffleDeck() {
        if (this.gameState.deckId) {
            try {
                const response = await fetch(`https://truco-blnx.onrender.com/truco/${this.gameState.deckId}/embaralhar`);
                const data = await response.json();
                this.server.emit('deckShuffled', data);
            }
            catch (error) {
                this.logger.error('Erro ao embaralhar o baralho: ', error);
            }
        }
    }
    async distributeCards() {
        if (this.gameState.deckId) {
            try {
                const response = await fetch(`https://truco-blnx.onrender.com/truco/${this.gameState.deckId}/distribuir`);
                const data = await response.json();
                this.logger.log("Tipo de data.manilha: " + typeof data.manilha);
                this.logger.log("Valor de data.manilha: " + JSON.stringify(data.manilha));
                let manilhasAtualizadas = [];
                const manilhaStr = data.manilha;
                const manilhaSemUltimaLetra = manilhaStr.slice(0, -1);
                this.logger.error(manilhaStr);
                this.logger.error("Valor de data.manilha: " + manilhaSemUltimaLetra);
                manilhasAtualizadas = [
                    manilhaSemUltimaLetra + "D",
                    manilhaSemUltimaLetra + "S",
                    manilhaSemUltimaLetra + "H",
                    manilhaSemUltimaLetra + "C",
                ];
                this.gameState.shackles = manilhasAtualizadas.map((card) => ({
                    id: card,
                    src: `${card}.png`,
                }));
                this.gameState.players = this.gameState.players.map((player, index) => {
                    const playerCards = data[`jogador${index + 1}`] || [];
                    const playerHand = playerCards.map((card) => `${card.toLowerCase()}.png`);
                    return {
                        ...player,
                        hand: playerHand,
                        originalHand: [...playerHand],
                    };
                });
                this.server.emit('cardsDistributed', this.gameState.players, this.gameState.shackles);
            }
            catch (error) {
                this.logger.error('Erro ao distribuir as cartas: ', error);
            }
        }
    }
    playCard(client, payload) {
        const player = this.gameState.players.find((p) => p.id === payload.playerId);
        if (!player)
            return;
        const selectedCard = player.hand[payload.cardIndex];
        if (!selectedCard)
            return;
        player.hand = player.hand.filter((_, index) => index !== payload.cardIndex);
        this.gameState.table.push({
            card: selectedCard,
            position: player.position,
        });
        if (this.gameState.table.length === 4) {
            this.determineRoundWinner();
        }
        this.server.emit('tableUpdated', this.gameState.table);
    }
    determineRoundWinner() {
        const force = [
            'card-back',
            '4',
            '5',
            '6',
            '7',
            'Q',
            'J',
            'K',
            'A',
            '2',
            '3',
        ];
        const getCardValue = (cardImage) => {
            const match = cardImage.match(/card(\d+|[kqja])/);
            if (cardImage.includes('card-back')) {
                return 'card-back';
            }
            return match ? match[1].toUpperCase() : '';
        };
        const getCardSuit = (cardImage) => {
            const match = cardImage.match(/(\d+)([dshc])\.png/);
            return match ? match[2] : '';
        };
        let winningCards = [this.gameState.table[0]];
        let hasShackle = this.gameState.shackles.some((shackle) => shackle.id.includes(getCardValue(this.gameState.table[0].card).toLowerCase()));
        for (let i = 1; i < this.gameState.table.length; i++) {
            const currentCardValue = getCardValue(this.gameState.table[i].card);
            const currentCardSuit = getCardSuit(this.gameState.table[i].card);
            const winningCardValue = getCardValue(winningCards[0].card);
            const winningCardSuit = getCardSuit(winningCards[0].card);
            const isCurrentShackle = this.gameState.shackles.some((shackle) => shackle.id.includes(currentCardValue.toLowerCase()));
            if (isCurrentShackle) {
                if (!hasShackle) {
                    winningCards = [this.gameState.table[i]];
                    hasShackle = true;
                }
                else {
                    const naipeForca = ['o', 'e', 'c', 'p'];
                    if (naipeForca.indexOf(currentCardSuit) >
                        naipeForca.indexOf(winningCardSuit)) {
                        winningCards = [this.gameState.table[i]];
                    }
                    else if (naipeForca.indexOf(currentCardSuit) ===
                        naipeForca.indexOf(winningCardSuit)) {
                        winningCards.push(this.gameState.table[i]);
                    }
                }
            }
            else if (!hasShackle) {
                const currentForce = force.indexOf(currentCardValue);
                const winningForce = force.indexOf(winningCardValue);
                if (currentForce > winningForce) {
                    winningCards = [this.gameState.table[i]];
                }
                else if (currentForce === winningForce) {
                    winningCards.push(this.gameState.table[i]);
                }
            }
        }
        let winningTeam;
        if (winningCards.length > 1) {
            winningTeam = 'empate';
        }
        else {
            winningTeam =
                winningCards[0].position === 'bottom' ||
                    winningCards[0].position === 'top'
                    ? '1'
                    : '2';
        }
        this.addPoints(winningTeam);
        this.gameState.table = [];
    }
    addPoints(team) {
        const winningTeam = team === '1' ? 1 : team === '2' ? 2 : 3;
        this.gameState.score.winners[this.gameState.score.rounds] = winningTeam;
        if (this.gameState.score.rounds < 3) {
            this.gameState.score.rounds++;
        }
        if (this.gameState.score.rounds === 3) {
            if (this.gameState.score.winners.filter((w) => w === 1).length > 1) {
                this.gameState.overallScore.nos++;
            }
            else if (this.gameState.score.winners.filter((w) => w === 2).length > 1) {
                this.gameState.overallScore.eles++;
            }
            this.resetRound();
        }
    }
    resetRound() {
        this.gameState.score.rounds = 0;
        this.gameState.score.winners = [0, 0, 0];
        this.server.emit('roundReset');
    }
    afterInit(server) {
        this.logger.log('WebSocket gateway inicializado');
    }
    handleConnection(client) {
        this.logger.log(`Cliente conectado: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }
};
exports.AppGateway = AppGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('newDeck'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "createDeck", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('shuffleDeck'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "shuffleDeck", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('distributeCards'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "distributeCards", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('playCard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "playCard", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
            credentials: true,
        },
    })
], AppGateway);
//# sourceMappingURL=app.gateway.js.map