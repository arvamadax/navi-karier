# Referensi SKKNI (Standar Kompetensi Kerja Nasional Indonesia) per target role.
# Entry di bawah sudah diverifikasi ke sumber resmi (Kemnaker / LSP berlisensi BNSP).
# JANGAN menambah nomor regulasi atau kode unit kompetensi baru tanpa verifikasi
# ke skkni.kemnaker.go.id — role tanpa entry memang belum punya skema terverifikasi.

SKKNI_REFERENCE = {
    "Software Engineer": {
        "scheme_name": "Software Development – Pemrograman",
        "regulation": "Kepmenaker RI No. 282 Tahun 2016",
        "senior_scheme_name": "Software Requirements Analysis and Design",
        "senior_regulation": "Kepmenaker RI No. 44 Tahun 2017",
        "units": [
            {"code": "J.62SAD00.002.1", "name": "Melakukan Identifikasi Sumber Kebutuhan Perangkat Lunak"},
            {"code": "J.62SAD00.006.1", "name": "Membuat Kebutuhan Dokumentasi Spesifikasi Perangkat Lunak"},
            {"code": "J.62SAD00.011.1", "name": "Merancang Struktur Perangkat Lunak"},
        ],
        "note": "Skema junior/menengah mengacu Kepmenaker No. 282/2016 (Software Development – Pemrograman). Skema senior/arsitektur mengacu Kepmenaker No. 44/2017.",
    },
    "Backend Engineer": {
        "scheme_name": "Software Development – Pemrograman",
        "regulation": "Kepmenaker RI No. 282 Tahun 2016",
        "units": [],
        "note": "Sub-fokus server-side dari skema Software Development. Unit kompetensi spesifik server-side belum dikurasi dari dokumen resmi.",
    },
    "Frontend Developer": {
        "scheme_name": "Software Development – Pemrograman",
        "regulation": "Kepmenaker RI No. 282 Tahun 2016",
        "units": [],
        "note": "Sub-fokus client-side dari skema Software Development (mencakup okupasi Junior Web Programmer / Web Developer).",
    },
    "Fullstack Developer": {
        "scheme_name": "Software Development – Pemrograman",
        "regulation": "Kepmenaker RI No. 282 Tahun 2016",
        "units": [],
        "note": "Menggabungkan cakupan server-side dan client-side dari skema Software Development.",
    },
    "Mobile Developer": {
        "scheme_name": "Software Development – Pemrograman",
        "regulation": "Kepmenaker RI No. 282 Tahun 2016",
        "units": [],
        "note": "Mencakup okupasi Junior Mobile Programmer di bawah skema Software Development yang sama.",
    },
    "Data Analyst": {
        "scheme_name": "Data Science",
        "regulation": "Kepmenaker RI No. 299 Tahun 2020",
        "units": [],
        "note": "Skema mencakup okupasi Ilmuwan Data Madya (Associate Data Scientist). Unit kompetensi spesifik belum dikurasi dari dokumen resmi.",
    },
    "Data Scientist": {
        "scheme_name": "Data Science",
        "regulation": "Kepmenaker RI No. 299 Tahun 2020",
        "units": [],
        "note": "Skema mencakup okupasi Ilmuwan Data (Data Scientist). Unit kompetensi spesifik belum dikurasi dari dokumen resmi.",
    },
    "Cybersecurity Analyst": {
        "scheme_name": "Keamanan Informasi",
        "regulation": "Kepmenaker RI No. 55 Tahun 2015",
        "units": [],
        "note": "Sedang dalam proses pembaruan oleh BSSN melalui Peraturan BSSN No. 14 Tahun 2024 (Uji Keamanan Siber). Gunakan No. 55/2015 sebagai acuan resmi Kemnaker yang berlaku saat ini.",
    },
}


def get_skkni_reference(target_role: str):
    return SKKNI_REFERENCE.get(target_role)


def format_reference_standard(target_role: str):
    ref = SKKNI_REFERENCE.get(target_role)
    return f"{ref['scheme_name']} — {ref['regulation']}" if ref else None
