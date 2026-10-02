const page = document.body.dataset.page;
let savedTheme = 'light';
try { savedTheme = localStorage.getItem('purrbrews-theme') || 'light'; } catch {}
document.documentElement.dataset.theme = savedTheme === 'dark' ? 'dark' : 'light';

const brand = '<span class="brand-mark" aria-hidden="true"><span>ω</span></span><span>purrbrews</span>';
const sampleBadge = '<span class="sample">SAMPLE DATA · DESIGN PREVIEW</span>';
const themeButton = '<button class="icon-button" data-theme-toggle aria-label="Switch color theme" title="Switch color theme">◐</button>';
// Original, inline artwork: the previews stay completely offline.
function homeIllustration() {
  return `<svg class="home-illustration" viewBox="0 0 520 330" fill="none" aria-hidden="true"><rect x="54" y="33" width="406" height="263" rx="130" fill="currentColor" opacity=".06"/><circle cx="365" cy="94" r="47" fill="#e5a17f"/><path d="M365 30v-12m0 152v-12m-64-64h-12m152 0h-12m-19-45 9-9m-108 108 9-9" stroke="#a65b41" stroke-width="2"/><path d="M228 59h94v137h-94z" fill="#eff0dc" stroke="#506653" stroke-width="2"/><path d="M275 59v137m-47-68h94" stroke="#506653" stroke-width="2"/><path d="M242 176c22-51 49-48 65 0" fill="#a6b69a"/><path d="M62 274h400" stroke="#52614f" stroke-width="2"/><path d="M87 184c0-20 17-36 38-36h81c20 0 37 16 37 36v61H87z" fill="#597666"/><path d="M79 206c0-13 18-14 18 0v41h138v-41c0-14 19-13 19 0v53H79z" fill="#365749"/><path d="M93 259v15m147-15v15" stroke="#365749" stroke-width="5"/><rect x="112" y="164" width="51" height="48" rx="10" fill="#dd9a7e" transform="rotate(-9 112 164)"/><path d="M169 222c-13-17-7-38 6-38l9-15 11 15c23-4 38 13 34 34-1 8-6 13-15 14h-35c-22 0-25-8-23-15" fill="#efe6ce"/><path d="m181 197 3 1m15-1 3 1m-13 8 3 2 3-2m-34-2-14-3m13 10-14 2" stroke="#3d4d3d" stroke-width="2" stroke-linecap="round"/><path d="M349 232h73m-64 0-6 42m61-42 7 42" stroke="#805e47" stroke-width="4"/><path d="M372 210h26v22h-26z" fill="#df9c7e"/><path d="M398 214c15-3 15 17 0 14" stroke="#805e47" stroke-width="3"/><path d="M379 201c-7-7 7-9 0-17m10 17c-7-7 7-9 0-17" stroke="#805e47" stroke-width="2" stroke-linecap="round"/><path d="M318 273v-68m0 30c-32-2-32-25-32-25 26-1 32 25 32 25m0-8c27-2 30-33 30-33-28 2-30 33-30 33" stroke="#506653" stroke-width="3"/><path d="M303 249h31l-5 25h-21z" fill="#cc8c70"/><path d="M83 162V94m-20 0h40l-8-29H71z" fill="#d7c9a2" stroke="#805e47" stroke-width="2"/><ellipse cx="197" cy="283" rx="75" ry="6" fill="#506653" opacity=".12"/></svg>`;
}
function sceneControls() {
  return `<div class="scene-controls"><span class="scene-label">Set the mood <small>sample scenes</small></span><div class="scene-options" role="group" aria-label="Sample home scenes"><button data-scene="morning" aria-pressed="false">Morning <span aria-hidden="true">↗</span></button><button data-scene="reading" aria-pressed="false">Reading <span aria-hidden="true">↗</span></button><button data-scene="evening" aria-pressed="false">Wind down <span aria-hidden="true">↗</span></button></div></div>`;
}
const messages = [
  { sender: 'Purrbrews garden club', initials: 'GC', subject: 'Saturday, a little planting and a lot of tea', time: '09:42', date: '1 October 2026, 09:42', snippet: 'We’re bringing herbs, pots, and something sweet.', body: '<p>Hi everyone,</p><p>We’re spending Saturday morning planting the new herb pots. Bring a little compost if you have some, and your favourite mug.</p><div class="mail-highlight"><div><strong>Saturday, 10 am</strong><p>At home · the sunny corner</p></div><span aria-hidden="true">↗</span></div><p>There will be tea, plenty of biscuits, and absolutely no pressure to know anything about gardening.</p><p>See you there,<br>The garden club</p>' },
  { sender: 'Neighbourhood library', initials: 'NL', subject: 'Your next chapter is ready', time: '08:16', date: '1 October 2026, 08:16', snippet: 'The book you reserved is ready to collect.', body: '<p>Hello,</p><p>Your reserved copy of <em>The Secret Garden</em> is ready. We’ll hold it at the front desk until next Thursday.</p><div class="mail-highlight"><div><strong>Ready to collect</strong><p>One book · collection desk</p></div></div><p>Bring your library card when you stop by. Happy reading!</p><p>Your neighbourhood library</p>' },
  { sender: 'Coffee subscription', initials: 'CS', subject: 'Fresh beans are on their way', time: 'Yesterday', date: '30 September 2026, 16:25', snippet: 'This month’s medium roast has just been packed.', body: '<p>Hello, coffee people,</p><p>Your October bag is packed and ready to leave the roastery. This month’s medium roast has notes of chocolate and toasted hazelnut.</p><div class="mail-highlight"><div><strong>250 g · whole beans</strong><p>Estimated delivery: Friday</p></div></div><p>We hope it makes your mornings a little nicer.</p><p>The coffee team</p>' },
  { sender: 'Household notes', initials: 'HN', subject: 'A few things for the weekend', time: 'Yesterday', date: '30 September 2026, 12:10', snippet: 'Groceries, a shared recipe, and a film to watch.', body: '<p>Hello household,</p><p>The grocery list is ready in Vikunja. There’s also a new soup recipe in Mealie for the weekend.</p><p>Let’s make a pot, find a good film, and call it a plan.</p><p>See you at dinner!</p>' },
  { sender: 'Community workshop', initials: 'CW', subject: 'The repair table is open again', time: 'Tuesday', date: '29 September 2026, 10:05', snippet: 'Bring the small things you’ve been meaning to fix.', body: '<p>Hello neighbours,</p><p>The repair table is open this Sunday afternoon. We can help with small appliances, mending, and the mysteries of wobbly chairs.</p><p>Bring your item and we’ll figure it out together.</p><p>The workshop team</p>' }
];
const services = [
  { group: 'Everyday household', items: ['Nextcloud', 'Immich', 'Paperless', 'Mealie', 'Vikunja', 'Vaultwarden', 'FreshRSS', 'Actual Budget'] },
  { group: 'Home & personal', items: ['Home Assistant', 'Music Assistant', 'Karakeep', 'FitTrackee', 'Traccar', 'Open WebUI', 'n8n', 'ESPHome'] },
  { group: 'Fleet & operations', items: ['Gatus', 'Komodo', 'Scrutiny', 'NetAlertX', 'Pi-hole · sieve', 'Pi-hole · mochaPot', 'Speedtest Tracker', 'ntfy', 'Authelia', 'LLDAP', 'Traefik', 'CrowdSec', 'Unbound', 'Cloudflare Tunnel', 'Restic backups', 'Samba / NFS', 'Ollama · roastery', 'Immich ML', 'Embedding worker', 'pgvector', 'Periphery agents', 'Disk collectors'] }
];

