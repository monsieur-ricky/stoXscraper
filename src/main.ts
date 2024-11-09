import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  app.enableCors();
  // Uncomment the following lines to enable the middlewares
  // app.use(new DomainRestrictionMiddleware().use);
  // app.use(new ApiKeyMiddleware().use);

  await app.listen(port);
}
bootstrap();
