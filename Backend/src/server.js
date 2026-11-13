import app from './app.js'
import env from './config/env.js'
import { connectDatabase, disconnectDatabase } from './config/db.js'

async function start() {
  await connectDatabase()

  const server = app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`)
  })

  const shutdown = () => {
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
