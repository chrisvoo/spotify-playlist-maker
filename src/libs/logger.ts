import { createLogger, format, transports } from 'winston'

const LOG_DIR = 'logs';

export default createLogger({
    level: 'info',
    format: format.printf(info => `[${new Date().toISOString().slice(0, 19)}] ${info.level}: ${info.message}`+(info.splat!==undefined?`${info.splat}`:" ")),
    transports: [
      new transports.File({
        filename: `${LOG_DIR}/spm.log`,
      }),
      new transports.Console()
    ],
  });