/**
 * ระบบสารบรรณ THAMC: ตัวเชื่อม Google Sheets + Google Drive (Apps Script Web App)
 *
 * ติดตั้ง: เปิด Google Sheet > ส่วนขยาย > Apps Script > วางโค้ดนี้ทั้งไฟล์ > ตั้ง TOKEN
 * > Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone) > คัดลอก URL
 * หลังแก้โค้ดทุกครั้ง ต้อง Deploy > Manage deployments > Edit > New version
 *
 * ชีทรายปีงบประมาณ (1 ต.ค. - 30 ก.ย.): "ออก FY2570", "รับ FY2570" สร้างอัตโนมัติ
 * ชีท "ข้อมูลหลัก": รายชื่อหน่วยงาน ผู้ลงชื่อ และการตั้งค่าการกรอกข้อมูล (ใช้ร่วมกันทุกคน)
 * ไฟล์แนบ: เก็บใน Google Drive โฟลเดอร์ "สารบรรณ THAMC - ไฟล์แนบ/FYxxxx" (ครั้งแรกจะขออนุญาตเข้าถึง Drive)
 */
const SPREADSHEET_ID = '1fG1U1d_BMtzcI9KdGINg17mdbAXeFuNjopBfu_vSEvg';
const TOKEN = 'thamc-sarabun';
const ATTACH_ROOT = 'สารบรรณ THAMC - ไฟล์แนบ';
const MASTER_SHEET = 'ข้อมูลหลัก';
const HEAD = ['id', 'ประเภท', 'เลขที่', 'วันที่', 'จาก', 'ถึง / เลขหนังสือต้นทาง', 'เรื่อง', 'จำนวนเงิน', 'ผู้ลงชื่อ / ผู้รับ', 'ผู้ดำเนินการ', 'สถานะ', 'หมวดเรื่อง', 'หมายเหตุ', 'แก้ไขล่าสุด', 'ไฟล์แนบ'];
const KEYS = ['id', 'kind', 'no', 'date', 'a', 'b', 'subj', 'amt', 'who', 'handler', 'st', 'cat', 'note', 'edited', 'files'];
const NAME_RE = /^(ออก|รับ) FY(\d{4})$/;

function ss_() { return SpreadsheetApp.openById(SPREADSHEET_ID); }
function fyOf_(ds) { const p = String(ds).split('/').map(Number); return p[1] >= 10 ? p[2] + 1 : p[2]; }
function nameOf_(kind, fy) { return (kind === 'out' ? 'ออก' : 'รับ') + ' FY' + fy; }

function sheet_(kind, fy) {
  const ss = ss_(), n = nameOf_(kind, fy);
  let sh = ss.getSheetByName(n);
  if (!sh) {
    sh = ss.insertSheet(n);
    sh.getRange('C:D').setNumberFormat('@');
    sh.appendRow(HEAD);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');
    sh.setColumnWidth(7, 420);
    sh.hideColumns(1);
  } else if (sh.getRange(1, HEAD.length).getValue() !== HEAD[HEAD.length - 1]) {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');
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
  ss_().getSheets().forEach(sh => {
    if (!NAME_RE.test(sh.getName()) || sh.getLastRow() < 2) return;
    sh.getRange(2, 1, sh.getLastRow() - 1, KEYS.length).getValues().forEach(v => {
      const o = {}; KEYS.forEach((c, i) => o[c] = v[i]);
      o.amt = Number(o.amt) || 0; out.push(o);
    });
  });
  return out;
}

function masterSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(MASTER_SHEET);
  if (!sh) {
    sh = ss.insertSheet(MASTER_SHEET);
    sh.appendRow(['ประเภท', 'ค่า']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#0D9488').setFontColor('#ffffff');
    sh.setColumnWidth(2, 360);
  }
  return sh;
}
function masterGet_() {
  const sh = masterSheet_(), r = { orgs: [], people: [], fm: null };
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(v => {
    if (v[0] === 'org') r.orgs.push(String(v[1]));
    else if (v[0] === 'person') r.people.push(String(v[1]));
    else if (v[0] === 'fm') { try { r.fm = JSON.parse(v[1]); } catch (e) {} }
  });
  return r;
}
function masterSet_(q) {
  const sh = masterSheet_();
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  const rows = [...(q.orgs || []).map(v => ['org', v]), ...(q.people || []).map(v => ['person', v]), ['fm', JSON.stringify(q.fm || {})]];
  sh.getRange(2, 1, rows.length, 2).setValues(rows);
}

function child_(parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function upload_(q) {
  const folder = child_(child_(DriveApp.getRootFolder(), ATTACH_ROOT), 'FY' + q.fy);
  const safe = String(q.no || '').replace(/[\/\\:*?"<>|]/g, '-');
  const blob = Utilities.newBlob(Utilities.base64Decode(q.data), q.mime || 'application/octet-stream', safe + ' - ' + q.name);
  const f = folder.createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { id: f.getId(), url: f.getUrl() };
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function names_() { return ss_().getSheets().map(s => s.getName()).filter(n => NAME_RE.test(n)); }

function doGet() { return json_({ ok: true, sheets: names_() }); }

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const q = JSON.parse(e.postData.contents);
    if (q.token !== TOKEN) return json_({ ok: false, error: 'รหัสไม่ถูกต้อง' });
    switch (q.action) {
      case 'ping': return json_({ ok: true, sheets: names_() });
      case 'ensure': sheet_('out', q.fy); sheet_('in', q.fy); return json_({ ok: true, sheets: names_() });
      case 'upsert': upsertMany_([q.rec]); return json_({ ok: true });
      case 'bulk': upsertMany_(q.recs); return json_({ ok: true, n: q.recs.length });
      case 'list': return json_({ ok: true, recs: list_() });
      case 'master_get': return json_(Object.assign({ ok: true }, masterGet_()));
      case 'master_set': masterSet_(q); return json_({ ok: true });
      case 'upload': return json_(Object.assign({ ok: true }, upload_(q)));
      default: return json_({ ok: false, error: 'ไม่รู้จักคำสั่ง' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally { lock.releaseLock(); }
}
