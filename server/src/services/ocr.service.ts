import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private worker: any = null;

  // ─── Initialize Tesseract worker (lazy, on first use) ───
  private async getWorker() {
    if (!this.worker) {
      this.worker = await createWorker('eng');
      this.logger.log('[OCR] Tesseract worker initialized');
    }
    return this.worker;
  }

  // ─── Extract text from an image URL ───
  async extractText(imageUrl: string): Promise<string | null> {
    try {
      const worker = await this.getWorker();
      this.logger.log(`[OCR] Processing image: ${imageUrl.slice(0, 80)}...`);

      const { data } = await worker.recognize(imageUrl);
      const text = data?.text || '';

      this.logger.log(`[OCR RAW] ${JSON.stringify(text)}`); // ← new line

      this.logger.log(
        `[OCR] Extracted ${text.length} chars: "${text.slice(0, 200)}"`,
      );
      return text.trim();
    } catch (err: any) {
      this.logger.error(`[OCR] Failed: ${err.message}`);
      return null;
    }
  }

  // ─── Parse SuperProcure Bid Command screenshot format ───
  // parseSuperProcure(text: string): {
  //   lane: string;
  //   vehicleType: string;
  //   spec: string;
  //   weights: string[];
  // } | null {
  //   const lines = text
  //     .split(/\r?\n/)
  //     .map((l) => l.trim())
  //     .filter(Boolean);

  //   if (!lines.some((l) => /superprocure|bid command|load cost/i.test(l))) {
  //     return null;
  //   }

  //   let fromCity = '';
  //   let fromPin = '';
  //   let toCity = '';
  //   let toPin = '';
  //   let vehicleType = '';
  //   let weight = '';

  //   for (let i = 0; i < lines.length; i++) {
  //     const line = lines[i];

  //     // From/To pattern: "Khopoli > Mukundpur" or "Khopoli → Mukundpur"
  //     const arrowMatch = line.match(/^(.+?)\s*[→>]\s*(.+?)(?:\s+(\d{6}))?$/);
  //     if (arrowMatch && !fromCity) {
  //       fromCity = arrowMatch[1].trim();
  //       toCity = arrowMatch[2].trim();
  //       // Check if pincodes are on next line
  //       const nextLine = lines[i + 1] || '';
  //       const pinMatch = nextLine.match(/^(\d{6})\s+(\d{6})$/);
  //       if (pinMatch) {
  //         fromPin = pinMatch[1];
  //         toPin = pinMatch[2];
  //       }
  //     }

  //     // Vehicle: OCR garbles "VEHICLE" as "vesicLe", "vemicLe", etc.
  //     // Next line: "@ Trailer 50ft x1 © FTL" → clean to "Trailer 50ft x1"
  //     if (/v[ae]hic|vesic|vemic/i.test(line) && i < lines.length - 1) {
  //       vehicleType = lines[i + 1] || '';
  //       vehicleType = vehicleType
  //         .replace(/[@©®]/g, '')
  //         .replace(/\bFTL\b/gi, '')
  //         .replace(/\s+/g, ' ')
  //         .trim();
  //       // ─── Remove trailing single letters (OCR garbage like "m") ───
  //       vehicleType = vehicleType.replace(/\s+[a-z]$/, '').trim();
  //     }

  //     // Weight: OCR garbles "WEIGHT" as "fy wee", etc.
  //     // Next line: "29 MT Solar Modules" → extract "29MT"
  //     if (/fy wee|weight|wt\b/i.test(line) && i < lines.length - 1) {
  //       weight = lines[i + 1] || '';
  //       const wMatch = weight.match(/(\d+\s*(?:mt|mt\+c|kg|tn|ton)\+?c?)/i);
  //       if (wMatch) {
  //         weight = wMatch[1].toUpperCase().replace(/\s+/g, '');
  //       } else {
  //         weight = '';
  //       }
  //     }
  //   }

  //   if (!fromCity && !toCity) return null;

  //   const lane =
  //     [fromCity, fromPin].filter(Boolean).join(' ') +
  //     ' TO ' +
  //     [toCity, toPin].filter(Boolean).join(' ');

  //   const weights = weight ? [weight] : [];

  //   return {
  //     lane: lane.trim().toUpperCase(),
  //     vehicleType: vehicleType.toUpperCase().trim(),
  //     spec: weight ? weight.replace(/\s+/g, '').toUpperCase() : '',
  //     weights,
  //   };
  // }

  parseSuperProcure(text: string): {
    lane: string;
    vehicleType: string;
    spec: string;
    weights: string[];
  } | null {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (!lines.some((l) => /superprocure|bid command|load cost/i.test(l))) {
      return null;
    }

    let fromCity = '';
    let fromPin = '';
    let toCity = '';
    let toPin = '';
    let vehicleType = '';
    let weight = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // From/To pattern: "Khopoli > Mukundpur" or "Khopoli → Mukundpur"
      const arrowMatch = line.match(/^(.+?)\s*[→>]\s*(.+?)(?:\s+(\d{6}))?$/);
      if (arrowMatch && !fromCity) {
        fromCity = arrowMatch[1].trim();
        toCity = arrowMatch[2].trim();
        const nextLine = lines[i + 1] || '';
        const pinMatch = nextLine.match(/^(\d{6})\s+(\d{6})$/);
        if (pinMatch) {
          fromPin = pinMatch[1];
          toPin = pinMatch[2];
        }
      }

      // Vehicle: OCR garbles "VEHICLE" as "vesicLe", "vemicLe", etc.
      if (/v[ae]hic|vesic|vemic/i.test(line) && i < lines.length - 1) {
        vehicleType = lines[i + 1] || '';
        vehicleType = vehicleType
          .replace(/[@©®]/g, '')
          .replace(/\bFTL\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        vehicleType = vehicleType.replace(/\s+[a-z]$/, '').trim();
      }

      // Weight: OCR garbles "WEIGHT" as "fy wee", etc.
      if (/fy wee|weight|wt\b/i.test(line) && i < lines.length - 1) {
        weight = lines[i + 1] || '';
        const wMatch = weight.match(/(\d+\s*(?:mt|mt\+c|kg|tn|ton)\+?c?)/i);
        if (wMatch) {
          weight = wMatch[1].toUpperCase().replace(/\s+/g, '');
        } else {
          weight = '';
        }
      }
    }

    // ─── FALLBACK: arrow icon wasn't OCR'd as text — use PICKUP/DROP lines instead ───
    if (!fromCity || !toCity) {
      const extractFromLabeledLine = (label: 'pickup' | 'drop') => {
        const re = new RegExp(`^${label}\\b`, 'i');
        const line = lines.find((l) => re.test(l));
        if (!line) return null;

        const pinMatch = line.match(/\b(\d{6})\b/);
        const pin = pinMatch ? pinMatch[1] : '';

        // Address is comma-separated: "<label + company>, <City>, <State>, <Country>[, PIN]"
        const parts = line
          .replace(re, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        // City is the 2nd comma-segment on both PICKUP and DROP lines in this template,
        // even though DROP sometimes embeds the PIN in the 1st segment instead of the last.
        const city = (parts[1] || '').replace(/\d{6}/g, '').trim();
        return { city, pin };
      };

      if (!fromCity) {
        const pickup = extractFromLabeledLine('pickup');
        if (pickup?.city) {
          fromCity = pickup.city;
          fromPin = pickup.pin;
        }
      }
      if (!toCity) {
        const drop = extractFromLabeledLine('drop');
        if (drop?.city) {
          toCity = drop.city;
          toPin = drop.pin;
        }
      }
    }

    if (!fromCity && !toCity) return null;

    const lane =
      [fromCity, fromPin].filter(Boolean).join(' ') +
      ' TO ' +
      [toCity, toPin].filter(Boolean).join(' ');

    const weights = weight ? [weight] : [];

    return {
      lane: lane.trim().toUpperCase(),
      vehicleType: vehicleType.toUpperCase().trim(),
      spec: weight ? weight.replace(/\s+/g, '').toUpperCase() : '',
      weights,
    };
  }
}
