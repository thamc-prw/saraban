/**
 * ระบบสารบรรณ THAMC: ตัวเชื่อม Google Sheets (Apps Script Web App)
 * วิธีใช้: เปิด Google Sheet > ส่วนขยาย > Apps Script > วางโค้ดนี้ > ตั้ง TOKEN
 * > ทำให้ใช้งานได้ > ติดตั้งเว็บแอป (Execute as: Me, Who has access: Anyone) > คัดลอก URL ไปใส่ในหน้า ตั้งค่า > ฐานข้อมูล
 *
 * ชีทแยกตามปีงบประมาณ (1 ต.ค. - 30 ก.ย.) ชื่อ "ออก FY2570" และ "รับ FY2570"
 * ชีทของปีงบใหม่จะถูกสร้างอัตโนมัติเมื่อมีเอกสารแรกของปีนั้น หรือเมื่อระบบสั่ง ensure
 */
const SPREADSHEET_ID = '1fG1U1d_BMtzcI9KdGINg17mdbAXeFuNjopBfu_vSEvg';
const TOKEN = 'เปลี่ยนรหัสนี้';
const HEAD = ['id', 'ประเภท', 'เลขที่', 'วันที่', 'จาก', 'ถึง / เลขหนังสือต้นทาง', 'เรื่อง', 'จำนวนเงิน', 'ผู้ลงชื่อ / ผู้รับ', 'ผู้ดำเนินการ', 'สถานะ', 'หมวดเรื่อง', 'หมายเหตุ', 'แก้ไขล่าสุด'];
const KEYS = ['id', 'kind', 'no', 'date', 'a', 'b', 'subj', 'amt', 'who', 'handler', 'st', 'cat', 'note', 'edited'];
const NAME_RE = /^(ออก|รับ) FY(\d{4})$/;

function fyOf_(ds) { const p = String(ds).split('/').map(Number); return p[1] >= 10 ? p[2] + 1 : p[2]; }
function nameOf_(kind, fy) { return (kind === 'out' ? 'ออก' : 'รับ') + ' FY' + fy; }

function sheet_(kind, fy) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID), n = nameOf_(kind, fy);
  let sh = ss.getSheetByName(n);
  if (!sh) {
    sh = ss.insertSheet(n);
    sh.getRange('C:D').setNumberFormat('@');
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');
    sh.setColumnWidth(7, 420);
    sh.hideColumns(1);
  }
  return sh;
}

function upsertMany_(recs) {
  const groups = {};
  recs.forEach(r => { const k = r.kind + '|' + fyOf_(r.date); (groups[k] = groups[k] || []).push(r); });
  Object.keys(groups).forEach(k => {
    const [kind, fy] = k.split('|'), sh = sheet_(kind, Number(fy));
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
    const fresh = [];
    groups[k].forEach(r => {
      const row = KEYS.map(c => r[c] == null ? '' : r[c]), i = ids.indexOf(String(r.id));
      if (i >= 0) sh.getRange(i + 2, 1, 1, KEYS.length).setValues([row]); else fresh.push(row);
    });
    if (fresh.length) sh.getRange(sh.getLastRow() + 1, 1, fresh.length, KEYS.length).setValues(fresh);
  });
}

function list_() {
  const out = [];
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().forEach(sh => {
    const m = sh.getName().match(NAME_RE);
    if (!m || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, KEYS.length).getValues().forEach(v => {
      const o = {}; KEYS.forEach((c, i) => o[c] = v[i]);
      o.amt = Number(o.amt) || 0; out.push(o);
    });
  });
  return out;
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function names_() { return SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().map(s => s.getName()).filter(n => NAME_RE.test(n)); }

function doGet() { return json_({ ok: true, sheets: names_() }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const q = JSON.parse(e.postData.contents);
    if (q.token !== TOKEN) return json_({ ok: false, error: 'รหัสไม่ถูกต้อง' });
    switch (q.action) {
      case 'ping': return json_({ ok: true, sheets: names_() });
      case 'ensure': sheet_('out', q.fy); sheet_('in', q.fy); return json_({ ok: true, sheets: names_() });
      case 'upsert': upsertMany_([q.rec]); return json_({ ok: true });
      case 'bulk': upsertMany_(q.recs); return json_({ ok: true, n: q.recs.length });
      case 'list': return json_({ ok: true, recs: list_() });
      default: return json_({ ok: false, error: 'ไม่รู้จักคำสั่ง' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}
