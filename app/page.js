'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: 16, background: '#fff', minHeight: '100vh' },
  h2: { fontSize: 20, fontWeight: 600, margin: '0 0 12px' },
  h3: { fontSize: 15, fontWeight: 600, margin: '12px 0 8px' },
  tabs: { display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e5ea', overflowX: 'auto' },
  tab: { padding: '10px 12px', fontSize: 13, fontWeight: 500, border: 'none', background: 'transparent', color: '#666', whiteSpace: 'nowrap', borderBottom: '2px solid transparent', cursor: 'pointer' },
  tabActive: { color: '#000', borderBottomColor: '#000' },
  card: { background: '#fff', border: '1px solid #e5e5ea', borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, color: '#666', marginBottom: 4, display: 'block' },
  field: { marginBottom: 10 },
  input: { width: '100%', padding: 10, fontSize: 14, border: '1px solid #d1d1d6', borderRadius: 8, boxSizing: 'border-box', fontFamily: 'inherit' },
  btnPrimary: { background: '#000', color: '#fff', border: 'none', padding: '12px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, width: '100%', cursor: 'pointer' },
  btnDanger: { background: 'transparent', border: '1px solid #e5e5ea', color: '#d32f2f', padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  btnGhost: { background: 'transparent', border: '1px solid #e5e5ea', padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', marginRight: 6 },
  stat: { background: '#f5f5f7', borderRadius: 8, padding: 12 },
  statLabel: { fontSize: 12, color: '#666' },
  statValue: { fontSize: 18, fontWeight: 600, marginTop: 4 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  fund: { background: '#e3f2fd', borderRadius: 8, padding: 12, marginBottom: 12 },
  fundLabel: { fontSize: 12, color: '#1565c0' },
  fundValue: { fontSize: 22, fontWeight: 600, color: '#0d47a1', marginTop: 4 },
  meta: { fontSize: 12, color: '#666' },
  empty: { textAlign: 'center', padding: 24, color: '#999', fontSize: 13 },
  pos: { color: '#2e7d32', fontWeight: 600 },
  neg: { color: '#d32f2f', fontWeight: 600 },
  sync: { fontSize: 11, color: '#999', textAlign: 'right', marginBottom: 8 },
  checkboxList: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 8, border: '1px solid #d1d1d6', borderRadius: 8 },
  ratioBtns: { display: 'flex', gap: 6, marginTop: 6 },
  ratioBtn: { flex: 1, padding: '8px 6px', fontSize: 12, border: '1px solid #d1d1d6', borderRadius: 6, background: '#fff', cursor: 'pointer' },
  ratioBtnActive: { background: '#000', color: '#fff', borderColor: '#000' },
  computed: { background: '#f5f5f7', padding: 8, borderRadius: 6, fontSize: 13, textAlign: 'center', marginTop: 6 },
  categoryBadge: { display: 'inline-block', background: '#e3f2fd', color: '#1565c0', fontSize: 11, padding: '2px 8px', borderRadius: 12, marginRight: 6 },
};

const fmt = n => Math.round(n).toLocaleString('vi-VN') + 'đ';
const today = () => new Date().toISOString().slice(0, 10);
const famLabel = f => {
  const total = (f.adults || 0) + (f.children || 0);
  if ((f.children || 0) === 0) return `${total} người`;
  if ((f.adults || 0) === 0) return `${total} người (${f.children} TE)`;
  return `${total} người (${f.adults} NL + ${f.children} TE)`;
};

export default function Home() {
  const [tab, setTab] = useState('summary');
  const [families, setFamilies] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sync, setSync] = useState('Đang tải...');

  const [famName, setFamName] = useState('');
  const [famAdults, setFamAdults] = useState('');
  const [famChildren, setFamChildren] = useState('0');
  const [conFamily, setConFamily] = useState('');
  const [conDate, setConDate] = useState(today());
  const [conAmount, setConAmount] = useState('');
  const [conNote, setConNote] = useState('');

  // Expense form
  const [expName, setExpName] = useState('');
  const [expCategory, setExpCategory] = useState('Tiền phòng');
  const [expDate, setExpDate] = useState(today());
  const [expQty, setExpQty] = useState('1');
  const [expUnitPrice, setExpUnitPrice] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('fund'); // 'fund' hoặc family_id
  const [expParts, setExpParts] = useState({});
  const [expChildRatio, setExpChildRatio] = useState(0.5);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    loadAll();
    const ch = supabase.channel('changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'families' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function loadAll() {
    try {
      setSync('Đang đồng bộ...');
      const [f, c, e, cat] = await Promise.all([
        supabase.from('families').select('*').order('created_at'),
        supabase.from('contributions').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('expense_categories').select('*').order('created_at'),
      ]);
      setFamilies(f.data || []);
      setContributions(c.data || []);
      setExpenses(e.data || []);
      setCategories(cat.data || []);
      const parts = {};
      (f.data || []).forEach(x => parts[x.id] = true);
      setExpParts(parts);
      setSync('✓ Đã đồng bộ ' + new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      setSync('⚠ Lỗi: ' + err.message);
    }
  }

  // Tự tính tổng tiền từ quantity × unit_price
  const computedTotal = (() => {
    const q = parseFloat(expQty) || 0;
    const u = parseFloat(expUnitPrice) || 0;
    return q * u;
  })();

  // Tổng tiền cuối cùng để lưu: ưu tiên expAmount nếu nhập tay, ngược lại lấy computed
  const finalAmount = () => {
    const direct = parseFloat(expAmount) || 0;
    if (direct > 0) return direct;
    return computedTotal;
  };

  // ===== ACTIONS =====
  async function addFamily() {
    const adults = parseInt(famAdults) || 0;
    const children = parseInt(famChildren) || 0;
    if (!famName.trim()) return alert('Nhập tên gia đình');
    if (adults + children < 1) return alert('Phải có ít nhất 1 người');
    const { error } = await supabase.from('families').insert({
      name: famName.trim(), adults, children,
    });
    if (error) return alert('Lỗi: ' + error.message);
    setFamName(''); setFamAdults(''); setFamChildren('0');
  }

  async function deleteFamily(id) {
    if (!confirm('Xóa gia đình này?')) return;
    await supabase.from('families').delete().eq('id', id);
  }

  async function addContribution() {
    if (!conFamily) return alert('Chọn gia đình');
    if (!conAmount || conAmount <= 0) return alert('Nhập số tiền hợp lệ');
    const { error } = await supabase.from('contributions').insert({
      family_id: conFamily, date: conDate, amount: parseFloat(conAmount), note: conNote.trim() || null,
    });
    if (error) return alert('Lỗi: ' + error.message);
    setConAmount(''); setConNote('');
  }

  async function deleteContribution(id) {
    if (!confirm('Xóa khoản góp?')) return;
    await supabase.from('contributions').delete().eq('id', id);
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    const { error } = await supabase.from('expense_categories').insert({ name: newCategory.trim() });
    if (error) {
      if (error.code === '23505') alert('Danh mục này đã tồn tại');
      else alert('Lỗi: ' + error.message);
      return;
    }
    setExpCategory(newCategory.trim());
    setNewCategory('');
  }

  async function deleteCategory(id, name) {
    if (!confirm(`Xóa danh mục "${name}"? (Các khoản chi đã có sẽ giữ nguyên tên danh mục)`)) return;
    await supabase.from('expense_categories').delete().eq('id', id);
  }

  async function addExpense() {
    if (!expName.trim()) return alert('Nhập nội dung');
    const amount = finalAmount();
    if (!amount || amount <= 0) return alert('Nhập số tiền hoặc đơn giá hợp lệ');
    const participants = Object.keys(expParts).filter(k => expParts[k]);
    if (participants.length === 0) return alert('Chọn ít nhất 1 gia đình tham gia');

    const payload = {
      name: expName.trim(),
      date: expDate,
      amount,
      category: expCategory,
      quantity: parseInt(expQty) || 1,
      unit_price: parseFloat(expUnitPrice) || null,
      payer_id: expPayer === 'fund' ? null : expPayer,
      participants,
      child_ratio: expChildRatio,
    };

    const { error } = await supabase.from('expenses').insert(payload);
    if (error) return alert('Lỗi: ' + error.message);

    // Reset form
    setExpName(''); setExpAmount(''); setExpQty('1'); setExpUnitPrice('');
  }

  async function deleteExpense(id) {
    if (!confirm('Xóa khoản chi?')) return;
    await supabase.from('expenses').delete().eq('id', id);
  }

  // ===== CALCULATIONS =====
  function shares(family, childRatio) {
    return (family.adults || 0) + (family.children || 0) * (childRatio ?? 0.5);
  }

  function calcBalances() {
    // balance = đóng góp (tiền góp + tiền ứng) - phần phải trả
    const b = {};
    families.forEach(f => b[f.id] = 0);

    // 1. Cộng tiền góp
    contributions.forEach(c => {
      if (b[c.family_id] !== undefined) b[c.family_id] += parseFloat(c.amount);
    });

    // 2. Cộng tiền gia đình tự ứng trả (payer_id != null = gia đình ứng)
    expenses.forEach(e => {
      if (e.payer_id && b[e.payer_id] !== undefined) {
        b[e.payer_id] += parseFloat(e.amount);
      }
    });

    // 3. Trừ phần phải trả theo đầu người
    expenses.forEach(e => {
      const ratio = e.child_ratio ?? 0.5;
      const totalShares = e.participants.reduce((s, pid) => {
        const f = families.find(x => x.id === pid);
        return s + (f ? shares(f, ratio) : 0);
      }, 0);
      if (totalShares === 0) return;
      const perShare = parseFloat(e.amount) / totalShares;
      e.participants.forEach(pid => {
        const f = families.find(x => x.id === pid);
        if (f && b[pid] !== undefined) b[pid] -= perShare * shares(f, ratio);
      });
    });
    return b;
  }

  function calcSettlements(b) {
    const arr = Object.entries(b).map(([id, v]) => ({ id, v: Math.round(v) })).filter(x => x.v !== 0);
    const debtors = arr.filter(x => x.v < 0).sort((a, b) => a.v - b.v);
    const creditors = arr.filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    const transfers = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amt = Math.min(-debtors[i].v, creditors[j].v);
      transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: amt });
      debtors[i].v += amt; creditors[j].v -= amt;
      if (debtors[i].v === 0) i++;
      if (creditors[j].v === 0) j++;
    }
    return transfers;
  }

  const balances = calcBalances();
  const settlements = calcSettlements(balances);
  const totalContrib = contributions.reduce((s, c) => s + parseFloat(c.amount), 0);
  const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalExpFromFund = expenses.filter(e => !e.payer_id).reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalAdults = families.reduce((s, f) => s + (f.adults || 0), 0);
  const totalChildren = families.reduce((s, f) => s + (f.children || 0), 0);
  const totalPeople = totalAdults + totalChildren;

  // Tổng chi theo danh mục
  const expByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'Khác';
    acc[cat] = (acc[cat] || 0) + parseFloat(e.amount);
    return acc;
  }, {});

  // ===== EXPORT =====
  function exportExcel() {
    if (families.length === 0) return alert('Chưa có dữ liệu');
    const wb = XLSX.utils.book_new();

    const famData = [['Tên gia đình', 'Người lớn', 'Trẻ em', 'Tổng'],
      ...families.map(f => [f.name, f.adults || 0, f.children || 0, (f.adults || 0) + (f.children || 0)])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(famData), 'Gia đình');

    const conData = [['Ngày', 'Gia đình', 'Số tiền', 'Ghi chú'],
      ...contributions.map(c => [c.date, families.find(f => f.id === c.family_id)?.name || '?', c.amount, c.note || ''])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(conData), 'Góp tiền');

    const expData = [['Ngày', 'Danh mục', 'Nội dung', 'SL', 'Đơn giá', 'Số tiền', 'Người chi', 'Hệ số TE', 'Gia đình tham gia'],
      ...expenses.map(e => [
        e.date, e.category || 'Khác', e.name,
        e.quantity || 1, e.unit_price || '', e.amount,
        e.payer_id ? (families.find(f => f.id === e.payer_id)?.name || '?') : 'Quỹ chung',
        e.child_ratio ?? 0.5,
        e.participants.map(p => families.find(f => f.id === p)?.name).filter(Boolean).join(', ')
      ])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expData), 'Khoản chi');

    const balData = [
      ['TỔNG KẾT', ''], ['Tổng đã góp', totalContrib], ['Tổng đã chi', totalExp],
      ['Chi từ quỹ', totalExpFromFund], ['Số dư quỹ', totalContrib - totalExpFromFund],
      ['Tổng người', totalPeople], ['Người lớn', totalAdults], ['Trẻ em', totalChildren],
      [], ['CHI THEO DANH MỤC'],
      ...Object.entries(expByCategory).map(([k, v]) => [k, v]),
      [], ['Gia đình', 'NL', 'TE', 'Đã góp', 'Đã ứng', 'Cân đối'],
      ...families.map(f => {
        const c = contributions.filter(x => x.family_id === f.id).reduce((s, x) => s + parseFloat(x.amount), 0);
        const advanced = expenses.filter(e => e.payer_id === f.id).reduce((s, e) => s + parseFloat(e.amount), 0);
        return [f.name, f.adults || 0, f.children || 0, c, advanced, Math.round(balances[f.id] || 0)];
      }),
      [], ['QUYẾT TOÁN'], ['Từ', 'Đến', 'Số tiền'],
      ...settlements.map(t => [families.find(f => f.id === t.from)?.name, families.find(f => f.id === t.to)?.name, t.amount])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(balData), 'Quyết toán');

    XLSX.writeFile(wb, `ChiaTienDuLich_${today()}.xlsx`);
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.h2}>✈️ Chia tiền du lịch</h2>
      <div style={styles.sync}>{sync}</div>

      <div style={styles.tabs}>
        {['summary', 'contribution', 'expenses', 'families', 'export'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}>
            {{summary:'Tổng kết',contribution:'Góp tiền',expenses:'Khoản chi',families:'Gia đình',export:'Xuất'}[t]}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div>
          <div style={styles.fund}>
            <div style={styles.fundLabel}>Số dư quỹ chung</div>
            <div style={styles.fundValue}>{fmt(totalContrib - totalExpFromFund)}</div>
            <div style={styles.meta}>Đã góp {fmt(totalContrib)} · Chi từ quỹ {fmt(totalExpFromFund)}</div>
          </div>
          <div style={{ ...styles.grid2, marginBottom: 12 }}>
            <div style={styles.stat}><div style={styles.statLabel}>Tổng chi</div><div style={styles.statValue}>{fmt(totalExp)}</div></div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Tổng người</div>
              <div style={styles.statValue}>{totalPeople}</div>
              <div style={styles.meta}>{totalAdults} NL + {totalChildren} TE</div>
            </div>
          </div>

          {Object.keys(expByCategory).length > 0 && (
            <>
              <h3 style={styles.h3}>Chi theo danh mục</h3>
              {Object.entries(expByCategory).map(([cat, sum]) => (
                <div key={cat} style={{ ...styles.card, padding: '8px 14px' }}>
                  <div style={styles.row}>
                    <div style={{ fontSize: 14 }}>{cat}</div>
                    <div style={{ fontWeight: 600 }}>{fmt(sum)}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          <h3 style={styles.h3}>Cân đối mỗi gia đình</h3>
          {families.length === 0 ? <div style={styles.empty}>Hãy thêm gia đình</div> :
            families.map(f => {
              const c = contributions.filter(x => x.family_id === f.id).reduce((s, x) => s + parseFloat(x.amount), 0);
              const adv = expenses.filter(e => e.payer_id === f.id).reduce((s, e) => s + parseFloat(e.amount), 0);
              const b = Math.round(balances[f.id] || 0);
              return (
                <div key={f.id} style={{ ...styles.card, padding: '10px 14px' }}>
                  <div style={styles.row}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{f.name}</div>
                      <div style={styles.meta}>
                        {famLabel(f)} · Góp {fmt(c)}{adv > 0 && ` · Ứng ${fmt(adv)}`}
                      </div>
                    </div>
                    <div style={b > 0 ? styles.pos : b < 0 ? styles.neg : {}}>
                      {b > 0 ? `+${fmt(b)} (dư)` : b < 0 ? `${fmt(b)} (thiếu)` : 'Cân'}
                    </div>
                  </div>
                </div>
              );
            })}

          <h3 style={styles.h3}>Gợi ý quyết toán</h3>
          {settlements.length === 0 ? <div style={styles.empty}>Mọi người đã cân bằng ✓</div> :
            settlements.map((t, i) => (
              <div key={i} style={{ ...styles.card, padding: '10px 14px' }}>
                <div style={styles.row}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: '#d32f2f' }}>{families.find(f => f.id === t.from)?.name}</span>
                    {' → '}
                    <span style={{ color: '#2e7d32' }}>{families.find(f => f.id === t.to)?.name}</span>
                  </div>
                  <div style={{ fontWeight: 600 }}>{fmt(t.amount)}</div>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'contribution' && (
        <div>
          <div style={styles.card}>
            <h3 style={styles.h3}>Ghi nhận khoản góp</h3>
            <div style={styles.field}>
              <label style={styles.label}>Gia đình</label>
              <select style={styles.input} value={conFamily} onChange={e => setConFamily(e.target.value)}>
                <option value="">-- Chọn --</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Ngày</label>
                <input style={styles.input} type="date" value={conDate} onChange={e => setConDate(e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Số tiền</label>
                <input style={styles.input} type="number" inputMode="numeric" value={conAmount} onChange={e => setConAmount(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Ghi chú</label>
              <input style={styles.input} type="text" value={conNote} onChange={e => setConNote(e.target.value)} placeholder="VD: Đợt 1" />
            </div>
            <button style={styles.btnPrimary} onClick={addContribution}>Thêm khoản góp</button>
          </div>

          <h3 style={styles.h3}>Tổng góp theo gia đình</h3>
          {families.map(f => {
            const total = contributions.filter(c => c.family_id === f.id).reduce((s, c) => s + parseFloat(c.amount), 0);
            return (
              <div key={f.id} style={{ ...styles.card, padding: '10px 14px' }}>
                <div style={styles.row}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{f.name}</div>
                    <div style={styles.meta}>{famLabel(f)}</div>
                  </div>
                  <div style={{ fontWeight: 600 }}>{fmt(total)}</div>
                </div>
              </div>
            );
          })}

          <h3 style={styles.h3}>Lịch sử góp</h3>
          {contributions.length === 0 ? <div style={styles.empty}>Chưa có khoản góp</div> :
            contributions.map(c => (
              <div key={c.id} style={styles.card}>
                <div style={{ ...styles.row, marginBottom: 6 }}>
                  <div style={{ fontWeight: 500 }}>{families.find(f => f.id === c.family_id)?.name || '?'}</div>
                  <div style={{ fontWeight: 600 }}>{fmt(c.amount)}</div>
                </div>
                <div style={styles.meta}>📅 {c.date}{c.note ? ' · ' + c.note : ''}</div>
                <button style={{ ...styles.btnDanger, marginTop: 8 }} onClick={() => deleteContribution(c.id)}>Xóa</button>
              </div>
            ))}
        </div>
      )}

      {tab === 'expenses' && (
        <div>
          <div style={styles.card}>
            <h3 style={styles.h3}>Thêm khoản chi</h3>

            <div style={styles.field}>
              <label style={styles.label}>Danh mục</label>
              <select style={styles.input} value={expCategory} onChange={e => setExpCategory(e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="+ Thêm danh mục mới"
                />
                <button style={styles.btnGhost} onClick={addCategory}>Thêm</button>
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Nội dung chi tiết</label>
              <input style={styles.input} value={expName} onChange={e => setExpName(e.target.value)} placeholder="VD: Khách sạn Mường Thanh, Ăn trưa nhà hàng X" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Ngày</label>
              <input style={styles.input} type="date" value={expDate} onChange={e => setExpDate(e.target.value)} />
            </div>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Số lượng</label>
                <input style={styles.input} type="number" inputMode="numeric" min="1" value={expQty} onChange={e => setExpQty(e.target.value)} placeholder="1" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Đơn giá</label>
                <input style={styles.input} type="number" inputMode="numeric" value={expUnitPrice} onChange={e => setExpUnitPrice(e.target.value)} placeholder="0" />
              </div>
            </div>

            {computedTotal > 0 && (
              <div style={styles.computed}>
                Tự tính: {expQty} × {fmt(parseFloat(expUnitPrice) || 0)} = <strong>{fmt(computedTotal)}</strong>
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>Tổng tiền (nhập tay - nếu để trống sẽ lấy tự tính ở trên)</label>
              <input style={styles.input} type="number" inputMode="numeric" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder={computedTotal > 0 ? `Tự tính: ${fmt(computedTotal)}` : '0'} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Người chi trả</label>
              <select style={styles.input} value={expPayer} onChange={e => setExpPayer(e.target.value)}>
                <option value="fund">💰 Quỹ chung</option>
                {families.map(f => <option key={f.id} value={f.id}>👤 {f.name} (ứng trả)</option>)}
              </select>
              <div style={{ ...styles.meta, marginTop: 4 }}>
                {expPayer === 'fund' ? 'Trừ trực tiếp vào quỹ chung' : 'Gia đình này ứng trả, sẽ được tính bù khi quyết toán'}
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Trẻ em tính bằng mấy phần người lớn?</label>
              <div style={styles.ratioBtns}>
                {[{ v: 0, l: 'Miễn phí' }, { v: 0.5, l: 'Nửa suất' }, { v: 1, l: 'Như NL' }].map(opt => (
                  <button key={opt.v}
                    style={{ ...styles.ratioBtn, ...(expChildRatio === opt.v ? styles.ratioBtnActive : {}) }}
                    onClick={() => setExpChildRatio(opt.v)}>
                    {opt.l} ({opt.v})
                  </button>
                ))}
              </div>
              <input
                style={{ ...styles.input, marginTop: 6 }}
                type="number" step="0.1" min="0" max="2"
                value={expChildRatio}
                onChange={e => setExpChildRatio(parseFloat(e.target.value) || 0)}
                placeholder="Hoặc nhập tay"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Gia đình tham gia</label>
              <div style={styles.checkboxList}>
                {families.length === 0 ? <div style={styles.meta}>Thêm gia đình trước</div> :
                  families.map(f => (
                    <label key={f.id} style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                      <input type="checkbox" checked={!!expParts[f.id]} onChange={e => setExpParts({ ...expParts, [f.id]: e.target.checked })} />
                      {f.name} ({famLabel(f)})
                    </label>
                  ))}
              </div>
              <div style={{ marginTop: 6 }}>
                <button style={styles.btnGhost} onClick={() => { const x = {}; families.forEach(f => x[f.id] = true); setExpParts(x); }}>Chọn tất cả</button>
                <button style={styles.btnGhost} onClick={() => setExpParts({})}>Bỏ chọn</button>
              </div>
            </div>

            <button style={styles.btnPrimary} onClick={addExpense}>Thêm khoản chi</button>
          </div>

          <h3 style={styles.h3}>Danh sách khoản chi</h3>
          {expenses.length === 0 ? <div style={styles.empty}>Chưa có khoản chi</div> :
            expenses.map(e => {
              const parts = e.participants.map(p => families.find(f => f.id === p)?.name).filter(Boolean);
              const ratio = e.child_ratio ?? 0.5;
              const payerName = e.payer_id ? (families.find(f => f.id === e.payer_id)?.name || '?') : 'Quỹ chung';
              return (
                <div key={e.id} style={styles.card}>
                  <div style={{ ...styles.row, marginBottom: 6 }}>
                    <div>
                      <span style={styles.categoryBadge}>{e.category || 'Khác'}</span>
                      <span style={{ fontWeight: 500 }}>{e.name}</span>
                    </div>
                    <div style={{ fontWeight: 600 }}>{fmt(e.amount)}</div>
                  </div>
                  <div style={styles.meta}>
                    📅 {e.date}
                    {e.quantity > 1 && e.unit_price && ` · ${e.quantity} × ${fmt(e.unit_price)}`}
                  </div>
                  <div style={styles.meta}>💳 {payerName} · Hệ số TE: {ratio}</div>
                  <div style={styles.meta}>👥 {parts.join(', ')}</div>
                  <button style={{ ...styles.btnDanger, marginTop: 8 }} onClick={() => deleteExpense(e.id)}>Xóa</button>
                </div>
              );
            })}
        </div>
      )}

      {tab === 'families' && (
        <div>
          <div style={styles.card}>
            <h3 style={styles.h3}>Thêm gia đình</h3>
            <div style={styles.field}>
              <label style={styles.label}>Tên gia đình</label>
              <input style={styles.input} value={famName} onChange={e => setFamName(e.target.value)} placeholder="VD: Gia đình anh Nam" />
            </div>
            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Người lớn</label>
                <input style={styles.input} type="number" inputMode="numeric" min="0" value={famAdults} onChange={e => setFamAdults(e.target.value)} placeholder="2" />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Trẻ em</label>
                <input style={styles.input} type="number" inputMode="numeric" min="0" value={famChildren} onChange={e => setFamChildren(e.target.value)} placeholder="0" />
              </div>
            </div>
            <button style={styles.btnPrimary} onClick={addFamily}>Thêm gia đình</button>
          </div>

          <h3 style={styles.h3}>Danh sách</h3>
          {families.length === 0 ? <div style={styles.empty}>Chưa có gia đình</div> :
            families.map(f => (
              <div key={f.id} style={{ ...styles.card, padding: '10px 14px' }}>
                <div style={styles.row}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{f.name}</div>
                    <div style={styles.meta}>{famLabel(f)}</div>
                  </div>
                  <button style={styles.btnDanger} onClick={() => deleteFamily(f.id)}>Xóa</button>
                </div>
              </div>
            ))}

          <h3 style={styles.h3}>Quản lý danh mục chi</h3>
          {categories.map(c => (
            <div key={c.id} style={{ ...styles.card, padding: '10px 14px' }}>
              <div style={styles.row}>
                <div>{c.name}</div>
                <button style={styles.btnDanger} onClick={() => deleteCategory(c.id, c.name)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'export' && (
        <div>
          <div style={styles.card}>
            <h3 style={styles.h3}>Xuất báo cáo Excel</h3>
            <p style={styles.meta}>File gồm 4 sheet: Gia đình, Góp tiền, Khoản chi, Quyết toán.</p>
            <button style={{ ...styles.btnPrimary, marginTop: 12 }} onClick={exportExcel}>📥 Tải file Excel</button>
          </div>
        </div>
      )}
    </div>
  );
}
