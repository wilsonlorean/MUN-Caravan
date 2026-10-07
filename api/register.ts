const json = (res: any, body: unknown, status = 200) => {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const requiredString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0

const clean = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, { error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !secretKey) {
    console.error('Missing Supabase server environment variables.')
    return json(res, { error: 'Server configuration error.' }, 500)
  }

  // Reject cross-site browser submissions. Direct API clients without an Origin header remain allowed.
  const origin = req.headers.origin
  if (origin) {
    try {
      if (new URL(origin).origin !== `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `https://${req.headers.host}`}`) {
        return json(res, { error: 'Invalid request origin.' }, 403)
      }
    } catch {
      return json(res, { error: 'Invalid request origin.' }, 403)
    }
  }

  let data: Record<string, unknown>
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  } catch {
    return json(res, { error: 'Invalid JSON body.' }, 400)
  }

  // Honeypot for unsophisticated bots. This field is never shown to real users.
  if (requiredString(data.website)) {
    return json(res, { success: true, message: 'Registration received successfully.' }, 201)
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
    return json(res, { error: 'Please complete all required fields.' }, 400)
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json(res, { error: 'Please provide a valid email address.' }, 400)
  }

  if (pathway === 'OBSERVER' && role !== 'Observer') {
    return json(res, { error: 'Invalid observer role.' }, 400)
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/registrations`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      signal: controller.signal,
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

    clearTimeout(timeout)

    if (!response.ok) {
      const details = await response.text()
      console.error('Supabase insert failed:', response.status, details)
      return json(res, { error: 'Unable to save your application. Please try again.' }, 500)
    }

    return json(res, {
      success: true,
      message: 'Registration received successfully',
      applicant: { name, email, pathway, role },
    }, 201)
  } catch (error) {
    clearTimeout(timeout)
    console.error('Registration API failed:', error)
    return json(res, { error: 'Unable to submit your application. Please try again.' }, 500)
  }
}
