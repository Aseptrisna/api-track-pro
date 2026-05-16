import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req,
} from '@nestjs/common';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Get('stats')
  getStats(@Req() req: any) {
    return this.service.getStats(req.user.userId);
  }

  @Get()
  findAll(@Req() req: any, @Query() q: any) {
    return this.service.findAll(req.user.userId, {
      vehicleId: q.vehicleId,
      type:      q.type,
      status:    q.status,
      page:      q.page  ? parseInt(q.page,  10) : 1,
      limit:     q.limit ? parseInt(q.limit, 10) : 25,
    });
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.userId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(id, req.user.userId);
  }
}
