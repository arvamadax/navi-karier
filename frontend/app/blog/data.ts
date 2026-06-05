export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  readTime: string;
  content: string;
};

export const posts: BlogPost[] = [
  {
    slug: 'skill-gap-krisis-ekonomi-indonesia',
    title: 'Skill Gap: Krisis Ekonomi yang Jarang Dibicarakan',
    excerpt:
      'Data BPS menunjukkan 7,46 juta pengangguran di Indonesia mayoritas karena mismatch skill. Bagaimana kita bisa mengatasinya?',
    date: '2026-06-01',
    author: 'Tim NaviKarier',
    category: 'Insight',
    readTime: '5 min',
    content: `
## Angka yang Mengkhawatirkan

Per Februari 2024, BPS mencatat 7,46 juta orang menganggur di Indonesia. Tapi yang jarang dibahas adalah **penyebab utamanya**: mismatch antara skill yang dimiliki pelamar dengan kebutuhan industri.

## Bukan Soal Kurang Lowongan

Indonesia sebenarnya punya banyak lowongan kerja. Masalahnya, 51,5% pelamar tidak memenuhi kualifikasi minimum posisi yang dilamar. Ini bukan soal kurangnya pendidikan — ini soal **relevansi skill**.

## Dampak Ekonomi

Bank Indonesia memperkirakan kerugian ekonomi akibat produktivitas yang tidak optimal mencapai **Rp 142 triliun per tahun**. Angka ini setara dengan total belanja pendidikan beberapa provinsi.

## Solusi: Data-Driven Upskilling

Langkah pertama untuk mengatasi skill gap adalah **mengukurnya secara akurat**. Tanpa data yang jelas, upskilling menjadi tebakan — kamu belajar hal yang belum tentu dibutuhkan industri.

NaviKarier hadir untuk mengubah pendekatan ini. Dengan menghitung gap secara matematis berdasarkan standar industri, kamu tahu persis skill mana yang harus diprioritaskan.

## Mulai dari Diri Sendiri

Perubahan sistemik membutuhkan waktu. Tapi kamu bisa mulai dari langkah kecil: **ukur skill gap kamu hari ini**, lalu buat rencana belajar yang terarah.
    `,
  },
  {
    slug: 'cara-mengukur-skill-gap',
    title: '3 Cara Mengukur Skill Gap Kamu (Yang Sebenarnya Akurat)',
    excerpt:
      'Kebanyakan orang menilai skill mereka berdasarkan feeling. Ini cara yang lebih objektif dan actionable.',
    date: '2026-05-28',
    author: 'Tim NaviKarier',
    category: 'Tutorial',
    readTime: '4 min',
    content: `
## Masalah dengan Self-Assessment

Riset menunjukkan bahwa manusia buruk dalam menilai kemampuan sendiri. Fenomena ini disebut **Dunning-Kruger effect** — orang yang kurang kompeten cenderung overestimate kemampuannya, sementara yang kompeten justru underestimate.

## Cara 1: Bandingkan dengan Job Description

Ambil 5-10 job listing untuk posisi yang kamu tuju. Catat semua skill yang diminta dan rating-nya. Bandingkan dengan kemampuan kamu secara jujur.

**Kelebihan:** Gratis dan langsung relevan.
**Kekurangan:** Subjektif dan memakan waktu.

## Cara 2: Ikuti Skill Assessment Online

Platform seperti LinkedIn, HackerRank, atau Coursera menawarkan assessment per-skill. Hasilnya lebih objektif karena diukur lewat tes.

**Kelebihan:** Objektif per-skill.
**Kekurangan:** Hanya mengukur satu skill per tes, tidak memberikan gambaran keseluruhan.

## Cara 3: Gunakan Skill Gap Analyzer

Tools seperti NaviKarier menghitung gap antara seluruh profil skill kamu vs standar industri secara bersamaan. Hasilnya langsung menunjukkan prioritas: skill mana yang paling berdampak jika ditingkatkan.

**Kelebihan:** Holistik, cepat, dan langsung actionable.
**Kekurangan:** Bergantung pada kejujuran input.

## Kesimpulan

Metode terbaik adalah kombinasi: gunakan analyzer untuk gambaran besar, lalu validasi dengan assessment per-skill untuk area yang paling kritis.
    `,
  },
  {
    slug: 'upskilling-vs-reskilling',
    title: 'Upskilling vs Reskilling: Mana yang Kamu Butuhkan?',
    excerpt:
      'Dua istilah yang sering tertukar. Padahal strateginya sangat berbeda — salah pilih bisa buang waktu berbulan-bulan.',
    date: '2026-05-20',
    author: 'Tim NaviKarier',
    category: 'Karier',
    readTime: '3 min',
    content: `
## Definisi Singkat

**Upskilling** = meningkatkan skill yang sudah kamu punya agar lebih dalam atau sesuai standar terbaru. Contoh: frontend developer belajar TypeScript.

**Reskilling** = belajar skill baru untuk pindah ke role yang berbeda. Contoh: akuntan belajar data analysis.

## Kapan Upskilling?

Upskilling cocok ketika:
- Kamu sudah di industri yang tepat tapi skill belum memenuhi standar
- Gap antara skill kamu dan requirement relatif kecil (< 30%)
- Kamu ingin naik level di role yang sama

## Kapan Reskilling?

Reskilling cocok ketika:
- Industri kamu sedang declining
- Kamu ingin pivot ke bidang yang sangat berbeda
- Gap terlalu besar untuk di-bridge dengan upskilling

## Bagaimana NaviKarier Membantu?

Ketika kamu menjalankan skill gap analysis di NaviKarier, hasilnya akan menunjukkan apakah gap kamu bersifat **incremental** (butuh upskilling) atau **fundamental** (butuh reskilling). Ini menghemat waktu dan mencegah investasi belajar yang salah arah.

## Prinsip Utama

Apapun pilihannya, yang penting adalah **mulai dari data, bukan asumsi**. Ukur dulu, baru belajar.
    `,
  },
  {
    slug: 'industri-paling-banyak-skill-gap',
    title: '5 Industri dengan Skill Gap Terbesar di Indonesia 2026',
    excerpt:
      'Berdasarkan analisis ribuan job listing, ini industri yang paling kesulitan menemukan kandidat qualified.',
    date: '2026-05-15',
    author: 'Tim NaviKarier',
    category: 'Data',
    readTime: '6 min',
    content: `
## Metodologi

Data diambil dari analisis 10.000+ job listing Indonesia di Q1 2026, dibandingkan dengan profil skill rata-rata pelamar di setiap industri.

## 1. Technology — Gap Score: 38%

Permintaan untuk cloud, AI/ML, dan cybersecurity jauh melampaui supply. Skill yang paling gap: **cloud architecture**, **MLOps**, dan **security engineering**.

## 2. Financial Services — Gap Score: 34%

Transformasi digital di perbankan dan fintech menciptakan gap besar di **data engineering**, **risk modeling**, dan **regulatory technology**.

## 3. Healthcare — Gap Score: 31%

Bukan hanya soal tenaga medis. Gap terbesar justru di **health informatics**, **telemedicine operations**, dan **clinical data management**.

## 4. Manufacturing — Gap Score: 28%

Industri 4.0 membutuhkan skill yang belum banyak dimiliki: **IoT integration**, **predictive maintenance**, dan **supply chain analytics**.

## 5. Education — Gap Score: 25%

EdTech boom menciptakan kebutuhan baru: **instructional design**, **learning analytics**, dan **digital curriculum development**.

## Implikasi

Jika kamu di salah satu industri ini, peluang untuk menonjol lewat upskilling sangat besar. Gap yang lebar = kesempatan yang lebar.
    `,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
