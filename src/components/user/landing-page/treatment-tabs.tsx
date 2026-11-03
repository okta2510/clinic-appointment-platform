'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { categories, treatments, type Category } from '@/constants/treatments';
import {
  categoryIcons,
  TreatmentCard,
} from '@/components/user/treatment/treatment-card';
import { NAVY } from './constants';

export function TreatmentTabs() {
  const [active, setActive] = useState<Category>('Acne & Scar');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const visible = treatments.filter((treatment) => treatment.category === active);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === 'ArrowRight') {
      next = (index + 1) % categories.length;
    } else if (event.key === 'ArrowLeft') {
      next = (index - 1 + categories.length) % categories.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = categories.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    setActive(categories[next]);
    tabRefs.current[next]?.focus();
    tabRefs.current[next]?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-16 bg-white">
      <h2
        className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl md:text-4xl"
        style={{ color: NAVY }}
      >
        Temukan Perawatan Terbaik Sesuai Permasalahan Kulitmu
      </h2>
      <div
        role="tablist"
        aria-label="Kategori perawatan"
        className="-mx-5 mt-6 flex scroll-px-5 gap-2 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] scrollbar-none md:mx-0 md:mt-8 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category, index) => {
          const selected = category === active;
          const Icon = categoryIcons[category];
          return (
            <button
              key={category}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`tab-${index}`}
              aria-selected={selected}
              aria-controls="panel-treatments"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(category)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B1B7A] sm:text-base md:px-6 md:py-3 md:text-lg ${
                selected
                  ? 'border-[#1B1B7A] bg-[#1B1B7A] text-white shadow-md'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-[#1B1B7A] hover:text-[#1B1B7A]'
              }`}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              {category}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="panel-treatments"
        aria-labelledby={`tab-${categories.indexOf(active)}`}
        tabIndex={0}
        className="mt-8 grid gap-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B7A] sm:grid-cols-2 md:mt-10 md:gap-6 lg:grid-cols-4"
      >
        {visible.map((treatment, index) => (
          <TreatmentCard key={treatment.slug} treatment={treatment} index={index} />
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Link
          href="/treatment"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[#1B1B7A] px-6 py-3 font-bold text-[#1B1B7A] transition-colors hover:bg-[#1B1B7A] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B1B7A]"
        >
          Lihat Semua Treatment
        </Link>
      </div>
    </section>
  );
}
