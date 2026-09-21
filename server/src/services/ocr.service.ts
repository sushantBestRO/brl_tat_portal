// import { Injectable, Logger } from '@nestjs/common';
// import { createWorker } from 'tesseract.js';

// @Injectable()
// export class OcrService {
//   private readonly logger = new Logger(OcrService.name);
//   private worker: any = null;

//   // ─── Initialize Tesseract worker (lazy, on first use) ───
//   private async getWorker() {
//     if (!this.worker) {
//       this.worker = await createWorker('eng');
//       this.logger.log('[OCR] Tesseract worker initialized');
//     }
//     return this.worker;
//   }

//   // ─── Extract text from an image URL ───
//   async extractText(imageUrl: string): Promise<string | null> {
//     try {
//       const worker = await this.getWorker();
//       this.logger.log(`[OCR] Processing image: ${imageUrl.slice(0, 80)}...`);

//       const { data } = await worker.recognize(imageUrl);
//       const text = data?.text || '';

//       this.logger.log(`[OCR RAW] ${JSON.stringify(text)}`); // ← new line

//       this.logger.log(
//         `[OCR] Extracted ${text.length} chars: "${text.slice(0, 200)}"`,
//       );
//       return text.trim();
//     } catch (err: any) {
//       this.logger.error(`[OCR] Failed: ${err.message}`);
//       return null;
//     }
//   }

//   // parseSuperProcure(text: string): {
//   //   lane: string;
//   //   vehicleType: string;
//   //   spec: string;
//   //   weights: string[];
//   // } | null {
//   //   const lines = text
//   //     .split(/\r?\n/)
//   //     .map((l) => l.trim())
//   //     .filter(Boolean);

//   //   if (!lines.some((l) => /superprocure|bid command|load cost/i.test(l))) {
//   //     return null;
//   //   }

//   //   let fromCity = '';
//   //   let fromPin = '';
//   //   let toCity = '';
//   //   let toPin = '';
//   //   let vehicleType = '';
//   //   let weight = '';

//   //   for (let i = 0; i < lines.length; i++) {
//   //     const line = lines[i];

//   //     // From/To pattern: "Khopoli > Mukundpur" or "Khopoli → Mukundpur"
//   //     const arrowMatch = line.match(/^(.+?)\s*[→>]\s*(.+?)(?:\s+(\d{6}))?$/);
//   //     if (arrowMatch && !fromCity) {
//   //       fromCity = arrowMatch[1].trim();
//   //       toCity = arrowMatch[2].trim();
//   //       const nextLine = lines[i + 1] || '';
//   //       const pinMatch = nextLine.match(/^(\d{6})\s+(\d{6})$/);
//   //       if (pinMatch) {
//   //         fromPin = pinMatch[1];
//   //         toPin = pinMatch[2];
//   //       }
//   //     }

//   //     // Vehicle: OCR garbles "VEHICLE" as "vesicLe", "vemicLe", etc.
//   //     if (/v[ae]hic|vesic|vemic/i.test(line) && i < lines.length - 1) {
//   //       vehicleType = lines[i + 1] || '';
//   //       vehicleType = vehicleType
//   //         .replace(/[@©®]/g, '')
//   //         .replace(/\bFTL\b/gi, '')
//   //         .replace(/°/g, "'") // ← ADD: degree symbol → apostrophe
//   //         .replace(/×/g, 'x') // ← ADD: × → x
//   //         .replace(/\s+/g, ' ')
//   //         .trim();
//   //       vehicleType = vehicleType.replace(/\s+[a-z]$/, '').trim();
//   //     }

//   //     // Weight: OCR garbles "WEIGHT" as "fy wee", etc.
//   //     if (/fy wee|weight|wt\b/i.test(line) && i < lines.length - 1) {
//   //       weight = lines[i + 1] || '';
//   //       const wMatch = weight.match(/(\d+\s*(?:mt|mt\+c|kg|tn|ton)\+?c?)/i);
//   //       if (wMatch) {
//   //         weight = wMatch[1].toUpperCase().replace(/\s+/g, '');
//   //       } else {
//   //         weight = '';
//   //       }
//   //     }
//   //   }

