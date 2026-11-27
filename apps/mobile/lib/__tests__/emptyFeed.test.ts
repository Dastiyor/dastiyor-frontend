import { emptyFeed, type EmptyFeedText } from '../emptyFeed';

const text: EmptyFeedText = {
  noTasksFilterHint: 'FILTER', emptyCustomerDesc: 'CUSTOMER', emptyProviderDesc: 'ALERTS',
  alertsPaidOnly: 'PAID-ONLY', oneOffHint: 'ONE-OFF',
};
const base = { alertPlan: null, category: '', narrowed: false, text };

describe('emptyFeed', () => {
  it('asks a customer to post the first task', () => {
    expect(emptyFeed({ ...base, role: 'CUSTOMER' })).toEqual({ action: 'createTask', subtitle: 'CUSTOMER' });
  });

  it('offers alerts to a provider on a paid plan', () => {
    expect(emptyFeed({ ...base, role: 'PROVIDER', alertPlan: 'pro' }))
      .toEqual({ action: 'taskAlerts', subtitle: 'ALERTS\n\nONE-OFF' });
  });

  it('sends a FREE provider to the whole feed and only names the paid plans', () => {
    expect(emptyFeed({ ...base, role: 'PROVIDER', alertPlan: 'free', category: 'Дизайн' }))
      .toEqual({ action: 'seeAllTasks', subtitle: 'PAID-ONLY\n\nONE-OFF' });
    // Already on the whole feed: nothing wider to offer.
    expect(emptyFeed({ ...base, role: 'PROVIDER', alertPlan: 'free' }).action).toBeNull();
    // Plan not known yet: never promise alerts.
    expect(emptyFeed({ ...base, role: 'PROVIDER', category: 'Дизайн' }).action).toBe('seeAllTasks');
  });

  it('mentions the filters first when they emptied the feed', () => {
    expect(emptyFeed({ ...base, role: 'CUSTOMER', narrowed: true }).subtitle).toBe('FILTER\n\nCUSTOMER');
  });
});
