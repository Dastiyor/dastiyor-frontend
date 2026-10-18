import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// /api/upload refuses files over 4MB, and a full-size photo from a 24–48MP iPhone
// camera comes close or goes over. 2048px on the long edge is more than a phone
// screen shows and lands well under 1MB.
export const MAX_EDGE = 2048;

/** Returns a JPEG copy no larger than MAX_EDGE on its long side (also turns HEIC into JPEG). */
export async function shrinkImage(uri: string): Promise<string> {
  try {
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const { width, height } = original;
    const image = Math.max(width, height) > MAX_EDGE
      ? await ImageManipulator.manipulate(uri)
          .resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE })
          .renderAsync()
      : original;
    const saved = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return saved.uri;
  } catch {
    // Let the server decide rather than lose the photo; it answers with a clear error if too big.
    return uri;
  }
}
