import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainRestrictionMiddleware } from './middleware/domain-restriction.middleware';
import { ApiKeyMiddleware } from './middleware/api-key.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use(new DomainRestrictionMiddleware().use);
  app.use(new ApiKeyMiddleware().use);

  await app.listen(3000);
}
bootstrap();
