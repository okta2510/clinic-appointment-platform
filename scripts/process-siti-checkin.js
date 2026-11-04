const http = require('http');

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const ADMIN_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFhYWFhYWFhLTExMTEtMTExMS0xMTExLWFhYWFhYWFhYWFhYSIsImVtYWlsIjoiYWRtaW5Aa2xpbmlrLnRlc3QiLCJyb2xlIjoiQURNSU4iLCJmdWxsX25hbWUiOiJBZG1pbiBVdGFtYSBLbGluaWsgRXN0ZXRpa2EiLCJpYXQiOjE3OTM4MTc0NDksImV4cCI6MTc5NDQyMjI0OX0.15e8VhcywADhTqKhR6Qx_2dVaxux_4YaQDwM7TM6UCg';

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
  console.log('--- Memproses Janji Temu Siti Rahayu ---');

  // 1. Upload Bukti Bayar untuk Siti Rahayu
  const sitiApptId = '4e1b610c-2976-4b01-a8c5-cdc55ac6e2c7';
  console.log('1. Upload bukti transfer Siti Rahayu...');
  const proofRes = await request(
    'POST',
    `/appointments/${sitiApptId}/payment-proof`,
    { image_base64: sampleProofBase64 },
    SITI_TOKEN
  );
  console.log('   Proof upload status:', proofRes.status, proofRes.data?.message);
  await sleep(500);

  // 2. Admin Approve Siti Rahayu
  console.log('2. Admin approve pembayaran Siti Rahayu...');
  const approveRes = await request(
    'PATCH',
    `/admin/appointments/${sitiApptId}/approve`,
    null,
    ADMIN_TOKEN
  );
  console.log('   Approve status:', approveRes.status, approveRes.data?.message);
  const qrTokenSiti = approveRes.data?.data?.qr_token || sitiApptId;
  await sleep(500);

  // 3. Admin Check-in Siti Rahayu
  console.log('3. Admin check-in Siti Rahayu...');
  const checkinRes = await request(
    'POST',
    '/admin/queue/check-in',
    { qr_token: qrTokenSiti },
    ADMIN_TOKEN
  );
  console.log('   Check-in Siti:', checkinRes.status, checkinRes.data?.data);
  await sleep(500);

  // 4. Dokter Panggil Antrean Siti (sehingga Siti dilayani dokter, current_queue_number = 1)
  const sessionId = '03d5b324-832a-48bd-92ee-7d01619dca16';
  console.log('4. Call next queue...');
  const callRes = await request(
    'PATCH',
    '/admin/queue/call-next',
    { session_id: sessionId },
    ADMIN_TOKEN
  );
  console.log('   Call next:', callRes.status, callRes.data?.data);
  await sleep(500);

  // 5. Cek Metrik Dashboard
  console.log('\n--- Hasil Metrik Terkini ---');
  const metricsRes = await request('GET', '/admin/dashboard/metrics', null, ADMIN_TOKEN);
  console.log(metricsRes.data?.data);
}

main().catch(console.error);
