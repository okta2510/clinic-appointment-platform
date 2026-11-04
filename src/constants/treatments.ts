export const categories = [
  'Acne & Scar',
  'Brightening',
  'Anti-Aging',
  'Hair',
  'Slimming',
] as const;

export type Treatment = {
  title: string;
  description: string;
  category: Category;
  slug: string; // dipakai di URL /treatment/[treatmentSlug]
  price: number; // Rupiah, sama dengan seed-treatments.ts di backend
  image?: string;
  featured?: boolean; // tampil di carousel treatment unggulan
};

export type Category = (typeof categories)[number];

export const treatments: Treatment[] = [
  {
    slug: 'acne-dermapeel',
    price: 400000,
    title: 'Acne Dermapeel',
    description:
      'Menggunakan larutan kimia untuk mengangkat lapisan kulit terluar. Kulit baru yang muncul lebih halus dan cerah.',
    category: 'Acne & Scar',
  },
  {
    slug: 'ipl-acne',
    price: 550000,
    title: 'IPL Acne',
    description:
      'Memanfaatkan energi cahaya untuk membuat wajah lebih halus, cerah, dan membasmi jerawat.',
    category: 'Acne & Scar',
  },
  {
    slug: 'acne-laser-co2',
    price: 1800000,
    featured: true,
    title: 'Acne Laser Co2',
    description:
      'Menggunakan energi cahaya berintensitas tinggi untuk mengangkat sel kulit mati dan mempercepat regenerasi kulit.',
    category: 'Acne & Scar',
  },
  {
    slug: 'acne-facial',
    price: 250000,
    featured: true,
    title: 'Acne Facial',
    description:
      'Pengelupasan sel kulit mati, pemberian nutrisi, serta pelembapan untuk membuat kulit wajah lebih sehat.',
    category: 'Acne & Scar',
  },
  {
    slug: 'brightening-facial',
    price: 300000,
    featured: true,
    title: 'Brightening Facial',
    description:
      'Perawatan wajah untuk membantu mencerahkan kulit yang tampak kusam dan tidak merata.',
    category: 'Brightening',
  },
  {
    slug: 'glow-peeling',
    price: 350000,
    title: 'Glow Peeling',
    description:
      'Peeling ringan untuk mengangkat sel kulit mati sehingga kulit tampak lebih cerah dan segar.',
    category: 'Brightening',
  },
  {
    slug: 'vitamin-c-infusion',
    price: 450000,
    title: 'Vitamin C Infusion',
    description:
      'Pemberian nutrisi vitamin C ke kulit untuk membantu tampilan wajah lebih bercahaya.',
    category: 'Brightening',
  },
  {
    slug: 'anti-aging-facial',
    price: 400000,
    title: 'Anti-Aging Facial',
    description:
      'Perawatan wajah untuk membantu menjaga kekenyalan dan tampilan kulit agar tetap awet muda.',
    category: 'Anti-Aging',
  },
  {
    slug: 'skin-booster',
    price: 1500000,
    featured: true,
    title: 'Skin Booster',
    description:
      'Membantu melembapkan kulit dari dalam agar tampak lebih kenyal dan sehat.',
    category: 'Anti-Aging',
  },
  {
    slug: 'rf-lifting',
    price: 1200000,
    title: 'RF Lifting',
    description:
      'Menggunakan energi radiofrekuensi untuk membantu kulit tampak lebih kencang.',
    category: 'Anti-Aging',
  },
  {
    slug: 'hair-treatment',
    price: 350000,
    featured: true,
    title: 'Hair Treatment',
    description:
      'Perawatan kulit kepala dan rambut untuk membantu rambut tampak lebih sehat dan kuat.',
    category: 'Hair',
  },
  {
    slug: 'laser-hair-removal',
    price: 600000,
    title: 'Laser Hair Removal',
    description:
      'Membantu mengurangi pertumbuhan rambut yang tidak diinginkan dengan energi laser.',
    category: 'Hair',
  },
  {
    slug: 'body-slimming',
    price: 500000,
    featured: true,
    title: 'Body Slimming',
    description:
      'Perawatan tubuh untuk membantu membentuk kontur tubuh dengan teknologi non-invasif.',
    category: 'Slimming',
  },
  {
    slug: 'body-contouring',
    price: 1500000,
    title: 'Body Contouring',
    description:
      'Membantu menyamarkan tampilan lemak membandel pada area tertentu.',
    category: 'Slimming',
  },
];

export const featuredTreatments = treatments.filter((treatment) => treatment.featured);

export function getTreatmentBySlug(slug: string) {
  return treatments.find((treatment) => treatment.slug === slug);
}

// Samakan penulisan nama: "Acne And Scar", "acne & scar" → "acne and scar"
function normalizeName(name: string) {
  return name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
}

// Spesialisasi dokter estetika yang menangani treatment klinik kecantikan:
export function isSpecialistForCategory(specialistName: string | undefined, category: Category) {
  if (!specialistName) return true;
  const s = normalizeName(specialistName);
  const c = normalizeName(category);

  if (s === c) return true;

  if (category === 'Hair') {
    return s.includes('hair') || s.includes('rambut') || s.includes('trikologi') || s.includes('kulit') || s.includes('dermatologi');
  }

  if (category === 'Slimming') {
    return s.includes('slimming') || s.includes('bedah') || s.includes('plastik') || s.includes('estetika') || s.includes('tubuh');
  }

  if (category === 'Anti-Aging') {
    return s.includes('anti-aging') || s.includes('aging') || s.includes('bedah') || s.includes('estetika') || s.includes('dermatologi') || s.includes('kulit');
  }

  if (category === 'Acne & Scar') {
    return s.includes('dermatologi') || s.includes('kulit') || s.includes('laser') || s.includes('scar') || s.includes('estetika') || s.includes('bedah');
  }

  if (category === 'Brightening') {
    return s.includes('dermatologi') || s.includes('laser') || s.includes('estetika') || s.includes('kulit');
  }

  return true;
}
