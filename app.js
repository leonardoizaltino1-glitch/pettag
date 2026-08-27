const SUPABASE_URL='https://vprfybqpgeburxdjqcdi.supabase.co';
const SUPABASE_KEY='sb_publishable_Ir2iZjHu6onRXjTHEFq0zg_Ga1v-HAC';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const qs=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let currentUser=null;
let authMode='login';
let editingPet=null;

function code(){const a=new Uint32Array(1);crypto.getRandomValues(a);return 'PET-'+a[0].toString(36).slice(0,6).toUpperCase().padEnd(6,'X')}
function petIcon(p){return p.species==='Gato'?'🐱':p.species==='Cachorro'?'🐶':'🐾'}
function hideAll(){['home','auth','resetPassword','register','dashboard','writer','finder','publicProfile'].forEach(id=>qs(id)?.classList.add('hidden'))}
function goHome(){hideAll();qs('home').classList.remove('hidden');history.replaceState({},'',location.pathname);scrollTo({top:0,behavior:'smooth'})}
function showSection(id){hideAll();qs(id).classList.remove('hidden');if(id==='dashboard')renderDashboard();scrollTo({top:0,behavior:'smooth'})}

function refreshAuthButton(){
  qs('authButton').textContent=currentUser?'Minha conta':'Entrar';
  qs('authButton').onclick=currentUser?()=>showSection('dashboard'):openAuth;
}
function openAuth(){authMode='login';renderAuthMode();showSection('auth')}
function toggleAuthMode(){authMode=authMode==='login'?'signup':'login';renderAuthMode()}
function renderAuthMode(){
  const signup=authMode==='signup';
  qs('authTitle').textContent=signup?'Criar conta':'Entrar';
  qs('authSubmit').textContent=signup?'Criar conta':'Entrar';
  qs('authToggle').textContent=signup?'Já tenho conta':'Criar conta';
  qs('authNameRow').classList.toggle('hidden',!signup);
  qs('authMessage').innerHTML='';
}
async function startRegisterPet(){
  if(!currentUser){openAuth();qs('authMessage').innerHTML='<div class="notice">Entre ou crie sua conta para cadastrar um pet.</div>';return}
  editingPet=null; qs('petForm').reset(); qs('petFormTitle').textContent='Novo pet'; qs('petSubmit').textContent='Criar perfil';
  showSection('register');
}

async function forgotPassword(){
  const email=qs('authEmail').value.trim();
  if(!email){qs('authMessage').innerHTML='<div class="notice warning">Digite seu e-mail acima primeiro.</div>';return}
  const redirectTo=location.origin+location.pathname;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
  qs('authMessage').innerHTML=error?'<div class="notice warning">'+esc(error.message)+'</div>':'<div class="notice success">✅ Enviamos o link de recuperação para seu e-mail.</div>';
}
qs('resetForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const {error}=await sb.auth.updateUser({password:qs('newPassword').value});
  qs('resetMessage').innerHTML=error?'<div class="notice warning">'+esc(error.message)+'</div>':'<div class="notice success">✅ Senha alterada. Você já pode usar sua conta.</div>';
  if(!error)setTimeout(()=>showSection('dashboard'),900);
});

qs('authForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=qs('authEmail').value.trim();
  const password=qs('authPassword').value;
  const name=qs('authName').value.trim();
  const btn=e.submitter; btn.disabled=true;
  try{
    if(authMode==='signup'){
      const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}});
      if(error)throw error;
      if(data.user){
        await sb.from('profiles').upsert({user_id:data.user.id,name,email},{onConflict:'user_id'});
      }
      qs('authMessage').innerHTML='<div class="notice success">✅ Conta criada. Se o Supabase pedir confirmação por e-mail, confirme e depois faça login.</div>';
      authMode='login';renderAuthMode();
    }else{
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;
      currentUser=data.user;refreshAuthButton();showSection('dashboard');
    }
  }catch(err){qs('authMessage').innerHTML='<div class="notice warning">'+esc(err.message)+'</div>'}
  finally{btn.disabled=false}
});

async function logout(){
  await sb.auth.signOut();currentUser=null;refreshAuthButton();goHome();
}

