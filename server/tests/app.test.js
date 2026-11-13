import request from 'supertest'
import app from '../src/app.js'

describe('app', () => {
  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
    expect(['connected', 'disconnected']).toContain(res.body.data.database)
  })

  it('unknown route returns 404 in the standard error shape', async () => {
    const res = await request(app).get('/api/v1/nope')

    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.meta.requestId).toBeTruthy()
  })

  it('security headers are set', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.headers['x-content-type-options']).toBeTruthy()
    expect(res.headers['x-powered-by']).toBeUndefined()
  })
})
