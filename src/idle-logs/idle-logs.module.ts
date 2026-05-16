import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdleLog, IdleLogSchema } from './schemas/idle-log.schema';
import { IdleLogsService } from './idle-logs.service';
import { IdleLogsController } from './idle-logs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: IdleLog.name, schema: IdleLogSchema }]),
  ],
  controllers: [IdleLogsController],
  providers:   [IdleLogsService],
  exports:     [IdleLogsService],
})
export class IdleLogsModule {}
