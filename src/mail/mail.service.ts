import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const appUrl = this.configService.get('APP_URL', 'http://localhost:5173');
    const url = `${appUrl}/verify-email?token=${token}`;
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM', 'noreply@fleetmonitor.com'),
      to: email,
      subject: 'Verify Your Email - Fleet Monitor',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Welcome to Smart Fleet Monitor!</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
          <p style="color: #6B7280; margin-top: 20px;">If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const appUrl = this.configService.get('APP_URL', 'http://localhost:5173');
    const url = `${appUrl}/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM', 'noreply@fleetmonitor.com'),
      to: email,
      subject: 'Reset Password - Fleet Monitor',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Reset Your Password</h2>
          <p>Click the button below to reset your password:</p>
          <a href="${url}" style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p style="color: #6B7280; margin-top: 20px;">This link expires in 1 hour.</p>
        </div>
      `,
    });
  }

  async sendAlertEmail(email: string, subject: string, message: string) {
    await this.transporter.sendMail({
      from: this.configService.get('MAIL_FROM', 'noreply@fleetmonitor.com'),
      to: email,
      subject: `Alert: ${subject} - Fleet Monitor`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #EF4444;">⚠️ Fleet Alert</h2>
          <p>${message}</p>
        </div>
      `,
    });
  }
}
