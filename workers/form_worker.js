/**
 * Module worker: export default with fetch handler so D1 bindings are available via env
 * Uses env.LCHATY_BETA (D1) or falls back to env.SIGNUPS (KV)
 */
export default {
  async fetch(request, env) {
    const logs = []
    logs.push('handler_start')
    if (request.method !== 'POST') {
      logs.push('method_not_allowed')
      return new Response(JSON.stringify({ ok: false, logs }), { status: 405, headers: { 'Content-Type': 'application/json' } })
    }

    const contentType = request.headers.get('content-type') || ''
    let form = {}
    if (contentType.includes('application/json')) {
      form = await request.json()
    } else {
      const fd = await request.formData()
      for (const [k, v] of fd.entries()) form[k] = v
    }

    // Simple honeypot: if populated, silently accept to avoid spam
    if (form._honey) {
      logs.push('honeypot_triggered')
      return new Response(JSON.stringify({ ok: true, logs }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const email = (form.email || '').toString().trim()
    if (!email) return new Response('Missing email', { status: 400 })

    try {
      logs.push('storage_check')
      if (env.LCHATY_BETA) {
        logs.push('using_d1')
        // Try insert, on failure update existing row
        const insertSql = `INSERT INTO signups (email, signup_date, opted_in, beta_approved, notes) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)`
        try {
          logs.push('d1_prepare_insert')
          const res = await env.LCHATY_BETA.prepare(insertSql).bind(email, 1, 0, '').run()
          logs.push('d1_insert_ok')
          logs.push(JSON.stringify(res))
        } catch (e) {
          logs.push('d1_insert_failed')
          logs.push(String(e && e.message ? e.message : e))
          const updateSql = `UPDATE signups SET signup_date = CURRENT_TIMESTAMP, opted_in = 1 WHERE email = ?`
          const res2 = await env.LCHATY_BETA.prepare(updateSql).bind(email).run()
          logs.push('d1_update_ok')
          logs.push(JSON.stringify(res2))
        }
      } else if (env.SIGNUPS) {
        logs.push('using_kv')
        const key = `signup:${Date.now()}:${Math.random().toString(36).slice(2,8)}`
        await env.SIGNUPS.put(key, JSON.stringify({ email, created_at: new Date().toISOString() }))
        logs.push('kv_put_ok')
      } else {
        logs.push('no_storage')
        return new Response(JSON.stringify({ ok: false, logs, error: 'No storage configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
    } catch (err) {
      try { console.error('Signup storage error:', err && err.stack ? err.stack : err) } catch (e) {}
      const msg = err && err.message ? err.message : String(err)
      logs.push('exception')
      logs.push(msg)
      return new Response(JSON.stringify({ ok: false, logs, error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
    logs.push('all_done')
    return new Response(JSON.stringify({ ok: true, logs, email }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}
