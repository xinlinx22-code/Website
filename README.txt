WEBSITE IP LOGGER - SIAP DEPLOY

Isi paket:
- server.js
- package.json
- .gitignore

CARA DEPLOY:
1. Upload 3 file tersebut ke repository GitHub.
2. Hubungkan repository ke hosting Node.js seperti Render.
3. Build Command: npm install
4. Start Command: npm start
5. Tambahkan Environment Variables:
   DATA_SECRET = secret acak yang panjang
   ADMIN_PASSWORD = password admin
6. Deploy.

URL:
- Website: https://DOMAIN-ANDA/
- Dashboard: https://DOMAIN-ANDA/admin
- Health check: https://DOMAIN-ANDA/health

USERNAME DASHBOARD:
admin

CATATAN:
- IP tidak disimpan dalam bentuk asli. Sistem menyimpan HMAC-SHA256.
- Database SQLite dibuat otomatis di folder data.
- Untuk hosting yang filesystem-nya tidak persisten, gunakan database terkelola
  (misalnya PostgreSQL) agar data tidak hilang setelah redeploy/restart.
- Untuk website publik, pastikan pemberitahuan/kebijakan privasi sesuai aturan
  yang berlaku sebelum mengumpulkan data teknis pengunjung.
