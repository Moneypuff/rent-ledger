const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/home/user/rent-ledger/payroll.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
const mk=()=>({innerHTML:'',textContent:'',value:'',dataset:{},classList:{toggle(){},add(){},remove(){}},elements:new Proxy({},{get:()=>({value:''})}),addEventListener(){},querySelectorAll:()=>[]});
const sb={console,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{getElementById:mk,querySelector:mk,querySelectorAll:()=>[],addEventListener(){},createElement:mk,body:{appendChild(){},removeChild(){},classList:{add(){},remove(){}}}},window:{scrollTo(){},print(){}},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL(){}},setTimeout};
sb.globalThis=sb;vm.createContext(sb);vm.runInContext(src,sb);
const {DEFAULTS,buildPeriods,buildRemittances,round2,toISO}=sb;
const cfg=JSON.parse(JSON.stringify(DEFAULTS));
const rows=buildPeriods(cfg), cra=buildRemittances(rows,'regular');
const sum=f=>round2(rows.reduce((a,r)=>a+r[f],0));
const erPay=round2(rows[0].eiEr+rows[0].qppEr+rows[0].qpipEr+rows[0].hsf+rows[0].cnesst);
const out={
 cfg:{gross:cfg.grossPerPeriod,fed:cfg.federalTaxPerPeriod,qc:cfg.quebecTaxPerPeriod,
      qpp:cfg.qppRatePct,qppEx:cfg.qppExemptionAnnual,ympe:cfg.ympe,yampe:cfg.yampe,qpp2:cfg.qpp2RatePct,
      ei:cfg.eiRatePct,eiMie:cfg.eiMie,eiMult:cfg.eiEmployerMultiplier,
      qpipEe:cfg.qpipEmployeeRatePct,qpipEr:cfg.qpipEmployerRatePct,qpipMax:cfg.qpipMax,
      hsf:cfg.hsfRatePct,cnesst:cfg.cnesstRatePct},
 perPay:{gross:rows[0].gross,fed:rows[0].fed,qc:rows[0].qc,qpp:rows[0].qpp,ei:rows[0].ei,qpip:rows[0].qpip,
         ded:rows[0].deductions,net:rows[0].net,
         qppEr:rows[0].qppEr,eiEr:rows[0].eiEr,qpipEr:rows[0].qpipEr,hsf:rows[0].hsf,cnesst:rows[0].cnesst,
         er:erPay,cra:rows[0].cra,rq:rows[0].rq},
 periods:rows.map(r=>({n:r.n,start:toISO(r.periodStart),end:toISO(r.periodEnd),pay:toISO(r.payDate),
   gross:r.gross,fed:r.fed,qc:r.qc,qpp:r.qpp,ei:r.ei,qpip:r.qpip,ded:r.deductions,net:r.net,
   qppEr:r.qppEr,eiEr:r.eiEr,qpipEr:r.qpipEr,hsf:r.hsf,cnesst:r.cnesst,cra:r.cra,rq:r.rq,
   paid:r.paid,shortfall:r.shortfall,restated:r.onErrorBasis,recovery:r.recovery,ytd:r.ytd})),
 months:cra.map(m=>({key:m.key,label:m.label,due:toISO(m.due),n:m.rows.length,gross:m.gross,
   fed:m.fed,ei:m.ei,eiEr:m.eiEr,cra:m.cra,
   qc:m.qc,qpp:m.qpp,qppEr:m.qppEr,qpip:m.qpip,qpipEr:m.qpipEr,hsf:m.hsf,cnesst:m.cnesst,rq:m.rq,
   dates:m.rows.map(r=>toISO(r.payDate))})),
 totals:{gross:sum('gross'),fed:sum('fed'),qc:sum('qc'),qpp:sum('qpp'),ei:sum('ei'),qpip:sum('qpip'),
   ded:sum('deductions'),net:sum('net'),
   qppEr:sum('qppEr'),eiEr:sum('eiEr'),qpipEr:sum('qpipEr'),hsf:sum('hsf'),cnesst:sum('cnesst'),
   cra:sum('cra'),rq:sum('rq'),shortfall:sum('shortfall'),
   paidNet:rows[rows.length-1].ytd.paidNet,shortQc:rows[rows.length-1].ytd.shortQc,
   shortQpip:rows[rows.length-1].ytd.shortQpip,
   er:round2(sum('qppEr')+sum('eiEr')+sum('qpipEr')+sum('hsf')+sum('cnesst'))}
};
fs.writeFileSync('data.json',JSON.stringify(out,null,1));
console.log('perPay',JSON.stringify(out.perPay));
console.log('totals',JSON.stringify(out.totals));
