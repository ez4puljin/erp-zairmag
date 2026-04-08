export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'default-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'default-refresh-secret',
    expiration: process.env.JWT_EXPIRATION ?? '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },
});
