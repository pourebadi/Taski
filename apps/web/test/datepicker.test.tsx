import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider, App as AntApp } from 'antd';
import faIR from 'antd/locale/fa_IR';
import dayjs from 'dayjs';
import JalaliDatePicker from '../src/components/JalaliDatePicker';
import { theme } from '../src/theme';

/**
 * تقویم فقط نباید «رندر شود» — باید واقعاً باز شود، ماه عوض کند و
 * تاریخ درست برگرداند. رندرِ خالی همان چیزی بود که قبلاً باگ را از
 * دید تست پنهان کرد.
 */

beforeEach(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as never;
  }
  (window as never as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {} unobserve() {} disconnect() {}
  };
});

const wrap = (ui: React.ReactElement) =>
  render(
    <ConfigProvider direction="rtl" locale={faIR} theme={theme}>
      <AntApp>{ui}</AntApp>
    </ConfigProvider>,
  );

describe('انتخابگر تاریخ شمسی', () => {
  it('تاریخ انتخاب‌شده را شمسی نشان می‌دهد', () => {
    wrap(<JalaliDatePicker value={dayjs('2026-03-21')} onChange={() => {}} />);
    // ۲۱ مارس ۲۰۲۶ = ۱ فروردین ۱۴۰۵
    expect(screen.getByText('۱۴۰۵/۰۱/۰۱')).toBeTruthy();
  });

  it('با کلیک باز می‌شود و نام ماه شمسی را نشان می‌دهد', async () => {
    wrap(<JalaliDatePicker value={dayjs('2026-03-21')} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'انتخاب تاریخ' }));
    await waitFor(() => expect(screen.getByText(/فروردین/)).toBeTruthy());
  });

  it('انتخاب یک روز، تاریخ میلادی درست را برمی‌گرداند', async () => {
    const onChange = vi.fn();
    wrap(<JalaliDatePicker value={dayjs('2026-03-21')} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'انتخاب تاریخ' }));
    await waitFor(() => expect(screen.getByText(/فروردین/)).toBeTruthy());

    // روز دهم فروردین ۱۴۰۵ = ۳۰ مارس ۲۰۲۶
    fireEvent.click(screen.getByText('۱۰'));
    expect(onChange).toHaveBeenCalled();
    const picked = onChange.mock.calls[0][0] as dayjs.Dayjs;
    expect(picked.format('YYYY-MM-DD')).toBe('2026-03-30');
  });

  it('دکمه ماه قبل و بعد کار می‌کند', async () => {
    wrap(<JalaliDatePicker value={dayjs('2026-03-21')} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'انتخاب تاریخ' }));
    await waitFor(() => expect(screen.getByText(/فروردین/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'ماه بعد' }));
    await waitFor(() => expect(screen.getByText(/اردیبهشت/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'ماه قبل' }));
    await waitFor(() => expect(screen.getByText(/فروردین/)).toBeTruthy());
  });

  it('پاک کردن، مقدار تهی برمی‌گرداند', () => {
    const onChange = vi.fn();
    wrap(<JalaliDatePicker value={dayjs('2026-03-21')} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'پاک کردن تاریخ' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('شبکه‌ی روزها نقش grid و خانه‌ها نقش gridcell دارند', async () => {
    wrap(<JalaliDatePicker value={dayjs('2026-03-21')} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'انتخاب تاریخ' }));
    await waitFor(() => expect(screen.getByRole('grid')).toBeTruthy());
    expect(screen.getAllByRole('gridcell').length).toBe(31); // فروردین ۳۱ روز
  });
});
