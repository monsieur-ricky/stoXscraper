import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = app.get(ConfigService).getOrThrow<number>('PORT');

  app.enableCors();
  app.enableShutdownHooks();
  // Uncomment the following lines to enable the middlewares
  // app.use(new DomainRestrictionMiddleware().use);
  // app.use(new ApiKeyMiddleware().use);

  await app.listen(port);
}
void bootstrap().catch((error: unknown) => {
  console.error('Application startup failed.', error);
  process.exitCode = 1;
});
