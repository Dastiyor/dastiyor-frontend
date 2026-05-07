import Link from 'next/link';

type StepProps = {
    onNext: (data: any) => void;
    onBack: () => void;
    data: any;
};

export default function Step4Budget({ onNext, onBack, data }: StepProps) {
    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '32px' }}>What is your budget?</h2>

            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                onNext({
                    budget: formData.get('budget'),
                    amount: formData.get('amount'),
                });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '12px' }}>Budget Type</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{
                            flex: 1,
                            padding: '16px',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: 'var(--white)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <input type="radio" name="budget" value="fixed" defaultChecked={!data.budget || data.budget === 'fixed'} />
                            Fixed Price
                        </label>
                        <label style={{
                            flex: 1,
                            padding: '16px',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: 'var(--white)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <input type="radio" name="budget" value="negotiable" defaultChecked={data.budget === 'negotiable'} />
                            Negotiable
                        </label>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Amount (TJS)</label>
                    <input
                        name="amount"
                        type="number"
                        defaultValue={data.amount}
                        placeholder="e.g., 100"
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </div>

                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#e8f0fe', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                    By publishing details, you agree to our <Link href="/terms" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Terms of Service</Link>.
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={onBack}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                    >
                        Back
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                    >
                        Publish Task
                    </button>
                </div>
            </form>
        </div>
    );
}
