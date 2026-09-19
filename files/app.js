/* ===================== NUTRITION DATABASE (per 100g) ===================== */
const DB = {
  "หมูสับ":        {kcal:296, protein:17.9, carb:0,    fat:25,  sugar:0,   sodium:62},
  "เนื้อไก่":       {kcal:165, protein:31,   carb:0,    fat:3.6, sugar:0,   sodium:74},
  "กุ้ง":          {kcal:99,  protein:24,   carb:0.2,  fat:0.3, sugar:0,   sodium:111},
  "ไข่ไก่":         {kcal:155, protein:13,   carb:1.1,  fat:11,  sugar:1.1, sodium:124},
  "ข้าวสวย":       {kcal:130, protein:2.7,  carb:28,   fat:0.3, sugar:0.1, sodium:1},
  "เส้นก๋วยเตี๋ยว": {kcal:109, protein:0.9,  carb:25,   fat:0.2, sugar:0.1, sodium:9},
  "น้ำตาลทราย":    {kcal:387, protein:0,    carb:100,  fat:0,   sugar:100, sodium:1},
  "น้ำตาลปี๊บ":     {kcal:375, protein:0.2,  carb:97,   fat:0.2, sugar:90,  sodium:20},
  "น้ำปลา":        {kcal:35,  protein:5,    carb:3.6,  fat:0,   sugar:0,   sodium:7850},
  "ซีอิ๊วขาว":      {kcal:60,  protein:6,    carb:6,    fat:0,   sugar:1,   sodium:5493},
  "ซอสหอยนางรม":   {kcal:51,  protein:2.7,  carb:11,   fat:0.1, sugar:9,   sodium:2733},
  "น้ำมันพืช":      {kcal:884, protein:0,    carb:0,    fat:100, sugar:0,   sodium:0},
  "กระเทียม":      {kcal:149, protein:6.4,  carb:33,   fat:0.5, sugar:1,   sodium:17},
  "หอมแดง":        {kcal:72,  protein:2.5,  carb:16.8, fat:0.1, sugar:4.2, sodium:12},
  "พริกขี้หนู":     {kcal:40,  protein:1.9,  carb:9,    fat:0.4, sugar:5,   sodium:9},
  "มะนาว":         {kcal:25,  protein:0.4,  carb:8.4,  fat:0.2, sugar:1.7, sodium:2},
  "ถั่วงอก":       {kcal:30,  protein:3.2,  carb:5.9,  fat:0.2, sugar:4.1, sodium:6},
  "ต้นหอม":        {kcal:32,  protein:1.8,  carb:7.3,  fat:0.2, sugar:2.3, sodium:16},
  "กะทิ":          {kcal:230, protein:2.3,  carb:5.5,  fat:23.8,sugar:3.3, sodium:15},
  "เกลือ":         {kcal:0,   protein:0,    carb:0,    fat:0,   sugar:0,   sodium:38758},
  "พริกแกง":       {kcal:120, protein:3,    carb:15,   fat:5,   sugar:3,   sodium:1200},
  "เต้าหู้":        {kcal:76,  protein:8,    carb:1.9,  fat:4.8, sugar:0.6, sodium:7},
  "ผักบุ้ง":        {kcal:19,  protein:2.6,  carb:3.1,  fat:0.2, sugar:1.5, sodium:65},
};
const UNIT_TO_GRAM = { "กรัม":1, "ช้อนโต๊ะ":15, "ช้อนชา":5, "ถ้วย":200, "มิลลิลิตร":1 };
const UNITS = Object.keys(UNIT_TO_GRAM);
const RDI = { fat:65, carb:300, protein:50, sodium:2000, sugar:60 };

