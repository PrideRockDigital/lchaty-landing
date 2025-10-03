/**
 * Module worker: export default with fetch handler so D1 bindings are available via env
 * Uses env.LCHATY_BETA (D1) or falls back to env.SIGNUPS (KV)
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const contentType = request.headers.get('content-type') || ''
    let form = {}
    if (contentType.includes('application/json')) {
      form = await request.json()
    } else {
      const fd = await request.formData()
      for (const [k, v] of fd.entries()) form[k] = v
    }

    // Honeypot: silently succeed for bots
    if (form._honey) return new Response('OK', { status: 200 })

    const email = (form.email || '').toString().trim()
    if (!email) return new Response('Missing email', { status: 400 })

    try {
      if (env.LCHATY_BETA) {
        const insertSql = `INSERT INTO signups (email, signup_date, opted_in, beta_approved, notes) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)`
        try {
          await env.LCHATY_BETA.prepare(insertSql).bind(email, 1, 0, '').run()
        } catch (e) {
          const updateSql = `UPDATE signups SET signup_date = CURRENT_TIMESTAMP, opted_in = 1 WHERE email = ?`
          await env.LCHATY_BETA.prepare(updateSql).bind(email).run()
        }
      } else if (env.SIGNUPS) {
        const key = `signup:${Date.now()}:${Math.random().toString(36).slice(2,8)}`
        await env.SIGNUPS.put(key, JSON.stringify({ email, created_at: new Date().toISOString() }))
      } else {
        return new Response('No storage configured', { status: 500 })
      }
    } catch (err) {
      try { console.error('Signup storage error:', err && err.stack ? err.stack : err) } catch (e) {}
      const msg = err && err.message ? err.message : String(err)
      return new Response(`DEBUG: Failed to store signup: ${msg}`, { status: 500 })
    }

    return Response.redirect('/thank-you.html', 302)
  }
}
