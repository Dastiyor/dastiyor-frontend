/** Full page load after sign-in, so the header and dashboards see the new cookie. */
export async function goToDashboard(): Promise<void> {
    let role: string | null = null;
    try {
        const res = await fetch('/api/profile');
        if (res.ok) role = (await res.json()).user.role;
    } catch {
        // Already signed in: a dropped connection here must not leave the button stuck.
    }
    window.location.href = role === 'PROVIDER' ? '/provider' : role === 'CUSTOMER' ? '/customer' : '/';
}
