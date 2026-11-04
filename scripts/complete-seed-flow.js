const http = require('http');

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const ADMIN_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFhYWFhYWFhLTExMTEtMTExMS0xMTExLWFhYWFhYWFhYWFhYSIsImVtYWlsIjoiYWRtaW5Aa2xpbmlrLnRlc3QiLCJyb2xlIjoiQURNSU4iLCJmdWxsX25hbWUiOiJBZG1pbiBVdGFtYSBLbGluaWsgRXN0ZXRpa2EiLCJpYXQiOjE3OTM4MTc0NDksImV4cCI6MTc5NDQyMjI0OX0.15e8VhcywADhTqKhR6Qx_2dVaxux_4YaQDwM7TM6UCg';

const BUDI_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiYmJiYmJiLTIyMjItMjIyMi0yMjIyLWJiYmJiYmJiYmJiYiIsImVtYWlsIjoicGFzaWVuQGtsaW5pay50ZXN0Iiwicm9sZSI6IlBBVElFTlQiLCJmdWxsX25hbWUiOiJCdWRpIFBhc2llbiBEZW1vIiwiaWF0IjoxNzkzODE3NDU4LCJleHAiOjE3OTQ0MjIyNTh9.wpIaZstPrlp648asb9UoKlrG1N-cBCkuN8wxtCyohYc';

const SITI_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiYmJiYmJiLTIyMjItMjIyMi0yMjIyLWNjY2NjY2NjY2NjYyIsImVtYWlsIjoic2l0aUBrbGluaWsudGVzdCIsInJvbGUiOiJQQVRJRU5UIiwiZnVsbF9uYW1lIjoiU2l0aSBSYWhheXUiLCJpYXQiOjE3OTM4MTc0NjgsImV4cCI6MTc5NDQyMjI2OH0.ZGA0AP3bcnO1X9E5iw2qwmSONlCqsYi6fFfymBo-A9E';

const sampleProofBase64 =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150">' +
      '<rect width="300" height="150" fill="#e0e7ff"/>' +
      '<text x="20" y="50" font-family="sans-serif" font-size="14" fill="#1e1b4b" font-weight="bold">Bukti Transfer BCA</text>' +
      '<text x="20" y="80" font-family="sans-serif" font-size="12" fill="#4338ca">Nominal: Rp 180.000</text>' +
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  EKSEKUSI PEMROSESAN JANJI TEMU HARI INI (2026-11-05)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const budiApptId = '71f5bd05-5043-4b23-a803-bef0f676d351';
  const sitiApptId = '4e1b610c-2976-4b01-a8c5-cdc55ac6e2c7';
  const sessionId = '03d5b324-832a-48bd-92ee-7d01619dca16';

  // 1. BUDI DEMO: Upload Proof -> Approve -> Check-in #1 -> Call Next
  console.log('1. Memproses Janji Pasien 1 (Budi Demo)...');
  const p1 = await request('POST', `/appointments/${budiApptId}/payment-proof`, {
    image_base64: sampleProofBase64,
  }, BUDI_TOKEN);
  console.log('   Upload Bukti Bayar Budi:', p1.status, p1.data?.message);
  await sleep(300);

  const a1 = await request('PATCH', `/admin/appointments/${budiApptId}/approve`, null, ADMIN_TOKEN);
  console.log('   Admin Approve Budi:', a1.status, a1.data?.message);
  const qr1 = a1.data?.data?.qr_token || budiApptId;
  await sleep(300);

  const c1 = await request('POST', '/admin/queue/check-in', { qr_token: qr1 }, ADMIN_TOKEN);
  console.log('   Check-in Budi (Resepsionis):', c1.status, `Nomor Antrean: #${c1.data?.data?.queue_number}`);
  await sleep(300);

  const call1 = await request('PATCH', '/admin/queue/call-next', { session_id: sessionId }, ADMIN_TOKEN);
  console.log('   Dokter Memanggil Budi (Antrean Sekarang):', call1.data?.data?.current_queue_number);
  await sleep(300);

  // 2. SITI RAHAYU: Upload Proof -> Approve -> Check-in #2 (Menunggu Antrean)
  console.log('\n2. Memproses Janji Pasien 2 (Siti Rahayu)...');
  const p2 = await request('POST', `/appointments/${sitiApptId}/payment-proof`, {
    image_base64: sampleProofBase64,
  }, SITI_TOKEN);
  console.log('   Upload Bukti Bayar Siti:', p2.status, p2.data?.message);
  await sleep(300);

  const a2 = await request('PATCH', `/admin/appointments/${sitiApptId}/approve`, null, ADMIN_TOKEN);
  console.log('   Admin Approve Siti:', a2.status, a2.data?.message);
  const qr2 = a2.data?.data?.qr_token || sitiApptId;
  await sleep(300);

  const c2 = await request('POST', '/admin/queue/check-in', { qr_token: qr2 }, ADMIN_TOKEN);
  console.log('   Check-in Siti (Resepsionis):', c2.status, `Nomor Antrean: #${c2.data?.data?.queue_number}`);
  console.log('   -> Siti Rahayu sekarang resmi berstatus: MENUNGGU ANTREAN di Ruang Tunggu!');
  await sleep(300);

  // 3. AHMAD FAUZI: Booking Baru untuk Menunggu Verifikasi Pembayaran
  console.log('\n3. Menyiapkan Janji Pasien 3 (Ahmad Fauzi) untuk Verifikasi Pembayaran...');
  // Cek apakah Ahmad sudah punya appointment aktif di sesi dr. Gisella
  // Ahmad Fauzi: APT-261105-2CDD7E (ID: 85e13f8d-80ef-4cf4-bbad-c2767d788297) sudah berstatus waiting_confirmation!
  console.log('   Ahmad Fauzi sudah aktif dengan status waiting_confirmation (Menunggu Verifikasi Admin).');

  // 4. Periksa Hasil Akhir Metrik Dashboard
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  HASIL METRIK DASHBOARD SETELAH PROSES LENGKAP');
  console.log('═══════════════════════════════════════════════════════════════');
  const metricsRes = await request('GET', '/admin/dashboard/metrics', null, ADMIN_TOKEN);
  const m = metricsRes.data?.data;
  console.log('Metrik Dashboard Admin:');
  console.log(`  1. Janji Hari Ini       : ${m?.today_appointments} janji`);
  console.log(`  2. Verifikasi Pembayaran: ${m?.pending_verification} transaksi`);
  console.log(`  3. Menunggu Antrean     : ${m?.waiting_queue} pasien`);
  console.log(`  4. Pendapatan Hari Ini  : Rp ${Number(m?.today_revenue).toLocaleString('id-ID')}`);
  console.log(`  5. Total Pendapatan     : Rp ${Number(m?.total_revenue).toLocaleString('id-ID')}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);

