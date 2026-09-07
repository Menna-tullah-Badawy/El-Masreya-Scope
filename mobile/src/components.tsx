import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Product, Post } from './api';
import { colors, radius, shadow } from './theme';
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
    <Card pad={0} onPress={onPress} style={{ overflow: 'hidden', flex: 1 }}>
      <View>
        <Img uri={p.image} ratio={1.5} radiusTop />
        <View style={{
          position: 'absolute', top: 10, [rtl ? 'right' : 'left']: 10,
          flexDirection: 'row', gap: 6,
        } as any}>
          {p.is_for_rent ? <Badge label={t('forRent')} tone="available" small /> : null}
          {p.is_for_sale ? <Badge label={t('forSale')} tone="reserved" small /> : null}
        </View>
        <Pressable
          onPress={(e: any) => { e.stopPropagation?.(); toggleCompare(p); }}
          style={{
            position: 'absolute', top: 8, [rtl ? 'left' : 'right']: 8,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: inCompare ? colors.brand : 'rgba(255,255,255,0.94)',
            alignItems: 'center', justifyContent: 'center', ...shadow.sm,
          } as any}>
          <Text style={{ fontSize: 14, color: inCompare ? '#fff' : colors.sub }}>⇄</Text>
        </Pressable>
        {soldOut ? (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: 'rgba(214,69,69,0.92)', paddingVertical: 5,
          }}>
            <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '800', textAlign: 'center' }}>
              {t('outOfStock')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 13, gap: 7 }}>
        <Txt size={11} color={colors.muted} numberOfLines={1}>
          {p.brand} {p.model ? `· ${p.model}` : ''}
        </Txt>
        <Txt bold="700" size={14.5} numberOfLines={2} style={{ minHeight: 38 }}>{name}</Txt>
        <Txt size={11.5} color={colors.sub} numberOfLines={2} style={{ minHeight: 32 }}>{short}</Txt>

        <Row center gap={6}>
          <Stars value={p.rating_avg} size={12} />
          <Txt size={11} color={colors.muted}>
            {p.rating_count ? `${p.rating_avg.toFixed(1)} (${p.rating_count})` : '—'}
          </Txt>
        </Row>

        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />

        <Row between center>
          <View>
            {p.is_for_rent ? (
              <Row center gap={3}>
                <Txt bold="800" size={16} color={colors.brandDark}>{money(p.rent_daily, lang)}</Txt>
                <Txt size={11} color={colors.muted}>{t('perDay')}</Txt>
              </Row>
            ) : (
              <Txt bold="800" size={16} color={colors.brandDark}>{money(p.sale_price, lang)}</Txt>
            )}
            {p.is_for_rent && p.rent_monthly > 0 ? (
              <Txt size={10.5} color={colors.muted}>{money(p.rent_monthly, lang)} {t('perMonth')}</Txt>
            ) : null}
          </View>
          <View style={{ alignItems: rtl ? 'flex-start' : 'flex-end' }}>
            <Txt size={11} bold="700" color={soldOut ? colors.danger : colors.success}>
              {p.units_available} {t('available')}
            </Txt>
            <Txt size={10} color={colors.muted}>{p.units_total} {lang === 'ar' ? 'وحدة' : 'units'}</Txt>
          </View>
        </Row>
      </View>
    </Card>
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
          {r.length < cols
            ? Array.from({ length: cols - r.length }).map((_, k) => <View key={`f${k}`} style={{ flex: 1 }} />)
            : null}
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
        <Txt bold="700" size={15} numberOfLines={2}>{pickLang(post, 'title', lang)}</Txt>
        <Txt size={12.5} color={colors.sub} numberOfLines={3}>{pickLang(post, 'excerpt', lang)}</Txt>
        <Txt size={11} color={colors.muted}>
          {post.author} · {post.views} {lang === 'ar' ? 'مشاهدة' : 'views'}
        </Txt>
      </View>
    </Card>
  );
}

export function SectionHeader({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <Row between center>
      <Txt bold="800" size={19}>{title}</Txt>
      {action ? (
        <Pressable onPress={onAction}>
          <Txt size={13} bold="700" color={colors.brand}>{action} ←</Txt>
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
    <View style={{
      backgroundColor: map.bg, borderRadius: radius.md, padding: 12,
      borderWidth: 1, borderColor: map.fg + '33',
    }}>
      <Row center gap={8}>
        <Text style={{ fontSize: 15 }}>{map.icon}</Text>
        <Txt size={12.5} color={map.fg} style={{ flex: 1 }}>{text}</Txt>
      </Row>
    </View>
  );
}
