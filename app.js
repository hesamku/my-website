/* app.js - License Panel (client-side) */
/* NOTE: This is a client-side admin panel that uses a GitHub personal access token
   to update keys.json in your repository. For security, create a fine-grained token
   with minimal repo permissions and KEEP IT SECRET.
*/

/* CONFIG - change these to match your repo */
const CONFIG = {
  githubUser: "hesamku",
  repo: "my-website",
  branch: "main",
  keysPath: "keys.json", // path in repo
  adminUser: "hesam_ku",
  adminPass: "hesam.1388"
};

/* helper - DOM */
const $ = (sel)=>document.querySelector(sel);

/* basic app object */
const app = {
  token: null,
  rawUrl(){ return `https://raw.githubusercontent.com/${CONFIG.githubUser}/${CONFIG.repo}/${CONFIG.branch}/${CONFIG.keysPath}` },
  apiUrl(){ return `https://api.github.com/repos/${CONFIG.githubUser}/${CONFIG.repo}/contents/${CONFIG.keysPath}` },

  onLoad(){
    const logged = sessionStorage.getItem('logged');
    if(!logged){ location.href='index.html'; return; }
    // ask for token if not present
    if(!this.token) {
      const t = prompt('Enter GitHub Personal Access Token (fine-grained, repo contents write allowed). Token will NOT be stored. Paste and press OK.');
      if(!t){ alert('No token - dashboard is read-only. To enable save, reopen and enter token.'); }
      this.token = t;
    }
    this.loadKeys();
  },

  login(){
    const u = $('#username').value.trim();
    const p = $('#password').value;
    if(u===CONFIG.adminUser && p===CONFIG.adminPass){
      sessionStorage.setItem('logged','1');
      location.href='dashboard.html';
    } else {
      $('#msg').textContent = 'Invalid credentials';
    }
  },

  logout(){
    sessionStorage.removeItem('logged');
    location.href='index.html';
  },

  async loadKeys(){
    try{
      const r = await fetch(this.rawUrl());
      if(!r.ok) throw new Error('Fetch failed');
      const text = await r.text();
      this.keysRaw = text;
      this.keysJson = JSON.parse(text);
      this.renderTable();
    }catch(e){
      alert('Failed to load keys.json: '+e.message);
    }
  },

  renderTable(){
    const tbody = $('#keysTable tbody');
    tbody.innerHTML = '';
    const keys = this.keysJson.keys || {};
    Object.keys(keys).forEach(k=>{
      const item = keys[k];
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${k}</td>
<td>${item.expires||''}</td>
<td>${item.max_devices||''}</td>
<td>${(item.devices||[]).join(', ')}</td>
<td>${item.status||''}</td>
<td>
  <button class="small" data-key="${k}" onclick="app.editKey(this)">Edit</button>
  <button class="small" data-key="${k}" onclick="app.deleteKey(this)">Delete</button>
</td>`;
      tbody.appendChild(tr);
    });
  },

  async createKey(){
    const key = $('#newKey').value.trim();
    const expires = $('#newExpires').value.trim();
    const max = parseInt($('#newMax').value) || 1;
    const status = $('#newStatus').value;
    if(!key){ alert('Key required'); return; }
    if(!expires.match(/^\d{4}-\d{2}-\d{2}$/)){ alert('Expires must be YYYY-MM-DD'); return; }
    if(!confirm('Create key '+key+'?')) return;
    // update local object
    this.keysJson.keys = this.keysJson.keys||{};
    this.keysJson.keys[key] = { expires: expires, max_devices: max, devices: [], status: status };
    await this.saveKeys('Create key '+key);
    $('#newKey').value=''; $('#newExpires').value=''; $('#newMax').value='1';
    $('#createArea').classList.add('hidden');
    await this.loadKeys();
  },

  editKey(btn){
    const key = btn.getAttribute('data-key');
    const obj = this.keysJson.keys[key];
    const newExpires = prompt('Expires (YYYY-MM-DD):', obj.expires||'');
    if(newExpires===null) return;
    const newMax = prompt('Max devices:', obj.max_devices||1);
    if(newMax===null) return;
    const newStatus = prompt('Status (active/disabled):', obj.status||'active');
    if(newStatus===null) return;
    obj.expires = newExpires;
    obj.max_devices = parseInt(newMax) || 1;
    obj.status = newStatus;
    this.saveKeys('Edit key '+key).then(()=>this.loadKeys());
  },

  deleteKey(btn){
    const key = btn.getAttribute('data-key');
    if(!confirm('Delete '+key+'?')) return;
    delete this.keysJson.keys[key];
    this.saveKeys('Delete key '+key).then(()=>this.loadKeys());
  },

  async saveKeys(commitMessage){
    if(!this.token){ alert('No token provided. Cannot save.'); return; }
    try{
      // get current file to obtain sha
      const getR = await fetch(this.apiUrl()+'?ref='+CONFIG.branch, { headers: { Authorization: 'Bearer '+this.token, Accept: 'application/vnd.github+json' }});
      if(!getR.ok) throw new Error('Get file failed: '+getR.status);
      const meta = await getR.json();
      const sha = meta.sha;
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(this.keysJson, null, 2))));
      const putR = await fetch(this.apiUrl(), {
        method: 'PUT',
        headers: { Authorization: 'Bearer '+this.token, Accept: 'application/vnd.github+json', 'Content-Type':'application/json' },
        body: JSON.stringify({ message: commitMessage, content: content, sha: sha, branch: CONFIG.branch })
      });
      if(!putR.ok){
        const err = await putR.json();
        throw new Error('Save failed: '+(err.message||putR.status));
      }
      alert('Saved.');
    }catch(e){
      alert('Save error: '+e.message);
    }
  }
};
