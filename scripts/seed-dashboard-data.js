const http = require('http');

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const sampleProofBase64 =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150">' +
      '<rect width="300" height="150" fill="#e0e7ff"/>' +
      '<text x="20" y="50" font-family="sans-serif" font-size="14" fill="#1e1b4b" font-weight="bold">Bukti Transfer Bank BCA</text>' +
      '<text x="20" y="80" font-family="sans-serif" font-size="12" fill="#4338ca">Nominal: Rp 180.000</text>' +
      '<text x="20" y="110" font-family="sans-serif" font-size="11" fill="#6366f1">Klinik Kecantikan Arhe</text>' +
      '</svg>'
  ).toString('base64');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await request('POST', '/auth/login', { email, password });
  if (res.status === 200 && res.data?.data?.token) {
    return res.data.data.token;
  }
  return null;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SEEK & SEED APPOINTMENTS HARI INI (2026-11-05)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Login Admin
  const adminToken = await loginUser('admin@klinik.test', 'Admin123!');
  if (!adminToken) {
    throw new Error('Gagal login admin');
  }
  console.log('✅ Admin login OK.');

  // Target Dokter: dr. Gisella Valerie, Dipl. AAAM
  const doctorId = '22222222-0000-0000-0000-000000000002';
  const sessionDate = '2026-11-05';
  const startTimeStr = '10:00';

  console.log('🎯 Target Dokter & Jadwal:', {
    doctor_id: doctorId,
    session_date: sessionDate,
    start_time: startTimeStr,
  });

  // 2. Login 3 Pasien
  console.log('\n🔐 Mengotentikasi 3 Akun Pasien...');
  const tokenBudi = await loginUser('pasien@klinik.test', 'Pasien123!');
  const tokenSiti = await loginUser('siti@klinik.test', 'Pasien123!');
  const tokenAhmad = await loginUser('ahmad@klinik.test', 'Pasien123!');

  if (!tokenBudi || !tokenSiti || !tokenAhmad) {
    throw new Error('Gagal mengotentikasi seluruh akun pasien demo');
  }
  console.log('✅ Akun Pasien Budi, Siti, dan Ahmad terotentikasi.');

  // ---------------------------------------------------------------------------
  // Transaksi 1: Budi Demo -> Selesai Bayar -> Check-in -> Sedang Dilayani Dokter
  // ---------------------------------------------------------------------------
  console.log('\n[1/3] Menjalankan Transaksi Pasien 1 (Budi Demo - Sedang di Ruang Dokter)...');
  const appt1Res = await request(
    'POST',
    '/appointments',
    {
      doctor_id: doctorId,
      session_date: sessionDate,
      start_time: startTimeStr,
    },
    tokenBudi
  );
  let sessionId = null;
  if (appt1Res.status !== 201 && appt1Res.status !== 200) {
    console.error('Gagal booking 1:', appt1Res);
  } else {
    const appt1 = appt1Res.data.data;
    sessionId = appt1.session_id;
    console.log(`  - Booking #1 Terbuat: ${appt1.code} (ID: ${appt1.id})`);

    // Upload Bukti Bayar
    await request(
      'POST',
      `/appointments/${appt1.id}/payment-proof`,
      { image_base64: sampleProofBase64 },
      tokenBudi
    );
    console.log('  - Bukti Bayar #1 Terunggah.');

    // Admin Approve
    const approve1 = await request('PATCH', `/admin/appointments/${appt1.id}/approve`, null, adminToken);
    const qrToken1 = approve1.data?.data?.qr_token || appt1.id;
    console.log(`  - Admin Menyetujui Pembayaran #1 (QR: ${qrToken1})`);

    // Check-in Resepsionis
    const checkin1 = await request(
      'POST',
      '/admin/queue/check-in',
      { qr_token: qrToken1 },
      adminToken
    );
    console.log(`  - Pasien #1 Check-in Meja Resepsionis: Nomor Antrean #${checkin1.data?.data?.queue_number}`);

    // Dokter Panggil Pasien #1
    if (checkin1.data?.data?.session_id) {
      sessionId = checkin1.data.data.session_id;
    }
    const callNextRes = await request('PATCH', '/admin/queue/call-next', { session_id: sessionId }, adminToken);
    console.log('  - Dokter Memanggil Antrean #1 (Sekarang di dalam ruang dokter)', callNextRes.data?.data);
  }

  // ---------------------------------------------------------------------------
  // Transaksi 2: Siti Rahayu -> Selesai Bayar -> Check-in -> Menunggu Antrean
  // ---------------------------------------------------------------------------
  console.log('\n[2/3] Menjalankan Transaksi Pasien 2 (Siti Rahayu - Menunggu Antrean #2)...');
  const appt2Res = await request(
    'POST',
    '/appointments',
    {
      doctor_id: doctorId,
      session_date: sessionDate,
      start_time: startTimeStr,
    },
    tokenSiti
  );
  if (appt2Res.status !== 201 && appt2Res.status !== 200) {
    console.error('Gagal booking 2:', appt2Res);
  } else {
    const appt2 = appt2Res.data.data;
    console.log(`  - Booking #2 Terbuat: ${appt2.code} (ID: ${appt2.id})`);

    // Upload Bukti Bayar
    await request(
      'POST',
      `/appointments/${appt2.id}/payment-proof`,
      { image_base64: sampleProofBase64 },
      tokenSiti
    );
    console.log('  - Bukti Bayar #2 Terunggah.');

    // Admin Approve
    const approve2 = await request('PATCH', `/admin/appointments/${appt2.id}/approve`, null, adminToken);
    const qrToken2 = approve2.data?.data?.qr_token || appt2.id;
    console.log(`  - Admin Menyetujui Pembayaran #2 (QR: ${qrToken2})`);

    // Check-in Resepsionis
    const checkin2 = await request(
      'POST',
      '/admin/queue/check-in',
      { qr_token: qrToken2 },
      adminToken
    );
    console.log(`  - Pasien #2 Check-in Meja Resepsionis: Nomor Antrean #${checkin2.data?.data?.queue_number}`);
    console.log('  - Pasien #2 Siap di Ruang Tunggu (Status: Menunggu Antrean)!');
  }

  // ---------------------------------------------------------------------------
  // Transaksi 3: Ahmad Fauzi -> Upload Bukti Bayar -> Menunggu Verifikasi Admin
  // ---------------------------------------------------------------------------
  console.log('\n[3/3] Menjalankan Transaksi Pasien 3 (Ahmad Fauzi - Menunggu Verifikasi Admin)...');
  const appt3Res = await request(
    'POST',
    '/appointments',
    {
      doctor_id: doctorId,
      session_date: sessionDate,
      start_time: startTimeStr,
    },
    tokenAhmad
  );
  if (appt3Res.status !== 201 && appt3Res.status !== 200) {
    console.error('Gagal booking 3:', appt3Res);
  } else {
    const appt3 = appt3Res.data.data;
    console.log(`  - Booking #3 Terbuat: ${appt3.code} (ID: ${appt3.id})`);

    // Upload Bukti Bayar
    await request(
      'POST',
      `/appointments/${appt3.id}/payment-proof`,
      { image_base64: sampleProofBase64 },
      tokenAhmad
    );
    console.log('  - Bukti Bayar #3 Terunggah (Status: waiting_confirmation / Pending Verification).');
  }

  // ---------------------------------------------------------------------------
  // Verifikasi Hasil Metrik Dashboard Akhir
  // ---------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  VERIFIKASI METRIK DASHBOARD SETELAH SEEDING');
  console.log('═══════════════════════════════════════════════════════════════');
  const afterRes = await request('GET', '/admin/dashboard/metrics', null, adminToken);
  const metricsAfter = afterRes.data?.data;
  console.log('Metrik Dashboard Sekarang:');
  console.log(`  • Janji Hari Ini       : ${metricsAfter.today_appointments}`);
  console.log(`  • Verifikasi Pembayaran : ${metricsAfter.pending_verification}`);
  console.log(`  • Menunggu Antrean     : ${metricsAfter.waiting_queue}`);
  console.log(`  • Pendapatan Hari Ini  : Rp ${Number(metricsAfter.today_revenue).toLocaleString('id-ID')}`);
  console.log(`  • Total Pendapatan     : Rp ${Number(metricsAfter.total_revenue).toLocaleString('id-ID')}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
