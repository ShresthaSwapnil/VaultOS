import * as pdfParse from 'pdf-parse';
import sharp from 'sharp';

export interface ParsedFileResult {
  text: string;
  metadata: {
    mimeType: string;
    size: number;
    dimensions?: { width: number; height: number };
    [key: string]: any;
  };
}

export async function parseFile(buffer: Buffer, filename: string, mimeType: string): Promise<ParsedFileResult> {
  const size = buffer.length;
  
  if (mimeType === 'application/pdf') {
    try {
      const pdf = (pdfParse as any).default || pdfParse;
      const pdfData = await pdf(buffer);
      return {
        text: pdfData.text,
        metadata: {
          mimeType,
          size,
          author: pdfData.info?.Author,
          title: pdfData.info?.Title,
          pages: pdfData.numpages,
        },
      };
    } catch (e: any) {
      return {
        text: `Error parsing PDF text contents for: ${filename}`,
        metadata: { mimeType, size, error: e.message },
      };
    }
  }

  if (mimeType.startsWith('image/')) {
    try {
      const imageInfo = await sharp(buffer).metadata();
      return {
        text: `Image file: ${filename} (${imageInfo.width}x${imageInfo.height} px, format: ${imageInfo.format})`,
        metadata: {
          mimeType,
          size,
          dimensions: imageInfo.width && imageInfo.height ? { width: imageInfo.width, height: imageInfo.height } : undefined,
          format: imageInfo.format,
        },
      };
    } catch (e: any) {
      return {
        text: `Image metadata extraction failed for: ${filename}`,
        metadata: { mimeType, size, error: e.message },
      };
    }
  }

  // Handle plain text and markdown
  if (mimeType.startsWith('text/') || filename.endsWith('.md') || filename.endsWith('.txt')) {
    const text = buffer.toString('utf-8');
    return {
      text,
      metadata: { mimeType, size },
    };
  }

  // Fallback for binaries (video/audio/zip)
  return {
    text: `Binary file upload: ${filename} of type ${mimeType}`,
    metadata: { mimeType, size },
  };
}
