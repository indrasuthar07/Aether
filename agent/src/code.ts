import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('0123456789', 6);

export function createSessionCode(): string {
  return generateCode();
}