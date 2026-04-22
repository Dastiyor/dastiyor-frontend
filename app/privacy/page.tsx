import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Политика конфиденциальности | Dastiyor',
    description: 'Политика конфиденциальности платформы Dastiyor — как мы собираем, используем и защищаем ваши данные.',
};

const sectionStyle = { marginBottom: '40px' };
const headingStyle = { marginBottom: '12px' };
const textStyle = { color: 'var(--text-light)', lineHeight: '1.8' };
const listStyle = { color: 'var(--text-light)', lineHeight: '1.9', paddingLeft: '20px' };

export default function PrivacyPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1 className="heading-lg" style={{ marginBottom: '8px' }}>Политика конфиденциальности</h1>
            <p style={{ color: 'var(--text-light)', marginBottom: '48px', fontSize: '0.9rem' }}>
                Последнее обновление: апрель 2026 г.
            </p>

            <section style={sectionStyle}>
                <p style={textStyle}>
                    Настоящая Политика конфиденциальности объясняет, какие персональные данные собирает платформа
                    Dastiyor (dastiyor.com), как мы их используем и как защищаем. Пользуясь нашим сервисом, вы
                    соглашаетесь с условиями данной Политики.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>1. Какие данные мы собираем</h2>
                <p style={{ ...textStyle, marginBottom: '12px' }}>При регистрации и использовании платформы мы можем собирать:</p>
                <ul style={listStyle}>
                    <li>Имя и фамилию;</li>
                    <li>Номер мобильного телефона;</li>
                    <li>Адрес электронной почты;</li>
                    <li>Роль на платформе (заказчик или исполнитель);</li>
                    <li>Содержание заданий, откликов и сообщений, которые вы размещаете;</li>
                    <li>Отзывы и оценки, которые вы оставляете или получаете;</li>
                    <li>Технические данные: IP-адрес, тип браузера, операционная система, страницы посещений.</li>
                </ul>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>2. Как мы используем ваши данные</h2>
                <ul style={listStyle}>
                    <li>Для создания и управления вашим аккаунтом;</li>
                    <li>Для отображения ваших заданий и откликов другим пользователям;</li>
                    <li>Для отправки уведомлений об активности (email и SMS через сервис Brevo);</li>
                    <li>Для обработки платежей за подписку через SmartPay;</li>
                    <li>Для обеспечения безопасности платформы и предотвращения мошенничества;</li>
                    <li>Для улучшения работы сервиса на основе агрегированной аналитики.</li>
                </ul>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>3. Передача данных третьим лицам</h2>
                <p style={{ ...textStyle, marginBottom: '12px' }}>
                    Мы не продаём и не передаём ваши персональные данные третьим лицам в коммерческих целях.
                    Данные передаются только следующим сервисам в рамках работы платформы:
                </p>
                <ul style={listStyle}>
                    <li><strong>Supabase</strong> — облачное хранение базы данных (PostgreSQL);</li>
                    <li><strong>Brevo</strong> — отправка транзакционных email и SMS-уведомлений;</li>
                    <li><strong>SmartPay</strong> — обработка платежей за подписку исполнителей;</li>
                    <li><strong>Vercel</strong> — хостинг и CDN платформы.</li>
                </ul>
                <p style={{ ...textStyle, marginTop: '12px' }}>
                    Все перечисленные партнёры работают в соответствии со своими политиками конфиденциальности
                    и обеспечивают безопасность передаваемых данных.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>4. Публичная информация профиля</h2>
                <p style={textStyle}>
                    Имя, фотография профиля, описание, рейтинг и отзывы исполнителей являются публичными и
                    видны всем пользователям платформы. Контактные данные (телефон, email) не отображаются
                    публично и доступны только после взаимодействия в рамках конкретного задания.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>5. Cookies и аналитика</h2>
                <p style={textStyle}>
                    Dastiyor использует cookies для поддержания сессии авторизации. Мы не используем
                    сторонние трекеры или рекламные cookies. Вы можете отключить cookies в настройках
                    браузера, однако это может нарушить работу авторизации на платформе.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>6. Хранение и защита данных</h2>
                <p style={textStyle}>
                    Ваши данные хранятся на серверах Supabase с использованием шифрования. Пароли хранятся
                    в зашифрованном виде (bcrypt). Токены авторизации имеют срок действия 24 часа. Мы
                    применяем разумные технические и организационные меры для защиты ваших данных от
                    несанкционированного доступа, изменения или уничтожения.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>7. Ваши права</h2>
                <p style={{ ...textStyle, marginBottom: '12px' }}>Вы вправе:</p>
                <ul style={listStyle}>
                    <li>Запросить доступ к своим персональным данным;</li>
                    <li>Потребовать исправления неточных данных;</li>
                    <li>Запросить удаление аккаунта и связанных данных;</li>
                    <li>Отписаться от email и SMS-уведомлений через настройки аккаунта.</li>
                </ul>
                <p style={{ ...textStyle, marginTop: '12px' }}>
                    Для реализации любого из этих прав напишите на{' '}
                    <a href="mailto:support@dastiyor.com" style={{ color: 'var(--primary)' }}>support@dastiyor.com</a>.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>8. Возраст пользователей</h2>
                <p style={textStyle}>
                    Платформа Dastiyor предназначена для лиц старше 18 лет. Мы не собираем намеренно данные
                    несовершеннолетних. Если вам стало известно, что несовершеннолетний зарегистрировался на
                    платформе, сообщите нам — мы удалим аккаунт.
                </p>
            </section>

            <section style={sectionStyle}>
                <h2 className="heading-md" style={headingStyle}>9. Изменения политики</h2>
                <p style={textStyle}>
                    Мы можем обновлять данную Политику. При существенных изменениях мы уведомим
                    пользователей по email или через уведомление на платформе. Продолжение использования
                    сервиса после публикации изменений означает ваше согласие с обновлённой Политикой.
                </p>
            </section>

            <section style={{ padding: '32px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 className="heading-md" style={headingStyle}>10. Контакты</h2>
                <p style={textStyle}>
                    По вопросам конфиденциальности обращайтесь:{' '}
                    <a href="mailto:support@dastiyor.com" style={{ color: 'var(--primary)' }}>support@dastiyor.com</a>
                </p>
            </section>
        </div>
    );
}
