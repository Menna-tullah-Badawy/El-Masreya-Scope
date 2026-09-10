import React from 'react';
import {
  I18nManager, Platform, Pressable, ScrollView, StatusBar, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native';
import { StoreProvider, useStore, Route } from './src/store';
import { colors, radius, shadow } from './src/theme';
import { Badge, Loading, Row, Toasts, Txt, openUrl, useLayout, useT, waLink } from './src/ui';

import HomeScreen from './src/screens/Home';
import CatalogScreen from './src/screens/Catalog';
import ProductScreen from './src/screens/Product';
import CartScreen, { CheckoutScreen } from './src/screens/Cart';
import { OrdersScreen, OrderDetailScreen } from './src/screens/Orders';
import {
  AuthScreen, BlogScreen, CompareScreen, NotificationsScreen, PostScreen, ProfileScreen,
} from './src/screens/Misc';
import { AdminDashboard, AdminReports } from './src/screens/AdminDash';
import { AdminPosts, AdminProducts, AdminUnits } from './src/screens/AdminCatalog';
import {
  AdminCustomers, AdminMaintenance, AdminOrderDetail, AdminOrders, AdminReviews, AdminSettings,
} from './src/screens/AdminOps';

// -------------------------------------------------------------- renderer
function Screen() {
  const { route } = useStore();
  switch (route.name) {
    case 'home': return <HomeScreen />;
    case 'catalog': return <CatalogScreen initialCategory={route.category} initialMode={route.mode} initialQ={route.q} />;
    case 'product': return <ProductScreen id={route.id} />;
    case 'compare': return <CompareScreen />;
    case 'cart': return <CartScreen />;
    case 'checkout': return <CheckoutScreen />;
    case 'orders': return <OrdersScreen />;
    case 'order': return <OrderDetailScreen id={route.id} />;
    case 'blog': return <BlogScreen />;
    case 'post': return <PostScreen id={route.id} />;
    case 'profile': return <ProfileScreen />;
    case 'auth': return <AuthScreen mode={route.mode} />;
    case 'notifications': return <NotificationsScreen />;
    case 'admin.dashboard': return <AdminDashboard />;
    case 'admin.products': return <AdminProducts />;
    case 'admin.units': return <AdminUnits />;
    case 'admin.orders': return <AdminOrders />;
    case 'admin.order': return <AdminOrderDetail id={route.id} />;
    case 'admin.customers': return <AdminCustomers />;
    case 'admin.maintenance': return <AdminMaintenance />;
    case 'admin.reviews': return <AdminReviews />;
    case 'admin.posts': return <AdminPosts />;
    case 'admin.reports': return <AdminReports />;
    case 'admin.settings': return <AdminSettings />;
    default: return <HomeScreen />;
  }
}

// ---------------------------------------------------------------- header — Minimal + blur (Linear/Apple)
function Header() {
  const { go, user, cartCount, unread, lang, setLang, route, back, canGoBack, logout, rtl } = useStore();
  const { t } = useT();
  const { isPhone, isDesktop } = useLayout();
  const isAdminArea = route.name.startsWith('admin.');

  const navItems: { r: Route; label: string }[] = [
    { r: { name: 'home' }, label: t('home') },
    { r: { name: 'catalog' }, label: t('catalog') },
    { r: { name: 'blog' }, label: t('blog') },
    { r: { name: 'orders' }, label: t('orders') },
  ];

  return (
    <View
      style={{
        backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.84)' : '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        zIndex: 20,
        ...(Platform.OS === 'web' ? ({ backdropFilter: 'saturate(180%) blur(12px)' } as any) : null),
      }}
    >
      <View style={{
        maxWidth: 1400, width: '100%', alignSelf: 'center',
        paddingHorizontal: 14, paddingVertical: 10,
        flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12,
      }}>
        {canGoBack && isPhone ? (
          <Pressable onPress={back} hitSlop={10} style={{ padding: 4 }}>
            <Text style={{ fontSize: 19, color: colors.brandDark }}>{rtl ? '→' : '←'}</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => go({ name: 'home' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: colors.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 13, color: '#fff', fontWeight: '800', letterSpacing: 0.5 }}>S</Text>
          </View>
          {!isPhone || !canGoBack ? (
            <View>
              <Txt bold="700" size={14} style={{ letterSpacing: -0.4 }}>
                SCOPE
              </Txt>
              {!isPhone ? <Txt size={10} color={colors.muted} style={{ letterSpacing: 0.3, marginTop: -2 }}>{t('appTagline')}</Txt> : null}
            </View>
          ) : null}
        </Pressable>

        {isDesktop && !isAdminArea ? (
          <Row gap={2} style={{ marginHorizontal: 18 }}>
            {navItems.map((n) => {
              const active = route.name === n.r.name;
              return (
                <Pressable
                  key={n.label}
                  onPress={() => go(n.r)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    backgroundColor: active ? colors.surface : 'transparent',
                    borderWidth: active ? 1 : 0,
                    borderColor: colors.border,
                  }}
                >
                  <Txt size={13} bold={active ? '600' : '500'} color={active ? colors.text : colors.sub}>
                    {n.label}
                  </Txt>
                </Pressable>
              );
            })}
          </Row>
        ) : null}

        <View style={{ flex: 1 }} />

        <Row center gap={7}>
          <Pressable
            onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Txt size={11.5} bold="600" color={colors.sub}>
              {lang === 'ar' ? 'EN' : 'عربي'}
            </Txt>
          </Pressable>

          {!isAdminArea ? <IconBtn icon="◧" badge={cartCount} onPress={() => go({ name: 'cart' })} /> : null}
          {user ? <IconBtn icon="◎" badge={unread} onPress={() => go({ name: 'notifications' })} /> : null}

          {user ? (
            <Pressable onPress={() => go({ name: 'profile' })}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Txt bold="600" size={12} color="#fff">
                  {user.name?.[0]}
                </Txt>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => go({ name: 'auth' })}
              style={{
                backgroundColor: colors.text,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
              }}
            >
              <Txt size={12.5} bold="600" color="#fff">
                {t('login')}
              </Txt>
            </Pressable>
          )}
        </Row>
      </View>

      {user?.role === 'admin' && !isAdminArea ? (
        <Pressable onPress={() => go({ name: 'admin.dashboard' })}
          style={{ backgroundColor: colors.dark, paddingVertical: 7 }}>
          <Txt center size={12} bold="700" color="#fff">⚙️ {t('adminPanel')} ←</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function IconBtn({ icon, badge, onPress }: { icon: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.sub }}>{icon}</Text>
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: colors.text,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// -------------------------------------------------------------- sidebar
const ADMIN_NAV: { r: Route; key: any; icon: string }[] = [
  { r: { name: 'admin.dashboard' }, key: 'dashboard', icon: '📊' },
  { r: { name: 'admin.orders' }, key: 'allOrders', icon: '📦' },
  { r: { name: 'admin.products' }, key: 'products', icon: '🩺' },
  { r: { name: 'admin.units' }, key: 'units', icon: '🔖' },
  { r: { name: 'admin.maintenance' }, key: 'maintenance', icon: '🛠️' },
  { r: { name: 'admin.customers' }, key: 'customers', icon: '👥' },
  { r: { name: 'admin.reviews' }, key: 'reviews', icon: '⭐' },
  { r: { name: 'admin.posts' }, key: 'posts', icon: '📰' },
  { r: { name: 'admin.reports' }, key: 'reports', icon: '📈' },
  { r: { name: 'admin.settings' }, key: 'settings', icon: '⚙️' },
];

function AdminSidebar() {
  const { route, go, rtl } = useStore();
  const { t } = useT();
  return (
    <View style={{
      width: 218, backgroundColor: colors.dark, paddingVertical: 16, paddingHorizontal: 10, gap: 4,
    }}>
      <Txt size={10.5} bold="800" color="rgba(255,255,255,0.4)" style={{ paddingHorizontal: 10, marginBottom: 6 }}>
        {t('adminPanel').toUpperCase()}
      </Txt>
      {ADMIN_NAV.map((n) => {
        const active = route.name === n.r.name
          || (n.r.name === 'admin.orders' && route.name === 'admin.order');
        return (
          <Pressable key={n.r.name} onPress={() => go(n.r)}
            style={{
              paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md,
              backgroundColor: active ? colors.brand : 'transparent',
              flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10,
            }}>
            <Text style={{ fontSize: 15 }}>{n.icon}</Text>
            <Text style={{
              color: active ? '#fff' : 'rgba(255,255,255,0.72)',
              fontWeight: active ? '800' : '600', fontSize: 13.5,
            }}>{t(n.key)}</Text>
          </Pressable>
        );
      })}
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 10 }} />
      <Pressable onPress={() => go({ name: 'home' })}
        style={{
          paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md,
          flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10,
        }}>
        <Text style={{ fontSize: 15 }}>🏬</Text>
        <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13.5, fontWeight: '600' }}>{t('exitAdmin')}</Text>
      </Pressable>
    </View>
  );
}

