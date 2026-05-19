const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('docker exec -i labs-api sh -c "node -e \\"require(\'./dist/db\').default.query(\'SELECT email FROM profiles WHERE LOWER(email) = LOWER($1)\', [\'anna.reitinger@efeso.com\']).then(r => console.log(r.rows)).catch(console.error)\\""', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
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
