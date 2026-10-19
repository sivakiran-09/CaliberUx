const API = '/api';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const screen = $('#screen');
const pages = {
  'supplier-review': 'Supplier Review Dashboard',
  'ai-recommendation': 'AI Approval Recommendation',
  'purchase-review': 'Purchase Request Review',
  'risk-analysis': 'High-Risk Proposal Analysis',
  'override-recommendation': 'Override AI Recommendation',
  'suppliers': 'Supplier Management',
  'audit-logs': 'Audit Logs'
};
let suppliersCache = [];
let currentProposalId = 'PR-2025-105';
let toastTimer;
const money = n => n >= 1000000 ? '$' + (n/1000000).toFixed(2) + 'M' : '$' + Number(n||0).toLocaleString('en-US');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const badge = value => `<span class="badge ${String(value).toLowerCase().includes('low')||String(value).toLowerCase().includes('active')||String(value).toLowerCase().includes('approved')?'low':String(value).toLowerCase().includes('high')||String(value).toLowerCase().includes('reject')?'high':String(value).toLowerCase().includes('medium')||String(value).toLowerCase().includes('review')||String(value).toLowerCase().includes('required')?'medium':'neutral'}">${esc(value)}</span>`;
async function api(url, options={}) {
  const res = await fetch(API+url, {headers:{'Content-Type':'application/json'}, ...options});
  const data = await res.json().catch(()=>({error:'Invalid server response'}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function notify(message, error=false) {
  const el=$('#toast'); el.textContent=message; el.className='toast'+(error?' error':''); el.style.display='block';
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.style.display='none',3600);
}
function go(page, proposalId) {
  if (proposalId) currentProposalId=proposalId;
  if (!pages[page]) page='supplier-review';
  location.hash=page;
  render(page);
}
function setActive(page) {
  $$('#navigation a').forEach(a=>a.classList.toggle('active', a.dataset.page===page || (page==='supplier-review'&&a.textContent.includes('Proposals'))));
  $('#breadcrumb').innerHTML=`Proposals <span>›</span> <b>${esc(pages[page]||page)}</b>`;
}
function heading(title, subtitle, actions='') {
 return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle||''}</p></div><div class="actions">${actions}</div></div>`;
}
function card(title, body, extra='') { return `<section class="card ${extra}"><div class="card-head">${title}</div>${body}</section>`; }
function metric(label, value, percent, color='') {
 return `<div class="metric"><div class="metric-top"><span>${label}</span><b>${value}</b></div><div class="bar ${color}"><span style="width:${Math.min(100,Math.max(0,Number(percent)||0))}%"></span></div></div>`;
}
function stat(label,value,sub,extra='') {return `<div class="stat ${extra}"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`;}
function mini(label,value,hint,percent) {return `<div class="mini-stat"><div class="label">${label}</div><div class="value">${value}</div><div class="bar"><span style="width:${percent}%"></span></div><div class="hint">${hint}</div></div>`;}
function approvalStatusOf(p) {
 const s = String(p.approvalStatus || p.status || 'Pending Review').toLowerCase();
 if (s.includes('approved')) return 'Approved';
 if (s.includes('rejected')) return 'Rejected';
 return 'Pending Review';
}
function approvalBadge(p) {
 const status = approvalStatusOf(p);
 const cls = status === 'Approved' ? 'approval-approved' : status === 'Rejected' ? 'approval-rejected' : 'approval-pending';
 const icon = status === 'Approved' ? '✓' : status === 'Rejected' ? '×' : '◷';
 return `<span class="approval-badge ${cls}" aria-label="Approval status: ${status}">${icon} ${status}</span>`;
}
function proposalActions(id) {return `<button class="btn success" data-decision="Approved" data-id="${esc(id)}">✓ Approve Proposal</button><button class="btn" data-decision="Revisions Requested" data-id="${esc(id)}">Request Revisions</button>`;}
async function render(page=location.hash.slice(1)||'supplier-review') {
 if (!pages[page]) page='supplier-review';
 setActive(page); screen.innerHTML='<div class="loading">Loading…</div>';
 try {
  if(page==='supplier-review') await renderSupplierReview();
  else if(page==='ai-recommendation') await renderAIRecommendation();
  else if(page==='purchase-review') await renderPurchaseReview();
  else if(page==='risk-analysis') await renderRiskAnalysis();
  else if(page==='override-recommendation') await renderOverride();
  else if(page==='suppliers') await renderSuppliers();
  else if(page==='audit-logs') await renderAuditLogs();
 } catch(e) {screen.innerHTML=`<div class="card card-body"><h2>Could not load this screen</h2><p>${esc(e.message)}</p><p>Make sure the server is running with <code>npm start</code>.</p></div>`;}
}
async function getProposal(id=currentProposalId) {return (await api('/proposals/'+encodeURIComponent(id))).item;}
async function renderSupplierReview() {
 const p=await getProposal('PR-2025-105'); currentProposalId=p.id;
 screen.innerHTML=`
 ${heading(`${esc(p.supplier)} <span style="color:var(--green)">✿</span> ${approvalBadge(p)}`,`${esc(p.category)} • Global Tier 1`,`<button class="btn danger" data-decision="Rejected" data-id="${p.id}">Reject Proposal</button><button class="btn primary" data-decision="Approved" data-id="${p.id}">✓ Approve Supplier</button>`)}
 <div class="grid stats">
  <div class="stat highlight"><div class="stat-row"><div><div class="label">AI Confidence Score</div><div class="value">${p.confidence}%</div><div class="sub" style="color:var(--green)">High fit for requirements</div></div><div class="stat-icon">♧</div></div></div>
  ${stat('Risk Level',`<span style="color:var(--green)">Low</span>`,'Financial & Operational')}
  ${stat('Historical Rating',`${p.rating} <small style="font-size:11px;font-weight:500">/ 5.0</small>`,'★★★★★')}
 </div>
 <div class="grid two-col">
  ${card('▣ Business Profile',`<div class="card-body details">
   <div><div class="detail-label">HQ Location</div><div class="detail-value">${esc(p.location)}</div></div>
   <div><div class="detail-label">Years in Business</div><div class="detail-value">${esc(p.yearsInBusiness)}</div></div>
   <div><div class="detail-label">Annual Revenue</div><div class="detail-value">${esc(p.revenue)}</div></div>
   <div><div class="detail-label">Key Contacts</div><div class="detail-value"><span class="avatar" style="display:inline-grid;width:25px;height:25px;vertical-align:middle;margin-right:7px">JS</span>${esc(p.contact)}</div></div>
  </div>`)}
  ${card('◉ Performance Metrics (Last 12M)',`<div class="card-body">${metric('On-time Delivery',p.onTimeDelivery+'%',p.onTimeDelivery)}${metric('Quality Compliance',p.qualityCompliance+'%',p.qualityCompliance)}${metric('Responsiveness (SLA)',p.responsiveness+'%',p.responsiveness,'blue')}</div>`)}
 </div>
 <div class="section-title">Quick navigation</div><div class="actions"><button class="btn" data-go="ai-recommendation">View AI Recommendation →</button><button class="btn" data-go="purchase-review">Purchase Request Review →</button><button class="btn" data-go="risk-analysis">Risk Analysis →</button><button class="btn" data-go="suppliers">Manage Suppliers →</button></div>`;
}
async function renderAIRecommendation() {
 const p=await getProposal('PR-2025-103');
 screen.innerHTML=`${heading(esc(p.title),`${p.id} • AI-assisted decision support`,`<button class="btn" data-go="supplier-review">← Supplier Review</button>`)}
 <div class="layout-main-side"><div>
 <section class="recommendation"><div class="eyebrow green">▣ AI Recommendation</div><h2>${esc(p.recommendation)}</h2><p>The proposal from ${esc(p.supplier)} strongly aligns with project requirements, demonstrating significant cost savings and compliance with major security frameworks.</p><div class="score"><strong>${p.confidence}%</strong><small>Confidence</small><hr><b>◉</b><small> ${esc(p.risk)} Risk</small></div></section>
 <div class="section-title">Decision Summary</div><div class="grid decision-grid">${mini('Market Match',p.marketMatch,'Against comparable vendors',85)}${mini('Reliability Score',p.reliability+' / 10','Supplier reliability',94)}${mini('Compliance Check',p.compliance,'Security requirements',100)}${mini('Cost Efficiency','12% Under','Projected savings vs budget',88)}</div>
 <div class="section-title">Supporting Evidence</div>${card('Evidence and assessment',`<div class="evidence-list">${p.evidence.map((e,i)=>`<div class="evidence-item"><span class="evidence-icon">${i<2?'✓':'ⓘ'}</span><div><b>${['Historical Performance','Financial Health','Slight Timeline Deviation'][i]||'Additional evidence'}</b><p>${esc(e)}</p></div></div>`).join('')}</div>`)}
 </div><div class="side-stack">${card('Financial Summary',`<div class="card-body details"><div class="stat-row"><span class="muted">Proposed Cost</span><b>${money(p.cost)}</b></div><div class="stat-row"><span class="muted">Allocated Budget</span><b>${money(p.budget)}</b></div><hr><div class="stat-row"><span>Variance</span><b style="color:var(--green)">${money(p.budget-p.cost)}</b></div></div>`)}${card('Metadata',`<div class="card-body details"><div><div class="detail-label">SUPPLIER</div><b>${esc(p.supplier)}</b></div><div><div class="detail-label">DEPARTMENT</div>${esc(p.department)}</div><div><div class="detail-label">REQUESTED BY</div>${esc(p.requestedBy)}</div><div><div class="detail-label">DATE SUBMITTED</div>${esc(p.dateSubmitted)}</div></div>`)}<div class="actions" style="display:grid">${proposalActions(p.id)}</div></div></div>`;
}
async function renderPurchaseReview() {
 const p=await getProposal('PR-2025-103B');
 screen.innerHTML=`${heading('Purchase Request Review',`Proposals › ${p.id} • Action required`,`<button class="btn" data-go="ai-recommendation">Request More Info</button><button class="btn warning" data-decision="Sent for Review" data-id="${p.id}">◉ Verify & Proceed</button>`)}
 <div class="layout-main-side"><div>
 ${card('⚠ AI Assessment Result <span class="badge medium" style="float:right">Manual Review Advised</span>',`<div class="card-body grid" style="grid-template-columns:125px minmax(0,1fr);gap:20px"><div class="mini-stat" style="text-align:center;align-self:start"><div class="label">Confidence Score</div><div class="value" style="font-size:29px;color:#ed9800">${p.confidence}%</div><div class="hint">Medium</div></div><div><b>AI Reasoning</b><div class="evidence-list"><div class="evidence-item"><span class="evidence-icon">✓</span><div><b>Vendor Status</b><p>${esc(p.supplier)} is an approved vendor with consistent delivery history over the past 24 months.</p></div></div><div class="evidence-item"><span class="evidence-icon">✓</span><div><b>Budget Alignment</b><p>The requested amount (${money(p.cost)}) is compared with the allocated budget (${money(p.budget)}).</p></div></div><div class="evidence-item"><span class="evidence-icon" style="color:#d98a00">ⓘ</span><div><b>Price Variance Detected</b><p>${esc(p.evidence[2])}</p></div></div></div></div></div>`)}
 <div class="grid" style="grid-template-columns:1fr 1fr;margin-top:18px">${card('Confidence Trend (Similar PRs)',`<div class="card-body"><div class="chart">${[82,87,79,91,68].map((v,i)=>`<div class="chart-col"><span style="height:${v}%"></span><small>${['Jul','Aug','Sep','Oct','Now'][i]}</small></div>`).join('')}</div><div class="chart-legend"><span><i class="dot"></i>Historical Avg</span><span>● Current</span></div></div>`)}${card('Supplier Summary: '+esc(p.supplier),`<div class="card-body"><b>${esc(p.supplier)}</b><p class="muted">Vendor ID: ${esc(p.supplierId)}</p><hr><div class="grid" style="grid-template-columns:repeat(3,1fr)"><div><small class="muted">YTD Spend</small><p>${money(p.cost)}</p></div><div><small class="muted">Risk Rating</small><p>${badge(p.risk)}</p></div><div><small class="muted">Avg SLA</small><p>94.2%</p></div></div></div>`)}</div>
 <div class="actions" style="margin-top:18px"><button class="btn" data-go="risk-analysis">Back to risk analysis</button><button class="btn soft" data-go="override-recommendation" data-proposal="${p.id}">Override AI Recommendation</button></div>
 </div><div class="side-stack">${card('Key Details',`<div class="card-body details"><div><div class="detail-label">TOTAL AMOUNT</div><div style="font-size:19px;font-weight:800">${money(p.cost)}</div></div><div><div class="detail-label">Request Date</div>${esc(p.dateSubmitted)}</div><div><div class="detail-label">Department</div>${esc(p.department)}</div><div><div class="detail-label">Cost Center</div>CC-4920-IND</div><div><div class="detail-label">Requester</div>${esc(p.requestedBy)}</div><hr><button class="btn small" data-go="supplier-review">◎ View Supplier Profile</button></div>`)}</div></div>`;
}
async function renderRiskAnalysis() {
 const p=await getProposal('PR-2025-101');
 screen.innerHTML=`${heading(esc(p.title),`Submitted by ${esc(p.supplier)} • AI risk assessment`,`<button class="btn" data-go="purchase-review">Request More Info</button><button class="btn" data-decision="Sent for Review" data-id="${p.id}">✉ Send for Review</button><button class="btn danger" data-decision="Rejected" data-id="${p.id}">⊘ Reject Proposal</button>`)}
 <div class="layout-main-side"><div>
 <section class="risk-box high"><div class="eyebrow" style="color:var(--red)">⚠ Overall AI Recommendation</div><div class="stat-row"><h2>DO NOT APPROVE</h2><div style="text-align:right"><strong style="font-size:25px;color:var(--red)">${p.confidence}%</strong><div class="muted">Confidence Score</div></div></div><hr><b>Primary Reasoning</b><ul class="risk-list"><li>Poor Historical Performance: Supplier has failed to meet SLA targets on 3 of the last 4 similar engagements.</li><li>Pricing Deviation: Proposed cost is 28% higher than industry benchmark and current market average.</li><li>Unfavorable Terms: Contract lacking standard liability caps; high risk exposure for CaliberUX.</li></ul></section>
 ${card('Detailed Risk Factors <button class="btn small" style="float:right" data-go="purchase-review">View Full Analysis</button>',`<div class="table-wrap"><table class="risk-table"><thead><tr><th>Category</th><th>Finding</th><th>Severity</th></tr></thead><tbody><tr><td>Financial Stability</td><td>Recent D&B report indicates declining liquidity ratios over the past 3 quarters.</td><td>${badge('High')}</td></tr><tr><td>Compliance</td><td>Missing updated ISO 27001 certification documentation.</td><td>${badge('Critical')}</td></tr><tr><td>Resource Allocation</td><td>Key personnel named in proposal are currently overallocated on other projects.</td><td>${badge('Medium')}</td></tr></tbody></table></div>`)}
 <div class="actions" style="margin-top:15px"><button class="btn" data-go="override-recommendation" data-proposal="${p.id}">Override AI Recommendation →</button><button class="btn" data-go="suppliers">View Suppliers</button></div>
 </div><div class="side-stack">${card(esc(p.supplier),`<div class="card-body"><div class="stat-row"><div class="avatar">BA</div>${badge('Under Review')}</div><p class="muted">Vendor ID: ${esc(p.supplierId)}</p><div class="detail-label">CATEGORY</div><p>${esc(p.category)}</p><div class="detail-label">TOTAL SPEND YTD</div><h3>${money(p.cost)}</h3><hr><button class="btn small" data-go="suppliers">View Full Supplier Profile →</button></div>`)}</div></div>`;
}
async function renderOverride() {
 const p=await getProposal(currentProposalId==='PR-2025-105'?'PR-2025-101':currentProposalId);
 screen.innerHTML=`${heading('Override AI Recommendation',`Proposal #${p.id} • Procurement governance`,`<button class="btn" data-go="risk-analysis">← Back</button>`)}
 <div class="modal"><div class="modal-title"><h2>Override AI Recommendation</h2><button class="close-btn" data-go="risk-analysis">×</button></div>
 <div class="override-alert"><h3>⚠ AI Recommendation: ${esc(p.recommendation)}</h3><p>The AI assessment has identified risk signals for ${esc(p.id)} from ${esc(p.supplier)}.<br><br>• Historical delivery and SLA performance should be reviewed.<br>• Financial stability and cost alignment need consideration.<br>• Confirm all required compliance documentation before approval.</p></div>
 <form id="overrideForm" data-id="${esc(p.id)}"><div class="form-row"><label>Your Decision</label><div class="radio-cards"><label class="radio-card"><input type="radio" name="decision" value="Approve Regardless" required> Approve Regardless</label><label class="radio-card"><input type="radio" name="decision" value="Send for Manual Review" required> Send for Manual Review</label><label class="radio-card"><input type="radio" name="decision" value="Reject Proposal" required> Reject Proposal</label></div></div>
 <div class="form-row"><label for="reason">Reason for Override</label><select class="select" style="width:100%" id="reason" required><option value="">Select a primary reason…</option><option>Additional evidence received</option><option>Business criticality</option><option>Risk assessment correction</option><option>Budget exception approved</option><option>Other documented reason</option></select></div>
 <div class="form-row"><label for="comments">Additional Comments</label><textarea id="comments" class="textarea" maxlength="500" placeholder="Provide detailed justification for overriding the AI recommendation…"></textarea><div class="counter"><span id="count">0</span> / 500</div></div>
 <label class="checkline"><input id="ack" type="checkbox" required><span>I acknowledge that I am overriding an automated risk assessment. My actions will be recorded in the system audit log and may require secondary approval based on enterprise governance policies.</span></label>
 <div class="modal-actions"><button type="button" class="btn" data-go="risk-analysis">Cancel</button><button type="submit" class="btn primary">Confirm Override</button></div></form></div>`;
 $('#comments').addEventListener('input',e=>$('#count').textContent=e.target.value.length);
 $('#overrideForm').addEventListener('submit',async e=>{
  e.preventDefault();const decision=$('input[name="decision"]:checked')?.value;
  try{const out=await api(`/proposals/${encodeURIComponent(p.id)}/override`,{method:'POST',body:JSON.stringify({decision,reason:$('#reason').value,comments:$('#comments').value,acknowledged:$('#ack').checked})});notify(out.message);go('risk-analysis',p.id);}
  catch(err){notify(err.message,true);}
 });
}
async function renderSuppliers() {
 const params=new URLSearchParams();
 const q=$('#supplierSearch')?.value||'';
 const category=$('#categoryFilter')?.value||'All', status=$('#statusFilter')?.value||'All', risk=$('#riskFilter')?.value||'All';
 if(q)params.set('q',q);if(category!=='All')params.set('category',category);if(status!=='All')params.set('status',status);if(risk!=='All')params.set('risk',risk);
 const result=await api('/suppliers?'+params.toString()); suppliersCache=result.items;
 screen.innerHTML=`${heading('Suppliers','Manage and assess your supplier network',`<button class="btn" id="exportBtn">⇩ Export CSV</button><button class="btn primary" id="addSupplierBtn">＋ Add New Supplier</button>`)}
 <div class="table-toolbar"><input class="field" id="supplierSearch" placeholder="⌕ Search suppliers…" value="${esc(q)}"><select class="select" id="categoryFilter"><option>All</option>${result.categories.map(c=>`<option ${c===category?'selected':''}>${esc(c)}</option>`).join('')}</select><select class="select" id="statusFilter">${['All','Active','Under Review','Inactive'].map(x=>`<option ${x===status?'selected':''}>${x}</option>`).join('')}</select><select class="select" id="riskFilter">${['All','Low','Medium','High'].map(x=>`<option ${x===risk?'selected':''}>${x}</option>`).join('')}</select></div>
 ${card('Supplier Directory',`<div class="table-wrap"><table class="data-table"><thead><tr><th>Supplier Name</th><th>Category</th><th>Active Proposals</th><th>Rating</th><th>Risk Level</th><th>Status</th><th>Actions</th></tr></thead><tbody>${result.items.map(s=>`<tr><td><div class="supplier-name">${esc(s.name)} ${s.verified?'✿':''}</div><small class="muted">ID: ${esc(s.id)}</small></td><td>${esc(s.category)}</td><td>${s.activeProposals}</td><td class="rating">★ ${Number(s.rating).toFixed(1)}</td><td>${badge(s.risk)}</td><td>${badge(s.status)}</td><td><button class="btn small" data-supplier="${esc(s.id)}">View</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No suppliers match your filters.</td></tr>'}</tbody></table></div><div class="table-footer"><span>Showing ${result.items.length} of ${result.total} results</span><div class="pagination"><button disabled>‹</button><button class="active">1</button><button disabled>›</button></div></div>`)}
 <div id="supplierModalHost"></div>`;
 ['supplierSearch','categoryFilter','statusFilter','riskFilter'].forEach(id=>$('#'+id).addEventListener(id==='supplierSearch'?'input':'change',()=>renderSuppliers().catch(e=>notify(e.message,true))));
 $('#addSupplierBtn').addEventListener('click',showSupplierModal);
 $('#exportBtn').addEventListener('click',()=>exportCSV(result.items));
 $$('[data-supplier]').forEach(b=>b.addEventListener('click',()=>{const s=result.items.find(x=>x.id===b.dataset.supplier);if(s)showSupplierDetails(s);}));
}
function showSupplierModal(){
 const host=$('#supplierModalHost');host.innerHTML=`<div class="modal" style="margin-top:16px"><div class="modal-title"><h2>Add New Supplier</h2><button class="close-btn" id="closeSupplier">×</button></div><form id="supplierForm"><div class="form-row"><label>Supplier name *</label><input class="field" name="name" required placeholder="e.g. Northstar Technologies"></div><div class="form-row"><label>Category *</label><select class="select" style="width:100%" name="category" required><option value="">Choose category</option>${['IT Infrastructure','Logistics','Consulting','Cloud Services','IT Consulting & Services','Cybersecurity','Network Services','Other'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="grid decision-grid"><div class="form-row"><label>Risk level</label><select class="select" style="width:100%" name="risk"><option>Low</option><option selected>Medium</option><option>High</option></select></div><div class="form-row"><label>Rating (0–5)</label><input class="field" type="number" min="0" max="5" step=".1" name="rating" value="0"></div></div><div class="form-row"><label>Headquarters</label><input class="field" name="location" placeholder="City, State, Country"></div><div class="form-row"><label>Key contact</label><input class="field" name="contact" placeholder="Contact name"></div><div class="modal-actions"><button type="button" class="btn" id="cancelSupplier">Cancel</button><button class="btn primary">Save Supplier</button></div></form></div>`;
 $('#closeSupplier').onclick=$('#cancelSupplier').onclick=()=>host.innerHTML='';
 $('#supplierForm').addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target).entries());try{const out=await api('/suppliers',{method:'POST',body:JSON.stringify(data)});notify('Supplier added successfully.');await renderSuppliers();}catch(err){notify(err.message,true);}});
 host.scrollIntoView({behavior:'smooth',block:'start'});
}
function showSupplierDetails(s){
 const host=$('#supplierModalHost');host.innerHTML=`<div class="modal" style="margin-top:16px"><div class="modal-title"><h2>${esc(s.name)}</h2><button class="close-btn" id="closeDetails">×</button></div><div class="grid decision-grid">${mini('Historical Rating',s.rating+' / 5','Supplier rating',s.rating*20)}${mini('On-time Delivery',s.onTimeDelivery+'%','Delivery performance',s.onTimeDelivery)}${mini('Quality Compliance',s.qualityCompliance+'%','Quality metrics',s.qualityCompliance)}${mini('Responsiveness',s.responsiveness+'%','SLA performance',s.responsiveness)}</div><div class="details" style="margin-top:18px"><div><div class="detail-label">SUPPLIER ID</div>${esc(s.id)}</div><div><div class="detail-label">CATEGORY</div>${esc(s.category)}</div><div><div class="detail-label">HEADQUARTERS</div>${esc(s.location)}</div><div><div class="detail-label">KEY CONTACT</div>${esc(s.contact)}</div><div><div class="detail-label">STATUS / RISK</div>${badge(s.status)} ${badge(s.risk)}</div></div></div>`;$('#closeDetails').onclick=()=>host.innerHTML='';
}
function exportCSV(items){const cols=['id','name','category','activeProposals','rating','risk','status'];const csv=[cols.join(','),...items.map(s=>cols.map(c=>`"${String(s[c]??'').replace(/"/g,'""')}"`).join(','))].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='caliberux-suppliers.csv';a.click();URL.revokeObjectURL(a.href);notify('Supplier CSV exported.');}
async function renderAuditLogs(){const r=await api('/audit-logs');screen.innerHTML=`${heading('Audit Logs','A record of supplier and proposal decisions')} ${card('Recent activity',`<div class="card-body">${r.items.length?r.items.map(x=>`<div class="audit-item"><span class="evidence-icon">◷</span><div><b>${esc(x.action)}</b><p>${esc(x.details)} • ${esc(x.actor)}</p></div><time>${new Date(x.timestamp).toLocaleString()}</time></div>`).join(''):'<div class="empty">No audit events yet. Decisions and supplier changes will appear here.</div>'}</div>`)}`;}
document.addEventListener('click',async e=>{
 const goBtn=e.target.closest('[data-go]');if(goBtn){go(goBtn.dataset.go,goBtn.dataset.proposal);return;}
 const decisionBtn=e.target.closest('[data-decision]');if(decisionBtn){const decision=decisionBtn.dataset.decision,id=decisionBtn.dataset.id;if(decision==='Rejected'&&!confirm('Reject this proposal?'))return;try{const out=await api(`/proposals/${encodeURIComponent(id)}/decision`,{method:'PATCH',body:JSON.stringify({decision})});notify(out.message);render(location.hash.slice(1)||'supplier-review');}catch(err){notify(err.message,true);}return;}
});
$('#globalSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){go('suppliers');setTimeout(()=>{const input=$('#supplierSearch');if(input){input.value=e.target.value;input.dispatchEvent(new Event('input'));}},80);}});
$('#notifications').addEventListener('click',()=>go('audit-logs'));
window.addEventListener('hashchange',()=>render(location.hash.slice(1)));
render();
