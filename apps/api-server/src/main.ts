import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', true);
  app.enableCors();
  app.setGlobalPrefix('api', {
    exclude: ['R4consulta', 'R4notifica'],
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
