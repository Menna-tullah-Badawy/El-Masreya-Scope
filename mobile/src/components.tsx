import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Product, Post } from './api';
import { colors, radius } from './theme';
import { money, pickLang } from './i18n';
import { useStore } from './store';
import { Badge, Card, Img, Row, Stars, Txt, useLayout, useT } from './ui';

export function ProductCard({ p, onPress }: { p: Product; onPress: () => void }) {
  const { lang, compare, toggleCompare, rtl } = useStore();
  const { t } = useT();
  const name = pickLang(p, 'name', lang);
  const short = pickLang(p, 'short', lang);
  const inCompare = !!compare.find((c) => c.id === p.id);
  const soldOut = p.units_available <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: any) => [
        {
          flex: 1,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          overflow: 'hidden',
          opacity: pressed ? 0.97 : 1,
        },
        Platform.OS === 'web'
          ? ({ transition: 'all 0.2s ease', cursor: 'pointer' } as any)
          : null,
      ]}
    >
      <View>
        <Img uri={p.image} ratio={1.45} radiusTop={false} style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 } as any} />
        <View style={{ position: 'absolute', top: 10, [rtl ? 'right' : 'left']: 10, flexDirection: 'row', gap: 6 } as any}>
          {p.is_for_rent ? <Badge label={t('forRent')} tone="available" small /> : null}
          {p.is_for_sale ? <Badge label={t('forSale')} tone="reserved" small /> : null}
        </View>
        <Pressable
          onPress={(e: any) => { e.stopPropagation?.(); toggleCompare(p); }}
          style={{
            position: 'absolute', top: 10, [rtl ? 'left' : 'right']: 10,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: inCompare ? colors.text : 'rgba(255,255,255,0.96)',
            borderWidth: 1, borderColor: inCompare ? colors.text : colors.border,
            alignItems: 'center', justifyContent: 'center',
          } as any}
        >
          <Text style={{ fontSize: 11, color: inCompare ? '#fff' : colors.sub, fontWeight: '700' }}>⇄</Text>
        </Pressable>
        {soldOut ? (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(17,17,19,0.9)', paddingVertical: 5 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 }}>{t('outOfStock')}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 7 }}>
        <Txt size={10.5} color={colors.muted} style={{ letterSpacing: 0.4, textTransform: 'uppercase' as any }} numberOfLines={1}>
          {p.brand} {p.model ? `· ${p.model}` : ''}
        </Txt>
        <Txt bold="650" size={13.5} numberOfLines={2} style={{ minHeight: 36, lineHeight: 18 }}>{name}</Txt>
        <Txt size={11.5} color={colors.sub} numberOfLines={2} style={{ minHeight: 30, lineHeight: 16 }}>{short}</Txt>

        <Row center gap={5}>
          <Stars value={p.rating_avg} size={11} />
          <Txt size={10.5} color={colors.muted}>{p.rating_count ? `${p.rating_avg.toFixed(1)} · ${p.rating_count}` : '—'}</Txt>
        </Row>

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4, opacity: 0.7 }} />

        <Row between center>
          <View>
            {p.is_for_rent ? (
              <Row center gap={4}>
                <Txt bold="700" size={15} style={{ letterSpacing: -0.3 }}>{money(p.rent_daily, lang)}</Txt>
                <Txt size={10.5} color={colors.muted}>{t('perDay')}</Txt>
              </Row>
            ) : (
              <Txt bold="700" size={15} style={{ letterSpacing: -0.3 }}>{money(p.sale_price, lang)}</Txt>
            )}
            {p.is_for_rent && p.rent_monthly > 0 ? (
              <Txt size={10} color={colors.muted}>{money(p.rent_monthly, lang)} {t('perMonth')}</Txt>
            ) : null}
          </View>
          <View style={{ alignItems: rtl ? 'flex-start' : 'flex-end' }}>
            <Txt size={10.5} bold="600" color={soldOut ? colors.danger : colors.sub}>{p.units_available} {t('available')}</Txt>
            <Txt size={10} color={colors.muted}>{p.units_total} {lang === 'ar' ? 'وحدة' : 'units'}</Txt>
          </View>
        </Row>
      </View>
    </Pressable>
  );
}

export function Grid({ children, min = 250 }: { children: React.ReactNode; min?: number }) {
  const { cols } = useLayout();
  const arr = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < arr.length; i += cols) rows.push(arr.slice(i, i + cols));
  const { rtl } = useStore();
  return (
    <View style={{ gap: 14 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 14 }}>
          {r.map((c, j) => <View key={j} style={{ flex: 1 }}>{c}</View>)}
          {r.length < cols ? Array.from({ length: cols - r.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />) : null}
        </View>
      ))}
    </View>
  );
}

export function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const { lang } = useStore();
  return (
    <Card pad={0} onPress={onPress} style={{ overflow: 'hidden', flex: 1 }}>
      <Img uri={post.cover} ratio={2} radiusTop />
      <View style={{ padding: 14, gap: 7 }}>
        <Row gap={6} wrap>
          {(post.tags || []).slice(0, 2).map((tg) => <Badge key={tg} label={tg} small />)}
        </Row>
        <Txt bold="700" size={14} numberOfLines={2}>{pickLang(post, 'title', lang)}</Txt>
        <Txt size={12} color={colors.sub} numberOfLines={3}>{pickLang(post, 'excerpt', lang)}</Txt>
        <Txt size={11} color={colors.muted}>{post.author} · {post.views} {lang === 'ar' ? 'مشاهدة' : 'views'}</Txt>
      </View>
    </Card>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void; }) {
  return (
    <Row between center>
      <Txt bold="700" size={16} style={{ letterSpacing: -0.3 }}>{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
          <Txt size={12.5} bold="600" color={colors.sub}>{action} →</Txt>
        </Pressable>
      ) : null}
    </Row>
  );
}

export function Banner({ level = 'info', text }: { level?: 'info' | 'warning' | 'danger' | 'success'; text: string }) {
  const map = {
    info: { bg: colors.infoBg, fg: colors.info, icon: 'ℹ️' },
    warning: { bg: colors.warningBg, fg: colors.warning, icon: '⚠️' },
    danger: { bg: colors.dangerBg, fg: colors.danger, icon: '⛔' },
    success: { bg: colors.successBg, fg: colors.success, icon: '✅' },
  }[level];
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: map.fg + '22' }}>
      <Row center gap={8}>
        <Text style={{ fontSize: 14 }}>{map.icon}</Text>
        <Txt size={12.5} color={map.fg} style={{ flex: 1, lineHeight: 18 }}>{text}</Txt>
      </Row>
    </View>
  );
}
