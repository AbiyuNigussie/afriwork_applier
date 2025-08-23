import { getGroqChat } from '../integrations/llm/groqClient.js';
import { stripHtml } from '../utils/text.js';
import { fetchJobById } from '../integrations/graphql/client.js';
import { getJobPreferences } from '../repositories/jobPreferencesRepo.js';
import { getUserProfile } from '../repositories/userProfileRepo.js';

export async function generateCoverLetterForJobId(jobId, chatId) {
  const job = await fetchJobById(jobId);
  if (!job) throw new Error('Job not found');
  const prefs = await getJobPreferences();
  const profile = await getUserProfile(chatId);

  const desc = stripHtml(job.description || '').trim();
  const skills = (job.skill_requirements || []).map(s => s?.skill?.name).filter(Boolean);
  const sectors = (job.sectors || []).map(s => s?.sector?.name).filter(Boolean);
  const city = job.city?.name || '';
  const country = job.city?.country?.name || '';

  const system = `You are an assistant that drafts concise, professional cover letters.
- Personalize to the role and company.
- Reference only provided details. Do not invent facts.
- Keep it within 900-999 characters.
- Use a confident but humble tone.
- Use British English.
`;

  const user = {
    job: {
      applier_name: "Abiyu Nigussie",
      title: job.title,
      company: job.entity?.name,
      experience_level: job.experience_level,
      job_type: job.job_type,
      job_site: job.job_site,
      compensation_type: job.compensation_type,
      city,
      country,
      sectors,
      skills,
      description: desc,
    },
    preferences: prefs,
  user_profile: profile ? { experience_text: profile.experience_text } : undefined,
  };

  const prompt = [
    ['system', system],
    ['user', `Write a tailored cover letter for the following job JSON. Focus on matching responsibilities and required skills.\n\nJOB:\n${JSON.stringify(user, null, 2)}`],
  ];

  const chat = getGroqChat();
  const messages = prompt.map(([role, content]) => ({ role, content }));
  const res = await chat.invoke(messages);
  const text = res?.content?.toString?.() || (Array.isArray(res?.content) ? res.content.map(p=>p.text||'').join('\n') : '') || '';
  return text.trim();
}
