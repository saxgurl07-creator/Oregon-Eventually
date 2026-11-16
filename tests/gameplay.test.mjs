import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,start);return source.slice(a,b)};
const definitions=slice('const vehicles=','function load()')+';({vehicles,professions,start})';
const {vehicles,professions,start}=vm.runInNewContext(definitions);
function harness(vehicle=0,profession=0){
 const state={...start,vehicle,profession,cash:160+professions[profession].cash,health:Math.min(100,85+professions[profession].health),morale:Math.min(100,70+professions[profession].morale),xp:professions[profession].xp,log:[...start.log]};
 const h={game:state,car:vehicles[vehicle],pace:'steady',screen:'map',eventReturnScreen:'map'};
 const sandbox={Math,console,vehicles,professions,lessons:vm.runInNewContext(slice('const lessons=','const quizQuestions=')+';lessons'),setScreen:v=>h.screen=v,setEventReturnScreen:v=>h.eventReturnScreen=v,setGame:fn=>{h.game=typeof fn==='function'?fn(h.game):fn;sync()},setCode:()=>{},setSlots:()=>{},setWarmupAnswer:()=>{},setWarmupCorrect:()=>{},setLessonSeen:()=>{},setQuiz:()=>{},setQuizAnswer:()=>{},setResult:()=>{},setHint:()=>{},setReview:()=>{}};
 function sync(){sandbox.game=h.game;sandbox.car=vehicles[h.game.vehicle];sandbox.pace=h.pace;sandbox.lesson=sandbox.lessons[Math.min(h.game.index,7)]}
 sync();
 const context=vm.createContext(sandbox);
 vm.runInContext(slice('function pitstop(kind){','function next()')+slice('function next(){','function recover()'),context);
 h.stop=kind=>{sync();context.pitstop(kind)};
 h.drive=(pace='steady')=>{h.pace=pace;sync();context.next()};
 return h;
}
test('every vehicle consumes its specified energy per drive',()=>{
 vehicles.forEach((car,i)=>{const h=harness(i);h.drive();assert.equal(h.game.energy,100-car.burn,car.name);assert.equal(h.game.index,1)});
});
test('all professions can finish a first leg',()=>{
 professions.forEach((job,i)=>{const h=harness(0,i);h.drive();assert.equal(h.game.index,1,job.name);assert.ok(h.game.xp>=job.xp)});
});
test('mechanic saves food and fuel money',()=>{
 const a=harness(0,0),b=harness(0,1);a.drive();b.drive();assert.equal(b.game.food-a.game.food,2);
 a.stop('fuel');b.stop('fuel');assert.equal(a.game.cash-(160+professions[0].cash),-22);assert.equal(b.game.cash-(160+professions[1].cash),-18);
});
test('nurse gets discounted urgent care',()=>{const h=harness(0,3);h.stop('urgent');assert.equal(h.game.cash,125)});
test('manager gets discounted hotel',()=>{const h=harness(0,0);h.stop('holiday');assert.equal(h.game.cash,220)});
test('fuel and groceries replenish their resources',()=>{const h=harness();h.drive();h.stop('fuel');assert.equal(h.game.energy,100);h.stop('groceries');assert.ok(h.game.food>20)});
test('insufficient cash gives a debt-bearing emergency loan',()=>{const h=harness();h.game.cash=0;h.stop('holiday');assert.equal(h.game.cash,30);assert.equal(h.game.emergencyDebt,30);assert.equal(h.game.morale,55)});
test('free scenic stops have diminishing returns',()=>{const h=harness();h.stop('scenic');h.stop('scenic');h.stop('scenic');assert.equal(h.game.freeBreaks,3);assert.equal(h.game.morale,90)});
test('three driving legs require rest',()=>{const h=harness(2);h.game.food=100;h.drive();h.drive();h.drive();assert.equal(h.game.index,3);h.drive();assert.equal(h.game.index,3)});
test('Taco Bell triggers illness; urgent care clears it',()=>{const h=harness();h.stop('taco');assert.equal(h.game.ecoli,1);h.stop('urgent');assert.equal(h.game.ecoli,0)});
test('fast driving saves hours compared with careful driving',()=>{const a=harness(),b=harness();a.drive('fast');b.drive('careful');assert.ok(a.game.hours<b.game.hours)});
test('recovery is triggered when illness becomes fatal',()=>{const h=harness();h.game.ecoli=3;h.game.bathroomUrgency=1;h.drive();assert.equal(h.game.recover,true)});
