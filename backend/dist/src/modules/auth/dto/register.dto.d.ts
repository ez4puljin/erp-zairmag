import { Role } from '@prisma/client';
export declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: Role;
    storeName?: string;
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}
