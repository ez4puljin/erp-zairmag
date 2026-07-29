import { Global, Module } from '@nestjs/common';
import { ExcelService } from './excel.service';

/** Global so any controller can inject ExcelService for .xlsx exports. */
@Global()
@Module({
  providers: [ExcelService],
  exports: [ExcelService],
})
export class ExcelModule {}