//   //   // ─── FALLBACK: arrow icon wasn't OCR'd as text — use PICKUP/DROP lines instead ───
//   //   if (!fromCity || !toCity) {
//   //     const extractFromLabeledLine = (label: 'pickup' | 'drop') => {
//   //       const re = new RegExp(`^${label}\\b`, 'i');
//   //       const line = lines.find((l) => re.test(l));
//   //       if (!line) return null;

//   //       const pinMatch = line.match(/\b(\d{6})\b/);
//   //       const pin = pinMatch ? pinMatch[1] : '';

//   //       // Address is comma-separated: "<label + company>, <City>, <State>, <Country>[, PIN]"
//   //       const parts = line
//   //         .replace(re, '')
//   //         .split(',')
//   //         .map((s) => s.trim())
//   //         .filter(Boolean);

//   //       // City is the 2nd comma-segment on both PICKUP and DROP lines in this template,
//   //       // even though DROP sometimes embeds the PIN in the 1st segment instead of the last.
//   //       const city = (parts[1] || '').replace(/\d{6}/g, '').trim();
//   //       return { city, pin };
//   //     };

//   //     if (!fromCity) {
//   //       const pickup = extractFromLabeledLine('pickup');
//   //       if (pickup?.city) {
//   //         fromCity = pickup.city;
//   //         fromPin = pickup.pin;
//   //       }
//   //     }
//   //     if (!toCity) {
//   //       const drop = extractFromLabeledLine('drop');
//   //       if (drop?.city) {
//   //         toCity = drop.city;
//   //         toPin = drop.pin;
//   //       }
//   //     }
//   //   }

//   //   if (!fromCity && !toCity) return null;

//   //   // ─── FALLBACK: If weight not found via label, scan all lines for weight patterns ───
//   //   if (!weight) {
//   //     for (const line of lines) {
//   //       // Matches: "29 MT Solar Modules", "22MT", "18 MT", "25 MT+C"
//   //       const wMatch = line.match(/(\d{1,3}(?:\.\d+)?)\s*(MT|KG|TON|TONS)\b/i);
//   //       if (wMatch) {
//   //         weight = `${wMatch[1]}${wMatch[2]}`.toUpperCase().replace(/\s+/g, '');
//   //         break;
//   //       }
//   //     }
//   //   }

//   //   if (!fromCity && !toCity) return null;

//   //   // ─── Guard: if destination is empty or too short, flag for manual review ───
//   //   if (!toCity || toCity.trim().length < 3) {
//   //     toCity = '[CHECK WHATSAPP - OCR incomplete]';
//   //   }

//   //   const lane =
//   //     [fromCity, fromPin].filter(Boolean).join(' ') +
//   //     ' TO ' +
//   //     [toCity, toPin].filter(Boolean).join(' ');

//   //   const weights = weight ? [weight] : [];

//   //   return {
//   //     lane: lane.trim().toUpperCase(),
//   //     vehicleType: vehicleType.toUpperCase().trim(),
//   //     spec: weight ? weight.replace(/\s+/g, '').toUpperCase() : '',
//   //     weights,
//   //   };
//   // }

//   parseSuperProcure(text: string): {
//     lane: string;
//     vehicleType: string;
//     spec: string;
//     weights: string[];
//   } | null {
//     const lines = text
//       .split(/\r?\n/)
//       .map((l) => l.trim())
//       .filter(Boolean);

//     if (!lines.some((l) => /superprocure|bid command|load cost/i.test(l))) {
//       return null;
//     }

//     const looksLikeCity = (s: string) =>
//       /^[a-zA-Z][a-zA-Z .&'-]*$/.test(s) && s.length >= 3 && s.length <= 30;

//     let fromCity = '';
//     let fromPin = '';
//     let toCity = '';
//     let toPin = '';
//     let vehicleType = '';
//     let weight = '';

