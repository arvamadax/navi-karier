import { ShieldCheck } from 'lucide-react';
import ComingSoon from '../../../../components/dashboard/ComingSoon';

export default function AdminDashboardPlaceholder() {
  return (
    <ComingSoon
      title="Admin Dashboard"
      icon={ShieldCheck}
      description="Panel administrasi platform sedang dalam pengembangan. Saat ini akun admin dikelola langsung lewat database untuk kebutuhan operasional dasar."
      plannedFeatures={[
        'User Management — kelola akun job seeker & company',
        'Companies — verifikasi dan kelola akun perusahaan',
        'Analytics — statistik penggunaan platform',
        'AI Management — monitoring biaya & performa Claude API',
        'Billing — kelola langganan Pro/Enterprise',
        'System Config — pengaturan environment platform',
      ]}
    />
  );
}
