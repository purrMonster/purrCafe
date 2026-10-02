const app=document.querySelector('#app'), drawer=document.querySelector('#drawer'), drawerContent=document.querySelector('#drawer-content');
const page=location.pathname==='/wall'?'wall':location.pathname==='/inbox'?'inbox':location.pathname==='/settings'?'settings':'overview';
document.body.dataset.page=page;
try {document.documentElement.dataset.theme=localStorage.getItem('purrbrews-theme')==='dark'?'dark':'light';} catch {}
let session, snapshot, mail, loading=false, notificationTimer, messageGeneration=0;
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const brand='<span class="brand-mark" aria-hidden="true"><span>ω</span></span><span>purrbrews</span>';
const money=(value,currency)=>new Intl.NumberFormat('en-IN',{style:'currency',currency,maximumFractionDigits:2}).format(value/100);
function date(value,options={dateStyle:'medium',timeStyle:'short'}) {return value && Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat('en',{timeZone:session?.timezone || 'Asia/Kolkata',...options}).format(new Date(value)):'Not checked';}
function notify(message) {const toast=document.querySelector('.toast');toast.textContent=message;clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>toast.textContent='',6000);}
async function api(path,method='GET',body) {
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(75000),headers:method==='GET'?{}:{'Content-Type':'application/json','X-Purrbrews-Intent':'dashboard'},body:body===undefined?undefined:JSON.stringify(body)});
  let data;try {data=await response.json();} catch {throw new Error('The server returned an unexpected response.');}
  if(!response.ok) throw new Error(data.error || 'Request failed.');return data;
}
function empty(source,title='Waiting for a connection') {
  return `<div class="empty-panel"><h3>${escape(title)}</h3><p>${escape(source?.message || 'Loading current information…')}</p>${!session.wallOnly?'<a href="/settings">Connection settings ↗</a>':''}</div>`;
}
function sourceTime(source) {return `<p class="live-source-time">${source?.updatedAt?`Last fetched ${escape(date(source.updatedAt))}`:'No live reading available'}</p>`;}
function status(source) {return `<span class="live-status">${source?.status==='ready'?'Live reading':source?.status==='unavailable'?'Unavailable':'Setup needed'}</span>`;}
function header() {
  const wall=page==='wall' || session.wallOnly;
  return `<header class="sidebar live-header"><a class="brand" href="${session.wallOnly?'/wall':'/'}">${brand}</a>${!session.wallOnly?`<nav aria-label="Dashboard screens">${[['/','Overview','overview'],['/inbox','Your inbox','inbox'],['/wall','Wall display','wall'],['/settings','Settings','settings']].map(([href,label,key])=>`<a class="nav-link ${page===key?'active':''}" href="${href}" ${page===key?'aria-current="page"':''}>${label}</a>`).join('')}</nav>`:''}<div class="actions"><span class="live-status">${session.local?'Local development':wall?'Household display':escape(session.name)}</span><button class="icon-button" data-theme aria-label="Switch color theme">◐</button></div></header>`;
}
function homePanel(source) {
  return `<section class="card dark-card ${page==='wall'?'wall-home':''}"><div class="card-head"><div><h2>Home, right now</h2><p class="sub">Home Assistant · selected entities</p></div>${status(source)}</div>${source?.data?.length?`<div class="live-devices">${source.data.map(item=>`<div class="device"><div class="device-name"><span class="device-glyph" aria-hidden="true">${item.actions.length?'☼':'◈'}</span><div><strong>${escape(item.label)}</strong><span class="state">${escape(item.area)} · ${escape(item.state)} ${escape(item.unit)}</span></div></div>${item.actions.length?`<div class="device-actions">${item.actions.map(action=>`<button data-control="${escape(item.id)}" data-action="${action}" aria-pressed="${action==='turn_on'?item.state==='on':action==='turn_off'?item.state==='off':false}" aria-label="${escape(item.label)}: ${action==='activate'?'activate':action==='turn_on'?'turn on':'turn off'}" ${!item.available?'disabled':''}>${action==='activate'?'Run':action==='turn_on'?'On':'Off'}</button>`).join('')}</div>`:`<span class="entity-value">${escape(item.state)}${escape(item.unit)}</span>`}</div>`).join('')}</div>`:empty(source)}${sourceTime(source)}</section>`;
}
function budgetPanel(source) {
  const data=source?.data;
  return `<section class="card budget-card ${page==='wall'?'wall-budget':''}"><div class="card-head"><div><h2>Room to breathe</h2><p class="sub">Actual Budget${data?` · ${escape(data.month)}`:''}</p></div>${status(source)}</div>${data?`<p class="small muted">Available across expense envelopes</p><div class="budget-amount">${escape(money(data.available,data.currency))}</div><p class="budget-note">${escape(money(data.assigned,data.currency))} assigned · ${escape(money(data.activity,data.currency))} net spending</p><p class="budget-note">Available balances include carryover and refunds.</p>${page!=='wall' && !session.wallOnly?`<div class="budget-breakdown">${data.categories.slice(0,4).map(cat=>`<div class="budget-row"><span>${escape(cat.name)}</span><span>${escape(money(cat.available,data.currency))}</span></div>`).join('')}</div><button class="card-link" data-budget>View all expense envelopes ↗</button>`:''}`:empty(source)}${sourceTime(source)}</section>`;
}
function mailPanel() {
  const data=mail?.data;
  return `<section class="card mail-card live-mail"><span class="postmark" aria-hidden="true">PB / POST</span><div class="card-head"><div><h2>A note for you</h2><p class="sub">Your Purelymail inbox</p></div></div>${data?`<div class="mail-count"><span class="serif">${data.unread}</span><p>unread messages<br>Only your mailbox is shown.</p></div>${data.messages.slice(0,3).map(message=>`<button class="mail-row" data-message="${escape(message.id)}"><span class="mail-row-top"><strong>${escape(message.sender)}</strong><time>${escape(date(message.receivedAt,{month:'short',day:'numeric'}))}</time></span><p>${escape(message.subject)}</p></button>`).join('')}${!data.messages.length?'<p class="muted">Your inbox is empty.</p>':''}<div class="mail-bottom"><span>Read-only message previews</span><a class="card-link" href="/inbox">Open inbox ↗</a></div>`:empty(mail,'Your personal mail')}${sourceTime(mail)}</section>`;
}
function fleetPanel(source) {
  return `<section class="card fleet-card ${page==='wall'?'wall-fleet':''}"><div class="fleet-title"><h2>The quiet crew</h2><p>Gatus · measured reachability</p></div>${source?.data?`<div class="fleet-nodes">${source.data.map(item=>`<div class="node"><strong>${escape(item.name)}</strong><span class="fleet-state ${item.state}">${item.state==='up'?'Online':item.state==='down'?'Offline':'Unknown'}</span><small>${escape(date(item.checkedAt,{hour:'2-digit',minute:'2-digit'}))}</small></div>`).join('')}</div>`:`<p class="small">${escape(source?.message || 'Loading monitor readings…')}</p>`}</section>`;
}
function directory() {
  const groups=[...new Set(snapshot.services.map(item=>item.group))];
  return `<section><div class="section-head"><h2>Your everyday constellation.</h2><div class="directory-controls"><label for="service-search" class="small muted">Find an app</label><input class="search" id="service-search" type="search" placeholder="Search your services"></div></div><div class="service-groups">${groups.map(group=>`<section class="service-group"><h3 class="group-label">${escape(group)}</h3><div class="service-list">${snapshot.services.filter(item=>item.group===group).map(item=>item.url?`<a class="service-button" data-service="${escape(item.name)}" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer"><span class="service-icon" aria-hidden="true">↗</span><span>${escape(item.name)}<small>Open service</small></span></a>`:`<span class="service-button" data-service="${escape(item.name)}" aria-disabled="true"><span class="service-icon" aria-hidden="true">◈</span><span>${escape(item.name)}<small>${escape(item.note || 'No web shortcut configured')}</small></span></span>`).join('')}</div></section>`).join('')}</div><p id="search-empty" class="muted" hidden>No services match this search.</p></section>`;
}
function render() {
  if(!session) return;
  let content='';
  if(page==='settings') content=settingsMarkup();
  else if(page==='inbox') {
    const data=mail?.data;
    content=`<header class="intro"><div><h1>Letters, with<br><em>a little breathing room.</em></h1><p>Your personal inbox, at your pace.</p></div><button class="button" data-refresh>Refresh inbox ↻</button></header><section class="card inbox-list live-inbox">${data?`<div class="inbox-toolbar"><strong>${escape(data.address)}</strong><span>${data.unread} unread</span></div>${data.messages.map(message=>`<button class="inbox-message ${message.unread?'unread':''}" data-message="${escape(message.id)}"><span class="sender">${escape(message.sender)}<time>${escape(date(message.receivedAt))}</time></span><p class="subject">${escape(message.subject)}</p><span class="mail-unread">${message.unread?'Unread':'Read'}</span></button>`).join('')}${!data.messages.length?'<div class="empty-panel"><h3>A quiet inbox.</h3><p>No messages to show.</p></div>':''}`:empty(mail,'Your personal mail')}</section>${sourceTime(mail)}`;
  } else if(snapshot) {
    const wall=page==='wall';
    content=`<header class="${wall?'wall-intro':'intro'}"><div><h1>${wall?'A good day<br><em>starts at home.</em>':'Your home.<br><em>Well brewed.</em>'}</h1><p>${wall?'The household at a glance.':'Home, money, mail, and the machines behind it.'}</p></div><div class="live-date">${escape(date(new Date(),{dateStyle:'full'}))}</div></header><div class="${wall?'wall-grid':'grid'}">${homePanel(snapshot.home)}${budgetPanel(snapshot.budget)}${!wall?mailPanel():''}${fleetPanel(snapshot.fleet)}${!wall?'<section class="card backup-card"><h3>Backups need verification</h3><p>No backup monitor is connected. Confirm a successful backup and restore before relying on it.</p></section>':''}</div>${!wall?directory():''}`;
  }
  app.innerHTML=`${header()}<main class="${page==='wall'?'wall-page live-wall':'content'}" id="main">${content}<footer class="page-foot"><span>A home for the whole Purrbrews ecosystem.</span><span>${page==='wall'?'Aggregate budget only · personal mail stays private':'Live sources · missing readings stay unknown'}</span></footer></main>`;
}
let account;
function settingsMarkup() {
  return `<header class="intro"><div><h1>A place for<br><em>the connections.</em></h1><p>Your mailbox belongs to your signed-in account.</p></div></header><section class="card settings-card"><h2>Your Purelymail mailbox</h2><p>${account?.connected?`Connected as ${escape(account.address)}.`:'Connect your personal mailbox to show unread counts and message previews.'}</p><p class="small">The server verifies the connection using encrypted IMAP and saves encrypted credentials. Messages stay read-only; attachments and remote images are not displayed.</p><form id="mail-form" class="settings-form"><label>Email address<input type="email" name="address" autocomplete="username" required maxlength="254" value="${escape(account?.address || '')}"></label><label>Mailbox password<input type="password" name="password" autocomplete="current-password" required maxlength="1024"></label><div class="actions"><button class="button primary" type="submit">${account?.connected?'Update connection':'Connect mailbox'}</button>${account?.connected?'<button class="button" type="button" data-disconnect>Disconnect mailbox</button>':''}</div><p class="form-error" role="status" id="form-status"></p></form></section><section class="card settings-card live-service-group"><h2>Household integrations</h2><p>Home Assistant entities, Actual Budget authentication, and Gatus access are configured by the administrator on the server.</p><p class="small">This dashboard uses one shared household budget. The wall identity receives aggregate totals only.</p>${session.admin?'<a class="button" href="/previews/index.html">View design previews ↗</a>':''}</section>`;
}
async function load() {
  if(loading) return;loading=true;
  try {
    session ||= await api('/api/session');
    if(session.wallOnly && page!=='wall') {location.replace('/wall');return;}
    if(page==='settings') account=await api('/api/mail/account');
    else {
      const results=await Promise.all([page==='inbox'?Promise.resolve(null):api(`/api/overview${page==='wall'?'?wall=1':''}`),page==='wall'?Promise.resolve(null):api('/api/mail')]);
      if(results[0]) snapshot=results[0];if(results[1]) mail=results[1];
    }
    render();
    if(page==='overview') document.querySelector('.intro')?.insertAdjacentHTML('beforeend','<img class="overview-scene live-art" src="/home-art.svg" alt="" width="320" height="203">');
  } catch(error) {
    app.innerHTML=`<main class="content"><h1>We couldn’t open your household.</h1><p>${escape(error.message)}</p><button class="button" data-refresh>Try again</button></main>`;
  } finally {loading=false;}
}
document.querySelector('#close-drawer').addEventListener('click',()=>drawer.close());
drawer.addEventListener('close',()=>{messageGeneration++;drawerContent.replaceChildren();});
function open(title,html) {document.querySelector('#drawer-title').textContent=title;drawerContent.innerHTML=html;if(!drawer.open) drawer.showModal();}
document.addEventListener('click',async event=> {
  const target=event.target.closest('button');if(!target) return;
  if(target.hasAttribute('data-theme')) {const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try {localStorage.setItem('purrbrews-theme',theme);} catch {}return;}
  if(target.hasAttribute('data-refresh')) return load();
  if(target.hasAttribute('data-budget') && snapshot?.budget.data) {
    messageGeneration++;
    const budget=snapshot.budget.data;
    return open(`Expense envelopes · ${budget.month}`,`<h2>Room to breathe.</h2><p>Assigned / Net spending / Available. Available includes carryover.</p>${budget.categories.map(cat=>`<div class="detail-row"><strong>${escape(cat.name)}</strong><span>${escape(money(cat.assigned,budget.currency))} / ${escape(money(cat.activity,budget.currency))} / ${escape(money(cat.available,budget.currency))}</span></div>`).join('')}`);
  }
  if(target.hasAttribute('data-control')) {
    target.disabled=true;
    try {const result=await api('/api/home/control','POST',{id:target.dataset.control,action:target.dataset.action});notify(result.message);await load();}
    catch(error) {notify(error.message);}finally {if(target.isConnected) target.disabled=false;}return;
  }
  if(target.hasAttribute('data-message')) {
    const generation=++messageGeneration;
    open('Your personal mail','<p role="status">Loading message…</p>');
    try {const message=await api(`/api/mail/message/${encodeURIComponent(target.dataset.message)}`);if(generation!==messageGeneration || !drawer.open) return;open('Your personal mail',`<h2>${escape(message.subject)}</h2><p class="message-meta">${escape(message.sender)}</p><div class="plain-message">${escape(message.text)}</div><p class="privacy-note">Read-only preview · attachments and remote images are not loaded.</p>`);}catch(error) {if(generation===messageGeneration && drawer.open) open('Message unavailable',`<p>${escape(error.message)}</p>`);}return;
  }
  if(target.hasAttribute('data-disconnect')) {
    target.disabled=true;try {notify((await api('/api/mail/account','DELETE',{})).message);await load();}catch(error) {notify(error.message);target.disabled=false;}
  }
});
document.addEventListener('submit',async event=> {
  if(event.target.id!=='mail-form') return;event.preventDefault();
  const form=event.target, button=form.querySelector('[type=submit]'),status=form.querySelector('#form-status');
  const values=new FormData(form);button.disabled=true;status.textContent='Verifying your mailbox…';
  try {const result=await api('/api/mail/account','POST',{address:values.get('address'),password:values.get('password')});form.elements.password.value='';notify(result.message);await load();}
  catch(error) {status.textContent=error.message;}finally {button.disabled=false;}
});
document.addEventListener('input',event=> {
  if(event.target.id!=='service-search') return;
  const query=event.target.value.trim().toLowerCase();let count=0;
  document.querySelectorAll('.service-group').forEach(group=>{let matches=0;group.querySelectorAll('[data-service]').forEach(item=>{const match=item.dataset.service.toLowerCase().includes(query);item.hidden=!match;if(match){count++;matches++;}});group.hidden=!matches;});
  document.querySelector('#search-empty').hidden=count>0;
});
load();
setInterval(()=>{if(page!=='settings' && !document.hidden && !drawer.open && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) load();},30000);
