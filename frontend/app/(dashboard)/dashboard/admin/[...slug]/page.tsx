import ComingSoon from '../../../../components/dashboard/ComingSoon';

const FEATURES: Record<string, { title: string; description: string }> = {
  companies: {
    title: 'Companies',
    description: 'Verifikasi dan kelola akun perusahaan terdaftar, beserta kuota penggunaan dan status langganan.',
  },
  analytics: {
    title: 'Platform Analytics',
    description: 'Tren penggunaan platform, distribusi role yang dianalisis, dan agregat skill gap nasional dari seluruh kandidat.',
  },
  ai: {
    title: 'AI Management',
    description: 'Pantau penggunaan Claude API, estimasi biaya per analisis, dan konfigurasi prompt engine analisis gap.',
  },
  billing: {
    title: 'Billing',
    description: 'Kelola langganan Pro/Enterprise, invoice, dan pembayaran seluruh akun platform.',
  },
  config: {
    title: 'System Config',
    description: 'Konfigurasi sistem: role skill map, referensi SKKNI terverifikasi, CORS, dan feature flags.',
  },
};

export default function AdminCatchAll({ params }: { params: { slug?: string[] } }) {
  const key = params.slug?.[0] ?? '';
  const meta = FEATURES[key] ?? {
    title: 'Admin',
    description: 'Halaman panel admin ini sedang dalam pengembangan.',
  };
  return <ComingSoon title={meta.title} description={meta.description} />;
}
