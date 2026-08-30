import { Layout, Menu, Typography, Dropdown } from 'antd';
import { AppstoreOutlined, ProfileOutlined, TeamOutlined, SettingOutlined, UserOutlined, FolderOutlined, UnorderedListOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth-store';
import { api } from '../lib/api';
import { t } from '../lib/i18n';

const { Header, Sider, Content } = Layout;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user, clear } = useAuth();

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => null);
    clear();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220}>
        <div style={{ color: '#fff', padding: 20, fontWeight: 700 }}>{t('app.title')}</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          onClick={({ key }) => nav(key)}
          items={[
            { key: '/my-work', icon: <ProfileOutlined />, label: t('nav.myWork') },
            { key: '/board', icon: <AppstoreOutlined />, label: t('nav.board') },
            { key: '/work', icon: <UnorderedListOutlined />, label: 'فهرست کارها' },
            { key: '/insights', icon: <LineChartOutlined />, label: 'تصویر کلی' },
            { key: '/projects', icon: <FolderOutlined />, label: t('nav.projects') },
            { key: '/team', icon: <TeamOutlined />, label: t('nav.team') },
            { key: '/admin', icon: <SettingOutlined />, label: t('nav.admin') },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Dropdown
            menu={{ items: [{ key: 'logout', label: t('auth.logout'), onClick: logout }] }}
          >
            <Typography.Text style={{ cursor: 'pointer' }}>
              <UserOutlined /> {user?.fullName}
            </Typography.Text>
          </Dropdown>
        </Header>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
