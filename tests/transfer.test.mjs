import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readLevel,campaignSave,restoreCampaign,restoreArrangement,restoreHistory} from '../src/engine.js';
import {parseTransferredSave,mergeTransferredProgress,acceptTransferMessage,commitTransferredSave,TRANSFER_MARKER,MAX_TRANSFER_LENGTH} from '../src/transfer.js';
const levels=JSON.parse(readFileSync(new URL('../src/levels.json',import.meta.url))).map(readLevel);
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const arrangement=(i,count)=>({version:2,placements:levels[i].pieces.map((p,id)=>id<count?{...p.solution}:null),rotations:levels[i].pieces.map(()=>0)});
const snapshot=(i,count)=>{const {version,...state}=arrangement(i,count);return state;};
const save=(index,completed,boards,sound=false)=>campaignSave(levels,{levelIndex:index,unlocked:Math.max(index,...completed,0),completed:new Set(completed),boards,sound});
const first=levels[6],other=levels[24];
const original=save(6,[0,1,2,3,4,5],{[first.id]:{...arrangement(6,2),history:[snapshot(6,1)]},[other.id]:{...arrangement(24,3),history:[snapshot(24,2),snapshot(24,1)]}});
const originalCopy=structuredClone(original);
const migrated=mergeTransferredProgress(parseTransferredSave(JSON.stringify(original)),null,levels);
assert.deepEqual(migrated,original);checks++;
check(migrated.sound===false,'Sound preference crosses origins');
for(const l of [first,other]){
 assert.deepEqual(restoreArrangement(l,migrated.boards[l.id]),restoreArrangement(l,original.boards[l.id]));checks++;
 assert.deepEqual(restoreHistory(l,migrated.boards[l.id]),restoreHistory(l,original.boards[l.id]));checks++;
}
// New-address work takes priority on conflicting boards, without losing other earned marks.
const newer=save(24,[0,1,2,3,4,5,6],{[first.id]:{...arrangement(6,1),history:[snapshot(6,0)]}},true);
const combined=mergeTransferredProgress(original,newer,levels),state=restoreCampaign(combined,levels);
check(state.completed.size===7,'Earned completions are unioned');
check(combined.currentId===other.id&&combined.sound===true,'The active new-address game and settings take priority');
assert.deepEqual(combined.boards[first.id],newer.boards[first.id]);checks++;
assert.deepEqual(combined.boards[other.id],original.boards[other.id]);checks++;
assert.deepEqual(mergeTransferredProgress(original,combined,levels),combined);checks++;
// Fresh new-address starter data must not displace an existing campaign.
const fresh=save(0,[],{[levels[0].id]:{version:2,...restoreArrangement(levels[0]),history:[]}},true);
check(mergeTransferredProgress(original,fresh,levels).currentId===first.id,'A fresh starter save does not hide the old current level');
// Every legacy completion count migrates through stable IDs, including prior rotating saves.
for(let count=0;count<=36;count++)for(const version of [1,2]){
 const old={version,current:Math.min(count,35),completed:Array.from({length:count},(_,i)=>i),sound:false};
 const out=restoreCampaign(mergeTransferredProgress(old,null,levels),levels),expected=restoreCampaign(old,levels);
 assert.deepEqual(out.completed,expected.completed);assert.equal(out.levelIndex,expected.levelIndex);checks+=2;
}
// Large saves travel as messages rather than URL fragments, keeping all 100 board histories.
const allBoards={};for(let i=0;i<100;i++)allBoards[levels[i].id]={...arrangement(i,1),history:Array.from({length:80},()=>snapshot(i,0))};
const large=save(99,Array.from({length:40},(_,i)=>i),allBoards);
const restored=mergeTransferredProgress(parseTransferredSave(JSON.stringify(large)),null,levels);
check(Object.keys(restored.boards).length===100,'Every saved board is retained');
check(Object.values(restored.boards).every(b=>b.history.length===80),'Full Undo history survives on all 100 boards');
const source={},nonce='transfer-nonce-123456';
const good={origin:'https://squared.leolune.fun',source,data:{type:'bentoad-save-response',nonce,save:JSON.stringify(original)}};
check(acceptTransferMessage(good,source,nonce),'Expected source, origin, type and nonce are accepted');
for(const bad of [{...good,origin:'https://example.com'},{...good,source:{}},{...good,data:{...good.data,nonce:'wrong'}},{...good,data:{...good.data,type:'other'}}])check(!acceptTransferMessage(bad,source,nonce),'Unrelated messages cannot import progress');
for(const bad of ['null','[]','{}','{"version":9}','{','x'.repeat(MAX_TRANSFER_LENGTH+1)]){assert.throws(()=>parseTransferredSave(bad));checks++;}
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
commitTransferredSave(storage,'squared-save-v1',JSON.stringify(migrated));
check(store.get(TRANSFER_MARKER)==='done','Migration is marked only after reading the written save back');
check(JSON.parse(store.get('squared-save-v1')).currentId===first.id,'The canonical player key is kept');
const failing={setItem(){throw new Error('quota');},getItem(){return null;}};
assert.throws(()=>commitTransferredSave(failing,'squared-save-v1','{}'));checks++;
assert.deepEqual(original,originalCopy);checks++;
console.log(JSON.stringify({transfer_checks:checks,legacy_round_trips:74,boards_with_full_history:100,status:'passed'}));
