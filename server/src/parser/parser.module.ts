import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationPhrase } from '../entities/classification-phrase.entity';
import { ParserService } from './parser.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClassificationPhrase])],
  providers: [ParserService],
  exports: [ParserService],
})
export class ParserModule {}
