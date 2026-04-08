"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const path_1 = require("path");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (origin.includes('localhost') ||
                origin.includes('127.0.0.1') ||
                /^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(origin) ||
                /^https?:\/\/100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(origin)) {
                return callback(null, true);
            }
            const extra = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
            if (extra.includes(origin))
                return callback(null, true);
            callback(null, false);
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads' });
    const port = process.env.PORT ?? 3000;
    await app.listen(Number(port), '0.0.0.0');
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
    console.log(`   Local:    http://localhost:${port}`);
    try {
        const os = require('os');
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name] || []) {
                if (net.family === 'IPv4' && !net.internal) {
                    console.log(`   Network:  http://${net.address}:${port}  (${name})`);
                }
            }
        }
    }
    catch { }
}
bootstrap();
//# sourceMappingURL=main.js.map