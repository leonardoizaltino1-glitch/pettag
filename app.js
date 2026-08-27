const STORE='pettag_nfc_prod_demo_v1';

const getPets=()=>JSON.parse(localStorage.getItem(STORE)||'[]');
const setPets=v=>localStorage.setItem(STORE,JSON.stringify(v));
const qs=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const code=()=> 'PET-'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0,6).toUpperCase().padEnd(6,'X');

function hideAll(){
  ['home','register','dashboard','writer','finder','publicProfile'].forEach(id=>qs(id)?.classList.add('hidden'));
}
function goHome(){hideAll();qs('home').classList.remove('hidden');window.history.replaceState({},'',location.pathname);window.scrollTo({top:0,behavior:'smooth'})}
function showSection(id){hideAll();qs(id).classList.remove('hidden');if(id==='dashboard')renderDashboard();window.scrollTo({top:0,behavior:'smooth'})}

qs('petForm').addEventListener('submit',e=>{
  e.preventDefault();
  const pet={
    id:code(),
    name:qs('name').value.trim(),
    species:qs('species').value,
    breed:qs('breed').value.trim(),
    sex:qs('sex').value,
    color:qs('color').value.trim(),
    owner:qs('owner').value.trim(),
    phone:qs('phone').value.trim(),
    whatsapp:qs('whatsapp').value.trim(),
    city:qs('city').value.trim(),
    district:qs('district').value.trim(),
    address:qs('address').value.trim(),
    notes:qs('notes').value.trim(),
    lost:false,
    createdAt:new Date().toISOString()
  };
  const all=getPets(); all.push(pet); setPets(all); e.target.reset(); openWriter(pet.id);
});

function petIcon(p){return p.species==='Gato'?'🐱':p.species==='Cachorro'?'🐶':'🐾'}

function renderDashboard(){
  const pets=getPets(), box=qs('petsGrid');
  if(!pets.length){box.innerHTML='<div class="notice">Você ainda não cadastrou nenhum pet.</div>';return}
  box.innerHTML=pets.map(p=>`
  <article class="pet-card">
    <div class="pet-icon">${petIcon(p)}</div>
    <h3>${esc(p.name)}</h3>
    <div class="muted">${esc(p.species)}${p.breed?' • '+esc(p.breed):''}</div>
    <div class="code">${p.id}</div>
    <span class="status ${p.lost?'lost':''}">${p.lost?'PET PERDIDO':'ATIVO'}</span>
    <div class="card-actions">
      <button class="secondary" onclick="openProfile('${p.id}')">Ver perfil</button>
      <button class="primary" onclick="openWriter('${p.id}')">Gravar NFC</button>
      <button class="ghost" onclick="toggleLost('${p.id}')">${p.lost?'Marcar encontrado':'Marcar perdido'}</button>
    </div>
  </article>`).join('');
}
function toggleLost(id){
  const pets=getPets(), p=pets.find(x=>x.id===id); if(!p)return;
  p.lost=!p.lost; setPets(pets); renderDashboard();
}

function profileUrl(id){
  const u=new URL(location.href);
  u.search='?pet='+encodeURIComponent(id); u.hash='';
  return u.toString();
}
function openWriter(id){
  const p=getPets().find(x=>x.id===id); if(!p)return;
  hideAll(); qs('writer').classList.remove('hidden');
  const url=profileUrl(id);
  qs('writerContent').innerHTML=`
    <div class="nfc-box">
      <div class="nfc-icon">📡</div>
      <h3>Vincular NTAG213 ao ${esc(p.name)}</h3>
      <p class="muted">A tag receberá somente este link:</p>
      <div class="urlbox">${esc(url)}</div>
      <button class="primary big" onclick="writeNfc('${id}')">Encostar e gravar a tag</button>
      <div id="writeStatus"></div>
    </div>
    <div class="notice warning"><b>Importante:</b> a gravação NFC via navegador depende do suporte do aparelho/navegador. Em aparelhos sem Web NFC, use um gravador/app NFC para escrever exatamente a URL exibida acima.</div>`;
}
async function writeNfc(id){
  const status=qs('writeStatus'), url=profileUrl(id);
  if(!('NDEFReader' in window)){
    status.innerHTML='<div class="notice warning">Este navegador não oferece gravação Web NFC. Copie a URL acima e grave na NTAG213 com um app NFC compatível.</div>';
    return;
  }
  try{
    status.innerHTML='<div class="notice">Aproxime a NTAG213 da parte traseira do celular...</div>';
    const ndef=new NDEFReader();
    await ndef.write({records:[{recordType:'url',data:url}]});
    status.innerHTML='<div class="notice success">✅ Tag gravada. Agora aproxime novamente para testar o perfil.</div>';
  }catch(err){
    status.innerHTML='<div class="notice warning">Não foi possível gravar: '+esc(err.message)+'</div>';
  }
}

function profileHtml(p){
  const number=(p.whatsapp||p.phone).replace(/\D/g,'');
  const wa='https://wa.me/55'+number+'?text='+encodeURIComponent('Olá! Encontrei o '+p.name+' pela PetTag '+p.id+'.');
  return `
    <div class="profile-photo">${petIcon(p)}</div>
    <span class="status ${p.lost?'lost':''}">${p.lost?'🚨 PET PERDIDO':'🐾 PET CADASTRADO'}</span>
    <h1>${esc(p.name)}</h1>
    <p class="muted">${esc(p.species)}${p.breed?' • '+esc(p.breed):''}${p.sex && p.sex!=='Não informado'?' • '+esc(p.sex):''}</p>
    ${p.color?'<p><b>Características:</b> '+esc(p.color)+'</p>':''}
    ${p.city?'<p><b>Cidade:</b> '+esc(p.city)+(p.district?' • '+esc(p.district):'')+'</p>':''}
    ${p.notes?'<p><b>Observações:</b> '+esc(p.notes)+'</p>':''}
    <div class="notice">${p.lost?'O tutor informou que este animal está perdido. Entre em contato o quanto antes.':'Este animal possui um tutor cadastrado. Se você o encontrou, entre em contato.'}</div>
    <div class="profile-actions">
      <a class="call" href="tel:${esc(p.phone)}">📞 Ligar para o tutor</a>
      <a class="wa" href="${wa}" target="_blank" rel="noopener">💬 Chamar no WhatsApp</a>
    </div>`;
}
function openProfile(id){
  const p=getPets().find(x=>x.id===id);if(!p)return;
  hideAll();qs('publicProfile').classList.remove('hidden');qs('publicProfile').innerHTML=profileHtml(p);
  window.history.replaceState({},'',location.pathname+'?pet='+encodeURIComponent(id));window.scrollTo({top:0,behavior:'smooth'});
}
function findPet(){
  const c=qs('finderCode').value.trim().toUpperCase(), p=getPets().find(x=>x.id===c);
  qs('finderResult').innerHTML=p?'<div class="public-profile" style="margin-top:20px">'+profileHtml(p)+'</div>':'<div class="notice warning">Tag não encontrada. Confira o código.</div>';
}
(function boot(){
  const id=new URLSearchParams(location.search).get('pet');
  if(id){const p=getPets().find(x=>x.id===id);if(p){hideAll();qs('publicProfile').classList.remove('hidden');qs('publicProfile').innerHTML=profileHtml(p);return}}
  goHome();
})();
