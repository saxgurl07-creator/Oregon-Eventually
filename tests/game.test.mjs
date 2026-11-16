import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
function extract(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b)}
const tasks=vm.runInNewContext(extract('const codeTasks=','const vehicles=')+';codeTasks');
const good=[['12'],['4 * 3'],['milesLeft > 100'],['food < 10'],['i < 5','i++'],["'fixed'"],["'Rock', 'Pop', 'Jazz'"],['===']];
const bad=[['13'],['4 + 3'],['milesLeft < 100'],['food > 10'],['i > 5','i++'],['fixed'],["'Rock', 'Jazz', 'Pop'"],['=']];
for(let chapter=0;chapter<tasks.length;chapter++){
 test('chapter '+(chapter+1)+' accepts correct answers and rejects incorrect ones',()=>{
  const inputs=tasks[chapter].parts.filter(p=>typeof p!=='string');
  assert.equal(inputs.length,good[chapter].length);
  inputs.forEach((p,i)=>assert.equal(p.answer.test(good[chapter][i]),true,'correct slot '+i));
  assert.equal(inputs.some((p,i)=>!p.answer.test(bad[chapter][i])),true);
 });
}
test('multi-line code renders actual line breaks',()=>{
 for(const i of [2,3,4,5,7])assert.ok(tasks[i].parts.some(p=>typeof p==='string'&&p.includes('\n')));
});
test('each coding exercise has only editable slots and fixed code',()=>{
 for(const task of tasks){assert.equal(typeof task.parts[0],'string');assert.equal(typeof task.parts.at(-1),'string');}
});
test('core survival rules and restart remain present',()=>{
 for(const marker of ['legsSinceRest','ecoli','function recover()','function restart()','game.energy<car.burn','localStorage.setItem'])assert.ok(source.includes(marker),marker);
});
