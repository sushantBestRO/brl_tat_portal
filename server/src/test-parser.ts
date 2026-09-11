import { ParserService } from './parser/parser.service';

// Standalone test - no database needed
const parser = new ParserService({} as any);

const testCases = [
  'JNPT to Ahmedabad 40ft 18ton rate plz',
  '95000',
  'Vapi to Bhiwandi 20ft 10ton',
  '55000',
];

const sizeRateTestCases = [
  '40ft-30000/-',
  "20'-25000/-",
  "1x40'-30000",
  '40 ft - 30000',
  '20ft-25000/- 40ft-35000/-',
];

console.log('\n=== Testing parseInquiry ===');
for (const text of testCases) {
  const result = parser.parseInquiry(text);
  console.log(`\n"${text}"`);
  console.log('  → parseInquiry:', result);
}

console.log('\n=== Testing parseRateReply ===');
for (const text of testCases) {
  const result = parser.parseRateReply(text);
  console.log(`\n"${text}"`);
  console.log('  → parseRateReply:', result);
}

console.log('\n=== Testing sizeRates ===');

for (const text of sizeRateTestCases) {
  const result = parser.parseRateReply(text);

  console.log(`\n"${text}"`);
  console.log('  → parseRateReply:', result);
  console.log('  → sizeRates:', result?.sizeRates);
}
