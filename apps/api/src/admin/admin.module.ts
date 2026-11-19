import { Module } from '@nestjs/common';
import { AdminAuthController, AdminController } from './admin.controller.js';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';

@Module({
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
