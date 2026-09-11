import { Injectable, OnModuleInit, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwt: JwtService,
    private envConfig: ConfigService,
  ) {}

  // ─── Auto-seed admin user on first startup ───
  async onModuleInit() {
    const email = this.envConfig.get<string>('ADMIN_EMAIL', 'admin@bestroadways.com');
    const existing = await this.userRepo.findOne({ where: { email } });

    if (!existing) {
      const password = this.envConfig.get<string>('ADMIN_PASSWORD', 'admin123');
      const passwordHash = await bcrypt.hash(password, 10);

      await this.userRepo.save(
        this.userRepo.create({
          email,
          name: 'BRL Coordinator',
          passwordHash,
          role: 'coordinator',
        }),
      );

      this.logger.log(`Seeded admin user: ${email}`);
    }
  }

  // ─── Login: verify email + password, return JWT ───
  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    const token = this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}


// onModuleInit() — auto-seed admin
// When the server starts for the very first time, there are no users in the database. This method checks if the admin email (from .env) exists. If not, it creates one with the admin password (also from .env), hashed using bcrypt.

// This means you can log in immediately after starting the server for the first time, without needing to manually create a user.

// login(email, password)
// Find the user by email
// Compare the password hash using bcrypt.compare()
// If valid, sign a JWT token containing the user ID, email, and role
// Return the token + user info (without the password hash)
// The frontend stores this token in localStorage and sends it as Authorization: Bearer <token> in every API request.

