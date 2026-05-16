import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'fleet-monitoring-jwt-secret-key-2024'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();

    const ownerRef = (user as any).owner_ref;
    // effectiveOwnerId: for team members, all data queries use the owner's ID
    // This means zero changes needed in any existing controller.
    const effectiveOwnerId = ownerRef ? String(ownerRef) : String(user._id);

    return {
      userId:       effectiveOwnerId,    // used by ALL existing data-access controllers
      actualUserId: String(user._id),    // used only for profile/settings operations
      email:        user.email,
      role:         user.role,
      name:         user.name,
      isTeamMember: !!ownerRef,
    };
  }
}
