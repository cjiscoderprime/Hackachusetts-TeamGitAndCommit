export async function googleEnabled({ url, key, signal, fetchImpl = fetch }) {
  const response = await fetchImpl(`${url.replace(/\/+$/, '')}/auth/v1/settings`, { headers: { apikey: key }, signal });
  if (!response.ok) throw new Error('Unable to check Google sign-in availability. Please retry or use email.');
  const settings = await response.json();
  return settings.external?.google === true;
}
export async function beginGoogleSignIn(client, origin) {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google', options: { redirectTo: `${origin}/login` },
  });
  if (error) throw error;
  return data;
}
