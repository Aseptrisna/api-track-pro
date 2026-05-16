import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TeamController } from './team.controller';

@Module({
  imports: [UsersModule],
  controllers: [TeamController],
})
export class TeamModule {}
