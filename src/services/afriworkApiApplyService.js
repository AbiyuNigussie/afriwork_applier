import fetch from 'cross-fetch';
import { GRAPHQL_ENDPOINT, AFRIWORK_BEARER_TOKEN, AFRIWORK_ORIGIN_PLATFORM_ID } from '../config/constants.js';

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
  if (!AFRIWORK_BEARER_TOKEN) {
    throw new Error('AFRIWORK_BEARER_TOKEN not set.');
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

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-role': 'job_seeker',
      authorization: `Bearer ${AFRIWORK_BEARER_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Invalid response: ' + text.slice(0, 500)); }
  if (!res.ok || json.errors) {
    throw new Error('Apply error: ' + (json.errors ? JSON.stringify(json.errors) : `${res.status} ${res.statusText}`));
  }
  return json.data.apply_to_job;
}
