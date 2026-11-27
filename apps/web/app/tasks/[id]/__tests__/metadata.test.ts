/**
 * @jest-environment node
 */
import { generateMetadata } from '../page';

const findUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({ prisma: { task: { findUnique: (args: unknown) => findUnique(args) } } }));
jest.mock('next/navigation', () => ({
    notFound: jest.fn(),
    permanentRedirect: (url: string) => { throw new Error(`redirect ${url}`); },
}));
jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn() }));
jest.mock('@/lib/i18n/server', () => ({ getServerTranslation: jest.fn() }));
jest.mock('@/components/tasks/TaskInfo', () => () => null);
jest.mock('@/components/tasks/TaskSidebar', () => () => null);
jest.mock('@/components/tasks/ResponseList', () => () => null);
jest.mock('@/components/reviews/ReviewForm', () => () => null);
jest.mock('@/components/tasks/RecommendedProviders', () => () => null);

beforeEach(() => findUnique.mockClear());

const params = (id: string) => ({ params: Promise.resolve({ id }) });

it('names the task page itself as canonical, with the preview image that exists', async () => {
    findUnique.mockResolvedValue({ title: 'Кран', description: null, category: 'Сантехника', city: 'Душанбе' });
    const meta = await generateMetadata(params('abc'));
    expect(meta.alternates?.canonical).toBe('/tasks/abc');
    expect(meta.openGraph).toMatchObject({ url: '/tasks/abc', images: [{ url: '/opengraph-image' }] });
});

it('sends an old example link to the task list', async () => {
    await expect(generateMetadata(params('preview-1'))).rejects.toThrow('redirect /tasks');
    expect(findUnique).not.toHaveBeenCalled();
});
