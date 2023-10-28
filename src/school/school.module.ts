import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './subject.entity';
import { Teacher } from './teacher.entity';
import { TrainingController } from './traning.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Subject, Teacher])],
  controllers: [TrainingController],
})
export class SchoolModule {}
