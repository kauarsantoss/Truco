import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TrucoService {
  constructor(private readonly httpService: HttpService) {}

  async criarBaralho(): Promise<string> {
    const trucoCards = "4D,5D,6D,7D,QD,JD,KD,AD,2D,3D," +
                       "4S,5S,6S,7S,QS,JS,KS,AS,2S,3S," +
                       "4H,5H,6H,7H,QH,JH,KH,AH,2H,3H," +
                       "4C,5C,6C,7C,QC,JC,KC,AC,2C,3C";
    
    const url = `https://www.deckofcardsapi.com/api/deck/new/shuffle/?cards=${trucoCards}`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data.deck_id;
  }

  async gerarCartas(deckId: string): Promise<any> {
    const url = `https://www.deckofcardsapi.com/api/deck/${deckId}/draw/?count=13`;
    const response = await firstValueFrom(this.httpService.get(url));
    
    const cartas = response.data.cards.map((card) => card.code);

    return {
      jogador1: cartas.slice(0, 3),
      jogador2: cartas.slice(3, 6),
      jogador3: cartas.slice(6, 9),
      jogador4: cartas.slice(9, 12),
      manilha: cartas[12]
    };
  }

  async embaralharCartas(deckId: string): Promise<any> {
    const url = `https://www.deckofcardsapi.com/api/deck/${deckId}/shuffle/`;
    const response = await firstValueFrom(this.httpService.post(url));

    return response.data.success;
  }
}