// ------------------------------------------------------------ bottom tabs
function BottomTabs() {
  const { route, go, cartCount, user, rtl } = useStore();
  const { t } = useT();
  const isAdminArea = route.name.startsWith('admin.');

  const items = isAdminArea
    ? [
      { r: { name: 'admin.dashboard' } as Route, label: t('dashboard'), icon: '📊' },
      { r: { name: 'admin.orders' } as Route, label: t('allOrders'), icon: '📦' },
      { r: { name: 'admin.products' } as Route, label: t('products'), icon: '🩺' },
      { r: { name: 'admin.maintenance' } as Route, label: t('maintenance'), icon: '🛠️' },
      { r: { name: 'admin.reports' } as Route, label: t('reports'), icon: '📈' },
    ]
    : [
      { r: { name: 'home' } as Route, label: t('home'), icon: '🏠' },
      { r: { name: 'catalog' } as Route, label: t('catalog'), icon: '🩺' },
      { r: { name: 'cart' } as Route, label: t('cart'), icon: '🛒', badge: cartCount },
      { r: { name: 'orders' } as Route, label: t('orders'), icon: '📦' },
      { r: { name: user ? 'profile' : 'auth' } as Route, label: user ? t('profile') : t('login'), icon: '👤' },
    ];

  return (
    <View style={{
      flexDirection: rtl ? 'row-reverse' : 'row', backgroundColor: '#fff',
      borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 6, paddingTop: 6,
    }}>
      {items.map((it: any) => {
        const active = route.name === it.r.name;
        return (
          <Pressable key={it.label} onPress={() => go(it.r)}
            style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 3 }}>
            <View>
              <Text style={{ fontSize: 18, opacity: active ? 1 : 0.55 }}>{it.icon}</Text>
              {it.badge ? (
                <View style={{
                  position: 'absolute', top: -4, right: -9, minWidth: 16, height: 16, borderRadius: 8,
                  backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{it.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={{
              fontSize: 10, fontWeight: active ? '800' : '600',
              color: active ? colors.brandDark : colors.muted,
            }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------- footer
function Footer() {
  const { lang, settings, go } = useStore();
  const { t } = useT();
  const wa = settings.whatsapp || '201113138839';
  return (
    <View style={{ backgroundColor: colors.dark, paddingVertical: 28, paddingHorizontal: 18, marginTop: 30 }}>
      <View style={{ maxWidth: 1400, width: '100%', alignSelf: 'center', gap: 16 }}>
        <Row wrap gap={30} between>
          <View style={{ gap: 8, minWidth: 230, flex: 1 }}>
            <Row center gap={9}>
              <View style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: colors.brand,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 17 }}>🔬</Text>
              </View>
              <View>
                <Txt bold="800" size={15} color="#fff">SCOPE</Txt>
                <Txt size={10.5} color="rgba(255,255,255,0.5)">{t('appTagline')}</Txt>
              </View>
            </Row>
            <Txt size={12} color="rgba(255,255,255,0.6)" style={{ lineHeight: 20, maxWidth: 320 }}>
              {lang === 'ar'
                ? 'تأجير وبيع المناظير والأجهزة الطبية للمستشفيات والعيادات والرعاية المنزلية في مصر.'
                : 'Rental and sales of endoscopes and medical equipment for hospitals, clinics and home care across Egypt.'}
            </Txt>
          </View>

          <View style={{ gap: 7, minWidth: 150 }}>
            <Txt bold="700" size={13} color="#fff">{lang === 'ar' ? 'روابط' : 'Links'}</Txt>
            {[
              { l: t('catalog'), r: { name: 'catalog' } as Route },
              { l: t('blog'), r: { name: 'blog' } as Route },
              { l: t('orders'), r: { name: 'orders' } as Route },
              { l: t('compare'), r: { name: 'compare' } as Route },
            ].map((x) => (
              <Pressable key={x.l} onPress={() => go(x.r)}>
                <Txt size={12.5} color="rgba(255,255,255,0.62)">{x.l}</Txt>
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 7, minWidth: 180 }}>
            <Txt bold="700" size={13} color="#fff">{lang === 'ar' ? 'تواصل معنا' : 'Contact'}</Txt>
            <Pressable onPress={() => openUrl(`tel:${settings.phone || '01113138839'}`)}>
              <Txt size={12.5} color="rgba(255,255,255,0.62)">📞 {settings.phone || '01113138839'}</Txt>
            </Pressable>
            <Pressable onPress={() => openUrl(waLink(wa, lang === 'ar' ? 'السلام عليكم' : 'Hello'))}>
              <Txt size={12.5} color="rgba(255,255,255,0.62)">💬 WhatsApp</Txt>
            </Pressable>
            <Txt size={12.5} color="rgba(255,255,255,0.62)">✉️ {settings.email || 'info@scope-eg.com'}</Txt>
            <Txt size={12.5} color="rgba(255,255,255,0.62)">
              📍 {lang === 'ar' ? (settings.address_ar || 'الجيزة، مصر') : (settings.address_en || 'Giza, Egypt')}
            </Txt>
          </View>
        </Row>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <Txt size={11.5} color="rgba(255,255,255,0.4)" center>
          © {new Date().getFullYear()} SCOPE Egypt — {lang === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
        </Txt>
      </View>
    </View>
  );
}

// ---------------------------------------------------------- floating WA
function WhatsAppFab() {
  const { settings, lang, route } = useStore();
  const { isPhone } = useLayout();
  if (route.name.startsWith('admin.')) return null;
  const wa = settings.whatsapp || '201113138839';
  return (
    <Pressable
      onPress={() => openUrl(waLink(wa, lang === 'ar' ? 'السلام عليكم، عايز أستفسر' : 'Hello, I have a question'))}
      style={{
        position: 'absolute', bottom: isPhone ? 74 : 24, right: 18,
        width: 52, height: 52, borderRadius: 26, backgroundColor: '#25D366',
        alignItems: 'center', justifyContent: 'center', ...shadow.md, zIndex: 500,
      }}>
      <Text style={{ fontSize: 25 }}>💬</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ shell
function Shell() {
  const { booting, route, rtl } = useStore();
  const { isPhone, isDesktop } = useLayout();
  const isAdminArea = route.name.startsWith('admin.');

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Loading label="SCOPE" />
      </View>
    );
  }

  const body = (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled">
      <View style={{
        padding: isPhone ? 13 : 20, gap: 16,
        maxWidth: isAdminArea ? 1500 : 1400, width: '100%', alignSelf: 'center',
      }}>
        <Screen />
      </View>
      {!isAdminArea ? <Footer /> : <View style={{ height: 20 }} />}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header />
      <View style={{ flex: 1, flexDirection: rtl ? 'row-reverse' : 'row' }}>
        {isAdminArea && isDesktop ? <AdminSidebar /> : null}
        {body}
      </View>
      {isPhone ? <BottomTabs /> : null}
      <WhatsAppFab />
      <Toasts />
    </View>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Shell />
      </SafeAreaView>
    </StoreProvider>
  );
}
