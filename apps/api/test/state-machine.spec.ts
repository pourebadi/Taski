import { describe, it, expect } from 'vitest';
import { ALLOWED_TRANSITIONS } from '../src/common/constants';

describe('ماشین حالت', () => {
  it('از BACKLOG مستقیم به DONE نمی‌رود', () => {
    expect(ALLOWED_TRANSITIONS.BACKLOG).not.toContain('DONE');
  });
  it('کار بدون نیاز به بازبینی از IN_PROGRESS به DONE می‌رود', () => {
    expect(ALLOWED_TRANSITIONS.IN_PROGRESS).toContain('DONE');
  });
  it('DONE فقط با بازگشت به IN_PROGRESS باز می‌شود', () => {
    expect(ALLOWED_TRANSITIONS.DONE).toEqual(['IN_PROGRESS']);
  });
});
