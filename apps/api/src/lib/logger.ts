import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  serializers: {
    req(req: any) {
      return { method: req.method, url: req.url }
    },
    res(res: any) {
      return { status: res.status }
    },
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname,reqId,req,res,user',
        messageFormat: '{msg} {req.method} {req.url} → {res.status} {responseTime}ms{if user} · {user}{end}',
        singleLine: true,
      },
    },
  }),
})