//     for (let i = 0; i < lines.length; i++) {
//       const line = lines[i];

//       // ─── From/To: "Khopoli > Mukundpur", "Khopoli → Mukundpur",
//       //    or OCR-garbled arrow "Patalganga IN Samana" ───
//       if (!fromCity) {
//         const arrowMatch = line.match(
//           /^(.+?)\s*(?:[→>]|\bto\b|\bin\b)\s*(.+?)(?:\s+(\d{6}))?$/i,
//         );
//         if (
//           arrowMatch &&
//           looksLikeCity(arrowMatch[1]) &&
//           looksLikeCity(arrowMatch[2])
//         ) {
//           fromCity = arrowMatch[1].trim();
//           toCity = arrowMatch[2].trim();
//           if (arrowMatch[3]) toPin = arrowMatch[3];
//           const nextLine = lines[i + 1] || '';
//           const pinMatch = nextLine.match(/^(\d{6})\s+(\d{6})$/);
//           if (pinMatch) {
//             fromPin = pinMatch[1];
//             toPin = pinMatch[2];
//           }
//         }
//       }

//       // ─── Vehicle: OCR garbles "VEHICLE SHIPMENT" many ways ───
//       if (
//         /v[ae]hic|vesic|vemic|venic|swipmen|shipmen/i.test(line) &&
//         i < lines.length - 1
//       ) {
//         vehicleType = lines[i + 1] || '';
//         vehicleType = vehicleType
//           .replace(/[@©®]/g, '')
//           .replace(/\bFTL\b/gi, '')
//           .replace(/°/g, "'")
//           .replace(/×/g, 'x')
//           .replace(/\s+/g, ' ')
//           .trim();
//         vehicleType = vehicleType.replace(/\s+[a-z]$/, '').trim();
//       }

//       // ─── Weight: OCR garbles "WEIGHT" as "fy wee", etc. ───
//       if (/fy wee|weight|wt\b/i.test(line) && i < lines.length - 1) {
//         weight = lines[i + 1] || '';
//         const wMatch = weight.match(/(\d+\s*(?:mt|mt\+c|kg|tn|ton)\+?c?)/i);
//         if (wMatch) {
//           weight = wMatch[1].toUpperCase().replace(/\s+/g, '');
//         } else {
//           weight = '';
//         }
//       }
//     }

//     // ─── FALLBACK: vehicle not found via label — scan all lines ───
//     if (!vehicleType) {
//       for (const line of lines) {
//         // "® Trailer 40° x1 © FTL", "Trailer 50ft x1", "Trailer a0 x50" (4 misread as a)
//         const vMatch = line.match(
//           /\b((?:trailer|truck|container|lcv|tempo)[^©@]*?(?:\d{2}|[a-z]\d)(?:'|"|°|ft)?\s*[x×]\s*\d+)/i,
//         );
//         if (vMatch) {
//           vehicleType = vMatch[1]
//             .replace(/°/g, "'")
//             .replace(/×/g, 'x')
//             .replace(/\ba(\d)\b/gi, '4$1') // OCR: "a0" → "40"
//             .replace(/\s+/g, ' ')
//             .trim();
//           break;
//         }
//       }
//     }

//     // ─── FALLBACK: PICKUP/DROP lines (handles wrapped addresses) ───
//     if (!fromCity || !toCity) {
//       const extractFromLabeledLine = (label: 'pickup' | 'drop') => {
//         const re = new RegExp(`^${label}\\b`, 'i');
//         const idx = lines.findIndex((l) => re.test(l));
//         if (idx === -1) return null;

//         // FIX: address may wrap onto the next line — join if no comma present
//         let line = lines[idx];
//         if (!line.includes(',') && idx + 1 < lines.length) {
//           line = `${line} ${lines[idx + 1]}`;
//         }

//         const pinMatch = line.match(/\b(\d{6})\b/);
//         const pin = pinMatch ? pinMatch[1] : '';

//         const parts = line
//           .replace(re, '')
//           .split(',')
//           .map((s) => s.trim())
//           .filter(Boolean);

