const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}
function logAction(action, details) {
  const db = readDB();
  db.auditLogs.unshift({ id: Date.now().toString(), action, details, timestamp: new Date().toISOString(), actor: 'Siva kiran' });
  db.auditLogs = db.auditLogs.slice(0, 200);
  writeDB(db);
}
function notFound(res, message) {
  return res.status(404).json({ error: message || 'Not found' });
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'CaliberUX API' }));

app.get('/api/suppliers', (req, res) => {
  const db = readDB();
  let items = db.suppliers;
  const q = String(req.query.q || '').toLowerCase();
  const category = String(req.query.category || 'All');
  const status = String(req.query.status || 'All');
  const risk = String(req.query.risk || 'All');
  if (q) items = items.filter(s => `${s.name} ${s.id} ${s.category}`.toLowerCase().includes(q));
  if (category !== 'All') items = items.filter(s => s.category === category);
  if (status !== 'All') items = items.filter(s => s.status === status);
  if (risk !== 'All') items = items.filter(s => s.risk === risk);
  res.json({ items, total: items.length, categories: [...new Set(db.suppliers.map(s => s.category))] });
});

app.post('/api/suppliers', (req, res) => {
  const { name, category, rating, risk, status, location, contact } = req.body || {};
  if (!name || !category) return res.status(400).json({ error: 'Supplier name and category are required.' });
  const db = readDB();
  const supplier = {
    id: `SUP-${Math.floor(1000 + Math.random() * 8999)}`, name: String(name).trim(),
    category: String(category).trim(), rating: Number(rating || 0), risk: risk || 'Medium',
    status: status || 'Active', activeProposals: 0, verified: false,
    location: location || 'Not provided', yearsInBusiness: 'New supplier',
    revenue: 'Not provided', contact: contact || 'Not provided',
    onTimeDelivery: 0, qualityCompliance: 0, responsiveness: 0
  };
  db.suppliers.unshift(supplier);
  db.auditLogs.unshift({ id: Date.now().toString(), action: 'Supplier created', details: supplier.name, timestamp: new Date().toISOString(), actor: 'Siva kiran' });
  writeDB(db);
  res.status(201).json({ item: supplier });
});

app.get('/api/proposals', (req, res) => {
  const db = readDB();
  let items = db.proposals;
  if (req.query.status) items = items.filter(p => p.status === req.query.status);
  res.json({ items, total: items.length });
});

app.get('/api/proposals/:id', (req, res) => {
  const item = readDB().proposals.find(p => p.id === req.params.id);
  if (!item) return notFound(res, 'Proposal not found');
  res.json({ item });
});

app.patch('/api/proposals/:id/decision', (req, res) => {
  const { decision } = req.body || {};
  const allowed = ['Approved', 'Rejected', 'Revisions Requested', 'Sent for Review'];
  if (!allowed.includes(decision)) return res.status(400).json({ error: 'Invalid decision.' });
  const db = readDB();
  const proposal = db.proposals.find(p => p.id === req.params.id);
  if (!proposal) return notFound(res, 'Proposal not found');
  proposal.status = decision;
  proposal.approvalStatus = decision === 'Approved' ? 'Approved' : decision === 'Rejected' ? 'Rejected' : 'Pending Review';
  proposal.lastDecisionAt = new Date().toISOString();
  proposal.lastDecisionBy = 'Siva kiran';
  db.auditLogs.unshift({ id: Date.now().toString(), action: `Proposal ${decision.toLowerCase()}`, details: `${proposal.id} — ${proposal.title}`, timestamp: new Date().toISOString(), actor: 'Siva kiran' });
  writeDB(db);
  res.json({ item: proposal, message: `Proposal marked as ${decision}.` });
});

app.post('/api/proposals/:id/override', (req, res) => {
  const { decision, reason, comments, acknowledged } = req.body || {};
  if (!['Approve Regardless', 'Send for Manual Review', 'Reject Proposal'].includes(decision)) return res.status(400).json({ error: 'Select an override decision.' });
  if (!reason) return res.status(400).json({ error: 'Select a reason for override.' });
  if (!acknowledged) return res.status(400).json({ error: 'Please acknowledge the override audit notice.' });
  const db = readDB();
  const proposal = db.proposals.find(p => p.id === req.params.id);
  if (!proposal) return notFound(res, 'Proposal not found');
  const mapped = decision === 'Approve Regardless' ? 'Approved (Override)' : decision === 'Reject Proposal' ? 'Rejected (Override)' : 'Manual Review (Override)';
  proposal.status = mapped;
  proposal.approvalStatus = decision === 'Approve Regardless' ? 'Approved' : decision === 'Reject Proposal' ? 'Rejected' : 'Pending Review';
  proposal.override = { decision, reason, comments: String(comments || '').slice(0, 500), at: new Date().toISOString(), by: 'Siva kiran' };
  db.auditLogs.unshift({ id: Date.now().toString(), action: 'AI recommendation overridden', details: `${proposal.id}: ${decision}; reason: ${reason}`, timestamp: new Date().toISOString(), actor: 'Siva kiran' });
  writeDB(db);
  res.json({ item: proposal, message: 'Override saved and recorded in the audit log.' });
});

app.get('/api/audit-logs', (req, res) => res.json({ items: readDB().auditLogs }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`CaliberUX running at http://localhost:${PORT}`));
