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

  // Use a timestamp-based key to avoid collisions
  const key = `signup:${Date.now()}:${Math.random().toString(36).slice(2,8)}`
  try {
    // SIGNUPS is a KV namespace bound in your worker environment
    await SIGNUPS.put(key, JSON.stringify({ email, created_at: new Date().toISOString() }))
  } catch (err) {
    return new Response('Failed to store signup', { status: 500 })
  }

  // Redirect to thank-you page
  return Response.redirect('/thank-you.html', 302)
}
