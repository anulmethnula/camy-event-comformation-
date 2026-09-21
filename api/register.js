const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbxN-6p1-OVjMp94mnbw1WEOAjB4eRM16X8KfEtuuwL9owl_jK2hYv0Ex0vmODhiRJGV5A/exec';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Use POST to register.' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid registration data.' });
  }

  const fail = message => res.status(400).json({ success: false, error: message });

  if (!data || typeof data !== 'object') {
    return fail('Registration details are required.');
  }

  for (const [key, max] of [
    ['name', 100],
    ['address', 220],
    ['city', 80],
    ['contact', 20]
  ]) {
    if (
      typeof data[key] !== 'string' ||
      !data[key].trim() ||
      data[key].length > max
    ) {
      return fail('Please check your ' + key + '.');
    }
  }

  const digits = data.contact.replace(/\D/g, '');
  if (
    !/^[+0-9()\s-]+$/.test(data.contact) ||
    digits.length < 9 ||
    digits.length > 15
  ) {
    return fail('Please enter a valid phone number.');
  }

  const guests = Number(data.guests);
  if (!Number.isInteger(guests) || guests < 0 || guests > 20) {
    return fail('Choose between 0 and 20 extra guests.');
  }

  if (data.attendance !== 'Yes') {
    return fail('Please confirm in-person attendance.');
  }

  if (
    typeof data.registrationId !== 'string' ||
    !/^CAMY-[A-Z0-9-]{8,64}$/.test(data.registrationId)
  ) {
    return fail('Invalid registration reference.');
  }

  const payload = {
    registrationId: data.registrationId,
    timestamp: new Date().toISOString(),
    name: data.name.trim(),
    address: data.address.trim(),
    city: data.city.trim(),
    contact: data.contact.trim(),
    guests: String(guests),
    totalAttendees: String(guests + 1),
    attendance: 'Yes',
    event: 'CAMY Community Event',
    eventDate: '04 October 2026'
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const endpoint = process.env.GOOGLE_SCRIPT_URL || DEFAULT_URL;

  async function sendToSheet(values) {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      body: new URLSearchParams(values),
      redirect: 'follow',
      signal: controller.signal
    });

    if (!upstream.ok) {
      throw new Error('Upstream unavailable');
    }

    try {
      return await upstream.json();
    } catch {
      throw new Error('Invalid upstream response');
    }
  }

  try {
    let result = await sendToSheet(payload);

    // Compatibility for an older Apps Script deployment that still required
    // an email even though the public form no longer asks for one.
    if (
      result &&
      result.success !== true &&
      typeof result.error === 'string' &&
      /email/i.test(result.error)
    ) {
      result = await sendToSheet({
        ...payload,
        email: 'not-collected@camy.invalid'
      });
    }

    if (!result || result.success !== true) {
      throw new Error((result && result.error) || 'Sheet write not confirmed');
    }

    if (result.registrationId && result.registrationId !== payload.registrationId) {
      throw new Error('Reference mismatch');
    }

    return res.status(200).json({
      success: true,
      registrationId: payload.registrationId
    });
  } catch (error) {
    console.error('Registration service:', error.name, error.message);
    return res.status(502).json({
      success: false,
      error: 'We could not confirm that your details were saved. Please retry.'
    });
  } finally {
    clearTimeout(timer);
  }
};
