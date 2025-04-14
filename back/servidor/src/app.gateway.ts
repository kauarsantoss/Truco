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
  private connectedPlayers: { socketId: string; playerId: number }[] = [];
  private isRequesting = false;

  // Criação de novo baralho
  @SubscribeMessage('newDeck')
  async createDeck(): Promise<void> {
    if (this.isRequesting) return;
    this.isRequesting = true;
    try {
      const response = await fetch(
          'https://truco-blnx.onrender.com/truco/newDeck',
      );
      const data = await response.json();
      this.gameState.deckId = data.deck_id;
      this.server.emit('deckCreated', data);
    } catch (error) {
      this.logger.error('Erro ao criar o baralho: ', error);
    } finally {
      this.isRequesting = false;
    }
  }

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
    /*    if (this.gameState.players.every((player) => player.hand.length > 0)) {
      this.logger.warn('Cartas já foram distribuídas.');
      return;
    }*/

    if (this.connectedPlayers.length < 4) {
      this.logger.warn('Ainda não há 4 jogadores conectados. Aguardando...');
      return;
    }

    if (this.gameState.deckId) {
      try {
        const response = await fetch(
            `https://truco-blnx.onrender.com/truco/${this.gameState.deckId}/distribuir`,
        );
        const data = await response.json();

        if (!data || !data.manilha) {
          this.logger.error('Resposta inválida da API:', data);
          return;
        }

        this.logger.debug('Valor recebido para manilha:', data.manilha);

        let manilhasAtualizadas: string[] = [];
        const manilhaStr = data.manilha.toUpperCase();
        const manilhaSemUltimaLetra = manilhaStr.slice(0, -1);
        manilhasAtualizadas = [
          manilhaSemUltimaLetra + 'D',
          manilhaSemUltimaLetra + 'S',
          manilhaSemUltimaLetra + 'H',
          manilhaSemUltimaLetra + 'C',
        ];

        this.gameState.shackles = manilhasAtualizadas.map((card: string) => ({
          id: card,
          src: `${card}.png`,
        }));

        // Atualizando as mãos dos jogadores
        this.gameState.players = this.gameState.players.map((player, index) => {
          const playerCards = data[`jogador${index + 1}`] || [];
          const playerHand = playerCards.map(
              (card: string) => `${card.toLowerCase()}.png`,
          );

          return {
            ...player,
            hand: playerHand,
            originalHand: [...playerHand],
          };
        });

        this.server.emit(
            'cardsDistributed',
            this.gameState.players,
            this.gameState.shackles,
        );

        // Enviando cartas individualmente para cada jogador
        this.connectedPlayers.forEach(({ socketId, playerId }) => {
          const player = this.gameState.players.find((p) => p.id === playerId);
          if (!player) return;

          // Criar uma versão mascarada das mãos para os outros jogadores
          const maskedHands = this.gameState.players.map((p) => ({
            id: p.id,
            hand:
                p.id === playerId
                    ? p.hand
                    : Array(p.hand.length).fill('card-back'),
            position: p.position,
          }));

          // Emitir apenas para o jogador específico
          this.server.to(socketId).emit('cardsDistributed', maskedHands);
        });

        // Emitir as manilhas para todos os jogadores
        this.server.emit('shuffleDistributed', {
          shackles: this.gameState.shackles,
        });
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
    this.logger.log(
        `Jogador ${player.id} jogando carta no índice: ${payload.cardIndex}`,
    );
    this.logger.log(`Mão atual: ${JSON.stringify(player.hand)}`);
    if (!selectedCard) return;

    const initialTableLength = this.gameState.table.length;
    player.hand = player.hand.filter((_, index) => index !== payload.cardIndex);
    this.logger.log(`Mão após remoção: ${JSON.stringify(player.hand)}`);

    // Adicionar a carta à mesa
    this.gameState.table.push({
      card: selectedCard,
      position: player.position,
    });

    // Emitir ambos os eventos: a atualização da mesa e da mão do jogador
    this.server.emit('tableUpdated', this.gameState.table);
    // Emitir apenas para o jogador correto
    const playerSocket = this.connectedPlayers.find(
        (p) => p.playerId === payload.playerId,
    );
    if (playerSocket) {
      this.server.emit('playerHandUpdated', {
        playerId: player.id,
        hand: player.hand,
      });
    }

    // Verificar se o jogador jogou a manilha
    if (
        this.gameState.shackles.some((shackle) => shackle.id === selectedCard)
    ) {
      this.determineRoundWinner();
      return;
    }

    // Verificar se 4 jogadores jogaram cartas
    if (this.gameState.table.length == 4) {
      this.determineRoundWinner();
      return;
    }
  }

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

    const getCardValue = (cardImage: string): string => {
      const match = cardImage.match(/(\d+|[kqja])([dshc])\.png/);
      return match ? match[1].toLowerCase() : '';
    };

    const getCardSuit = (cardImage: string): string => {
      const match = cardImage.match(/(\d+|[kqja])([dshc])\.png/);
      return match ? match[2] : '';
    };

    let winningCards = [this.gameState.table[0]];

    for (let i = 1; i < this.gameState.table.length; i++) {
      const currentCard = this.gameState.table[i];
      const currentCardValue = getCardValue(currentCard.card).toUpperCase();
      const currentCardSuit = getCardSuit(currentCard.card).toUpperCase();
      const winningCardValue = getCardValue(winningCards[0].card).toUpperCase();
      const winningCardSuit = getCardSuit(winningCards[0].card).toUpperCase();

      const isCurrentShackle = this.gameState.shackles.some((shackle) =>
          shackle.id.includes(currentCardValue + currentCardSuit),
      );

      const isWinningShackle = this.gameState.shackles.some((shackle) =>
          shackle.id.includes(winningCardValue + winningCardSuit),
      );

      if (isCurrentShackle) {
        this.logger.error(
            'É uma manilha: ' + currentCardValue + currentCardSuit,
        );

        if (!isWinningShackle) {
          // Se ainda não há uma manilha vencendo, esta se torna a vencedora
          winningCards = [currentCard];
        } else {
          // Se já há uma manilha, compara pelo naipe
          const suitPriority = ['D', 'S', 'H', 'C']; // Ouros > Espadas > Copas > Paus

          const currentSuitIndex = suitPriority.indexOf(
              currentCardSuit.toUpperCase(),
          );
          const winningSuitIndex = suitPriority.indexOf(
              winningCardSuit.toUpperCase(),
          );

          if (currentSuitIndex > winningSuitIndex) {
            winningCards = [currentCard];
          }
        }
        continue;
      }

      if (!isWinningShackle) {
        const currentForce = force.indexOf(currentCardValue);
        const winningForce = force.indexOf(winningCardValue);

        // Adiciona logs para depuração
        this.logger.error(
            `Comparando forças: ${currentCardValue}(${currentForce}) vs ${winningCardValue}(${winningForce})`,
        );

        // Se alguma carta não for encontrada na lista, evita comparações erradas
        if (currentForce === -1 || winningForce === -1) {
          this.logger.error('Erro: Carta não encontrada na lista de forças!');
          continue;
        }

        if (currentForce > winningForce) {
          winningCards = [currentCard];
        } else if (currentForce === winningForce) {
          winningCards.push(currentCard);
        }
      }
    }

    const uniqueCardValues = new Set(
        winningCards.map((c) => getCardValue(c.card)),
    );

    // Verifica se há empate de valores E se as cartas empatadas são de times diferentes
    const differentTeams =
        winningCards.some(
            (c) => c.position === 'bottom' || c.position === 'top',
        ) &&
        winningCards.some((c) => c.position === 'left' || c.position === 'right');

    if (
        winningCards.length > 1 &&
        uniqueCardValues.size === 1 &&
        differentTeams
    ) {
      this.addPoints('empate');
    } else {
      const winningTeam =
          winningCards[0].position === 'bottom' ||
          winningCards[0].position === 'top'
              ? '1'
              : '2';
      this.addPoints(winningTeam);
    }

    this.logger.debug(
        `Vencedor da rodada: ${winningCards.length > 1 ? 'Empate' : `Time ${winningCards[0].position}`}`,
    );
    this.gameState.table = []; // Limpar a mesa após a rodada
    this.server.emit('tableUpdated', []);
  }

  // Adicionar pontos ao time vencedor
  addPoints(team: string): void {
    const winningTeam = team === '1' ? 1 : team === '2' ? 2 : 3;

    // Atualizar apenas a rodada atual sem sobrescrever rodadas futuras
    if (this.gameState.score.rounds < 3) {
      this.gameState.score.winners[this.gameState.score.rounds] = winningTeam;
      this.gameState.score.rounds++;
    }

    this.logger.debug(
        `Placar Da Rodada Atualizado: ${JSON.stringify(this.gameState.score)}`,
    );
    this.logger.debug(
        `Placar Geral: ${JSON.stringify(this.gameState.overallScore)}`,
    );

    this.server.emit('updateScore', {
      score: this.gameState.score || { rounds: 0, winners: [0, 0, 0] },
    });

    this.determineGameWinner(this.gameState.score);
    // Verificação do fim da partida
    if (this.gameState.score.rounds === 3) {
      const nosWins = this.gameState.score.winners.filter(
          (w) => w === 1,
      ).length;
      const elesWins = this.gameState.score.winners.filter(
          (w) => w === 2,
      ).length;

      this.resetRound();
      this.logger.debug(
          `Time vencedor do jogo: ${nosWins > 1 ? 'Nos' : elesWins > 1 ? 'Eles' : 'Empate'}`,
      );
      this.logger.debug(
          `GameState Score: ${JSON.stringify(this.gameState.score)}`,
      );
      this.logger.debug(
          `GameState OverallScore: ${JSON.stringify(this.gameState.overallScore)}`,
      );
    }
  }

  determineGameWinner(score: { rounds: number; winners: number[] }): void {
    this.logger.error('pqpq scorre.rounds:', score.rounds);
    this.logger.error('pqpq scorre.winners:', score.winners);
    if (score.rounds >= 2 && score.winners[0] === 3) {
      if (score.winners[1] === 1) {
        this.gameState.overallScore.nos++;
        this.server.emit('teste', {
          overallScore: this.gameState.overallScore,
        });
        if (
            this.gameState.overallScore.eles == 12 ||
            this.gameState.overallScore.nos == 12
        ) {
          this.resetGame();
        }
      } else if (score.winners[1] === 2) {
        this.gameState.overallScore.eles++;
        this.server.emit('teste', {
          overallScore: this.gameState.overallScore,
        });
        if (
            this.gameState.overallScore.eles == 12 ||
            this.gameState.overallScore.nos == 12
        ) {
          this.resetGame();
        }
      }

      this.resetRound();
    }

    if (score.rounds === 2 && score.winners[1] === 3) {
      if (score.winners[0] === 1) {
        this.gameState.overallScore.nos++;
        this.server.emit('teste', {
          overallScore: this.gameState.overallScore,
        });
        if (
            this.gameState.overallScore.eles == 12 ||
            this.gameState.overallScore.nos == 12
        ) {
          this.resetGame();
        }
      } else if (score.winners[0] === 2) {
        this.gameState.overallScore.eles++;
        this.server.emit('teste', {
          overallScore: this.gameState.overallScore,
        });
        if (
            this.gameState.overallScore.eles == 12 ||
            this.gameState.overallScore.nos == 12
        ) {
          this.resetGame();
        }
      }
      this.resetRound();
    }

    const nosWins = score.winners.filter((w) => w === 1).length;
    const elesWins = score.winners.filter((w) => w === 2).length;

    let winningTeam;

    if (nosWins === 2) {
      this.gameState.overallScore.nos++;
      winningTeam = 'nos';
      this.server.emit('teste', {
        overallScore: this.gameState.overallScore,
      });
      if (
          this.gameState.overallScore.eles == 12 ||
          this.gameState.overallScore.nos == 12
      ) {
        this.resetGame();
      }
    } else if (elesWins === 2) {
      this.gameState.overallScore.eles++;
      winningTeam = 'eles';
      this.server.emit('teste', {
        overallScore: this.gameState.overallScore,
      });
      if (
          this.gameState.overallScore.eles == 12 ||
          this.gameState.overallScore.nos == 12
      ) {
        this.resetGame();
      }
    }

    if (score.rounds === 3 && score.winners[2] === 3) {
      if (score.winners[0] === 1) {
        this.gameState.overallScore.nos++;
        this.server.emit('teste', {
          overallScore: this.gameState.overallScore,
        });
        if (
            this.gameState.overallScore.eles == 12 ||
            this.gameState.overallScore.nos == 12
        ) {
          this.resetGame();
        }
      } else if (score.winners[0] === 2) {
        this.gameState.overallScore.eles++;
        this.server.emit('teste', {
          overallScore: this.gameState.overallScore,
        });
        if (
            this.gameState.overallScore.eles == 12 ||
            this.gameState.overallScore.nos == 12
        ) {
          this.resetGame();
        }
      }
      this.resetRound();
    }

    this.logger.error('pqpq:', this.gameState.overallScore);
    if (winningTeam) {
      this.server.emit('gameEnded', {
        winner: winningTeam,
        overallScore: this.gameState.overallScore,
      });

      this.resetRound();
    }

    this.server.emit('updateScore', {
      overallScore: this.gameState.overallScore,
      score: this.gameState.score,
    });
  }

  // Resetar a rodada
  resetRound(): void {
    // Resetar placar da rodada
    this.gameState.score.rounds = 0;
    this.gameState.score.winners = [0, 0, 0];

    // Limpar a mesa e as manilhas
    this.gameState.table = [];
    this.gameState.shackles = [];

    // Resetar as mãos dos jogadores
    this.gameState.players = this.gameState.players.map((player) => ({
      ...player,
      hand: [],
      originalHand: [],
    }));

    this.server.emit('roundReset');
    this.server.emit('tableUpdated', []);
    this.server.emit('playerHandsReset');

    // Reembaralhar e redistribuir as cartas
    this.shuffleDeck().then(() => this.distributeCards());
  }

  // Inicialização
  afterInit(server: Server) {
    this.logger.log('WebSocket gateway inicializado');
  }

  // Conexão com o cliente
  handleConnection(client: Socket) {
    if (this.connectedPlayers.length >= 4) {
      this.logger.warn(
          `Cliente ${client.id} tentou se conectar, mas o limite foi atingido.`,
      );
      client.emit('connectionDenied', {
        message:
            'Número máximo de jogadores atingido. Tente novamente mais tarde.',
      });
      client.disconnect();
      return;
    }

    this.logger.log(`Cliente conectado: ${client.id}`);
    setTimeout(() => {
      client.emit('myPlayerId', newPlayerId);
      this.logger.log(`Emitido myPlayerId: ${newPlayerId} para ${client.id}`);
    }, 100);

    const newPlayerId = this.connectedPlayers.length + 1;
    this.connectedPlayers.push({ socketId: client.id, playerId: newPlayerId });
    this.logger.log(`Jogador ${newPlayerId} conectado.`);

    // Quando atingir 4 jogadores, inicia a distribuição das cartas
    if (
        this.connectedPlayers.length === 4 &&
        this.connectedPlayers.length < 4
    ) {
      this.distributeCards();
    }
  }

  resetGame(): void {
    this.logger.log('Resetando o jogo...');

    this.gameState = {
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
        {
          id: 3,
          name: 'Jogador 3',
          hand: [],
          position: 'top',
          originalHand: [],
        },
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

    this.isRequesting = false;

    // Notifica os jogadores para atualizarem o estado
    this.server.emit('gameReset');
  }

  // Desconexão do cliente
  handleDisconnect(client: Socket): void {
    const disconnected = this.connectedPlayers.find(
        (p) => p.socketId === client.id,
    );
    if (disconnected) {
      this.logger.log(
          `Cliente desconectado: ${client.id} (Jogador ${disconnected.playerId})`,
      );
      this.connectedPlayers = this.connectedPlayers.filter(
          (p) => p.socketId !== client.id,
      );
      this.server.emit('playersUpdate', this.connectedPlayers);
    }

    // Se restaram menos de 4 jogadores, reseta o jogo
    if (this.connectedPlayers.length < 4) {
      this.logger.warn('Jogador desconectado. Reiniciando jogo...');

      this.resetGame();

      // Notificar os clientes restantes que o jogo foi resetado
      this.server.emit('gameResetDueToDisconnect', {
        message:
            'Um jogador se desconectou. O jogo será reiniciado quando 4 jogadores estiverem conectados novamente.',
      });
    }
  }
}