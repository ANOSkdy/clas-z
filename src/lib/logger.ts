const serialize = (message: string, meta?: unknown) =>
  JSON.stringify(meta ? { message, meta } : { message });

const log = (level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: unknown) => {
  const payload = serialize(message, meta);

  switch (level) {
    case 'info':
      console.info(payload);
      break;
    case 'warn':
      console.warn(payload);
      break;
    case 'debug':
      if (process.env.NODE_ENV !== 'production') {
        console.debug(payload);
      }
      break;
    case 'error':
    default:
      console.error(payload);
      break;
  }
};

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};
