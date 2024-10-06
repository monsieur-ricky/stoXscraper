import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainRestrictionMiddleware } from './middleware/domain-restriction.middleware';
import { ApiKeyMiddleware } from './middleware/api-key.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 10000;

  app.enableCors();
  // Uncomment the following lines to enable the middlewares
  // app.use(new DomainRestrictionMiddleware().use);
  // app.use(new ApiKeyMiddleware().use);

  await app.listen(port);
}
bootstrap();
