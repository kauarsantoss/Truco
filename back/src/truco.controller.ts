import { Controller, Get, Param, Post } from '@nestjs/common';
import { TrucoService } from './truco.service';

@Controller('truco')
export class TrucoController {
  constructor(private readonly trucoService: TrucoService) {}

  @Get('newDeck')
  async criarBaralho() {
    const deckId = await this.trucoService.criarBaralho();
    return { deck_id: deckId };
  }

  @Get(':deckId/distribuir')
  async distribuirCartas(@Param('deckId') deckId: string) {
    return this.trucoService.gerarCartas(deckId);
  }

  @Get(':deckId/embaralhar')
  async embaralharCartas(@Param('deckId') deckId: string){
    return this.trucoService.embaralharCartas(deckId);
  }
}
