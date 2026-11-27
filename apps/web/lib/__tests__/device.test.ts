import { detectPlatform } from '../device';

const UA = {
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    ipad: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

describe('detectPlatform', () => {
    it('sends Android to Google Play', () => expect(detectPlatform(UA.android)).toBe('android'));
    it('sends iPhone and iPad to the App Store', () => {
        expect(detectPlatform(UA.iphone)).toBe('ios');
        expect(detectPlatform(UA.ipad)).toBe('ios');
    });
    it('treats computers, and a missing UA, as desktop', () => {
        expect(detectPlatform(UA.mac)).toBe('desktop');
        expect(detectPlatform(UA.windows)).toBe('desktop');
        expect(detectPlatform(null)).toBe('desktop');
        expect(detectPlatform(undefined)).toBe('desktop');
    });
});
