import ComingSoon from '../../../../components/dashboard/ComingSoon';

const FEATURES: Record<string, { title: string; description: string }> = {
  roles: {
    title: 'Job Roles',
    description: 'Kelola requirement kompetensi per posisi. Definisikan skill & level yang dibutuhkan, lalu cocokkan otomatis dengan talent pool.',
  },
  invite: {
    title: 'Invite & Assess',
    description: 'Undang kandidat via email untuk mengunggah CV dan menjalankan analisis gap. Hasilnya langsung masuk ke talent pool perusahaan.',
  },
  reports: {
    title: 'Reports',
    description: 'Ekspor laporan kesiapan kerja kandidat dalam format PDF/Excel untuk kebutuhan rekrutmen dan pelatihan.',
  },
  settings: {
    title: 'Company Settings',
    description: 'Kelola profil perusahaan, anggota tim HR, dan preferensi rekrutmen.',
  },
};

export default function CompanyCatchAll({ params }: { params: { slug?: string[] } }) {
  const key = params.slug?.[0] ?? '';
  const meta = FEATURES[key] ?? {
    title: 'Company',
    description: 'Halaman dashboard perusahaan ini sedang dalam pengembangan.',
  };
  return <ComingSoon title={meta.title} description={meta.description} />;
}
