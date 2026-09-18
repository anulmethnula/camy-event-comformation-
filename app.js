const $ = id => document.getElementById(id);
const form = $('form');
let pending = null;
const start = new Date('2026-10-04T10:00:00+05:30').getTime();
function tick() {
  const remaining = Math.max(0, start - Date.now());
  const values = [Math.floor(remaining/86400000),Math.floor(remaining/3600000)%24,Math.floor(remaining/60000)%60,Math.floor(remaining/1000)%60];
  ['d','h','m','s'].forEach((id,i)=>$(id).textContent=String(values[i]).padStart(2,'0'));
  if (!remaining) $('countLabel').textContent='THE EVENT HAS STARTED';
}
tick(); setInterval(tick,1000);
function guest(change) {
  const n = Math.max(0,Math.min(20,Number($('guests').value)+change));
  $('guests').value=n; $('minus').disabled=n===0; $('plus').disabled=n===20;
  $('total').textContent=`${n+1} ${n ? 'people' : 'person'}`;
}
$('minus').addEventListener('click',()=>guest(-1));
$('plus').addEventListener('click',()=>guest(1));
function showError(message, field) {
  $('formError').textContent=message; $('formError').hidden=false;
  if(field) field.focus(); else $('formError').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function invitation(data) {
  const canvas=document.createElement('canvas'); canvas.width=1000; canvas.height=1250;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#f7f8f2';ctx.fillRect(0,0,1000,1250);
  ctx.fillStyle='#2b432e';ctx.fillRect(0,0,1000,22);
  ctx.strokeStyle='#b9cda7';ctx.lineWidth=2;ctx.strokeRect(55,55,890,1140);
  ctx.textAlign='center';ctx.fillStyle='#6b8057';ctx.font='bold 20px sans-serif';ctx.fillText('CAMY COMMUNITY · 2026',500,160);
  ctx.fillStyle='#26372b';ctx.font='bold 64px sans-serif';ctx.fillText('You’re invited.',500,295);
  ctx.fillStyle='#e44e39';ctx.font='bold 32px sans-serif';ctx.fillText('Good people. Great conversations.',500,375);
  ctx.fillStyle='#26372b';ctx.font='bold 38px sans-serif';ctx.fillText(data.name,500,530,820);
  ctx.font='24px sans-serif';ctx.fillText(`${data.totalAttendees} ${Number(data.totalAttendees)===1?'attendee':'attendees'} · In person`,500,590);
  ctx.fillStyle='#edf1e6';ctx.fillRect(100,670,800,265);
  ctx.fillStyle='#26372b';ctx.font='bold 32px sans-serif';ctx.fillText('SUNDAY, 4 OCTOBER 2026',500,740);
  ctx.font='28px sans-serif';ctx.fillText('10:00 AM · Sri Lanka time',500,800);ctx.fillText('Supun Arcade, Wellawatta',500,860);
  ctx.fillStyle='#6b8057';ctx.font='22px sans-serif';ctx.fillText('Free entry · Lunch + welcome drink included',500,1010);
  ctx.font='18px sans-serif';ctx.fillText(data.registrationId,500,1090);ctx.fillText('Keep this invitation with you when attending.',500,1150);
  return canvas.toDataURL('image/png');
}
form.addEventListener('submit',async event=>{
  event.preventDefault(); if($('submit').disabled)return;
  $('formError').hidden=true;
  if(!form.reportValidity())return;
  for(const id of ['name','address','city'])if(!$(id).value.trim()){showError(`Please enter your ${id==='name'?'full name':id}.`,$(id));return;}
  if(form.elements.attendance.value!=='Yes'){showError('This is an in-person event. Choose “Yes, I’ll be there” when you can attend.');return;}
  const phone=$('contact').value.trim(); const digits=phone.replace(/\D/g,'');
  if(!/^[+0-9()\s-]+$/.test(phone)||digits.length<9||digits.length>15){showError('Enter a valid phone number with 9–15 digits, for example 077 123 4567.',$('contact'));return;}
  const details={email:$('email').value.trim(),name:$('name').value.trim(),address:$('address').value.trim(),city:$('city').value.trim(),contact:phone,guests:String($('guests').value),totalAttendees:String(Number($('guests').value)+1),attendance:'Yes',event:'CAMY Community Event',eventDate:'04 October 2026'};
  const fingerprint=JSON.stringify(details);
  if(!pending||pending.fingerprint!==fingerprint)pending={fingerprint,id:'CAMY-'+crypto.randomUUID().toUpperCase()};
  const payload={...details,registrationId:pending.id,timestamp:new Date().toISOString()};
  const button=$('submit');button.disabled=true;button.classList.add('loading');button.textContent='Saving your place…';form.setAttribute('aria-busy','true');
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
  try {
    const response=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    let result;try{result=await response.json();}catch{throw new Error('Registration service is unavailable. Please try again shortly.');}
    if(!response.ok||result.success!==true||result.registrationId!==payload.registrationId)throw new Error(result.error||'We could not confirm your registration. Please retry.');
    $('regId').textContent=payload.registrationId;$('attendeeName').textContent=payload.name;$('partySize').textContent=`${payload.totalAttendees} ${Number(payload.totalAttendees)===1?'attendee':'attendees'} · Free entry, lunch and welcome drink`;
    try{$('download').href=invitation(payload);}catch{$('download').hidden=true;}
    $('formView').hidden=true;$('success').hidden=false;pending=null;
    $('successTitle').focus({preventScroll:true});$('registration').scrollIntoView({behavior:'smooth',block:'start'});
  } catch(error){showError(error.name==='AbortError'?'Confirmation is taking longer than expected. Retry with the same details; your reference will stay the same.':error.message);}
  finally{clearTimeout(timeout);button.disabled=false;button.classList.remove('loading');button.innerHTML='<span>Confirm my free place</span><span aria-hidden="true">→</span>';form.removeAttribute('aria-busy');}
});
$('again').addEventListener('click',()=>{form.reset();pending=null;guest(0);$('success').hidden=true;$('formView').hidden=false;$('download').hidden=false;$('formError').hidden=true;$('name').focus();});