function sidebar() {
  return `<aside class="sidebar"><a class="brand" href="index.html" aria-label="Purrbrews preview gallery">${brand}</a><nav aria-label="Mockup screens"><a class="nav-link ${page === 'overview' ? 'active' : ''}" href="dashboard-overview.html" ${page === 'overview' ? 'aria-current="page"' : ''}><span class="nav-symbol" aria-hidden="true">▦</span>Overview</a><a class="nav-link ${page === 'inbox' ? 'active' : ''}" href="dashboard-inbox.html" ${page === 'inbox' ? 'aria-current="page"' : ''}><span class="nav-symbol" aria-hidden="true">✉</span>Your inbox</a><a class="nav-link" href="wall-display.html"><span class="nav-symbol" aria-hidden="true">◫</span>Wall display</a><span class="nav-section">Explore the design</span><a class="nav-link" href="index.html"><span class="nav-symbol" aria-hidden="true">↗</span>All previews</a></nav><div class="sidebar-bottom"><span class="pill good"><span class="dot"></span>Local design preview</span><div class="user"><span class="avatar">PB</span><div><strong class="small">Household member</strong><p class="small muted">Sample personal view</p></div></div></div></aside>`;
}
function topbar(section) { return `<div class="topbar"><span class="breadcrumb">Your household / ${section}</span><div class="actions">${sampleBadge}${themeButton}</div></div>`; }
function devices() {
  return `<div class="device-list"><div class="device"><div class="device-name"><span class="device-glyph" aria-hidden="true">☼</span><div><strong>Living room lights</strong><span class="state">On · warm light</span></div></div><button class="toggle" aria-pressed="true" aria-label="Living room lights" data-device="Living room lights" data-on="On · warm light" data-off="Off"></button></div><div class="device"><div class="device-name"><span class="device-glyph" aria-hidden="true">◈</span><div><strong>Reading lamp</strong><span class="state">Off</span></div></div><button class="toggle" aria-pressed="false" aria-label="Reading lamp" data-device="Reading lamp" data-on="On · soft glow" data-off="Off"></button></div><div class="device"><div class="device-name"><span class="device-glyph" aria-hidden="true">≋</span><div><strong>Bedroom fan</strong><span class="state">On · low speed</span></div></div><button class="toggle" aria-pressed="true" aria-label="Bedroom fan" data-device="Bedroom fan" data-on="On · low speed" data-off="Off"></button></div></div>`;
}
function nodes() { return ['sieve', 'percolator', 'cellar', 'mochaPot', 'grinder'].map(name => `<div class="node"><strong>${name}</strong><span class="node-dot"><span class="dot"></span>Online</span></div>`).join(''); }
function directory() {
  const serviceButton = name => `<button class="service-button" data-service="${name}"><span class="service-icon" aria-hidden="true">${name.split(' ').map(word => word[0]).join('').slice(0,2).toUpperCase()}</span><span>${name}</span></button>`;
  return `<section aria-labelledby="directory-title"><div class="section-head"><h2 id="directory-title">Everything, in its place.</h2><div class="directory-controls"><label class="muted small" for="service-search">Find an app</label><input class="search" id="service-search" type="search" placeholder="Search your services"></div></div><div class="service-groups">${services.map(group => `<section class="service-group"><h3 class="group-label">${group.group}</h3><div class="service-list">${group.items.slice(0,8).map(serviceButton).join('')}</div>${group.items.length > 8 ? `<details class="more-services"><summary>More fleet tools <span>${group.items.length - 8} · expand ↓</span></summary><div class="service-list">${group.items.slice(8).map(serviceButton).join('')}</div></details>` : ''}</section>`).join('')}</div><p id="search-empty" class="muted small" hidden>No services match this search.</p></section>`;
}
function overview() {
  return `<div class="shell">${sidebar()}<main class="content">${topbar('Overview')}<header class="intro"><div><h1>A little more at home.</h1><p>Your lights, your plans, your household. All in one place.</p></div><div class="date">Thursday, 1 October<span class="muted" style="display:block">Sample morning snapshot</span></div></header><div class="grid"><section class="card dark-card"><div class="card-head"><div><h2>Home, right now</h2><p class="sub">Home Assistant · sample states</p></div><span class="pill"><span class="dot"></span>Connected</span></div><div class="climate"><div class="climate-degree">24<span>°</span></div><div><strong>Comfortably settled</strong><p>Living room · 52% humidity</p></div></div>${devices()}<div class="home-footer"><span>3 devices · preview controls</span><button class="card-link" data-home-details>All rooms ↗</button></div></section><section class="card"><div class="card-head"><div><h2>Room to breathe</h2><p class="sub">Actual Budget · October sample</p></div><span class="pill good">On track</span></div><p class="small muted">Available across expense envelopes</p><div class="budget-amount">₹18,400<span style="font-size:22px">.00</span></div><p class="small muted">₹64,800 activity of ₹83,200 assigned</p><div class="budget-chart" role="img" aria-label="Sample October budget: 78 percent used"><span></span><span></span><span></span><span></span></div><div class="chart-caption"><span>78% used</span><span>22% available</span></div><div class="budget-breakdown"><div class="budget-row"><span><i class="legend" style="--legend:#dd967e"></i>Home & bills</span><span>₹31,600</span></div><div class="budget-row"><span><i class="legend" style="--legend:#4f7162"></i>Food & everyday</span><span>₹18,200</span></div><div class="budget-row"><span><i class="legend" style="--legend:#adba9d"></i>Getting around</span><span>₹9,100</span></div><div class="budget-row"><span><i class="legend" style="--legend:#dfcbae"></i>Little extras</span><span>₹5,900</span></div></div><div class="budget-bottom"><span class="muted">All amounts are illustrative</span><button class="card-link" data-budget-details>View budget ↗</button></div></section><section class="card mail-card"><div class="card-head"><div><h2>A note for you</h2><p class="sub">Purelymail · sample personal inbox</p></div><span aria-hidden="true" style="font-size:23px;color:var(--accent)">✉</span></div><div class="mail-count"><span class="serif">3</span><p>unread messages<br>Nothing you need to rush.</p></div>${messages.slice(0,3).map((message,index) => `<button class="mail-row" data-message="${index}"><span class="mail-row-top"><strong>${message.sender}</strong><time>${message.time}</time></span><p>${message.subject}</p></button>`).join('')}<div class="mail-bottom"><span>Only your inbox is shown</span><a class="card-link" href="dashboard-inbox.html">Open inbox ↗</a></div></section><section class="card fleet-card"><div class="fleet-title"><h2>The quiet crew</h2><p>Fleet health · sample</p></div><div class="fleet-nodes">${nodes()}</div><button class="card-link" data-fleet-details>Details ↗</button></section><section class="card backup-card"><h3>Backups need attention</h3><p>Setup isn’t verified yet. An online server doesn’t mean a backup exists.</p><button class="card-link" data-service="Restic backups">Review setup ↗</button></section></div>${directory()}<footer class="page-foot"><span>A home for the whole Purrbrews ecosystem.</span><span>Illustrative data and controls · no live connections</span></footer></main></div>`;
}
function readerMarkup(message) {
  return `<div class="reader-top"><span class="label">Personal inbox / message preview</span><span class="pill">Sample message</span></div><h2>${message.subject}</h2><div class="sender-detail"><span class="avatar">${message.initials}</span><div><strong>${message.sender}</strong><p>To: your sample inbox · ${message.date}</p></div></div><hr><div class="mail-body">${message.body}</div><div class="reader-actions"><button class="button" data-demo-notice="This is a read-only sample message.">Read-only preview</button><a class="button ghost" href="dashboard-overview.html">Back to overview ↗</a></div><p class="privacy-note">Fictional message · no mailbox is connected.</p>`;
}
function inbox() {
  return `<div class="shell">${sidebar()}<main class="content">${topbar('Your inbox')}<header class="intro"><div><h1>A slower kind of inbox.</h1><p>A few messages worth opening. Your personal mail, at your pace.</p></div><span class="pill good">3 unread · sample</span></header><div class="inbox-layout"><section class="card inbox-list" aria-label="Sample inbox messages"><div class="inbox-toolbar"><strong class="small">Inbox <span class="muted">/ 5 messages</span></strong><button class="card-link" data-refresh-mail>Refresh ↻</button></div>${messages.map((message,index) => `<button class="inbox-message ${index === 0 ? 'selected' : ''}" data-message="${index}"><span class="sender"><span>${message.sender}</span><time>${message.time}</time></span><p class="subject">${message.subject}</p><p class="snippet">${message.snippet}</p></button>`).join('')}<p class="inbox-footer">Personal view · visible only to you<br>All names and messages are fictional.</p></section><article class="card reader" id="message-reader" aria-label="Selected message">${readerMarkup(messages[0])}</article></div><footer class="page-foot"><span>Tap any message to open the detail drawer.</span><span>Read-only design preview · sample data</span></footer></main></div>`;
}
function wall() {
  return `<main class="wall-page"><header class="wall-head"><a class="brand" href="index.html">${brand}</a><div class="actions"><span class="pill good"><span class="dot"></span>Household display</span>${sampleBadge}${themeButton}<a class="button ghost" href="index.html">All previews ↗</a></div></header><section class="wall-intro"><div><h1>Home is looking good.</h1><p>A calm little corner for the things that keep us going.</p></div><div class="wall-clock">10:24<span>Thursday, 1 October · sample time</span></div></section><div class="wall-grid"><section class="card dark-card wall-home"><div class="card-head"><div><h2>Make yourself comfortable</h2><p class="sub">Home Assistant · sample states</p></div></div><div class="climate"><div class="climate-degree">24<span>°</span></div><div><strong>Living room</strong><p>52% humidity<br>Just right.</p></div></div>${devices()}<div class="home-footer"><span>Safe device controls</span><span class="pill">Preview only</span></div></section><section class="card wall-budget"><div class="card-head"><h2>October, at a glance</h2></div><p class="muted small">Available across expense envelopes</p><div class="budget-amount">₹18,400</div><p class="muted">₹64,800 used · ₹83,200 assigned</p><div class="budget-chart" role="img" aria-label="Sample October budget: 78 percent used"><span></span><span></span><span></span><span></span></div><span class="pill good">On track · sample totals</span></section><section class="card"><h2>Worth remembering</h2><div class="wall-stat">Unverified</div><p class="muted">The backup setup still needs a verified restore.</p><p class="small muted" style="margin-top:22px">Status follows the project README.</p></section><section class="card wall-fleet"><div class="card-head"><div><h2>Everything humming along</h2><p class="sub">Five fleet nodes · illustrative status</p></div><span class="pill good">5 online</span></div><div class="fleet-nodes">${nodes()}</div></section></div><footer class="wall-bottom"><span>Wall view · aggregate budget only · personal inbox content stays private</span><span>Sample data and controls · no live connections</span></footer></main>`;
}
function gallery() {
  const previews = [
    { title:'Your household overview', file:'dashboard-overview.html', desc:'Home controls, budget breathing room, personal mail, and the entire service directory.', art:`<div class="mini-frame"><div class="mini-top"><span>purrbrews</span><span>Overview</span></div><div class="mini-title">A little more at home.</div><div class="mini-grid"><div class="mini-cell dark">Home, right now<strong>24°</strong><div class="mini-lines"><span></span><span></span></div></div><div class="mini-cell">Available this month<strong>₹18,400</strong><div class="mini-lines"><span></span><span></span></div></div></div></div>` },
    { title:'A personal inbox', file:'dashboard-inbox.html', desc:'A compact list becomes a roomy message preview. Tap a note to explore the detail layer.', art:`<div class="mini-frame"><div class="mini-top"><span>purrbrews</span><span>Your inbox</span></div><div class="mini-title">A slower kind of inbox.</div><div class="mini-inbox"><div class="mini-email">Inbox / 5 messages<strong>Garden club</strong><div class="mini-lines"><span></span><span></span></div><strong>Fresh coffee</strong><div class="mini-lines"><span></span><span></span></div></div><div class="mini-email">Sample personal mail<strong>Saturday, a little planting and a lot of tea</strong><div class="mini-lines"><span></span><span></span><span></span></div></div></div></div>` },
    { title:'The household wall display', file:'wall-display.html', desc:'Bigger touch targets, comfortable room controls, and useful totals without personal message content.', art:`<div class="mini-frame mini-wall"><div class="mini-top"><span>purrbrews</span><span>10:24</span></div><div class="mini-title">Home is looking good.</div><div class="mini-grid"><div class="mini-cell">Living room<strong>24°</strong><div class="mini-lines"><span></span><span></span></div></div><div class="mini-cell">October, at a glance<strong>₹18,400</strong><div class="mini-lines"><span></span><span></span></div></div></div></div>` }
  ];
  return `<main class="gallery"><header class="gallery-header"><a class="brand" href="index.html">${brand}</a><div class="actions">${sampleBadge}${themeButton}</div></header><section class="gallery-intro"><h1>A home for<br>your <em>whole household.</em></h1><p>Three windows into Purrbrews. Warm, clear, and a little playful — with the details just a tap away.</p></section><div class="preview-grid">${previews.map((preview,index) => `<a class="preview-card" href="${preview.file}"><div class="preview-art ${index === 2 ? 'wall-art' : ''}" aria-hidden="true">${preview.art}</div><div class="preview-copy"><div class="number">PREVIEW 0${index+1}</div><h2>${preview.title}</h2><p>${preview.desc}</p><span class="open">Explore this screen <span aria-hidden="true">↗</span></span></div></a>`).join('')}</div><div class="gallery-notes"><p>Try the theme toggle, device switches, email previews,<br>budget details, and searchable service directory.</p><p>Everything here is a local mockup.<br>All financial values, messages, and live states are illustrative.</p></div></main>`;
}

