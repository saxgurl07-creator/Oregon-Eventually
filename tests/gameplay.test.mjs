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
 const route=vm.runInNewContext(source.slice(source.indexOf('const routeLegs='),source.indexOf('const quizQuestions='))+';({routeLegs,routeMiles,milesRemaining,drivingHours})');
 const sandbox={Math,console,vehicles,professions,...route,lessons:vm.runInNewContext(slice('const lessons=','const quizQuestions=')+';lessons'),setScreen:v=>h.screen=v,setEventReturnScreen:v=>h.eventReturnScreen=v,setGame:fn=>{h.game=typeof fn==='function'?fn(h.game):fn;sync()},setCode:()=>{},setSlots:()=>{},setWarmupAnswer:()=>{},setWarmupCorrect:()=>{},setLessonSeen:()=>{},setQuiz:()=>{},setQuizAnswer:()=>{},setResult:()=>{},setHint:()=>{},setReview:()=>{}};
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
 a.stop('fuel');b.stop('fuel');assert.ok([-42,-22,28].includes(a.game.cash-(160+professions[0].cash)));assert.equal(b.game.cash-(160+professions[1].cash),-18);
});
test('nurse gets discounted urgent care',()=>{const h=harness(0,3);h.stop('urgent');assert.equal(h.game.cash,125)});
test('crypto bro pays regular hotel prices',()=>{const h=harness(0,0);h.stop('holiday');assert.equal(h.game.cash,212)});
test('fuel and groceries replenish their resources',()=>{const h=harness();h.drive();h.stop('fuel');assert.equal(h.game.energy,100);h.stop('groceries');assert.ok(h.game.food>20)});
test('insufficient cash gives a debt-bearing emergency loan',()=>{const h=harness();h.game.cash=0;h.stop('holiday');assert.equal(h.game.cash,30);assert.equal(h.game.emergencyDebt,30);assert.equal(h.game.morale,77)});
test('free scenic stops have diminishing returns',()=>{const h=harness();h.stop('scenic');h.stop('scenic');h.stop('scenic');assert.equal(h.game.freeBreaks,3);assert.equal(h.game.morale,100)});
test('three driving legs require rest',()=>{const h=harness(2);h.game.food=100;h.drive();h.drive();h.drive();assert.equal(h.game.index,3);h.drive();assert.equal(h.game.index,3)});
test('Taco Bell triggers illness; urgent care clears it',()=>{const h=harness();h.stop('taco');assert.equal(h.game.ecoli,1);h.stop('urgent');assert.equal(h.game.ecoli,0)});
test('fast driving saves hours compared with careful driving',()=>{const a=harness(),b=harness();a.drive('fast');b.drive('careful');assert.ok(a.game.hours<b.game.hours)});
test('recovery is triggered when illness becomes fatal',()=>{const h=harness();h.game.ecoli=3;h.game.bathroomUrgency=1;h.drive();assert.equal(h.game.recover,true)});

test('road route totals and cumulative driving time use distinct real-world legs',()=>{
 const route=vm.runInNewContext(source.slice(source.indexOf('const routeLegs='),source.indexOf('const quizQuestions='))+';({routeLegs,routeMiles,milesRemaining,drivingHours})');
 assert.equal(route.routeLegs.length,8);
 assert.equal(route.routeMiles,2116);
 assert.equal(route.milesRemaining(2),1887);
 assert.equal(route.milesRemaining(8),0);
 assert.equal(route.routeLegs[0].miles,49);
 assert.equal(route.routeLegs[2].miles,520);
 assert.ok(route.drivingHours(route.routeLegs[2],'fast')<route.drivingHours(route.routeLegs[2],'steady'));
 const h=harness();h.drive();assert.equal(h.game.milesDriven,49);assert.equal(h.game.hours,0.9);
});

test('crypto bro has risk and reward on each driving leg',()=>{
 assert.equal(professions[0].name,'Crypto Bro');
 const a=harness(0,0);a.drive();assert.ok([a.game.cash-50,a.game.cash,a.game.cash+20].includes(260));
 const b=harness(0,1);b.drive();assert.equal(b.game.cash,140);
});

test('three consecutive fast drives trigger a $45 speeding ticket and reset the streak',()=>{
 const h=harness(2,1);h.game.food=100;h.drive('fast');h.game.fatigue=0;h.drive('fast');h.game.fatigue=0;h.drive('fast');
 assert.equal(h.game.speedingTickets,1);assert.equal(h.game.fastStreak,0);
 assert.ok(h.game.log[0].includes('SPEEDING TICKET'));
 assert.equal(h.game.cash,95);
});
test('steady driving breaks a fast-driving streak',()=>{
 const h=harness(2,1);h.game.food=100;h.drive('fast');h.game.fatigue=0;h.drive('steady');h.game.fatigue=0;h.drive('fast');
 assert.equal(h.game.speedingTickets,0);assert.equal(h.game.fastStreak,1);
});
test('profession intro no longer refers to corporate manager',()=>{
 assert.ok(!source.includes('corporate manager'));
 assert.ok(source.includes('A crypto bro and an unemployed raccoon'));
});

test('former manager hotel and scenic perks are fully removed',()=>{
 assert.ok(!/MANAGER PERK|MANAGER INCIDENT|Manager saves|corporate manager/i.test(source));
 const h=harness(0,1);h.stop('holiday');
 assert.ok(!/MANAGER/i.test(h.game.log[0]));
 assert.equal(h.game.cash,92);
});

test('low charge and fuel have visible warnings in drive and pit stop screens',()=>{
 assert.ok(source.includes('CHARGING":"FUEL"} REQUIRED:'));
 assert.ok(source.includes('CHARGE":"FUEL"} LOW:'));
 assert.ok(source.includes('CHARGE BEFORE DRIVING'));
 const h=harness(3,1);h.game.energy=30;h.drive('fast');
 assert.equal(h.game.index,0);
 assert.equal(h.game.fastStreak,0);
});
test('speeding streak is visible and only completed drives count',()=>{
 assert.ok(source.includes('FAST DRIVING STREAK:'));
 const h=harness(3,1);h.game.food=100;h.game.energy=100;h.drive('fast');
 assert.equal(h.game.fastStreak,1);
 h.game.energy=0;h.drive('fast');
 assert.equal(h.game.fastStreak,1);
});
