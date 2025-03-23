import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrucoService } from './truco.service';
import { TrucoController } from './truco.controller';

@Module({
  imports: [HttpModule],
  providers: [TrucoService],
  controllers: [TrucoController],
})
export class TrucoModule {}
