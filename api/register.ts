const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const requiredString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0

const clean = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase server environment variables.')
    return json({ error: 'Server configuration error.' }, 500)
  }

  // Reject cross-site browser submissions. Direct API clients without an Origin header remain allowed.
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(req.url).origin) {
        return json({ error: 'Invalid request origin.' }, 403)
      }
    } catch {
      return json({ error: 'Invalid request origin.' }, 403)
    }
  }

  let data: Record<string, unknown>
  try {
    data = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  // Honeypot for unsophisticated bots. This field is never shown to real users.
  if (requiredString(data.website)) {
    return json({ success: true, message: 'Registration received successfully.' }, 201)
  }

  const pathway = clean(data.pathway, 20)
  const name = clean(data.name, 120)
  const email = clean(data.email, 254).toLowerCase()
  const mobile = clean(data.mobile, 40)
  const telegramUsername = clean(data.telegram_username, 100)
  const role = clean(data.role, 80)
  const munExperience = clean(data.mun_experience, 10)
  const munExperienceDetails = clean(data.mun_experience_details, 2000)
  const debateExperience = clean(data.debate_experience, 10)
  const debateExperienceDetails = clean(data.debate_experience_details, 2000)
  const icjExperience = clean(data.icj_experience, 10)
  const icjExperienceDetails = clean(data.icj_experience_details, 2000)

  if (
    !['PARTICIPANT', 'OBSERVER'].includes(pathway) ||
    !requiredString(name) ||
    !requiredString(email) ||
    !requiredString(mobile) ||
    !requiredString(role) ||
    !['Yes', 'No'].includes(munExperience) ||
    !['Yes', 'No'].includes(debateExperience) ||
    !['Yes', 'No'].includes(icjExperience)
  ) {
    return json({ error: 'Please complete all required fields.' }, 400)
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'Please provide a valid email address.' }, 400)
  }

  if (pathway === 'OBSERVER' && role !== 'Observer') {
    return json({ error: 'Invalid observer role.' }, 400)
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/registrations`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        pathway,
        name,
        email,
        mobile,
        telegram_username: telegramUsername || null,
        role,
        mun_experience: munExperience,
        mun_experience_details: munExperienceDetails || null,
        debate_experience: debateExperience,
        debate_experience_details: debateExperienceDetails || null,
        icj_experience: icjExperience,
        icj_experience_details: icjExperienceDetails || null,
      }),
    })

    if (!response.ok) {
      const details = await response.text()
      console.error('Supabase insert failed:', response.status, details)
      return json({ error: 'Unable to save your application. Please try again.' }, 500)
    }

    return json({
      success: true,
      message: 'Registration received successfully',
      applicant: { name, email, pathway, role },
    }, 201)
  } catch (error) {
    console.error('Registration API failed:', error)
    return json({ error: 'Unable to submit your application. Please try again.' }, 500)
  }
}
