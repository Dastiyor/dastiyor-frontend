import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Безопасность | Dastiyor',
    description: 'Как Dastiyor обеспечивает безопасность заказчиков и исполнителей на платформе.',
};

export default function SafetyPage() {
    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '800px' }}>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>Безопасность на Dastiyor</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', marginBottom: '48px', lineHeight: '1.7' }}>
                Безопасность участников — наш главный приоритет. Мы создали систему проверок и инструментов,
                которые защищают как заказчиков, так и исполнителей.
            </p>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Проверка исполнителей</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    Все исполнители проходят регистрацию с указанием реального номера телефона, который верифицируется
                    через SMS-код. Мы рекомендуем исполнителям добавлять фотографию профиля и описание опыта работы —
                    это повышает доверие заказчиков и помогает получать больше откликов.
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Система отзывов и рейтингов</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    После завершения задания заказчик может оставить отзыв и оценить работу исполнителя. Рейтинг
                    формируется на основе реальных выполненных заданий — подставные отзывы невозможны. Перед
                    выбором исполнителя изучите его историю работ и отзывы других пользователей.
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Безопасные платежи</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    Платежи за подписку исполнителей обрабатываются через SmartPay — официальную платёжную систему
                    Таджикистана. Все транзакции зашифрованы. Расчёты между заказчиком и исполнителем за выполнение
                    задания происходят напрямую по договорённости сторон.
                </p>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Советы по безопасности для заказчиков</h2>
                <ul style={{ color: 'var(--text-light)', lineHeight: '1.9', paddingLeft: '20px' }}>
                    <li>Выбирайте исполнителей с высоким рейтингом и положительными отзывами.</li>
                    <li>Перед встречей обсудите детали задания в чате на платформе — вся переписка сохраняется.</li>
                    <li>Не переводите предоплату незнакомым исполнителям без письменных договорённостей.</li>
                    <li>Первую встречу назначайте в общественном месте или в дневное время.</li>
                    <li>После завершения работы оставьте честный отзыв — это помогает другим пользователям.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Советы по безопасности для исполнителей</h2>
                <ul style={{ color: 'var(--text-light)', lineHeight: '1.9', paddingLeft: '20px' }}>
                    <li>Уточняйте все детали задания до начала работы, чтобы избежать недопонимания.</li>
                    <li>Фиксируйте договорённости об оплате в переписке на платформе.</li>
                    <li>Не соглашайтесь на задания, которые кажутся подозрительными или незаконными.</li>
                    <li>Сообщайте нам о нарушениях — мы разберёмся оперативно.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '40px' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Разрешение споров</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    Если между заказчиком и исполнителем возник конфликт, обратитесь в службу поддержки Dastiyor.
                    Наша команда рассмотрит ситуацию и поможет найти справедливое решение на основе переписки
                    и истории задания на платформе.
                </p>
            </section>

            <section style={{ padding: '32px', backgroundColor: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h2 className="heading-md" style={{ marginBottom: '12px' }}>Служба поддержки</h2>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '12px' }}>
                    Наша поддержка работает каждый день с 9:00 до 22:00 (время Душанбе, UTC+5).
                </p>
                <p style={{ color: 'var(--text-light)', lineHeight: '1.7' }}>
                    Email: <a href="mailto:support@dastiyor.com" style={{ color: 'var(--primary)' }}>support@dastiyor.com</a>
                </p>
            </section>
        </div>
    );
}
