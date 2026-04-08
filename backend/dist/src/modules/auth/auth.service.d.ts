import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    login(dto: LoginDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
            customerId: string | undefined;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<void>;
    getProfile(userId: string): Promise<{
        customer: {
            id: string;
            email: string | null;
            phone: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            storeName: string;
            contactName: string;
            address: string;
            city: string | null;
            latitude: import("@prisma/client-runtime-utils").Decimal | null;
            longitude: import("@prisma/client-runtime-utils").Decimal | null;
            creditLimit: import("@prisma/client-runtime-utils").Decimal;
            outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
            pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
            deletedAt: Date | null;
            userId: string | null;
            customerCategoryId: string | null;
        } | null;
        id: string;
        email: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    private generateTokens;
    private updateRefreshToken;
}
