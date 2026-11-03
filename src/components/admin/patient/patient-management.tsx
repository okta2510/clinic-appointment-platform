'use client';

import { useState } from 'react';
import { Calendar, Mail, Phone, Search, User, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/format';
import { inputBase } from '@/components/admin/styles';

export default function PatientManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: patients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-patients-list'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*, appointments(id, status)')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const filteredPatients = patients.filter((p: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = (p.full_name || '').toLowerCase();
    const phone = (p.phone_number || '').toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B1B7A] md:text-3xl">
            Manajemen Pasien
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Daftar seluruh pasien terdaftar di klinik dan riwayat keaktifan reservasi.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama pasien atau nomor telepon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputBase} pl-9`}
          />
        </div>
      </div>

      {/* PATIENTS TABLE */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-neutral-500 animate-pulse">
            Memuat daftar pasien...
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-red-600">
            Gagal memuat data pasien.{' '}
            <button
              type="button"
              onClick={() => refetch()}
              className="font-semibold underline ml-2"
            >
              Coba lagi
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Users className="mx-auto h-12 w-12 text-neutral-300" />
            <h3 className="mt-3 text-lg font-semibold text-neutral-700">
              Tidak ada data pasien
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Belum ada pasien terdaftar yang cocok dengan pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Nama Lengkap</th>
                  <th scope="col" className="px-5 py-3.5">Kontak</th>
                  <th scope="col" className="px-5 py-3.5">Jenis Kelamin</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Total Reservasi</th>
                  <th scope="col" className="px-5 py-3.5">Terdaftar Sejak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredPatients.map((patient: any) => {
                  const appointments = patient.appointments || [];
                  const doneCount = appointments.filter((a: any) => a.status === 'done').length;

                  return (
                    <tr key={patient.id} className="hover:bg-neutral-50/70">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-neutral-900 flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B1B7A]/10 text-xs font-bold text-[#1B1B7A]">
                            {(patient.full_name || 'P').charAt(0).toUpperCase()}
                          </div>
                          {patient.full_name || 'Pasien Tanpa Nama'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-neutral-800">
                          <Phone className="h-3.5 w-3.5 text-neutral-400" />
                          <span>{patient.phone_number || '-'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 capitalize text-neutral-700">
                        {patient.gender === 'male'
                          ? 'Laki-laki'
                          : patient.gender === 'female'
                          ? 'Perempuan'
                          : '-'}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className="font-semibold text-neutral-900">
                          {appointments.length}
                        </span>
                        {doneCount > 0 && (
                          <span className="ml-1 text-xs text-green-700">
                            ({doneCount} selesai)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-neutral-500 text-xs">
                        {formatDate(patient.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

