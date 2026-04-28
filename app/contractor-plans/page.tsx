export default function ContractorPlansPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '1000px', textAlign: 'center' }}>
            <h1 className="heading-lg">Contractor Plans</h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-light)', marginBottom: '60px' }}>
                Choose the best plan to grow your business.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border)' }}>
                    <h3 className="heading-md">Basic</h3>
                    <div style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '24px' }}>Free</div>
                    <ul style={{ textAlign: 'left', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li>✅ 5 Responses / month</li>
                        <li>✅ Basic Profile</li>
                        <li>❌ Priority Support</li>
                    </ul>
                    <button className="btn btn-outline" style={{ width: '100%' }}>Current Plan</button>
                </div>

                <div style={{ padding: '40px', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '24px', transform: 'scale(1.05)' }}>
                    <h3 className="heading-md" style={{ color: 'white' }}>Pro</h3>
                    <div style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '24px' }}>349 <span style={{ fontSize: '1.25rem', fontWeight: '600' }}>TJS</span><span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/мес</span></div>
                    <ul style={{ textAlign: 'left', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li>✅ Unlimited Responses</li>
                        <li>✅ Verified Badge</li>
                        <li>✅ Priority Support</li>
                    </ul>
                    <button className="btn" style={{ width: '100%', backgroundColor: 'white', color: 'var(--primary)' }}>Upgrade Now</button>
                </div>
            </div>
        </div>
    );
}
