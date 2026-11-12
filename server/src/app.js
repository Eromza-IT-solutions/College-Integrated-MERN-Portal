import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import env from './config/env.js'
import routes from './routes/index.js'
import { requestId } from './middleware/requestId.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.disable('x-powered-by')
app.use(requestId)
app.use(helmet())
app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(cookieParser())
if (env.nodeEnv === 'development') app.use(morgan('dev'))
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)

app.use('/api/v1', routes)

app.use(notFound)
app.use(errorHandler)

export default app
