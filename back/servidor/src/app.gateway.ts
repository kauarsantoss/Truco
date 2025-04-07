import { Logger } from '@nestjs/common';
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Definindo tipos para o estado do jogo
interface GameState {
    players: {
        id: number;
        name: string;
        hand: string[];
        position: string;
        originalHand: string[];
    }[];
    table: { card: string; position: string }[];
    shackles: { id: string; src: string }[];
    overallScore: { nos: number; eles: number };
    score: { rounds: number; winners: number[] };
    deckId: string | null;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class AppGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('AppGateway');
    private gameState: GameState = {
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

    // Criação de novo baralho
    @SubscribeMessage('newDeck')
    async createDeck(): Promise<void> {
        try {
            const response = await fetch(
                'https://truco-blnx.onrender.com/truco/newDeck',
            );
            const data = await response.json();
            this.gameState.deckId = data.deck_id;
            this.server.emit('deckCreated', data);
        } catch (error) {
            this.logger.error('Erro ao criar o baralho: ', error);
        }
    }

    // Embaralhando o baralho
    @SubscribeMessage('shuffleDeck')
    async shuffleDeck(): Promise<void> {
        if (this.gameState.deckId) {
            try {
                const response = await fetch(
                    `https://truco-blnx.onrender.com/truco/${this.gameState.deckId}/embaralhar`,
                );
                const data = await response.json();
                this.server.emit('deckShuffled', data);
            } catch (error) {
                this.logger.error('Erro ao embaralhar o baralho: ', error);
            }
        }
    }

    // Distribuindo cartas
    @SubscribeMessage('distributeCards')
    async distributeCards(): Promise<void> {
        if (this.gameState.deckId) {
            try {
                const response = await fetch(
                    `https://truco-blnx.onrender.com/truco/${this.gameState.deckId}/distribuir`
                );
                const data = await response.json();

                // Log para depuração: mostrar o tipo e valor de data.manilha
                this.logger.log("Tipo de data.manilha: " + typeof data.manilha);
                this.logger.log("Valor de data.manilha: " + JSON.stringify(data.manilha));

                let manilhasAtualizadas: string[] = [];
                // Se data.manilha for uma string, cria as manilhas correspondentes
                const manilhaStr = data.manilha.toUpperCase();
                const manilhaSemUltimaLetra = manilhaStr.slice(0, -1);
                this.logger.error(manilhaStr);
                this.logger.error("Valor de data.manilha: " + manilhaSemUltimaLetra);
                manilhasAtualizadas = [
                    manilhaSemUltimaLetra + "D", // Copas
                    manilhaSemUltimaLetra + "S", // Espadas
                    manilhaSemUltimaLetra + "H", // Copas
                    manilhaSemUltimaLetra + "C", // Ouros
                ];
                // Atualizando as manilhas no estado do jogo
                this.gameState.shackles = manilhasAtualizadas.map((card: string) => ({
                    id: card,
                    src: `${card}.png`,
                }));

                // Atualizando as mãos dos jogadores
                this.gameState.players = this.gameState.players.map((player, index) => {
                    const playerCards = data[`jogador${index + 1}`] || [];
                    const playerHand = playerCards.map(
                        (card: string) => `${card.toLowerCase()}.png`
                    );
                    return {
                        ...player,
                        hand: playerHand,
                        originalHand: [...playerHand],
                    };
                });

                this.server.emit('cardsDistributed', this.gameState.players, this.gameState.shackles);
            } catch (error) {
                this.logger.error('Erro ao distribuir as cartas: ', error);
            }
        }
    }

    // Lógica para jogar uma carta
    @SubscribeMessage('playCard')
    playCard(
        client: Socket,
        payload: { playerId: number; cardIndex: number },
    ): void {
        const player = this.gameState.players.find(
            (p) => p.id === payload.playerId,
        );
        if (!player) return;

        const selectedCard = player.hand[payload.cardIndex];
        if (!selectedCard) return;

        // Remover a carta da mão do jogador
        player.hand = player.hand.filter((_, index) => index !== payload.cardIndex);

        // Adicionar a carta à mesa
        this.gameState.table.push({
            card: selectedCard,
            position: player.position,
        });

        // Verificar se 3 jogadores jogaram cartas
        if (this.gameState.table.length === 3) {
            this.determineRoundWinner();
        }

        // Enviar a mesa atualizada para todos os clientes
        this.server.emit('tableUpdated', this.gameState.table);
    }

    // Determina o vencedor da rodada
    determineRoundWinner(): void {
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

        // Função para obter o valor de uma carta
        const getCardValue = (cardImage: string): string => {
            const match = cardImage.match(/card(\d+|[kqja])/);
            if (cardImage.includes('card-back')) {
                return 'card-back';
            }
            return match ? match[1].toUpperCase() : '';
        };

        // Função para obter o naipe de uma carta
        const getCardSuit = (cardImage: string): string => {
            const match = cardImage.match(/(\d+)([dshc])\.png/);
            return match ? match[2] : '';
        };

        let winningCards = [this.gameState.table[0]];
        let hasShackle = this.gameState.shackles.some((shackle) =>
            shackle.id.includes(
                getCardValue(this.gameState.table[0].card).toLowerCase(),
            ),
        );

        for (let i = 1; i < this.gameState.table.length; i++) {
            const currentCardValue = getCardValue(this.gameState.table[i].card);
            const currentCardSuit = getCardSuit(this.gameState.table[i].card);
            const winningCardValue = getCardValue(winningCards[0].card);
            const winningCardSuit = getCardSuit(winningCards[0].card);

            const isCurrentShackle = this.gameState.shackles.some((shackle) =>
                shackle.id.includes(currentCardValue.toLowerCase()),
            );

            if (isCurrentShackle) {
                if (!hasShackle) {
                    winningCards = [this.gameState.table[i]];
                    hasShackle = true;
                } else {
                    const naipeForca = ['o', 'e', 'c', 'p'];
                    if (
                        naipeForca.indexOf(currentCardSuit) >
                        naipeForca.indexOf(winningCardSuit)
                    ) {
                        winningCards = [this.gameState.table[i]];
                    } else if (
                        naipeForca.indexOf(currentCardSuit) ===
                        naipeForca.indexOf(winningCardSuit)
                    ) {
                        winningCards.push(this.gameState.table[i]);
                    }
                }
            } else if (!hasShackle) {
                const currentForce = force.indexOf(currentCardValue);
                const winningForce = force.indexOf(winningCardValue);

                if (currentForce > winningForce) {
                    winningCards = [this.gameState.table[i]];
                } else if (currentForce === winningForce) {
                    winningCards.push(this.gameState.table[i]);
                }
            }
        }

        let winningTeam;

        if (winningCards.length > 1) {
            winningTeam = 'empate';
        } else {
            winningTeam =
                winningCards[0].position === 'bottom' ||
                winningCards[0].position === 'top'
                    ? '1'
                    : '2';
        }

        this.addPoints(winningTeam);
        this.gameState.table = []; // Limpar a mesa após a rodada
    }

    // Adicionar pontos ao time vencedor
    addPoints(team: string): void {
        const winningTeam = team === '1' ? 1 : team === '2' ? 2 : 3;

        this.gameState.score.winners[this.gameState.score.rounds] = winningTeam;

        // Atualizando a pontuação do jogo
        if (this.gameState.score.rounds < 3) {
            this.gameState.score.rounds++;
        }

        // Verificando se algum time atingiu a pontuação final
        if (this.gameState.score.rounds === 3) {
            if (this.gameState.score.winners.filter((w) => w === 1).length > 1) {
                this.gameState.overallScore.nos++;
            } else if (
                this.gameState.score.winners.filter((w) => w === 2).length > 1
            ) {
                this.gameState.overallScore.eles++;
            }

            this.resetRound();
        }
    }

    // Resetar a rodada
    resetRound(): void {
        this.gameState.score.rounds = 0;
        this.gameState.score.winners = [0, 0, 0];
        this.server.emit('roundReset');
    }

    // Inicialização
    afterInit(server: Server) {
        this.logger.log('WebSocket gateway inicializado');
    }

    // Conexão com o cliente
    handleConnection(client: Socket) {
        this.logger.log(`Cliente conectado: ${client.id}`);
    }

    // Desconexão do cliente
    handleDisconnect(client: Socket) {
        this.logger.log(`Cliente desconectado: ${client.id}`);
    }
}