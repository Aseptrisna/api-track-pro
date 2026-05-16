import {
  Controller, Get, Post, Put, Delete,
  Body, Param, HttpCode, ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService, CreateTeamMemberDto } from '../users/users.service';
import { UserRole } from '../users/schemas/user.schema';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Team')
@ApiBearerAuth()
@Controller('team')
export class TeamController {
  constructor(private readonly usersService: UsersService) {}

  private assertOwner(user: any) {
    if (user.isTeamMember) throw new ForbiddenException('Only fleet owners can manage the team');
  }

  @Get()
  @ApiOperation({ summary: 'List team members' })
  findAll(@CurrentUser() user: any) {
    this.assertOwner(user);
    return this.usersService.findTeamMembers(user.actualUserId ?? user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a team member' })
  create(@CurrentUser() user: any, @Body() dto: CreateTeamMemberDto) {
    this.assertOwner(user);
    return this.usersService.createTeamMember(user.actualUserId ?? user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team member role or status' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { role?: UserRole; isActive?: boolean; name?: string },
  ) {
    this.assertOwner(user);
    return this.usersService.updateTeamMember(id, user.actualUserId ?? user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a team member' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    this.assertOwner(user);
    return this.usersService.removeTeamMember(id, user.actualUserId ?? user.userId);
  }
}
