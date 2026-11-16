import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import env from './config/env.js'
import { createSessionMiddleware } from './config/session.js'
import './models/index.js' // register every model (some look up others by name)
import routes from './routes/index.js'
import { requestId } from './middleware/requestId.js'
import { originCheck } from './middleware/originCheck.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.disable('x-powered-by')
// Behind a hosting proxy (HTTPS is handled by the proxy) the real client IP and protocol come from its headers.
if (env.nodeEnv === 'production') app.set('trust proxy', 1)
app.use(requestId)
app.use(helmet())
app.use(cors({ origin: env.clientOrigin, credentials: true }))
// rawBody: the webhook signature is checked over the exact bytes that arrived, so keep a copy of them.
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf } }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())
app.use(createSessionMiddleware()) // adds req.session; see config/session.js
if (env.nodeEnv === 'development') app.use(morgan('dev'))
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)

app.use('/api/v1', originCheck(), routes)

app.use(notFound)
app.use(errorHandler)

export default app
