import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    private gameState;
    createDeck(): Promise<void>;
    shuffleDeck(): Promise<void>;
    distributeCards(): Promise<void>;
    playCard(client: Socket, payload: {
        playerId: number;
        cardIndex: number;
    }): void;
    determineRoundWinner(): void;
    addPoints(team: string): void;
    resetRound(): void;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
}
