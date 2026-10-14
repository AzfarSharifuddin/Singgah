import sharp from "sharp";

export async function compressVendorImage(input: Buffer, maxDimension = 1600): Promise<Buffer> {
  const image = sharp(input, { limitInputPixels: 20000000 }).rotate();
  for (const quality of [80, 70, 60]) {
    const bytes = await image.clone().resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
    if (bytes.byteLength <= 500 * 1024) return bytes;
  }
  return image.resize({ width: Math.min(maxDimension, 1200), height: Math.min(maxDimension, 1200), fit: "inside", withoutEnlargement: true }).webp({ quality: 60 }).toBuffer();
}
