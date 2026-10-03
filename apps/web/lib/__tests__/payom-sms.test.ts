import { isPayomConfigured, isPayomRecipient, sendPayomSMS } from '@/lib/payom-sms';

describe('payom-sms', () => {
  const realFetch = global.fetch;
  const realEnv = process.env;

  beforeEach(() => {
    process.env = { ...realEnv, PAYOM_API_HOST: 'https://api.payom.example/', PAYOM_API_TOKEN: 'tok' };
    delete process.env.PAYOM_SENDER_NAME;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = realEnv;
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  function mockFetch(status: number, json: unknown) {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'Status',
      json: async () => json,
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it('is configured only when both host and token are set', () => {
    expect(isPayomConfigured()).toBe(true);
    delete process.env.PAYOM_API_TOKEN;
    expect(isPayomConfigured()).toBe(false);
  });

  it('accepts only +992 numbers with nine digits', () => {
    expect(isPayomRecipient('+992901234567')).toBe(true);
    expect(isPayomRecipient('+99290123456')).toBe(false);
    expect(isPayomRecipient('+79001234567')).toBe(false);
  });

  it('posts free text with bearer auth and a scheme-less host', async () => {
    const fetchMock = mockFetch(201, { id: 'm1', deliveryStatus: 'SERVICE_ACCEPTED' });

    const res = await sendPayomSMS({ recipient: '+992901234567', text: 'Hello' });

    expect(res).toEqual({ id: 'm1', deliveryStatus: 'SERVICE_ACCEPTED' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.payom.example/api/message');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({
      telephone: '+992901234567',
      senderName: 'Dastiyor',
      type: 'SMS',
      text: 'Hello',
    });
  });

  it('sends a template instead of text when given one', async () => {
    process.env.PAYOM_SENDER_NAME = 'DastiyorTJ';
    const fetchMock = mockFetch(201, { id: 'm2', deliveryStatus: 'SERVICE_ACCEPTED' });

    await sendPayomSMS({ recipient: '+992901234567', template: { id: 'tpl', variables: { code: '1234' } } });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      telephone: '+992901234567',
      senderName: 'DastiyorTJ',
      type: 'SMS',
      templateMessage: { templateId: 'tpl', variables: { code: '1234' } },
    });
  });

  it('throws with the validation detail on a 422', async () => {
    mockFetch(422, { detail: 'telephone: invalid' });
    await expect(sendPayomSMS({ recipient: '+992901234567', text: 'x' }))
      .rejects.toThrow('Payom SMS failed (422): telephone: invalid');
  });

  it('throws with the auth message on a 401', async () => {
    mockFetch(401, { code: 401, message: 'JWT Token not found' });
    await expect(sendPayomSMS({ recipient: '+992901234567', text: 'x' }))
      .rejects.toThrow('Payom SMS failed (401): JWT Token not found');
  });

  it('falls back to the status text when the error body is not JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 502, statusText: 'Bad Gateway',
      json: async () => { throw new Error('not json'); },
    }) as unknown as typeof fetch;
    await expect(sendPayomSMS({ recipient: '+992901234567', text: 'x' }))
      .rejects.toThrow('Payom SMS failed (502): Bad Gateway');
  });

  it('throws without calling the API when unconfigured', async () => {
    delete process.env.PAYOM_API_HOST;
    const fetchMock = mockFetch(201, {});
    await expect(sendPayomSMS({ recipient: '+992901234567', text: 'x' })).rejects.toThrow('configuration missing');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
