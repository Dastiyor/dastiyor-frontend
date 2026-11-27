import { passwordStrength } from '../validation';

const msgs = { errLength: 'too short' };

describe('passwordStrength', () => {
  it('asks only for 8 characters, like the server', () => {
    expect(passwordStrength('parolparol', msgs)).toEqual([]);
    expect(passwordStrength('12345678', msgs)).toEqual([]);
    expect(passwordStrength('пароль', msgs)).toEqual(['too short']);
  });
});
