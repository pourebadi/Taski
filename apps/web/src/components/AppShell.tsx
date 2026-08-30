import { useEffect, useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Typography } from 'antd';
import {
  AppstoreOutlined,
  ProfileOutlined,
  SettingOutlined,
  FolderOutlined,
  UnorderedListOutlined,
  LineChartOutlined,
  MenuOutlined,
  LogoutOutlined,
  KeyOutlined,
  SearchOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth-store';
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { label as termLabel } from '../lib/terms';
import { useThemeMode } from '../theme/ThemeProvider';
import CommandPalette from './CommandPalette';
import WorkItemDrawer from './WorkItemDrawer';

const { Header, Sider, Content } = Layout;

const PAGE_TITLE: Record<string, string> = {
  '/my-work': 'کارهای من',
  '/board': 'بورد',
  '/work': 'فهرست کارها',
  '/insights': 'تصویر کلی',
  '/projects': 'پروژه‌ها',
  '/admin': 'مدیریت',
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user, clear } = useAuth();
  const { mode, toggle } = useThemeMode();
  const screens = Grid.useBreakpoint();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // کار باز شده در URL نگه داشته می‌شود تا لینکش قابل اشتراک باشد
  const [params, setParams] = useSearchParams();
  const openItem = params.get('item');

  const showItem = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('item', id);
    setParams(next);
  };

  const closeItem = () => {
    const next = new URLSearchParams(params);
    next.delete('item');
    setParams(next, { replace: true });
  };

  const isDesktop = !!screens.lg;

  // با هر پیمایش، کشوی موبایل باید بسته شود وگرنه روی محتوا می‌ماند
  useEffect(() => setMobileNavOpen(false), [pathname]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    clear();
  };

  // «مدیریت» فقط برای کسی که واقعاً دسترسی دارد. پیش‌تر برای همه دیده می‌شد
  // و غیرادمین یک جدول خالی می‌گرفت، چون ۴۰۳ بی‌صدا بلعیده می‌شد.
  const isAdmin = ['ORG_OWNER', 'ADMIN'].includes(user?.role ?? '');

  const items = [
    { key: '/my-work', icon: <ProfileOutlined />, label: t('nav.myWork') },
    { key: '/board', icon: <AppstoreOutlined />, label: t('nav.board') },
    { key: '/work', icon: <UnorderedListOutlined />, label: 'فهرست کارها' },
    { key: '/insights', icon: <LineChartOutlined />, label: 'تصویر کلی' },
    { key: '/projects', icon: <FolderOutlined />, label: t('nav.projects') },
    ...(isAdmin ? [{ key: '/admin', icon: <SettingOutlined />, label: t('nav.admin') }] : []),
  ];

  const navMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[pathname]}
      onClick={({ key }) => nav(key)}
      items={items}
      style={{ background: 'transparent', borderInlineEnd: 0 }}
    />
  );

  const brand = (
    <div className="brand-lockup">
      <span className="mark" aria-hidden="true">
        اج
      </span>
      <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{t('app.title')}</span>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>

      {isDesktop && (
        <Sider width={232} className="on-dark" theme="dark" style={{ background: 'var(--ink)' }}>
          <nav aria-label="ناوبری اصلی">
            {brand}
            {navMenu}
          </nav>
        </Sider>
      )}

      <Drawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        placement="right"
        width={250}
        closable={false}
        className="on-dark"
        styles={{ body: { padding: 0, background: 'var(--ink)' } }}
      >
        <nav aria-label="ناوبری اصلی">
          {brand}
          {navMenu}
        </nav>
      </Drawer>

      <Layout>
        <Header className="app-header">
          {!isDesktop && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileNavOpen(true)}
              aria-label="باز کردن منو"
            />
          )}
          <Typography.Text strong style={{ fontSize: 15 }}>
            {PAGE_TITLE[pathname] ?? ''}
          </Typography.Text>

          <span style={{ flex: 1 }} />

          <Button
            type="text"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            aria-label="جست‌وجوی سریع"
            style={{ color: 'var(--text-muted)' }}
          >
            <SearchOutlined aria-hidden="true" />
            {isDesktop && (
              <span style={{ marginInlineStart: 6, fontSize: 12 }}>
                جست‌وجو <kbd className="kbd">Ctrl K</kbd>
              </span>
            )}
          </Button>

          <Button
            type="text"
            className="theme-toggle"
            onClick={toggle}
            icon={mode === 'dark' ? <SunOutlined aria-hidden="true" /> : <MoonOutlined aria-hidden="true" />}
            aria-label={mode === 'dark' ? 'روشن کردن تم روشن' : 'روشن کردن تم تیره'}
          />

          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'identity',
                  label: (
                    <div style={{ padding: '4px 0', minWidth: 170 }}>
                      <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', direction: 'ltr', textAlign: 'start' }}>
                        @{user?.username ?? user?.email}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 2 }}>
                        {termLabel('role', user?.role ?? '')}
                      </div>
                    </div>
                  ),
                  disabled: true,
                },
                { type: 'divider' },
                {
                  key: 'password',
                  icon: <KeyOutlined />,
                  label: t('auth.changePassword'),
                  onClick: () => nav('/change-password'),
                },
                { key: 'logout', icon: <LogoutOutlined />, label: t('auth.logout'), onClick: logout },
              ],
            }}
          >
            <Button type="text" style={{ height: 40, paddingInline: 8 }} aria-label="منوی حساب کاربری">
              <Avatar size={26} style={{ background: 'var(--brand)', fontSize: 12 }}>
                {user?.fullName?.trim()?.charAt(0) ?? '؟'}
              </Avatar>
              {isDesktop && <span style={{ marginInlineStart: 8 }}>{user?.fullName}</span>}
            </Button>
          </Dropdown>
        </Header>

        <Content>
          <main id="main-content" className="app-content" tabIndex={-1}>
            {children}
          </main>
        </Content>

        <CommandPalette onOpenItem={showItem} />
        <WorkItemDrawer
          id={openItem}
          open={!!openItem}
          onClose={closeItem}
          onChanged={() => window.dispatchEvent(new CustomEvent('taski:refresh'))}
        />
      </Layout>
    </Layout>
  );
}
