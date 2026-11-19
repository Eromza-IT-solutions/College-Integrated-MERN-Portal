import app from './app.js'
import env from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/db.js'
import { describeEmailMode } from './services/emailService.js'
import { startSchedulers } from './jobs/scheduler.js'

async function start() {
  await connectDatabase()
  const scheduler = startSchedulers()

  const server = app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`)
    console.log(`Email: ${describeEmailMode()}`)
  })

  const shutdown = () => {
    scheduler.stop()
    server.close(async () => {
      await disconnectDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((err) => {
  console.error('Failed to start server', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
  process.exit(1)
})
