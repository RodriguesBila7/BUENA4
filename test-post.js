fetch('http://localhost:3001/api/admin-acts/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'emp_1700000000000',
    actType: 'Advertência',
    actDate: '2026-07-07',
    details: {}
  })
}).then(async r => {
  console.log('Status:', r.status);
  console.log('Body:', await r.text());
}).catch(console.error);
