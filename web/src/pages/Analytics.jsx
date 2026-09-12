import { useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useHoldings } from '@/hooks/queries'
import { Page } from '@/components/Page'
import { Section } from '@/components/Section'
import { catOf } from '@/lib/assetColors'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const formatTRY = (value) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value ?? 0)

const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#F7F6F1',
  border: '1px solid #D9D6CB',
  borderRadius: '8px',
  color: '#1C1B18',
}

export default function Analytics() {
  const { t } = useLanguage()
  const { data: holdings = [], isLoading, error } = useHoldings()

  // Pie: varlık tipine göre dağılım
  const pieData = useMemo(() => {
    const typeValueMap = {}
    for (const h of holdings) {
      typeValueMap[h.assetType] = (typeValueMap[h.assetType] ?? 0) + (h.valueInTry ?? 0)
    }
    const totalAll = Object.values(typeValueMap).reduce((a, b) => a + b, 0)
    return Object.entries(typeValueMap).map(([name, value]) => ({
      name: t(`assets.${name.toLowerCase()}`),
      typeKey: name,
      value: parseFloat(((value / (totalAll || 1)) * 100).toFixed(2)),
      absValue: value,
    }))
  }, [holdings, t])

  return (
    <Page eyebrow={t('nav.sectionGeneral')} title={t('nav.analytics')}>
      {isLoading ? (
        <div className="text-ui text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-ui text-down" role="alert">{t('common.error')}: {error.message}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Varlık dağılımı */}
          <Section title={t('analytics.allocation')} meta={`${pieData.length} ${t('overview.assetCount')}`}>
            {pieData.length === 0 ? (
              <p className="py-10 text-center text-ui text-muted-foreground">{t('assets.noAssets')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.typeKey} fill={catOf(entry.typeKey).hex} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value, name, props) => [
                      `${value}% (${formatTRY(props.payload.absValue)})`,
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Section>
        </div>
      )}
    </Page>
  )
}
