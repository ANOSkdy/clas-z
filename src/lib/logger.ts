import pino from 'pino';

// 開発環境では見やすく整形、本番ではJSON形式
const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
});