qs('petForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!currentUser)return openAuth();
  const btn=e.submitter;btn.disabled=true;btn.textContent='Salvando...';
  try{
    let photo_url=editingPet?.photo_url||null;
    const file=qs('photo').files[0];
    if(file){
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
      const path=currentUser.id+'/'+Date.now()+'.'+ext;
      const {error:upErr}=await sb.storage.from('pet-photos').upload(path,file,{upsert:false});
      if(upErr)throw upErr;
      photo_url=sb.storage.from('pet-photos').getPublicUrl(path).data.publicUrl;
    }
    const p={name:qs('name').value.trim(),species:qs('species').value,breed:qs('breed').value.trim(),sex:qs('sex').value,color:qs('color').value.trim(),phone:qs('phone').value.trim(),whatsapp:qs('whatsapp').value.trim(),city:qs('city').value.trim(),district:qs('district').value.trim(),address:qs('address').value.trim(),notes:qs('notes').value.trim(),photo_url};
    if(editingPet){
      const {data,error}=await sb.from('pets').update(p).eq('id',editingPet.id).eq('owner_user_id',currentUser.id).select().single();
      if(error)throw error;
      editingPet=null;e.target.reset();showSection('dashboard');
    }else{
      p.owner_user_id=currentUser.id;p.public_code=code();p.lost=false;
      const {data,error}=await sb.from('pets').insert(p).select().single();
      if(error)throw error;
      e.target.reset();await openWriter(data.public_code);
    }
  }catch(err){alert('Não foi possível salvar: '+err.message)}
  finally{btn.disabled=false;btn.textContent=editingPet?'Salvar alterações':'Criar perfil'}
});

async function renderDashboard(){
  if(!currentUser){openAuth();return}
  qs('accountInfo').textContent=currentUser.email||'';
  const box=qs('petsGrid');box.innerHTML='<div class="notice">Carregando...</div>';
  const {data,error}=await sb.from('pets').select('*').eq('owner_user_id',currentUser.id).order('created_at',{ascending:false});
  if(error){box.innerHTML='<div class="notice warning">'+esc(error.message)+'</div>';return}
  if(!data.length){box.innerHTML='<div class="notice">Você ainda não cadastrou nenhum pet.</div>';return}
  box.innerHTML=data.map(p=>`<article class="pet-card">${p.photo_url?`<img class="pet-thumb" src="${esc(p.photo_url)}" alt="Foto de ${esc(p.name)}">`:`<div class="pet-icon">${petIcon(p)}</div>`}<h3>${esc(p.name)}</h3><div class="muted">${esc(p.species)}${p.breed?' • '+esc(p.breed):''}</div><div class="code">${esc(p.public_code)}</div><span class="status ${p.lost?'lost':''}">${p.lost?'PET PERDIDO':'ATIVO'}</span><div class="card-actions"><button class="secondary" onclick="openProfile('${p.public_code}')">Ver perfil</button><button class="secondary" onclick="editPet('${p.id}')">Editar</button><button class="primary" onclick="openWriter('${p.public_code}')">Gravar NFC</button><button class="ghost" onclick="toggleLost('${p.id}',${!p.lost})">${p.lost?'Marcar encontrado':'Marcar perdido'}</button><button class="ghost" onclick="deletePet('${p.id}')">Excluir</button></div></article>`).join('');
}

async function editPet(id){
  if(!currentUser)return openAuth();
  const {data,error}=await sb.from('pets').select('*').eq('id',id).eq('owner_user_id',currentUser.id).single();
  if(error){alert(error.message);return}
  editingPet=data;
  qs('name').value=data.name||''; qs('species').value=data.species||'Cachorro'; qs('breed').value=data.breed||'';
  qs('sex').value=data.sex||'Não informado'; qs('color').value=data.color||''; qs('phone').value=data.phone||'';
  qs('whatsapp').value=data.whatsapp||''; qs('city').value=data.city||''; qs('district').value=data.district||'';
  qs('address').value=data.address||''; qs('notes').value=data.notes||'';
  qs('petFormTitle').textContent='Editar '+data.name; qs('petSubmit').textContent='Salvar alterações';
  showSection('register');
}

async function toggleLost(id,value){
  const {error}=await sb.from('pets').update({lost:value}).eq('id',id);
  if(error)alert(error.message);else renderDashboard();
}
async function deletePet(id){
  if(!confirm('Excluir este pet?'))return;
  const {error}=await sb.from('pets').delete().eq('id',id);
  if(error)alert(error.message);else renderDashboard();
}

