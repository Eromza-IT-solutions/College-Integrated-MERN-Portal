import request from 'supertest'
import app from '../src/app.js'

describe('GET /api/v1/health', () => {
  it('returns a healthy response', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
    expect(res.headers['x-request-id']).toBeTruthy()
  })
})
