// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { JwtModule } from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { User } from '../entities/user.entity';
// import { AuthService } from './auth.service';
// import { AuthController } from './auth.controller';
// import { StringValue } from 'ms';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([User]),
//     JwtModule.registerAsync({
//       imports: [ConfigModule],
//       useFactory: (config: ConfigService) => ({
//         secret: config.get<string>('JWT_SECRET', 'dev-secret'),
//         signOptions: {
//           expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') as StringValue,
//         },
//       }),
//       inject: [ConfigService],
//     }),
//   ],
//   controllers: [AuthController],
//   providers: [AuthService],
// })
// export class AuthModule {}

// // TypeOrmModule.forFeature([User]) — needs the users table
// // JwtModule.registerAsync() — configures JWT with the secret and expiry from .env. The registerAsync version is used because we need to read from ConfigService (environment variables) at runtime, not at compile time.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { StringValue } from 'ms';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // Registers 'jwt' as the default Passport strategy — this is what
    // lets AuthGuard('jwt') (used inside JwtAuthGuard) find JwtStrategy.
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '8h') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

// TypeOrmModule.forFeature([User]) — needs the users table
// JwtModule.registerAsync() — configures JWT with the secret and expiry from .env. The registerAsync version is used because we need to read from ConfigService (environment variables) at runtime, not at compile time.
