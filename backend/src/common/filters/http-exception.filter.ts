import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Зарим алдаа нь `code` талбар дамжуулдаг (ж: WAREHOUSE_RETURN_CONFIRM) —
    // клиент үүгээр нь ялган асуулт тавьдаг тул хасалгүй дамжуулна.
    const body: any = typeof message === 'string' ? { message } : message;

    response.status(status).json({
      statusCode: status,
      message: body?.message,
      ...(body?.code ? { code: body.code } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
