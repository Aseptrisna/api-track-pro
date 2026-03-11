import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    const token = uuidv4();
    await this.usersService.setVerificationToken(user._id.toString(), token);
    try {
      await this.mailService.sendVerificationEmail(user.email, token);
    } catch (e) {
      console.log('Email sending failed, but registration succeeded');
    }
    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');
    const payload = { sub: user._id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) throw new BadRequestException('Invalid verification token');
    await this.usersService.setEmailVerified(user._id.toString());
    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return { message: 'If the email exists, a reset link will be sent.' };
    const token = uuidv4();
    await this.usersService.setPasswordResetToken(user._id.toString(), token);
    try {
      await this.mailService.sendPasswordResetEmail(email, token);
    } catch (e) {
      console.log('Email sending failed');
    }
    return { message: 'If the email exists, a reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    await this.usersService.resetPassword(user._id.toString(), newPassword);
    return { message: 'Password reset successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.isEmailVerified) throw new BadRequestException('Email already verified');
    const token = uuidv4();
    await this.usersService.setVerificationToken(user._id.toString(), token);
    await this.mailService.sendVerificationEmail(email, token);
    return { message: 'Verification email resent' };
  }

  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
