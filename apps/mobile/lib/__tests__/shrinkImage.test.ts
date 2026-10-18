import { ImageManipulator } from 'expo-image-manipulator';
import { shrinkImage, MAX_EDGE } from '../shrinkImage';

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

const manipulate = ImageManipulator.manipulate as jest.Mock;

/** A fake manipulator context for a source image of the given size. */
function source(width: number, height: number) {
  const saveAsync = jest.fn().mockResolvedValue({ uri: 'file:///out.jpg' });
  const ctx: { resize: jest.Mock; renderAsync: jest.Mock } = {
    resize: jest.fn(() => ctx),
    renderAsync: jest.fn().mockResolvedValue({ width, height, saveAsync }),
  };
  manipulate.mockReturnValue(ctx);
  return { ctx, saveAsync };
}

beforeEach(() => manipulate.mockReset());

test('scales a large landscape photo down to the max width', async () => {
  const { ctx, saveAsync } = source(8064, 6048);
  expect(await shrinkImage('file:///big.heic')).toBe('file:///out.jpg');
  expect(ctx.resize).toHaveBeenCalledWith({ width: MAX_EDGE });
  expect(saveAsync).toHaveBeenCalledWith({ compress: 0.8, format: 'jpeg' });
});

test('scales a large portrait photo down to the max height', async () => {
  const { ctx } = source(3024, 4032);
  await shrinkImage('file:///tall.jpg');
  expect(ctx.resize).toHaveBeenCalledWith({ height: MAX_EDGE });
});

test('re-encodes a small photo as JPEG without resizing it', async () => {
  const { ctx, saveAsync } = source(800, 600);
  expect(await shrinkImage('file:///small.png')).toBe('file:///out.jpg');
  expect(ctx.resize).not.toHaveBeenCalled();
  expect(saveAsync).toHaveBeenCalled();
});

test('falls back to the original file if the image cannot be processed', async () => {
  manipulate.mockImplementation(() => { throw new Error('decode failed'); });
  expect(await shrinkImage('file:///odd.jpg')).toBe('file:///odd.jpg');
});
