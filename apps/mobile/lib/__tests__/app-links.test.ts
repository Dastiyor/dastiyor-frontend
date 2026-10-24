import { Platform, Share } from 'react-native';
import { reportMailto, shareApp, SHARE_URL, storeReviewUrl } from '../app-links';

describe('reportMailto', () => {
  it('addresses support and pre-fills subject and device details, URL-encoded', () => {
    const url = reportMailto('support@dastiyor.com', 'Проблема в приложении', 'Опишите:', {
      version: '1.1.0', platform: 'ios', osVersion: '26.5', userId: 'u1',
    });
    expect(url.startsWith('mailto:support@dastiyor.com?subject=')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('subject')).toBe('Проблема в приложении');
    expect(params.get('body')).toBe('Опишите:\n\n\n—\nApp 1.1.0 · ios 26.5 · user u1');
  });

  it('leaves the user out for a guest', () => {
    const url = reportMailto('s@x.tj', 'S', 'B', { version: '1.1.0', platform: 'android', osVersion: '14' });
    expect(new URLSearchParams(url.split('?')[1]).get('body')).toBe('B\n\n\n—\nApp 1.1.0 · android 14');
  });
});

describe('storeReviewUrl', () => {
  const original = Platform.OS;
  afterEach(() => { Platform.OS = original; });

  it('opens the App Store review sheet on iOS', () => {
    Platform.OS = 'ios';
    expect(storeReviewUrl()).toBe('itms-apps://apps.apple.com/app/id6786128785?action=write-review');
  });

  it('opens the Play Store listing on Android', () => {
    Platform.OS = 'android';
    expect(storeReviewUrl()).toBe('market://details?id=com.dastiyor.app');
  });
});

describe('shareApp', () => {
  const original = Platform.OS;
  afterEach(() => { Platform.OS = original; });

  it('gives iOS the link as url, so the share sheet shows a link preview', async () => {
    Platform.OS = 'ios';
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await shareApp('Dastiyor');
    expect(share).toHaveBeenCalledWith({ message: 'Dastiyor', url: SHARE_URL });
  });

  it('puts the link in the message on Android, which has no url field', async () => {
    Platform.OS = 'android';
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await shareApp('Dastiyor');
    expect(share).toHaveBeenCalledWith({ message: `Dastiyor ${SHARE_URL}` });
  });
});