//         const city = (parts[1] || '').replace(/\d{6}/g, '').trim();
//         return { city, pin };
//       };

//       if (!fromCity) {
//         const pickup = extractFromLabeledLine('pickup');
//         if (pickup?.city) {
//           fromCity = pickup.city;
//           fromPin = pickup.pin;
//         }
//       }
//       if (!toCity) {
//         const drop = extractFromLabeledLine('drop');
//         if (drop?.city) {
//           toCity = drop.city;
//           toPin = drop.pin;
//         }
//       }
//     }

//     if (!fromCity && !toCity) return null;

//     // ─── FALLBACK: weight not found via label — scan all lines ───
//     if (!weight) {
//       for (const line of lines) {
//         const wMatch = line.match(/(\d{1,3}(?:\.\d+)?)\s*(MT|KG|TON|TONS)\b/i);
//         if (wMatch) {
//           weight = `${wMatch[1]}${wMatch[2]}`.toUpperCase().replace(/\s+/g, '');
//           break;
//         }
//       }
//     }

//     // ─── Guard: destination empty or too short → flag for review ───
//     if (!toCity || toCity.trim().length < 3) {
//       toCity = '[CHECK WHATSAPP - OCR incomplete]';
//     }

//     const lane =
//       [fromCity, fromPin].filter(Boolean).join(' ') +
//       ' TO ' +
//       [toCity, toPin].filter(Boolean).join(' ');

//     const weights = weight ? [weight] : [];