document.body.innerHTML = ({ gallery, overview, inbox, wall }[page] || gallery)() + '<dialog id="detail-drawer" aria-labelledby="drawer-title"><div class="drawer-header"><strong id="drawer-title">Details</strong><button class="icon-button" data-close-drawer aria-label="Close details">×</button></div><div class="drawer-content" id="drawer-content"></div></dialog><div class="toast" role="status" aria-live="polite"></div>';
// Give each surface its own composition within the shared design language.
if (page === 'gallery') {
  const intro = document.querySelector('.gallery-intro');
  intro.innerHTML = `<div class="gallery-story"><span class="eyebrow">THE PURRBREWS HOUSEHOLD / PREVIEW EDITION 01</span><h1>Your home.<br><em>Well brewed.</em></h1><p>A little order. A lot of everyday magic. One warm corner for your home, money, mail, and the machines behind it.</p><a class="button primary hero-button" href="dashboard-overview.html">Step inside <span aria-hidden="true">↗</span></a><span class="hero-footnote">Made for mornings. And everything after.</span></div><div class="gallery-scene">${homeIllustration()}<div class="scene-ticket"><span class="dot"></span> A home with a little more harmony<small>Illustrative home scene</small></div><span class="edition-stamp" aria-hidden="true">PB<br><small>HOME CLUB</small></span></div>`;
  document.querySelector('.preview-grid').insertAdjacentHTML('beforebegin', '<div class="collection-heading"><h2>Three ways to feel at home.</h2><span class="muted small">Click a screen. Explore the little details.</span></div>');
  document.querySelectorAll('.mini-title').forEach((title, index) => { title.textContent = ['Good morning, home people.', 'Letters, with breathing room.', 'A good day starts at home.'][index]; });
}
if (page === 'overview') {
  const intro = document.querySelector('.intro');
  intro.querySelector('h1').innerHTML = 'Good morning,<br><em>home people.</em>';
  intro.querySelector('p').textContent = 'A comfortable home. A clear head. A fresh start.';
  intro.insertAdjacentHTML('beforeend', `<div class="overview-scene">${homeIllustration()}</div>`);
  intro.insertAdjacentHTML('afterend', '<div class="daily-strip" aria-label="Sample household summary"><span><i class="dot"></i> Home feels comfortable <strong>24°C</strong></span><span>Room in the budget <strong>₹18,400</strong></span><a href="dashboard-inbox.html">A few notes for you <strong>3 unread ↗</strong></a><span class="strip-note">All values are samples</span></div>');
  document.querySelector('.dark-card .device-list').insertAdjacentHTML('afterend', sceneControls());
  const budget = document.querySelector('.budget-amount').closest('.card');
  budget.classList.add('budget-card');
  budget.querySelector('.budget-amount').insertAdjacentHTML('afterend', '<div class="budget-orbit" role="img" aria-label="Sample budget: 78 percent of assigned funds used, 22 percent available"><div><strong>22<span>%</span></strong><small>still available</small></div></div>');
  budget.querySelector('.budget-chart').classList.add('compact-chart');
  document.querySelector('.section-head h2').textContent = 'Your everyday constellation.';
  document.querySelector('.mail-card').insertAdjacentHTML('afterbegin', '<span class="postmark" aria-hidden="true">PB / POST</span>');
}
if (page === 'inbox') {
  document.querySelector('.intro h1').innerHTML = 'Letters, with<br><em>a little breathing room.</em>';
  document.querySelector('.reader').insertAdjacentHTML('beforeend', '<div class="reader-signoff" aria-hidden="true">Delivered to your little corner of the internet.</div>');
}
if (page === 'wall') {
  document.querySelector('.wall-intro h1').innerHTML = 'A good day<br><em>starts at home.</em>';
  document.querySelector('.wall-home .device-list').insertAdjacentHTML('afterend', sceneControls());
}
document.querySelectorAll('.service-icon').forEach(icon => {
  const name = icon.parentElement.dataset.service;
  const paths = /Budget|Vault/.test(name) ? '<rect x="4" y="6" width="16" height="13" rx="3"/><path d="M4 10h16m-5 5h2"/>' : /Home|Mealie|Music/.test(name) ? '<path d="m3 11 9-7 9 7M6 10v10h12V10m-8 10v-6h4v6"/>' : /Nextcloud|Immich|Paperless|FreshRSS/.test(name) ? '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6m-6 4h6m-6 4h3"/>' : '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01m5-10h5m-5 10h5"/>';
  icon.innerHTML = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
});
const drawer = document.querySelector('#detail-drawer');
const drawerContent = document.querySelector('#drawer-content');
const drawerTitle = document.querySelector('#drawer-title');
let toastTimer;
function notify(message) {
  const toast = document.querySelector('.toast');
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.textContent = ''; }, 3500);
}
function openDrawer(title, content) {
  drawerTitle.textContent = title;
  drawerContent.innerHTML = content;
  drawer.showModal();
}
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-theme-toggle')) {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('purrbrews-theme', theme); } catch {}
    notify(`${theme === 'dark' ? 'Dark' : 'Light'} theme selected`);
  }
  if (target.hasAttribute('data-close-drawer')) drawer.close();
  if (target.hasAttribute('data-device')) {
    document.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    const active = target.getAttribute('aria-pressed') !== 'true';
    target.setAttribute('aria-pressed', String(active));
    target.closest('.device').querySelector('.state').textContent = active ? target.dataset.on : target.dataset.off;
    notify(`Preview: ${target.dataset.device} ${active ? 'on' : 'off'}`);
  }
  if (target.hasAttribute('data-scene')) {
    const states = { morning: [true, false, true], reading: [false, true, false], evening: [true, true, false] }[target.dataset.scene];
    document.querySelectorAll('[data-device]').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(states[index]));
      button.closest('.device').querySelector('.state').textContent = states[index] ? button.dataset.on : button.dataset.off;
    });
    document.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(button === target)));
    notify(`Preview: ${target.textContent.replace('↗', '').trim()} scene selected · sample devices only`);
  }
  if (target.hasAttribute('data-message')) {
    const messageIndex = Number(target.dataset.message);
    const message = messages[messageIndex];
    const reader = document.querySelector('#message-reader');
    if (reader) {
      reader.innerHTML = readerMarkup(message);
      document.querySelectorAll('.inbox-message').forEach(item => item.classList.toggle('selected', item === target));
    }
    openDrawer('Personal inbox · sample message', readerMarkup(message));
  }
  if (target.hasAttribute('data-budget-details')) openDrawer('Actual Budget · sample October', '<span class="pill">Illustrative values</span><h2 style="margin-top:20px">A clear view of the month.</h2><p>Expense-envelope totals match the overview. Activity is spending recorded this month.</p><div class="detail-total"><p>Available across expense envelopes</p><strong>₹18,400.00</strong></div><div class="detail-row"><strong>Category</strong><span>Assigned / Activity / Available</span></div><div class="detail-row"><strong>Home & bills</strong><span>₹36,000 / ₹31,600 / ₹4,400</span></div><div class="detail-row"><strong>Food & everyday</strong><span>₹26,000 / ₹18,200 / ₹7,800</span></div><div class="detail-row"><strong>Getting around</strong><span>₹12,000 / ₹9,100 / ₹2,900</span></div><div class="detail-row"><strong>Little extras</strong><span>₹9,200 / ₹5,900 / ₹3,300</span></div><div class="detail-row"><strong>Total</strong><span>₹83,200 / ₹64,800 / ₹18,400</span></div><p class="small">No financial account is connected. All amounts are sample data.</p>');
  if (target.hasAttribute('data-home-details')) openDrawer('Home Assistant · sample rooms', '<h2>A comfortable home.</h2><p>Illustrative entity states, grouped by room.</p><div class="detail-row"><strong>Living room</strong><span>24°C · 52% humidity</span></div><div class="detail-row"><strong>Bedroom</strong><span>23°C · 49% humidity</span></div><div class="detail-row"><strong>Kitchen</strong><span>25°C · 55% humidity</span></div><div class="detail-total"><h3>Preview controls</h3><p>The switches update this page only. The eventual dashboard would use your chosen device and action allowlist.</p></div>');
  if (target.hasAttribute('data-fleet-details')) openDrawer('Fleet health · sample statuses', `<h2>The crew behind the scenes.</h2><p>Illustrative reachability for the five fleet nodes. Actual health would come from Gatus.</p>${['sieve · Network & alerts','percolator · Household apps','cellar · Storage & operations','mochaPot · Home & music','grinder · Automation & personal'].map(name => `<div class="detail-row"><strong>${name}</strong><span class="pill good">Online · sample</span></div>`).join('')}<div class="detail-row"><strong>roastery · GPU workstation</strong><span class="pill">Not monitored</span></div><div class="detail-total"><h3>Backups aren’t verified</h3><p>The project README records incomplete backup activation and restore checks. This preview doesn’t infer backup health from server uptime.</p></div>`);
  if (target.hasAttribute('data-service')) {
    const name = target.dataset.service;
    const backup = name === 'Restic backups';
    openDrawer(`${name} · service preview`, `<span class="pill">${backup ? 'Setup not verified' : 'Shortcut preview'}</span><h2 style="margin-top:22px">${name}</h2><p>${backup ? 'The Purrbrews README notes that backup activation and restore verification are unfinished. This service remains marked unverified.' : 'This tile represents a service in your Purrbrews ecosystem. In the working dashboard it would open the app using its configured household or admin permissions.'}</p><div class="detail-total"><h3>${backup ? 'Next step: verify the backup chain' : 'A place for every service'}</h3><p>${backup ? 'Check the existing Restic runbook before displaying a healthy backup status.' : 'App health will show measured status where a monitor is configured. Unmonitored apps will stay clearly labeled.'}</p></div><p class="small">Local design preview · no service URL is opened.</p>`);
  }
  if (target.hasAttribute('data-refresh-mail')) notify('Sample inbox refreshed · 3 unread messages');
  if (target.hasAttribute('data-demo-notice')) notify(target.dataset.demoNotice);
});
drawer.addEventListener('click', event => { if (event.target === drawer && event.clientX < drawer.getBoundingClientRect().left) drawer.close(); });
const searchInput = document.querySelector('#service-search');
if (searchInput) searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  let matchCount = 0;
  document.querySelectorAll('.service-group').forEach(group => {
    let groupCount = 0;
    group.querySelectorAll('.service-button').forEach(button => {
      const matches = button.dataset.service.toLowerCase().includes(query);
      button.hidden = !matches;
      button.style.display = matches ? '' : 'none';
      if (matches) { matchCount++; groupCount++; }
    });
    group.hidden = groupCount === 0;
    const moreServices = group.querySelector('.more-services');
    if (moreServices) moreServices.open = Boolean(query) && Array.from(moreServices.querySelectorAll('.service-button')).some(button => !button.hidden);
  });
  document.querySelector('#search-empty').hidden = matchCount !== 0;
});