async function getPet(c){
  const {data,error}=await sb.from('pets').select('*').eq('public_code',c).maybeSingle();
  if(error)throw error;return data;
}
function profileUrl(c){const u=new URL(location.href);u.search='?pet='+encodeURIComponent(c);u.hash='';return u.toString()}
async function openWriter(c){
  const p=await getPet(c);if(!p)return;
  if(!currentUser||p.owner_user_id!==currentUser.id){alert('Somente o tutor deste pet pode gravar/gerenciar a tag.');return}
  hideAll();qs('writer').classList.remove('hidden');const url=profileUrl(c);
  qs('writerContent').innerHTML=`<div class="nfc-box"><div class="nfc-icon">📡</div><h3>Vincular NTAG213 ao ${esc(p.name)}</h3><p class="muted">Grave somente esta URL na tag:</p><div class="urlbox">${esc(url)}</div><button class="primary big" onclick="writeNfc('${c}')">Encostar e gravar</button><button class="secondary big" style="margin-left:8px" onclick="copyTagUrl('${c}')">Copiar link</button><div id="writeStatus"></div></div><div class="notice warning"><b>iPhone:</b> use NFC Tools para gravar o link caso o Safari não permita escrita NFC.</div>`;
}
async function copyTagUrl(c){const u=profileUrl(c);try{await navigator.clipboard.writeText(u);qs('writeStatus').innerHTML='<div class="notice success">✅ Link copiado.</div>'}catch{prompt('Copie:',u)}}
async function writeNfc(c){
  const s=qs('writeStatus'),u=profileUrl(c);
  if(!('NDEFReader' in window)){s.innerHTML='<div class="notice warning">Seu navegador não grava NFC. Copie o link e use o NFC Tools.</div>';return}
  try{s.innerHTML='<div class="notice">Aproxime a NTAG213...</div>';const n=new NDEFReader();await n.write({records:[{recordType:'url',data:u}]});s.innerHTML='<div class="notice success">✅ Tag gravada.</div>'}catch(e){s.innerHTML='<div class="notice warning">'+esc(e.message)+'</div>'}
}
function profileHtml(p){
  const n=(p.whatsapp||p.phone||'').replace(/\D/g,'');
  const wa='https://wa.me/55'+n+'?text='+encodeURIComponent('Olá! Encontrei o '+p.name+' pela PetTag '+p.public_code+'.');
  const photo=p.photo_url?`<img class="profile-photo" src="${esc(p.photo_url)}" alt="Foto de ${esc(p.name)}">`:`<div class="profile-photo">${petIcon(p)}</div>`;
  return `${photo}<span class="status ${p.lost?'lost':''}">${p.lost?'🚨 PET PERDIDO':'🐾 PET CADASTRADO'}</span><h1>${esc(p.name)}</h1><p class="muted">${esc(p.species)}${p.breed?' • '+esc(p.breed):''}${p.sex&&p.sex!=='Não informado'?' • '+esc(p.sex):''}</p>${p.color?'<p><b>Características:</b> '+esc(p.color)+'</p>':''}${p.city?'<p><b>Cidade:</b> '+esc(p.city)+(p.district?' • '+esc(p.district):'')+'</p>':''}${p.notes?'<p><b>Observações:</b> '+esc(p.notes)+'</p>':''}<div class="notice">${p.lost?'O tutor informou que este animal está perdido. Entre em contato o quanto antes.':'Este animal possui um tutor cadastrado.'}</div><div class="privacy-note">Por segurança, o endereço completo do tutor não é exibido publicamente.</div><div class="profile-actions"><a class="call" href="tel:${esc(p.phone)}">📞 Ligar para o tutor</a><a class="wa" href="${wa}" target="_blank" rel="noopener">💬 Chamar no WhatsApp</a></div>`;
}
async function openProfile(c){
  hideAll();qs('publicProfile').classList.remove('hidden');qs('publicProfile').innerHTML='<div class="notice">Carregando...</div>';
  try{const p=await getPet(c);qs('publicProfile').innerHTML=p?profileHtml(p):'<div class="notice warning">Pet não encontrado.</div>';if(p)history.replaceState({},'',location.pathname+'?pet='+encodeURIComponent(c))}catch(e){qs('publicProfile').innerHTML='<div class="notice warning">'+esc(e.message)+'</div>'}
}
async function findPet(){
  const c=qs('finderCode').value.trim().toUpperCase(),box=qs('finderResult');box.innerHTML='<div class="notice">Buscando...</div>';
  try{const p=await getPet(c);box.innerHTML=p?'<div class="public-profile" style="margin-top:20px">'+profileHtml(p)+'</div>':'<div class="notice warning">Tag não encontrada.</div>'}catch(e){box.innerHTML='<div class="notice warning">'+esc(e.message)+'</div>'}
}

(async()=>{
  const {data:{session}}=await sb.auth.getSession();
  currentUser=session?.user||null;refreshAuthButton();
  sb.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;refreshAuthButton()});
  const id=new URLSearchParams(location.search).get('pet');
  const hash=location.hash||'';
  if(hash.includes('type=recovery')){hideAll();qs('resetPassword').classList.remove('hidden');}
  else if(id)await openProfile(id);else goHome();
})();
