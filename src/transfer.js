import {restoreCampaign,restoreArrangement,restoreHistory,campaignSave} from './engine.js';
export const LEGACY_ORIGIN='https://squared.leolune.fun';
export const BENTOAD_ORIGIN='https://bentoad.leolune.fun';
export const TRANSFER_MARKER='bentoad-origin-transfer-v1';
export const MAX_TRANSFER_LENGTH=8*1024*1024;

export function parseTransferredSave(raw){
  if(raw===null)return null;
  if(typeof raw!=='string'||raw.length>MAX_TRANSFER_LENGTH)throw new Error('Invalid save size');
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid save');
  if(value.version===3){if(typeof value.currentId!=='string'||!Array.isArray(value.completedIds))throw new Error('Invalid campaign');}
  else if(![undefined,1,2].includes(value.version)||(!Number.isInteger(value.current)&&!Array.isArray(value.completed)))throw new Error('Unknown save format');
  return value;
}

// New-address work wins a board conflict; earned squares from either save are kept.
export function mergeTransferredProgress(legacy,existing,levels){
  const old=restoreCampaign(legacy??{},levels),current=restoreCampaign(existing??{},levels);
  const meaningful=(level,board)=>{
    if(!board)return false;
    const state=restoreArrangement(level,board),fresh=restoreArrangement(level);
    return restoreHistory(level,board).length>0||JSON.stringify(state.placements)!==JSON.stringify(fresh.placements);
  };
  const hasCurrent=!!existing&&(current.completed.size>0||current.levelIndex>0||current.unlocked>0||levels.some(l=>meaningful(l,current.boards[l.id])));
  const chosen=hasCurrent?current:old,boards={};
  for(const l of levels){
    const record=meaningful(l,current.boards[l.id])?current.boards[l.id]:old.boards[l.id]??current.boards[l.id];
    if(record){const state=restoreArrangement(l,record);boards[l.id]={version:2,placements:state.placements,rotations:state.rotations,history:restoreHistory(l,record)};}
  }
  const completed=new Set([...old.completed,...current.completed]);
  const unlocked=Math.max(old.unlocked,current.unlocked,completed.size?Math.min(levels.length-1,Math.max(...completed)+1):0);
  return campaignSave(levels,{completed,unlocked,levelIndex:chosen.levelIndex,boards,sound:(hasCurrent?existing:legacy)?.sound!==false});
}

export function acceptTransferMessage(event,sourceWindow,nonce,origin=LEGACY_ORIGIN){
  return event.origin===origin&&event.source===sourceWindow&&event.data?.type==='bentoad-save-response'&&event.data.nonce===nonce;
}

export function commitTransferredSave(storage,key,encoded){
  storage.setItem(key,encoded);
  if(storage.getItem(key)!==encoded)throw new Error('Save could not be verified');
  // The source save remains on the old origin. A marker is only an optimization.
  try{storage.setItem(TRANSFER_MARKER,'done');}catch{}
}

export async function importLegacyProgress({levels,storage,key,playtest=false}){
  if(location.origin!==BENTOAD_ORIGIN)return {imported:false};
  try{storage=storage();}catch{return {imported:false};}
  let existing=null;
  try{existing=parseTransferredSave(storage.getItem(key));}catch{}
  try{
    if(existing&&storage.getItem(TRANSFER_MARKER)==='done')return {imported:false};
    // An isolated playtest starts with a copy of the new address's normal save.
    if(playtest&&localStorage.getItem('squared-save-v1'))return {imported:false};
  }catch{}
  const app=document.querySelector('.app');app.inert=true;
  const dialog=document.createElement('dialog');dialog.id='transfer-dialog';
  dialog.innerHTML='<span class="eyebrow">SAME LITTLE COLLECTION</span><h2>Bringing your squares over.</h2><p class="dialog-copy" id="transfer-copy">Checking your saved game at the previous address. Your original save stays there too.</p><button class="primary-button" id="transfer-retry" hidden>Bring my saved squares</button><a class="transfer-back" href="'+LEGACY_ORIGIN+'/classic.html">Open the previous saved game</a>';
  document.body.append(dialog);dialog.addEventListener('cancel',event=>event.preventDefault());dialog.showModal();
  const request=popup=>new Promise((resolve,reject)=>{
    const nonce=crypto.randomUUID();let frame=null,sourceWindow=null,poll=null,timer=null,finished=false;
    const cleanup=()=>{clearInterval(poll);clearTimeout(timer);window.removeEventListener('message',receive);frame?.remove();};
    const finish=(error,value)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve({raw:value,popup:popup?sourceWindow:null});};
    const receive=event=>{if(!acceptTransferMessage(event,sourceWindow,nonce))return;if(event.data.error)finish(new Error('The previous browser storage is unavailable'));else finish(null,event.data.save);};
    const send=()=>{try{sourceWindow?.postMessage({type:'bentoad-save-request',nonce},LEGACY_ORIGIN);}catch{}};
    window.addEventListener('message',receive);
    if(popup){sourceWindow=window.open(LEGACY_ORIGIN+'/save-bridge.html','bentoad-progress-transfer','width=480,height=520');if(!sourceWindow){finish(new Error('The transfer window was blocked'));return;}}
    else {frame=document.createElement('iframe');frame.hidden=true;frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.referrerPolicy='no-referrer';frame.src=LEGACY_ORIGIN+'/save-bridge.html';frame.onload=send;document.body.append(frame);sourceWindow=frame.contentWindow;}
    poll=setInterval(send,250);timer=setTimeout(()=>finish(new Error('The previous address did not respond')),7000);send();
  });
  return new Promise(resolve=>{
    let busy=false;
    const attempt=async popup=>{
      if(busy)return;busy=true;dialog.querySelector('#transfer-retry').hidden=true;
      dialog.querySelector('#transfer-copy').textContent='Bringing your saved squares into this address. Your original save stays untouched.';
      try{
        const response=await request(popup),legacy=parseTransferredSave(response.raw);
        if(legacy){
          const merged=mergeTransferredProgress(legacy,existing,levels);
          commitTransferredSave(storage,key,JSON.stringify(merged));
        }else {try{storage.setItem(TRANSFER_MARKER,'done');}catch{}}
        response.popup?.close();dialog.close();dialog.remove();app.inert=false;resolve({imported:!!legacy});
      }catch{
        // An existing new-address save is usable even if the old origin is offline.
        if(existing){dialog.close();dialog.remove();app.inert=false;resolve({imported:false});return;}
        dialog.querySelector('#transfer-copy').textContent='The previous save could not be brought over yet. Open a transfer window to try again, or continue at the previous address. Nothing has been removed.';
        dialog.querySelector('#transfer-retry').hidden=false;
      }finally{busy=false;}
    };
    dialog.querySelector('#transfer-retry').addEventListener('click',()=>attempt(true));
    attempt(false);
  });
}
