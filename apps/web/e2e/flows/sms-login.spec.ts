import { test, expect, open } from '../support/test';
import { e2eEmail, prisma } from '../support/db';
import { E2E_SMS_CODE, E2E_SMS_PHONE } from '../support/env';

const LOCAL_PHONE = E2E_SMS_PHONE.replace(/^\+992/, '');

test('sign up with a name and phone only, then sign back in by SMS code', async ({ page }) => {
    // Frees the designated number, whichever file used it last.
    await prisma.actionLog.deleteMany({ where: { user: { phone: E2E_SMS_PHONE } } });
    await prisma.user.deleteMany({ where: { phone: E2E_SMS_PHONE, email: { endsWith: '.dastiyor.test' } } });

    await open(page, '/register?type=customer');
    await page.locator('#reg-fullName').fill('E2E Только Телефон');
    await page.locator('#reg-phone').fill(LOCAL_PHONE);
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await page.locator('#reg-code').fill(E2E_SMS_CODE);
    await page.getByRole('button', { name: 'Создать аккаунт' }).click();
    await page.waitForURL(url => url.pathname === '/');

    const user = await prisma.user.findFirstOrThrow({ where: { phone: E2E_SMS_PHONE } });
    expect(user).toMatchObject({ password: null, phoneVerified: true });
    // A placeholder address is outside purgeE2EData(); move it inside.
    await prisma.user.update({ where: { id: user.id }, data: { email: e2eEmail('sms-login') } });

    await page.context().clearCookies();
    await open(page, '/login');
    await page.locator('#login-phone').fill(LOCAL_PHONE);
    await page.getByRole('button', { name: 'Получить код' }).click();
    await page.locator('#login-code').fill('000000');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page.getByText('Неверный или просроченный код')).toBeVisible();

    await page.locator('#login-code').fill(E2E_SMS_CODE);
    await page.getByRole('button', { name: 'Войти', exact: true }).click();
    await expect(page).toHaveURL(/\/customer$/);

    // Frees the number for the other specs.
    await prisma.actionLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
});
