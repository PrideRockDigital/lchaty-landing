addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Simple Cloudflare Worker to accept form submissions and store emails in KV namespace
 * Expects: POST with form field 'email'
 * Configure a KV namespace binding named SIGNUPS
 */
async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const contentType = request.headers.get('content-type') || ''
  let formData
  if (contentType.includes('application/json')) {
    formData = await request.json()
  } else {
    formData = Object.fromEntries(await request.formData())
  }

  const email = (formData.email || '').toString().trim()
  if (!email) {
    return new Response('Missing email', { status: 400 })
  }

  // Try to write into a D1 database if bound (LCHATY_BETA). If not, fall back to KV.
  try {
    if (typeof LCHATY_BETA !== 'undefined' && LCHATY_BETA) {
      // Upsert using a transaction: insert or update opted_in if existing
      const insertSql = `INSERT INTO signups (email, signup_date, opted_in, beta_approved, notes) VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?)`
      try {
        await LCHATY_BETA.prepare(insertSql).bind(email, 1, 0, '').run()
      } catch (e) {
        // If unique constraint fails, perform an update instead
        const updateSql = `UPDATE signups SET signup_date = CURRENT_TIMESTAMP, opted_in = 1 WHERE email = ?`
        await LCHATY_BETA.prepare(updateSql).bind(email).run()
      }
    } else {
      // Use a timestamp-based key to avoid collisions for KV fallback
      const key = `signup:${Date.now()}:${Math.random().toString(36).slice(2,8)}`
      if (typeof SIGNUPS !== 'undefined' && SIGNUPS) {
        await SIGNUPS.put(key, JSON.stringify({ email, created_at: new Date().toISOString() }))
      } else {
        return new Response('No storage configured', { status: 500 })
      }
    }
  } catch (err) {
    return new Response('Failed to store signup', { status: 500 })
  }

  // Redirect to thank-you page
  return Response.redirect('/thank-you.html', 302)
}
