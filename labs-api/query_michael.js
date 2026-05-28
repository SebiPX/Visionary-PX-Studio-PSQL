const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker exec -i labs-api sh -c "node -e \\"require(\'./dist/db\').default.query(\'SELECT email, full_name, moco_user_id FROM profiles WHERE email ILIKE \\\\\'%michael%walke%\\\\\' OR full_name ILIKE \\\\\'%michael walke%\\\\\'\').then(r => console.log(JSON.stringify(r.rows, null, 2))).catch(console.error)\\""', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '72.60.83.29',
  port: 22,
  username: 'root',
  password: 'Unsere-Schickeria-2025'
});
