import fetch from 'cross-fetch';
import { GRAPHQL_ENDPOINT, AFRIWORK_BEARER_TOKEN, AFRIWORK_ORIGIN_PLATFORM_ID, HASURA_ANON_ROLE } from '../config/constants.js';
import { AFRIWORK_LOGIN_EMAIL, AFRIWORK_LOGIN_PASSWORD } from '../config/constants.js';
let currentBearerToken = AFRIWORK_BEARER_TOKEN;

// Refreshes the bearer token using login mutation
export async function refreshBearerToken() {
  if (!AFRIWORK_LOGIN_EMAIL || !AFRIWORK_LOGIN_PASSWORD) {
    throw new Error('Missing AFRIWORK_LOGIN_EMAIL or AFRIWORK_LOGIN_PASSWORD environment variables');
  }
  const loginBody = {
    operationName: 'login',
    query: `mutation login($email: String!, $password: String!) {\n  login(user: {email_or_phone: $email, password: $password}) {\n    user_metadata {\n      id\n      pic\n      full_name\n      __typename\n    }\n    token\n    refresh_token\n    __typename\n  }\n}`,
    variables: {
      email: AFRIWORK_LOGIN_EMAIL,
      password: AFRIWORK_LOGIN_PASSWORD,
    },
  };
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-role': HASURA_ANON_ROLE || 'anonymous',
    },
    body: JSON.stringify(loginBody),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Invalid login response: ' + text.slice(0, 500)); }
  if (!res.ok || json.errors) {
    throw new Error('Login error: ' + (json.errors ? JSON.stringify(json.errors) : `${res.status} ${res.statusText}`));
  }
  const token = json.data?.login?.token;
  if (!token) throw new Error('No token returned from login mutation');
  currentBearerToken = token;
  return token;
}

const APPLY_MUTATION = `mutation ApplyToJob($application: JobApplicationInput!, $job_id: uuid!, $origin_platform_id: uuid!, $telegramUserName: String) {
  apply_to_job(
    application: $application
    job_id: $job_id
    origin_platform_id: $origin_platform_id
    telegram_username: $telegramUserName
  ) {
    application_id
    __typename
  }
}`;

export async function applyViaApi({ jobId, coverLetter, telegramUsername }) {
  if (!currentBearerToken) {
    await refreshBearerToken();
  }
  if (!AFRIWORK_ORIGIN_PLATFORM_ID) {
    throw new Error('AFRIWORK_ORIGIN_PLATFORM_ID not set.');
  }
  const body = {
    operationName: 'ApplyToJob',
    query: APPLY_MUTATION,
    variables: {
      application: { cover_letter: coverLetter },
      job_id: jobId,
      origin_platform_id: AFRIWORK_ORIGIN_PLATFORM_ID,
      telegramUserName: telegramUsername,
    },
  };

  let res, text, json;
  try {
    res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-role': 'job_seeker',
        authorization: `Bearer ${currentBearerToken}`,
      },
      body: JSON.stringify(body),
    });
    text = await res.text();
    try { json = JSON.parse(text); } catch { json = undefined; }
    const hasErrors = !res.ok || (json && json.errors);
    if (hasErrors) {
      // Check for authentication error by status or graphql errors
      const statusAuth = res.status === 401 || res.status === 403;
      const gqlAuth = json?.errors?.some(e => (e.extensions?.code === 'access-denied' || (e.message && /Authentication hook unauthorized/i.test(e.message))));
      if (statusAuth || gqlAuth) {
        await refreshBearerToken();
        // Retry once with new token
        res = await fetch(GRAPHQL_ENDPOINT, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-hasura-role': 'job_seeker',
            authorization: `Bearer ${currentBearerToken}`,
          },
          body: JSON.stringify(body),
        });
        text = await res.text();
        try { json = JSON.parse(text); } catch { json = undefined; }
        if (!res.ok || (json && json.errors)) {
          throw new Error('Apply error after refresh: ' + (json?.errors ? JSON.stringify(json.errors) : `${res.status} ${res.statusText}`));
        }
      } else {
        throw new Error('Apply error: ' + (json?.errors ? JSON.stringify(json.errors) : `${res.status} ${res.statusText}`));
      }
    }
  } catch (err) {
    throw err;
  }
  return json.data.apply_to_job;
}
