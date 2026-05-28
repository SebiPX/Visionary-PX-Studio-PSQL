import('./dist/services/mocoDbSync.js').then(m => m.performProjectSync().then(() => process.exit(0))).catch(e => { console.error(e); process.exit(1); });
