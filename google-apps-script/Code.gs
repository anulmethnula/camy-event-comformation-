// Deploy this script as a web app: execute as yourself; access: Anyone.
const SPREADSHEET_ID = '1EJ8niTxkFBqO8yLOOQc4UE2-UdJJBjoHI_RsWHKNClQ';
const TAB_NAME = 'CAMY Registrations';
const HEADERS = ['Registration ID','Timestamp','Full name','Address','City','Contact number','Extra guests','Total attendees','Attendance','Event','Event date'];
function doGet() { return output({success:true,service:'CAMY registration'}); }
function output(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function safeCell(value) {
  const text=String(value || '').trim();
  // Keep phone numbers as text and prevent user input becoming a formula.
  return /^[=+\-@]/.test(text) ? "'"+text : text;
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  try {
    const p=e && e.parameter;
    if(!p || !/^CAMY-[A-Z0-9-]{8,64}$/.test(p.registrationId || ''))throw new Error('Invalid registration reference.');
    for(const key of ['name','address','city','contact'])if(!p[key] || !p[key].trim())throw new Error('Missing '+key+'.');
    if(p.name.length>100||p.address.length>220||p.city.length>80||p.contact.length>20)throw new Error('Details are too long.');
    const digits=p.contact.replace(/\D/g,'');
    if(!/^[+0-9()\s-]+$/.test(p.contact)||digits.length<9||digits.length>15)throw new Error('Invalid contact number.');
    const guests=Number(p.guests);
    if(p.attendance!=='Yes'||!Number.isInteger(guests)||guests<0||guests>20)throw new Error('Invalid attendance details.');
    lock.waitLock(10000);
    const spreadsheet=SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet=spreadsheet.getSheetByName(TAB_NAME);
    if(!sheet){sheet=spreadsheet.insertSheet(TAB_NAME);sheet.appendRow(HEADERS);sheet.setFrozenRows(1);}
    const last=sheet.getLastRow();
    // Retries with the same reference do not create duplicate registrations.
    if(last>1 && sheet.getRange(2,1,last-1,1).createTextFinder(p.registrationId).matchEntireCell(true).findNext())return output({success:true,registrationId:p.registrationId});
    const row=sheet.getLastRow()+1;
    sheet.getRange(row,6).setNumberFormat('@');
    sheet.getRange(row,1,1,HEADERS.length).setValues([[p.registrationId,new Date(),safeCell(p.name),safeCell(p.address),safeCell(p.city),safeCell(p.contact),guests,guests+1,'Yes','CAMY Community Event','04 October 2026']]);
    SpreadsheetApp.flush();
    return output({success:true,registrationId:p.registrationId});
  } catch(error) {return output({success:false,error:error.message});}
  finally {if(lock.hasLock())lock.releaseLock();}
}
