/** Full page load after sign-in, so the header and dashboards see the new cookie. */
export async function goToDashboard(): Promise<void> {
    const res = await fetch('/api/profile');
    const role = res.ok ? (await res.json()).user.role : null;
    window.location.href = role === 'PROVIDER' ? '/provider' : role === 'CUSTOMER' ? '/customer' : '/';
}
