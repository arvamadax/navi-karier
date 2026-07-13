import { Building2 } from 'lucide-react';
import ComingSoon from '../../../../components/dashboard/ComingSoon';

export default function CompanyDashboardPlaceholder() {
  return (
    <ComingSoon
      title="Company Dashboard"
      icon={Building2}
      description="Dashboard untuk perusahaan/HR sedang dalam pengembangan. Fitur talent pool, gap analytics, dan invite & assess akan hadir setelah fase MVP job seeker selesai."
      plannedFeatures={[
        'Talent Pool — cari kandidat berdasarkan match score',
        'Job Roles — kelola requirement kompetensi per posisi',
        'Gap Analytics — agregat skill gap dari kandidat yang melamar',
        'Invite & Assess — undang kandidat untuk analisis CV',
        'Reports — ekspor laporan kesiapan kerja kandidat',
      ]}
    />
  );
}