/* ===================== PERSISTED STATE (shared across pages) ===================== */
const STORE_KEY = "kruachur_recipe_v1";

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return {dishName:"", ingredients:[], servings:1};
    const parsed = JSON.parse(raw);
    return {
      dishName: parsed.dishName || "",
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      servings: parsed.servings || 1
    };
  }catch(e){
    return {dishName:"", ingredients:[], servings:1};
  }
}
function saveState(s){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(s)); }catch(e){/* storage unavailable, app still works within the page */}
}
function clearState(){
  try{ localStorage.removeItem(STORE_KEY); }catch(e){}
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
      title:`ลดโซเดียมจาก "${topSodium.name}"`,
      text:`โซเดียมต่อหนึ่งที่อยู่ที่ประมาณ ${Math.round(perServ.sodium)} มก. ซึ่งเกินเกณฑ์แนะนำต่อมื้อ วัตถุดิบที่ให้โซเดียมมากที่สุดคือ "${topSodium.name}" ลองลดปริมาณลงประมาณหนึ่งในสี่ หรือใช้สูตรน้ำปลา/ซีอิ๊วสูตรลดโซเดียมแทน`
    });
  }

  const topSugar = [...contributions].sort((a,b)=>b.sugar-a.sugar)[0];
  if(perServ.kcal>0 && (total.sugar/servings) > 6 && topSugar && topSugar.sugar>0){
    recs.push({
      icon:"🍬", warn:true, tag:"น้ำตาลสูง",
      title:`ปรับลดน้ำตาลจาก "${topSugar.name}"`,
      text:`น้ำตาลต่อหนึ่งที่อยู่ที่ประมาณ ${(total.sugar/servings).toFixed(1)} กรัม ลองลดปริมาณ "${topSugar.name}" ลงทีละน้อย แล้วชิมรสก่อนปรุงเพิ่ม จะช่วยคุมความหวานได้โดยไม่เสียรสชาติมากนัก`
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

/* ===================== HELPERS ===================== */
function esc(s){ return (s||"").replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function round(n,d=0){ const f=Math.pow(10,d); return Math.round(n*f)/f; }
function pct(n, ref){ return Math.min(999, Math.round((n/ref)*100)); }

/* ===================== SHARED NUTRITION LABEL CARD ===================== */
// opts: { servingView: 'total'|'serving', showToggle: bool, note: string }
function renderLabelCard(state, opts){
  opts = opts || {};
  const servingView = opts.servingView || "total";
  const showToggle = !!opts.showToggle;
  const hasIngredients = state.ingredients && state.ingredients.length > 0;

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
  const useServing = servingView === "serving";
  const d = useServing ? {
    kcal: total.kcal/servings, protein: total.protein/servings, carb: total.carb/servings,
    fat: total.fat/servings, sugar: total.sugar/servings, sodium: total.sodium/servings
  } : total;

  return `<div class="label-card">
    <div class="label-head">
      <span class="lbl-eyebrow">ฉลากโภชนาการ${opts.note ? ' · '+esc(opts.note) : ''}</span>
      <h2>${esc(state.dishName) || "เมนูของคุณ"}</h2>
    </div>
    <div class="label-sub">
      <span>จำนวนหน่วยบริโภคต่อสูตร</span><span class="mono">${servings} ที่</span>
    </div>
    ${showToggle ? `<div class="serving-toggle">
      <button type="button" data-labelview="total" class="${!useServing?'active':''}">ต่อสูตรทั้งหมด</button>
      <button type="button" data-labelview="serving" class="${useServing?'active':''}">ต่อ 1 ที่</button>
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

/* ===================== SHARED CHROME (topbar + footer), rendered into every page ===================== */
function renderTopbar(current){
  const links = [
    {href:"index.html", label:"หน้าแรก", key:"home"},
    {href:"recipe.html", label:"วิเคราะห์เมนู", key:"recipe"},
    {href:"results.html", label:"ผลลัพธ์ล่าสุด", key:"results"},
  ];
  return `
  <header class="topbar">
    <a class="logo" href="index.html"><span class="logo-mark">ค</span>ครัวชัวร์</a>
    <nav class="sitenav" aria-label="เมนูหลัก">
      ${links.map(l=>`<a href="${l.href}" class="${l.key===current?'current':''}">${l.label}</a>`).join("")}
    </nav>
  </header>`;
}

function renderFooter(){
  const count = Object.keys(DB).length;
  return `
  <footer class="site-foot">
    <div class="foot-grid">
      <div>
        <div class="logo"><span class="logo-mark">ค</span>ครัวชัวร์</div>
        <p>เครื่องมือประมาณค่าพลังงานและสารอาหารจากสูตรอาหารไทย ช่วยให้เห็นภาพคร่าวๆ ก่อนตักเสิร์ฟ ใช้เป็นแนวทางเบื้องต้น ไม่ใช่การวิเคราะห์ในห้องปฏิบัติการ</p>
      </div>
      <div class="foot-col">
        <h4>เมนูลัด</h4>
        <a href="index.html">หน้าแรก</a>
        <a href="recipe.html">เริ่มวิเคราะห์เมนู</a>
        <a href="results.html">ดูผลลัพธ์ล่าสุด</a>
      </div>
      <div class="foot-col">
        <h4>เกี่ยวกับข้อมูล</h4>
        <a href="index.html#methodology">วิธีคำนวณ</a>
        <a href="index.html#faq">คำถามที่พบบ่อย</a>
        <span style="display:block;padding:6px 0;font-size:13.5px;color:rgba(247,241,225,0.75);">วัตถุดิบในฐานข้อมูล: ${count} รายการ</span>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© ${new Date().getFullYear()+543} ครัวชัวร์ · ใช้เพื่อเป็นแนวทางเบื้องต้นเท่านั้น</span>
      <span class="mono">v1.0 · rev.multi-page</span>
    </div>
  </footer>`;
}
