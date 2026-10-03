import { sendSMS, sendVerificationCode } from '@/lib/notifications/sms';
import { sendPayomSMS } from '@/lib/payom-sms';
import { sendSMS as sendBrevoSMS } from '@/lib/brevo-sms';

jest.mock('@/lib/payom-sms', () => ({
  ...jest.requireActual('@/lib/payom-sms'),
  sendPayomSMS: jest.fn(),
}));
jest.mock('@/lib/brevo-sms', () => ({ sendSMS: jest.fn() }));

describe('SMS provider routing', () => {
  const realEnv = process.env;

  beforeEach(() => {
    process.env = { ...realEnv, NODE_ENV: 'test', PAYOM_API_HOST: 'h', PAYOM_API_TOKEN: 't' };
    delete process.env.PAYOM_OTP_TEMPLATE_ID;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = realEnv;
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('sends Tajik numbers through Payom', async () => {
    (sendPayomSMS as jest.Mock).mockResolvedValue({ id: 'm1' });
    await expect(sendSMS({ to: '+992901234567', message: 'Hi' })).resolves.toBe(true);
    expect(sendPayomSMS).toHaveBeenCalledWith({ recipient: '+992901234567', text: 'Hi' });
    expect(sendBrevoSMS).not.toHaveBeenCalled();
  });

  it('reports failure when Payom rejects, without retrying on Brevo', async () => {
    (sendPayomSMS as jest.Mock).mockRejectedValue(new Error('401'));
    await expect(sendSMS({ to: '+992901234567', message: 'Hi' })).resolves.toBe(false);
    expect(sendBrevoSMS).not.toHaveBeenCalled();
  });

  it('sends foreign numbers through Brevo', async () => {
    await expect(sendSMS({ to: '+79001234567', message: 'Hi' })).resolves.toBe(true);
    expect(sendBrevoSMS).toHaveBeenCalledWith({ recipient: '+79001234567', body: 'Hi' });
    expect(sendPayomSMS).not.toHaveBeenCalled();
  });

  it('uses Brevo for every number while Payom is unconfigured', async () => {
    delete process.env.PAYOM_API_TOKEN;
    await expect(sendSMS({ to: '+992901234567', message: 'Hi' })).resolves.toBe(true);
    expect(sendBrevoSMS).toHaveBeenCalled();
    expect(sendPayomSMS).not.toHaveBeenCalled();
  });

  it('sends the OTP as free text when no template is configured', async () => {
    (sendPayomSMS as jest.Mock).mockResolvedValue({ id: 'm1' });
    await sendVerificationCode('+992901234567', '4821');
    expect(sendPayomSMS).toHaveBeenCalledWith({
      recipient: '+992901234567',
      text: expect.stringContaining('4821'),
    });
  });

  it('sends the OTP through the Payom template when configured', async () => {
    process.env.PAYOM_OTP_TEMPLATE_ID = 'tpl-1';
    (sendPayomSMS as jest.Mock).mockResolvedValue({ id: 'm1' });
    await sendVerificationCode('+992901234567', '4821');
    expect(sendPayomSMS).toHaveBeenCalledWith({
      recipient: '+992901234567',
      template: { id: 'tpl-1', variables: { code: '4821' } },
    });
  });
});