//     return {
//       lane: lane.trim().toUpperCase(),
//       vehicleType: vehicleType.toUpperCase().trim(),
//       spec: weight ? weight.replace(/\s+/g, '').toUpperCase() : '',
//       weights,
//     };
//   }
// }

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

      this.logger.log(`[OCR RAW] ${JSON.stringify(text)}`);

      this.logger.log(
        `[OCR] Extracted ${text.length} chars: "${text.slice(0, 200)}"`,
      );
      return text.trim();
    } catch (err: any) {
      this.logger.error(`[OCR] Failed: ${err.message}`);
      return null;
    }
  }

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

    const looksLikeCity = (s: string) =>
      /^[a-zA-Z][a-zA-Z .&'-]*$/.test(s) && s.length >= 3 && s.length <= 30;

    let fromCity = '';
    let fromPin = '';
    let toCity = '';
    let toPin = '';
    let vehicleType = '';
    let weight = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ─── From/To: "Khopoli > Mukundpur", "Khopoli → Mukundpur",
      //    or OCR-garbled arrow "Patalganga IN Samana" ───
      if (!fromCity) {
        const arrowMatch = line.match(
          /^(.+?)\s*(?:[→>]|\bto\b|\bin\b)\s*(.+?)(?:\s+(\d{6}))?$/i,
        );
        if (
          arrowMatch &&
          looksLikeCity(arrowMatch[1]) &&
          looksLikeCity(arrowMatch[2])
        ) {
          fromCity = arrowMatch[1].trim();
          toCity = arrowMatch[2].trim();
          if (arrowMatch[3]) toPin = arrowMatch[3];
          const nextLine = lines[i + 1] || '';
          const pinMatch = nextLine.match(/^(\d{6})\s+(\d{6})$/);
          if (pinMatch) {
            fromPin = pinMatch[1];
            toPin = pinMatch[2];
          }
        }
      }

      // ─── Vehicle: OCR garbles "VEHICLE SHIPMENT" many ways ───
      if (
        /v[ae]hic|vesic|vemic|venic|swipmen|shipmen/i.test(line) &&
        i < lines.length - 1
      ) {
        vehicleType = lines[i + 1] || '';
        vehicleType = vehicleType
          .replace(/[@©®]/g, '')
          .replace(/\bFTL\b/gi, '')
          .replace(/°/g, "'")
          .replace(/×/g, 'x')
          .replace(/\s+/g, ' ')
          .trim();
        vehicleType = vehicleType.replace(/\s+[a-z]$/, '').trim();
      }

      // ─── Weight: OCR garbles "WEIGHT" as "fy wee", etc. ───
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

    // ─── FALLBACK: vehicle not found via label — scan all lines ───
    if (!vehicleType) {
      for (const line of lines) {
        // "® Trailer 40° x1 © FTL", "Trailer 50ft x1", "Trailer a0 x50" (4 misread as a)
        const vMatch = line.match(
          /\b((?:trailer|truck|container|lcv|tempo)[^©@]*?(?:\d{2}|[a-z]\d)(?:'|"|°|ft)?\s*[x×]\s*\d+)/i,
        );
        if (vMatch) {
          vehicleType = vMatch[1]
            .replace(/°/g, "'")
            .replace(/×/g, 'x')
            .replace(/\ba(\d)\b/gi, '4$1') // OCR: "a0" → "40"
            .replace(/\s+/g, ' ')
            .trim();
          break;
        }
      }
    }

    // ─── FALLBACK: PICKUP/DROP lines (handles wrapped addresses) ───
    if (!fromCity || !toCity) {
      const extractFromLabeledLine = (label: 'pickup' | 'drop') => {
        const re = new RegExp(`^${label}\\b`, 'i');
        const idx = lines.findIndex((l) => re.test(l));
        if (idx === -1) return null;

        // ─── FIX 1: join wrapped continuation lines. Addresses wrap:
        //   "Pickup Renewsys India Private Limited, Khopoli,"   ← ends with ','
        //   "Maharashtra, India, 410203"
        //   "DROP Solar square energy Mangalore Karnataka 574144,"
        //   "KOMPADAVU, DAKSHINA KANNADA, Karnataka"
        // Join while the line ends with ',' OR has no comma yet; stop
        // once a pincode is present and the line doesn't end with ','.
        // ───
        let line = lines[idx];
        let j = idx + 1;
        while (j < lines.length && j <= idx + 3) {
          const needsMore = line.endsWith(',') || !line.includes(',');
          if (!needsMore) break;
          // don't swallow unrelated footer lines
          if (/^(load|closes|enter|bid|weight|fy wee|vishal)/i.test(lines[j]))
            break;
          line = `${line} ${lines[j]}`;
          j++;
          if (/\d{6}/.test(line) && !line.endsWith(',')) break; // got pincode
        }

        const pinMatch = line.match(/\b(\d{6})\b/);
        const pin = pinMatch ? pinMatch[1] : '';

        const parts = line
          .replace(re, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        let city = (parts[1] || '').replace(/\d{6}/g, '').trim();

        // ─── FIX 2: no-comma DROP lines like
        //   "DROP Solar square energy Mangalore Karnataka 574144"
        //   → city is the word(s) right before the state name ───
        if (!city && parts[0]) {
          const m = parts[0].match(
            /([A-Za-z][A-Za-z]*(?:\s+[A-Za-z]+)?)\s+(?:Karnataka|Maharashtra|Gujarat|Tamil\s?Nadu|Telangana|Andhra\s?Pradesh|Uttar\s?Pradesh|Rajasthan|Punjab|Haryana|Delhi|Madhya\s?Pradesh|West\s?Bengal|Odisha|Bihar|Jharkhand|Chhattisgarh|Assam|Kerala|Goa|Uttarakhand|Himachal\s?Pradesh)\s+\d{6}/i,
          );
          if (m) city = m[1];
        }

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

    // ─── FALLBACK: weight not found via label — scan all lines ───
    if (!weight) {
      for (const line of lines) {
        const wMatch = line.match(/(\d{1,3}(?:\.\d+)?)\s*(MT|KG|TON|TONS)\b/i);
        if (wMatch) {
          weight = `${wMatch[1]}${wMatch[2]}`.toUpperCase().replace(/\s+/g, '');
          break;
        }
      }
    }

    // ─── Guard: destination empty or too short → flag for review ───
    if (!toCity || toCity.trim().length < 3) {
      toCity = '[CHECK WHATSAPP - OCR incomplete]';
    }

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
