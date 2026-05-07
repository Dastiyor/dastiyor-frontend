type StepProps = {
    onNext: (data: any) => void;
    onBack: () => void;
    data: any;
};

export default function Step3Location({ onNext, onBack, data }: StepProps) {
    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '32px' }}>Where is the task location?</h2>

            <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                onNext({
                    city: formData.get('city'),
                    address: formData.get('address'),
                });
            }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>City or District</label>
                    <select
                        name="city"
                        defaultValue={data.city || 'Dushanbe'}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                            backgroundColor: 'var(--white)',
                        }}
                    >
                        <option value="Dushanbe">Dushanbe</option>
                        <option value="Khujand">Khujand</option>
                        <option value="Bokhtar">Bokhtar</option>
                        <option value="Remote">Remote / Online</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>Address (Optional)</label>
                    <input
                        name="address"
                        defaultValue={data.address}
                        placeholder="e.g., Rudaki Ave 12, Apt 4"
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
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
}
