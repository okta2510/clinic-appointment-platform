const http = require('http');

const API_BASE = 'http://localhost:8000/api/v1';

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

async function run() {
  console.log('🚀 Memulai Seeding Data Janji Temu Hari Ini via Backend API...\n');

  // 1. Login Admin
  console.log('1. Mengautentikasi Akun Admin...');
  const adminRes = await request('POST', '/auth/login', {
    email: 'admin@klinik.test',
    password: 'Admin123!',
  });
  if (adminRes.status !== 200 || !adminRes.data?.data?.token) {
    console.error('❌ Gagal login admin:', adminRes);
    return;
  }
  const adminToken = adminRes.data.data.token;
  console.log('✅ Admin berhasil login.');

  // 2. Login Pasien Utama (Budi)
  console.log('2. Mengautentikasi Pasien Demo (pasien@klinik.test)...');
  const patientRes = await request('POST', '/auth/login', {
    email: 'pasien@klinik.test',
    password: 'Pasien123!',
  });
  if (patientRes.status !== 200 || !patientRes.data?.data?.token) {
    console.error('❌ Gagal login pasien:', patientRes);
    return;
  }
  const patientToken = patientRes.data.data.token;
  console.log('✅ Pasien demo berhasil login.');

  // 3. Ambil Antrean Live atau Sesi Hari Ini
  console.log('3. Mencari Sesi Praktik Dokter Hari Ini...');
  const queueRes = await request('GET', '/queue/live');
  let targetSession = null;
  if (queueRes.status === 200 && Array.isArray(queueRes.data?.data) && queueRes.data.data.length > 0) {
    targetSession = queueRes.data.data[0];
  }

  if (!targetSession) {
    console.log('Mencari dari endpoint dokter...');
    const docRes = await request('GET', '/doctors');
    console.log('Doctors response:', docRes.data?.data?.length);
  }

  console.log('Target sesi:', targetSession);

  // 4. Periksa Metrik Sebelum Seeding
  console.log('\n📊 Memeriksa Metrik Dashboard Sebelum Seeding...');
  const metricsBefore = await request('GET', '/admin/dashboard/metrics', null, adminToken);
  console.log('Metrics Before:', metricsBefore.data?.data);

  console.log('\nSelesai tahap 1 check.');
}

run().catch(console.error);

