import { DB, UNIT_TO_GRAM, UNITS, RDI, STEP_LABELS } from './database.js';

/* ===================== STATE ===================== */
let state = {
  step: 1,
  maxStep: 1,
  dishName: "",
  ingredients: [],      
  servings: 1,
  loadingProgress: 0,
  results: null,        
  servingView: "total",  
  resultSubView: "calories", 
};

function resetState(){
  state = {step:1, maxStep:1, dishName:"", ingredients:[], servings:1, loadingProgress:0, results:null, servingView:"total", resultSubView:"calories"};
  render();
}

/* ===================== CALCULATIONS ===================== */
function gramsOf(ing){ return ing.amount * (UNIT_TO_GRAM[ing.unit] ?? 1); }

function computeTotals(ingredients){
  const total = {kcal:0, protein:0, carb:0, fat:0, sugar:0, sodium:0};
  const contributions = []; 
  ingredients.forEach(ing => {
    const data = DB[ing.name];
    if(!data) return;
    const g = gramsOf(ing);
    const factor = g/100;
    const c = {
      name: ing.name,
      kcal: data.kcal*factor, protein: data.protein*factor, carb: data.carb*factor,
      fat: data.fat*factor, sugar: data.sugar*factor, sodium: data.sodium*factor
    };
    total.kcal += c.kcal; total.protein += c.protein; total.carb += c.carb;
    total.fat += c.fat; total.sugar += c.sugar; total.sodium += c.sodium;
    contributions.push(c);
  });
  return {total, contributions};
}

function computeRecommendations(results, servings){
  const {total, contributions} = results;
  const perServ = {
    kcal: total.kcal/servings, sodium: total.sodium/servings, sugar: total.sugar/servings,
    fat: total.fat/servings
  };
  const recs = [];

  const topSodium = [...contributions].sort((a,b)=>b.sodium-a.sodium)[0];
  if(perServ.sodium > 800 && topSodium){
    recs.push({
      icon:"🧂", warn:true, tag:"โซเดียมสูง",
      title:`ลดโซเดียมจาก “${topSodium.name}”`,
      text:`โซเดียมต่อหนึ่งที่อยู่ที่ประมาณ ${Math.round(perServ.sodium)} มก. ซึ่งเกินเกณฑ์แนะนำต่อมื้อ วัตถุดิบที่ให้โซเดียมมากที่สุดคือ “${topSodium.name}” ลองลดปริมาณลงประมาณหนึ่งในสี่ หรือใช้สูตรน้ำปลา/ซีอิ๊วสูตรลดโซเดียมแทน`
    });
  }

  const topSugar = [...contributions].sort((a,b)=>b.sugar-a.sugar)[0];
  if(perServ.kcal>0 && (total.sugar/servings) > 6 && topSugar && topSugar.sugar>0){
    recs.push({
      icon:"🍬", warn:true, tag:"น้ำตาลสูง",
      title:`ปรับลดน้ำตาลจาก “${topSugar.name}”`,
      text:`น้ำตาลต่อหนึ่งที่อยู่ที่ประมาณ ${(total.sugar/servings).toFixed(1)} กรัม ลองลดปริมาณ “${topSugar.name}” ลงทีละน้อย แล้วชิมรสก่อนปรุงเพิ่ม จะช่วยคุมความหวานได้โดยไม่เสียรสชาติมากนัก`
    });
  }

  const fatKcalShare = total.fat>0 ? (total.fat*9)/total.kcal : 0;
  if(fatKcalShare > 0.35){
    recs.push({
      icon:"🫒", warn:false, tag:"ไขมันค่อนข้างสูง",
      title:"ลองลดน้ำมันหรือกะทิลงเล็กน้อย",
      text:`สัดส่วนพลังงานจากไขมันอยู่ที่ประมาณ ${Math.round(fatKcalShare*100)}% ของพลังงานทั้งหมด การลดน้ำมันผัดหรือกะทิลงราวหนึ่งช้อนโต๊ะจะช่วยลดไขมันได้โดยไม่กระทบรสชาติมากนัก`
    });
  }

  if(perServ.kcal > 600){
    recs.push({
      icon:"🍚", warn:false, tag:"พลังงานต่อที่ค่อนข้างสูง",
      title:"พิจารณาลดขนาดเสิร์ฟหรือแบ่งเสิร์ฟเพิ่ม",
      text:`พลังงานต่อหนึ่งที่อยู่ที่ประมาณ ${Math.round(perServ.kcal)} กิโลแคลอรี ลองแบ่งเสิร์ฟเพิ่มอีกหนึ่งที่ หรือลดข้าว/เส้นลงเล็กน้อยเพื่อให้เหมาะกับมื้ออาหารทั่วไป`
    });
  }

  if(recs.length === 0){
    recs.push({
      icon:"✅", warn:false, tag:"สมดุลดี",
      title:"สูตรนี้อยู่ในเกณฑ์ที่สมดุล",
      text:"ค่าพลังงาน โซเดียม น้ำตาล และไขมันต่อหนึ่งที่ อยู่ในเกณฑ์ที่เหมาะสมสำหรับมื้ออาหารทั่วไป สามารถทำตามสูตรนี้ได้ตามปกติ"
    });
  }
  return recs;
}

