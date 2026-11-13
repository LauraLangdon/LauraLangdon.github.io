/**
 * Ask Ghost to send a signup confirmation email.
 *
 * Ghost 6.53+ rejects signups that don't carry a one-time integrity token
 * from the site, which stops bots that post straight to the signup endpoint.
 * Older Ghost ignores the token, so this is safe to ship before upgrading.
 * Ghost's own Portal signup form does the same two requests.
 */
export async function requestSignup(ghostUrl: string, email: string): Promise<Response> {
	// Each token is single-use, so never reuse a cached one.
	const tokenRes = await fetch(`${ghostUrl}/members/api/integrity-token/`, {
		cache: 'no-store',
	});
	if (!tokenRes.ok) return tokenRes;
	const integrityToken = (await tokenRes.text()).trim();

	return fetch(`${ghostUrl}/members/api/send-magic-link/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, emailType: 'subscribe', integrityToken }),
	});
}
