import { describe, it, expect } from 'vitest';
import { can } from '../src/authorization/permissions';

describe('ماتریس دسترسی', () => {
  it('CONTRIBUTOR نمی‌تواند کاربر مدیریت کند', () => {
    expect(can('CONTRIBUTOR', 'user.manage')).toBe(false);
  });
  it('CONTRIBUTOR نمی‌تواند Baseline را بازتعریف کند', () => {
    expect(can('CONTRIBUTOR', 'workitem.rebaseline')).toBe(false);
  });
  it('PROJECT_MANAGER می‌تواند Baseline را بازتعریف کند', () => {
    expect(can('PROJECT_MANAGER', 'workitem.rebaseline')).toBe(true);
  });
  it('VIEWER نمی‌تواند کار بسازد', () => {
    expect(can('VIEWER', 'workitem.create')).toBe(false);
  });
});
