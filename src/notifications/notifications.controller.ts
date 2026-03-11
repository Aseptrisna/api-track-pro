import { Controller, Get, Put, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get() @ApiOperation({ summary: 'Get user notifications' })
  findAll(@CurrentUser() user: any, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.notificationsService.findByUser(user.userId, page || 1, limit || 20);
  }

  @Get('unread-count') @ApiOperation({ summary: 'Get unread count' })
  getUnreadCount(@CurrentUser() user: any) { return this.notificationsService.getUnreadCount(user.userId); }

  @Put(':id/read') @ApiOperation({ summary: 'Mark as read' })
  markAsRead(@Param('id') id: string) { return this.notificationsService.markAsRead(id); }

  @Put('read-all') @ApiOperation({ summary: 'Mark all as read' })
  markAllAsRead(@CurrentUser() user: any) { return this.notificationsService.markAllAsRead(user.userId); }
}