/* ===================== RENDER HELPERS ===================== */
function esc(s){ return (s||"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function round(n,d=0){ const f=Math.pow(10,d); return Math.round(n*f)/f; }
function pct(n, ref){ return Math.min(999, Math.round((n/ref)*100)); }

function renderStepRail(){
  let html = '<div class="steprail">';
  for(let i=1;i<=6;i++){
    const cls = i===state.step ? "active" : (i<state.step ? "done":"");
    const clickable = i<=state.maxStep;
    html += `<button class="step-dot ${cls} ${clickable?'clickable':''}" ${clickable?`data-goto="${i}"`:'disabled'}>
      <span class="num">${i}</span><span class="lbl">${STEP_LABELS[i-1]}</span>
    </button>`;
  }
  html += '</div>';
  return html;
}

function renderLabelCard(){
  const hasIngredients = state.ingredients.length > 0;
  if(!hasIngredients){
    return `<div class="label-card">
      <div class="label-head">
        <span class="lbl-eyebrow">ฉลากโภชนาการ · ตัวอย่าง</span>
        <h2>ข้อมูลโภชนาการ</h2>
      </div>
      <div class="label-empty">เพิ่มวัตถุดิบอย่างน้อยหนึ่งอย่าง<br>เพื่อดูค่าพลังงานและสารอาหารที่นี่</div>
    </div>`;
  }
  const {total} = computeTotals(state.ingredients);
  const servings = Math.max(1, state.servings||1);
  const useServing = state.servingView === "serving";
  const d = useServing ? {
    kcal: total.kcal/servings, protein: total.protein/servings, carb: total.carb/servings,
    fat: total.fat/servings, sugar: total.sugar/servings, sodium: total.sodium/servings
  } : total;

  const showToggle = state.step >= 5;

  return `<div class="label-card">
    <div class="label-head">
      <span class="lbl-eyebrow">ฉลากโภชนาการ${state.step<5 ? ' · ตัวอย่างเบื้องต้น':''}</span>
      <h2>${esc(state.dishName) || "เมนูของคุณ"}</h2>
    </div>
    <div class="label-sub">
      <span>จำนวนหน่วยบริโภคต่อสูตร</span><span class="mono">${servings} ที่</span>
    </div>
    ${showToggle ? `<div class="serving-toggle">
      <button data-view="total" class="${!useServing?'active':''}">ต่อสูตรทั้งหมด</button>
      <button data-view="serving" class="${useServing?'active':''}">ต่อ 1 ที่</button>
    </div>` : ''}
    <div class="label-cal">
      <span class="lc-label">พลังงานทั้งหมด</span>
      <span class="lc-num">${round(d.kcal)} <span style="font-size:14px;">kcal</span></span>
    </div>
    <div class="label-rows">
      <div class="label-row"><span>ไขมันทั้งหมด</span><span class="val">${round(d.fat,1)} ก.</span></div>
      <div class="label-row indent"><span>% ของปริมาณแนะนำ*</span><span class="rdi">${pct(d.fat,RDI.fat)}%</span></div>
      <div class="label-row"><span>คาร์โบไฮเดรตทั้งหมด</span><span class="val">${round(d.carb,1)} ก.</span></div>
      <div class="label-row indent"><span>น้ำตาล</span><span class="val">${round(d.sugar,1)} ก.</span></div>
      <div class="label-row"><span>โปรตีน</span><span class="val">${round(d.protein,1)} ก.</span></div>
      <div class="label-row"><span>โซเดียม</span><span class="val">${round(d.sodium)} มก.</span></div>
      <div class="label-row indent"><span>% ของปริมาณแนะนำ*</span><span class="rdi">${pct(d.sodium,RDI.sodium)}%</span></div>
    </div>
    <div class="label-foot">*% ของปริมาณสารอาหารที่แนะนำให้บริโภคต่อวัน คำนวณโดยประมาณจากพลังงาน 2,000 กิโลแคลอรี ค่าที่แสดงเป็นการประมาณการจากฐานข้อมูลวัตถุดิบทั่วไป ไม่ใช่การวิเคราะห์ในห้องปฏิบัติการ</div>
  </div>`;
}

/* ===================== STEP RENDERERS ===================== */
function renderStep1(){
  const today = new Date();
  const dateStr = `${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()+543}`;
  return `
  <div style="margin-bottom:40px;">
    <div class="hero-panel">
      <div class="ticket-num"><span class="dot"></span>ใบสั่งวิเคราะห์อาหาร · เลขที่ 00${Math.floor(1+Math.random()*8)} · ${dateStr}</div>
      <div class="hero-grid">
        <div>
          <h1>รู้ค่าพลังงาน<br>ก่อน<span class="accent">ตักเสิร์ฟ</span></h1>
          <p class="lead">กรอกสูตรอาหารที่คุณทำเป็นประจำ ระบบจะค้นข้อมูลวัตถุดิบ คำนวณแคลอรีและสารอาหารให้ทั้งหมด พร้อมคำแนะนำปรับสูตรให้เข้ากับเป้าหมายสุขภาพของคุณ</p>
          <div class="cta-row">
            <button class="cta" data-goto="2">
              เริ่มวิเคราะห์อาหาร
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </button>
            <span class="cta-note">ไม่ต้องสมัครสมาชิก เริ่มกรอกสูตรได้ทันที</span>
          </div>
        </div>
        <div class="sticker-frame">
          <svg viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="150" cy="215" rx="108" ry="14" fill="#e2d9bf"/>
            <circle cx="150" cy="140" r="98" fill="#ffffff" stroke="#211C14" stroke-width="3"/>
            <circle cx="150" cy="140" r="78" fill="none" stroke="#C9B98C" stroke-width="2"/>
            <path d="M100 148c8-24 34-38 55-34 24 4 40 26 36 48-4 22-30 34-54 30-22-4-42-22-37-44z" fill="#DE9F2E" stroke="#211C14" stroke-width="2.5"/>
            <path d="M118 132c6-6 14-8 20-4" stroke="#A62F23" stroke-width="2" fill="none" stroke-linecap="round"/>
            <path d="M235 110c3-16-4-30-16-34-2 10 2 18 8 24" fill="#C63D2F" stroke="#211C14" stroke-width="2.5"/>
            <path d="M231 78c4-6 4-14 0-18" stroke="#24392E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <path d="M72 100c-10-10-10-24-2-32 8 6 10 16 8 24" fill="#F7F1E1" stroke="#211C14" stroke-width="2.5"/>
            <path d="M58 92c-10-8-12-22-4-32 8 8 8 18 4 26" fill="#F7F1E1" stroke="#211C14" stroke-width="2"/>
            <g stroke="#C9B98C" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85">
              <path d="M120 40c4 8-4 12 0 20"/>
              <path d="M150 34c4 8-4 12 0 20"/>
              <path d="M180 40c4 8-4 12 0 20"/>
            </g>
          </svg>
        </div>
      </div>

      <hr class="receipt-divider">

      <ul class="receipt-list">
        <li><span class="ri-num">01</span><span class="ri-text">ค้นข้อมูลวัตถุดิบอัตโนมัติ</span><span class="ri-desc">จับคู่กับฐานข้อมูลโภชนาการทันทีที่พิมพ์</span><span class="ri-check">✓</span></li>
        <li><span class="ri-num">02</span><span class="ri-text">คำนวณครบทุกสารอาหาร</span><span class="ri-desc">พลังงาน โปรตีน คาร์บ ไขมัน น้ำตาล โซเดียม</span><span class="ri-check">✓</span></li>
        <li><span class="ri-num">03</span><span class="ri-text">คำแนะนำปรับสูตร</span><span class="ri-desc">ชี้จุดที่ควรปรับ พร้อมเหตุผลจากสูตรจริง</span><span class="ri-check">✓</span></li>
      </ul>
    </div>
  </div>`;
}

function renderStep2(){
  const chips = state.ingredients.map((ing,i)=>`
    <span class="chip">${esc(ing.name)}<button data-remove="${i}" aria-label="ลบวัตถุดิบ">×</button></span>
  `).join("");
  return `
  <div class="panel">
    <div class="ticket-head"><span class="th-num">รายการที่ <span class="dot">02</span> · สูตรอาหาร</span></div>
    <h2 class="section-title">กรอกสูตรอาหาร</h2>
    <p class="section-desc">ตั้งชื่อเมนู แล้วเพิ่มวัตถุดิบทีละอย่างจากฐานข้อมูล พิมพ์ชื่อวัตถุดิบภาษาไทย เช่น หมูสับ น้ำตาลทราย น้ำปลา</p>

    <div class="field">
      <label for="dishName">ชื่อเมนู</label>
      <input type="text" id="dishName" placeholder="เช่น ผัดกะเพราหมูสับ" value="${esc(state.dishName)}">
    </div>

    <div class="add-row">
      <div class="field">
        <label for="ingInput">เพิ่มวัตถุดิบ</label>
        <input type="text" id="ingInput" list="ingredientList" placeholder="พิมพ์ชื่อวัตถุดิบ...">
        <datalist id="ingredientList">
          ${Object.keys(DB).map(n=>`<option value="${esc(n)}">`).join("")}
        </datalist>
      </div>
      <button class="btn-secondary" id="addIngBtn">+ เพิ่มวัตถุดิบ</button>
    </div>
    <div id="ingError" style="display:none;color:var(--chili);font-size:12.5px;margin-top:8px;"></div>

    ${state.ingredients.length ? `<div class="chips">${chips}</div>` : `<div class="empty-note">ยังไม่มีวัตถุดิบในสูตร ลองเริ่มด้วย “หมูสับ”, “น้ำตาลทราย” หรือ “น้ำปลา”</div>`}

    <div class="nav-buttons">
      <button class="btn-ghost" data-goto="1">← ย้อนกลับ</button>
      <button class="btn-primary" id="toStep3" ${(!state.dishName.trim() || state.ingredients.length===0) ? 'disabled':''}>ถัดไป: ระบุปริมาณ →</button>
    </div>
  </div>`;
}

function renderStep3(){
  const rows = state.ingredients.map((ing,i)=>{
    const data = DB[ing.name] || {};
    // ดึงค่าหน่วยที่อนุญาต หากไม่มีการกำหนด ให้ใช้ UNITS ทั้งหมดตามเดิม
    const allowedUnits = data.allowedUnits || UNITS;
    
    // ตรวจสอบว่าหน่วยปัจจุบันอยู่ในรายการที่อนุญาตหรือไม่ ถ้าไม่อยู่ให้ปรับเป็นค่าแรก
    if(!allowedUnits.includes(ing.unit)){
      ing.unit = allowedUnits[0];
    }

    // สร้าง HTML สำหรับช่องเลือกหน่วย (ถ้ามีหน่วยเดียวแสดงเป็นข้อความล็อกไว้ ถ้ามีหลายหน่วยแสดงเป็น dropdown)
    const unitSelectHtml = allowedUnits.length === 1 
      ? `<span style="font-size:13px; color:var(--muted);">${allowedUnits[0]}</span><input type="hidden" data-unit="${i}" value="${allowedUnits[0]}">`
      : `<select data-unit="${i}">
          ${allowedUnits.map(u=>`<option value="${u}" ${u===ing.unit?'selected':''}>${u}</option>`).join("")}
        </select>`;

    return `
      <tr>
        <td class="iname">${esc(ing.name)}</td>
        <td><input type="number" min="0" step="0.5" value="${ing.amount}" data-qty="${i}" style="width:80px;"></td>
        <td>${unitSelectHtml}</td>
        <td class="gramnote">≈ ${round(gramsOf(ing),1)} ก.</td>
      </tr>
    `;
  }).join("");

  return `
  <div class="panel">
    <div class="ticket-head"><span class="th-num">รายการที่ <span class="dot">03</span> · ปริมาณ</span></div>
    <h2 class="section-title">ระบุปริมาณวัตถุดิบ</h2>
    <p class="section-desc">ใส่ปริมาณของแต่ละวัตถุดิบและเลือกหน่วย ระบบจะแปลงเป็นกรัมให้อัตโนมัติเพื่อใช้คำนวณ</p>

    <div class="field" style="max-width:220px;">
      <label for="servings">แบ่งเสิร์ฟกี่ที่</label>
      <input type="number" id="servings" min="1" step="1" value="${state.servings}">
    </div>

    <table class="qty-table">
      <thead><tr><th>วัตถุดิบ</th><th>ปริมาณ</th><th>หน่วย</th><th>เทียบกรัม</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="nav-buttons">
      <button class="btn-ghost" data-goto="2">← ย้อนกลับ</button>
      <button class="btn-primary" id="toStep4">วิเคราะห์คุณค่าทางโภชนาการ →</button>
    </div>
  </div>`;
}

function renderStep4(){
  return `
  <div class="panel">
    <div class="loading-wrap">
      <div class="pot">
        <div class="steam" style="left:30%; animation-delay:0s;"></div>
        <div class="steam" style="left:50%; animation-delay:.4s;"></div>
        <div class="steam" style="left:70%; animation-delay:.8s;"></div>
        <svg viewBox="0 0 64 64"><path d="M12 26h40l-3 26a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" fill="#24392E"/><rect x="10" y="20" width="44" height="8" rx="2" fill="#DE9F2E"/><circle cx="32" cy="24" r="2" fill="#F7F1E1"/></svg>
      </div>
      <h3>กำลังคำนวณคุณค่าทางโภชนาการ...</h3>
      <p>ระบบกำลังรวมค่าพลังงานและสารอาหารจากวัตถุดิบทั้งหมดในสูตร ${esc(state.dishName)}</p>
      <div class="progress-bar"><div class="progress-fill" id="progFill" style="width:${state.loadingProgress}%;"></div></div>
    </div>
  </div>`;
}

function renderStep5(){
  return state.resultSubView === "detail" ? renderStep5Detail() : renderStep5Calories();
}

function renderStep5Calories(){
  const {total} = computeTotals(state.ingredients);
  const servings = Math.max(1, state.servings||1);
  const useServing = state.servingView === "serving";
  const kcal = useServing ? total.kcal/servings : total.kcal;
  const perServing = total.kcal/servings;

  return `
  <div class="panel">
    <div class="ticket-head"><span class="th-num">รายการที่ <span class="dot">05</span> · ผลลัพธ์</span></div>
    <h2 class="section-title">มีกี่แคลอรี</h2>
    <p class="section-desc">พลังงานรวมของ “${esc(state.dishName)}” จากวัตถุดิบทั้งหมดในสูตร แบ่งเสิร์ฟทั้งหมด ${servings} ที่</p>

    <div class="serving-toggle" style="margin:0 0 30px; max-width:320px;">
      <button data-view="total" class="${!useServing?'active':''}">ต่อสูตรทั้งหมด</button>
      <button data-view="serving" class="${useServing?'active':''}">ต่อ 1 ที่</button>
    </div>

    <div style="display:flex; justify-content:center; margin:8px 0 30px;">
      <div class="sticker-frame" style="transform:rotate(0.8deg); max-width:280px; padding:26px 30px;">
        <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:6px;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C63D2F" stroke-width="2"><path d="M12 2c1 4-3 5-3 9a3 3 0 0 0 6 0c0-2-1-3-1-5 2 1 3 4 3 6a5 5 0 0 1-10 0c0-5 3-6 5-10z"/></svg>
          <span class="lc-label" style="font-size:14px; color:#8a8267;">พลังงานรวม</span>
        </div>
        <div style="text-align:center;">
          <span class="mono" style="font-size:56px; font-weight:700; color:var(--chili); line-height:1;">${round(kcal)}</span>
          <div style="font-size:13px; color:#8a8267; margin-top:4px;">กิโลแคลอรี ${useServing ? '(ต่อ 1 ที่)' : `(ต่อสูตร ${servings} ที่)`}</div>
        </div>
      </div>
    </div>
    <p style="font-size:13.5px; color:#8a8267; text-align:center;">≈ ${round(perServing)} กิโลแคลอรีต่อหนึ่งที่ ถ้าแบ่งเสิร์ฟ ${servings} ที่</p>

    <div class="nav-buttons">
      <button class="btn-ghost" data-goto="3">← ย้อนกลับไปแก้ไข</button>
      <button class="btn-primary" id="toDetailBtn">ดูสารอาหารแบบละเอียด →</button>
    </div>
  </div>`;
}

function renderStep5Detail(){
  const {total} = computeTotals(state.ingredients);
  const servings = Math.max(1, state.servings||1);
  const useServing = state.servingView === "serving";
  const d = useServing ? {
    kcal: total.kcal/servings, protein: total.protein/servings, carb: total.carb/servings,
    fat: total.fat/servings, sugar: total.sugar/servings, sodium: total.sodium/servings
  } : total;

  function bar(label, val, ref, cls){
    const p = Math.min(100, (val/ref)*100);
    return `<div class="bar-group">
      <div class="bar-label"><span>${label}</span><span class="mono">${round(val,1)}</span></div>
      <div class="bar-track"><div class="bar-fill ${cls}" style="width:${p}%;"></div></div>
    </div>`;
  }

  return `
  <div class="panel">
    <div class="ticket-head"><span class="th-num">รายการที่ <span class="dot">05</span> · รายละเอียด</span></div>
    <h2 class="section-title">สารอาหารทั้งหมด</h2>
    <p class="section-desc">รายละเอียดคุณค่าทางโภชนาการของ “${esc(state.dishName)}” สลับมุมมองระหว่างค่าต่อสูตรทั้งหมดและต่อหนึ่งที่ได้จากการ์ดฉลากด้านข้าง</p>

    <div class="result-hero">
      <span class="num-big">${round(d.kcal)}</span>
      <span class="num-unit">กิโลแคลอรี ${useServing ? '(ต่อ 1 ที่)' : `(ต่อสูตร ${servings} ที่)`}</span>
    </div>

    ${bar("โปรตีน (ก.)", d.protein, Math.max(RDI.protein, d.protein*1.2), "pandan")}
    ${bar("คาร์โบไฮเดรต (ก.)", d.carb, Math.max(RDI.carb, d.carb*1.2), "")}
    ${bar("น้ำตาล (ก.)", d.sugar, Math.max(RDI.sugar, d.sugar*1.2), "chili")}
    ${bar("ไขมัน (ก.)", d.fat, Math.max(RDI.fat, d.fat*1.2), "")}
    ${bar("โซเดียม (มก.)", d.sodium, Math.max(RDI.sodium, d.sodium*1.2), "chili")}

    <div class="nav-buttons">
      <button class="btn-ghost" id="backToCaloriesBtn">← กลับไปดูแคลอรีรวม</button>
      <button class="btn-primary" data-goto="6">ขอคำแนะนำจาก AI →</button>
    </div>
  </div>`;
}

function renderStep6(){
  const results = computeTotals(state.ingredients);
  const recs = computeRecommendations(results, Math.max(1,state.servings||1));
  const cards = recs.map(r=>`
    <div class="rec-card ${r.warn?'warn':''}">
      <span class="ricon">${r.icon}</span>
      <div>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.text)}</p>
        <span class="tag">${esc(r.tag)}</span>
      </div>
    </div>
  `).join("");

  return `
  <div class="panel">
    <div class="ticket-head"><span class="th-num">รายการที่ <span class="dot">06</span> · คำแนะนำ</span></div>
    <h2 class="section-title">คำแนะนำสำหรับสูตรนี้</h2>
    <p class="section-desc">คำแนะนำด้านล่างประเมินจากข้อมูลโภชนาการต่อหนึ่งที่เสิร์ฟของสูตร “${esc(state.dishName)}” เทียบกับเกณฑ์แนะนำต่อมื้อโดยประมาณ</p>
    ${cards}
    <div class="nav-buttons">
      <button class="btn-ghost" data-goto="5">← ดูผลลัพธ์อีกครั้ง</button>
      <button class="btn-primary" id="restartBtn">เริ่มวิเคราะห์เมนูใหม่</button>
    </div>
  </div>`;
}

/* ===================== MAIN RENDER ===================== */
function render(){
  const app = document.getElementById("app");
  let stepHtml = "";
  switch(state.step){
    case 1: stepHtml = renderStep1(); break;
    case 2: stepHtml = renderStep2(); break;
    case 3: stepHtml = renderStep3(); break;
    case 4: stepHtml = renderStep4(); break;
    case 5: stepHtml = renderStep5(); break;
    case 6: stepHtml = renderStep6(); break;
  }
  const showLabel = state.step >= 4;
  const narrow = state.step === 2 || state.step === 3;

  app.innerHTML = `
    <header class="topbar">
      <div class="logo"><span class="logo-mark">ค</span>ครัวชัวร์</div>
      ${renderStepRail()}
    </header>
    <main>
      ${showLabel ? `<div class="layout"><div>${stepHtml}</div><div>${renderLabelCard()}</div></div>` : (narrow ? `<div style="max-width:760px;margin:0 auto;">${stepHtml}</div>` : stepHtml)}
    </main>
    <footer class="site-foot">ค่าพลังงานและสารอาหารเป็นการประมาณการจากฐานข้อมูลวัตถุดิบทั่วไป ใช้เพื่อเป็นแนวทางเบื้องต้นเท่านั้น</footer>
  `;
  attachEvents();

  if(state.step === 4){
    runAnalysis();
  }
}

/* ===================== ANALYSIS SEQUENCE ===================== */
function runAnalysis(){
  state.loadingProgress = 0;
  const fill = document.getElementById("progFill");
  let p = 0;
  const timer = setInterval(()=>{
    p += 14 + Math.random()*10;
    if(p >= 100){
      p = 100;
      clearInterval(timer);
      
      // Compute results and save to database immediately upon completion
      state.results = computeTotals(state.ingredients);
      saveUserRecipeToDatabase();

      setTimeout(()=>{
        state.step = 5;
        state.maxStep = Math.max(state.maxStep, 5);
        render();
      }, 300);
    }
    if(fill) fill.style.width = p + "%";
  }, 220);
}

// Function to upload data to backend PHP
function saveUserRecipeToDatabase() {
  const { total } = computeTotals(state.ingredients);
  const servings = Math.max(1, state.servings || 1);
  const username = localStorage.getItem("kitchen_sure_user") || "Guest";

  const recipeData = {
    username: username,
    dishName: state.dishName,
    servings: servings,
    kcal: total.kcal,
    protein: total.protein,
    carb: total.carb,
    fat: total.fat,
    sugar: total.sugar,
    sodium: total.sodium
  };

  fetch('save_recipe.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipeData)
  })
  .then(res => res.text()) // Use text() first to catch any PHP warnings/errors if they occur
  .then(text => {
    try {
      const data = JSON.parse(text);
      console.log("Recipe saved successfully:", data);
    } catch(e) {
      console.error("PHP Response was not valid JSON:", text);
    }
  })
  .catch(err => {
    console.error("Network or Fetch error:", err);
  });
}
/* ===================== EVENTS ===================== */
function attachEvents(){
  document.querySelectorAll("[data-goto]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const target = parseInt(el.dataset.goto,10);
      if(target <= state.maxStep || target === state.step+1){
        state.step = target;
        if(target === 5) state.resultSubView = "calories";
        state.maxStep = Math.max(state.maxStep, target);
        render();
        window.scrollTo({top:0, behavior:"smooth"});
      }
    });
  });

  const dishInput = document.getElementById("dishName");
  if(dishInput){
    dishInput.addEventListener("input", e=>{ state.dishName = e.target.value; syncNavState(); });
  }

  const addBtn = document.getElementById("addIngBtn");
  const ingInput = document.getElementById("ingInput");
  if(addBtn && ingInput){
    const addFn = ()=>{
      const val = ingInput.value.trim();
      const errBox = document.getElementById("ingError");
      if(!val) return;
      if(!DB[val]){
        errBox.style.display = "block";
        errBox.textContent = `ไม่พบ “${val}” ในฐานข้อมูล ลองเลือกจากรายการที่แนะนำ เช่น หมูสับ, น้ำตาลทราย, น้ำปลา, กระเทียม`;
        return;
      }
      errBox.style.display = "none";
      state.ingredients.push({name: val, amount: 1, unit: "ช้อนโต๊ะ"});
      ingInput.value = "";
      render();
    };
    addBtn.addEventListener("click", addFn);
    ingInput.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); addFn(); }});
  }

  document.querySelectorAll("[data-remove]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const i = parseInt(el.dataset.remove,10);
      state.ingredients.splice(i,1);
      render();
    });
  });

  const toStep3 = document.getElementById("toStep3");
  if(toStep3){
    toStep3.addEventListener("click", ()=>{
      if(toStep3.disabled) return;
      state.step = 3; state.maxStep = Math.max(state.maxStep,3); render();
      window.scrollTo({top:0, behavior:"smooth"});
    });
  }

  const servingsInput = document.getElementById("servings");
  if(servingsInput){
    servingsInput.addEventListener("input", e=>{
      state.servings = Math.max(1, parseFloat(e.target.value)||1);
      const card = document.querySelector(".label-card");
      if(card) card.outerHTML = renderLabelCard();
    });
  }

  document.querySelectorAll("[data-qty]").forEach(el=>{
    el.addEventListener("input", e=>{
      const i = parseInt(el.dataset.qty,10);
      state.ingredients[i].amount = Math.max(0, parseFloat(e.target.value)||0);
      const row = el.closest("tr");
      row.querySelector(".gramnote").textContent = `≈ ${round(gramsOf(state.ingredients[i]),1)} ก.`;
      const card = document.querySelector(".label-card");
      if(card) card.outerHTML = renderLabelCard();
    });
  });
  document.querySelectorAll("[data-unit]").forEach(el=>{
    el.addEventListener("change", e=>{
      const i = parseInt(el.dataset.unit,10);
      state.ingredients[i].unit = e.target.value;
      const row = el.closest("tr");
      row.querySelector(".gramnote").textContent = `≈ ${round(gramsOf(state.ingredients[i]),1)} ก.`;
      const card = document.querySelector(".label-card");
      if(card) card.outerHTML = renderLabelCard();
    });
  });

  const toStep4 = document.getElementById("toStep4");
  if(toStep4){
    toStep4.addEventListener("click", ()=>{
      state.step = 4; render();
      window.scrollTo({top:0, behavior:"smooth"});
    });
  }

  const toDetailBtn = document.getElementById("toDetailBtn");
  if(toDetailBtn){
    toDetailBtn.addEventListener("click", ()=>{
      state.resultSubView = "detail";
      render();
      window.scrollTo({top:0, behavior:"smooth"});
    });
  }
  const backToCaloriesBtn = document.getElementById("backToCaloriesBtn");
  if(backToCaloriesBtn){
    backToCaloriesBtn.addEventListener("click", ()=>{
      state.resultSubView = "calories";
      render();
      window.scrollTo({top:0, behavior:"smooth"});
    });
  }

  document.querySelectorAll("[data-view]").forEach(el=>{
    el.addEventListener("click", ()=>{
      state.servingView = el.dataset.view;
      render();
    });
  });

  const restartBtn = document.getElementById("restartBtn");
  if(restartBtn){
    restartBtn.addEventListener("click", ()=>{
      resetState();
      window.scrollTo({top:0, behavior:"smooth"});
    });
  }
}

function syncNavState(){
  const btn = document.getElementById("toStep3");
  if(btn) btn.disabled = (!state.dishName.trim() || state.ingredients.length===0);
}

render();