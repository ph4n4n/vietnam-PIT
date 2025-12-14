const TAX_CONFIG = {
  // Employee insurance rates
  bhxh: { rate: 0.08, cap: 46_800_000 },  // BHXH 8%, cap 20 × 2.34M (từ 7/2024)
  bhyt: { rate: 0.015, cap: 46_800_000 }, // BHYT 1.5%, cap 20 × 2.34M
  bhtn: { rate: 0.01 },                    // BHTN 1%, cap depends on region

  // BHTN caps by region (20 × minimum wage)
  bhtnCaps: {
    1: 99_200_000,  // Vùng I: 20 × 4,960,000
    2: 88_200_000,  // Vùng II: 20 × 4,410,000
    3: 77_200_000,  // Vùng III: 20 × 3,860,000
    4: 69_000_000,  // Vùng IV: 20 × 3,450,000
  },

  // Employer insurance rates
  bhxhCompany: { rate: 0.17, cap: 46_800_000 },  // BHXH 17%
  bhnnCompany: { rate: 0.005, cap: 46_800_000 }, // BH tai nạn LĐ - Bệnh nghề nghiệp 0.5%
  bhytCompany: { rate: 0.03, cap: 46_800_000 },  // BHYT 3%
  bhtnCompany: { rate: 0.01 },  // BHTN 1%, cap depends on region

  personalDeduction: { old: 11_000_000, new: 15_500_000 },
  dependentDeduction: { old: 4_400_000, new: 6_200_000 },
  bracketsOld: [
    [5_000_000, 0.05],
    [10_000_000, 0.10],
    [18_000_000, 0.15],
    [32_000_000, 0.20],
    [52_000_000, 0.25],
    [80_000_000, 0.30],
    [Infinity, 0.35],
  ],
  bracketsNew: [
    [10_000_000, 0.05],
    [30_000_000, 0.15],
    [60_000_000, 0.25],
    [100_000_000, 0.30],
    [Infinity, 0.35],
  ],
};

let incomeType = 'gross';
let netScenario = 'keep-gross'; // 'keep-gross' or 'keep-net'

// History management
const HISTORY_KEY = 'pit_calc_history';
const HISTORY_ENABLED_KEY = 'pit_calc_history_enabled';
const MAX_HISTORY = 10;

function isHistoryEnabled() {
  return localStorage.getItem(HISTORY_ENABLED_KEY) !== 'false';
}

function setHistoryEnabled(enabled) {
  localStorage.setItem(HISTORY_ENABLED_KEY, enabled ? 'true' : 'false');
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToHistory(params) {
  if (!isHistoryEnabled()) return;
  
  const history = getHistory();
  const entry = {
    ...params,
    timestamp: Date.now(),
    id: Date.now().toString(36),
  };
  
  // Remove duplicate (same params)
  const filtered = history.filter(h => 
    !(h.income === params.income && h.type === params.type && 
      h.dependents === params.dependents && h.bonus === params.bonus)
  );
  
  filtered.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
  renderHistory();
}

function loadFromHistory(id) {
  const history = getHistory();
  const entry = history.find(h => h.id === id);
  if (!entry) return;
  
  document.getElementById('incomeInput').value = parseInt(entry.income, 10).toLocaleString('vi-VN');
  document.getElementById('dependents').value = entry.dependents;
  document.getElementById('bonusMonths').value = entry.bonus || 0;
  document.getElementById('region').value = entry.region;
  
  if (entry.type && ['gross', 'net'].includes(entry.type)) {
    incomeType = entry.type;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === entry.type);
    });
  }
  
  updateBhtnCapDisplay();
  calculate();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function confirmClearHistory() {
  if (confirm('Xóa toàn bộ lịch sử tính thuế?')) {
    clearHistory();
  }
}

function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;
  
  const enabled = isHistoryEnabled();
  const checkbox = document.getElementById('historyEnabled');
  if (checkbox) checkbox.checked = enabled;
  
  // Show/hide privacy note and wrapper
  const privacyNote = document.getElementById('historyPrivacy');
  const wrapper = document.getElementById('historyWrapper');
  const clearBtn = document.getElementById('historyClearBtn');
  
  if (privacyNote) privacyNote.style.display = enabled ? 'block' : 'none';
  if (wrapper) wrapper.style.display = enabled ? 'flex' : 'none';
  
  if (!enabled) {
    container.innerHTML = '';
    return;
  }
  
  // Show/hide clear button based on history length
  const history = getHistory();
  if (clearBtn) clearBtn.style.display = history.length > 0 ? 'block' : 'none';
  
  if (history.length === 0) {
    container.innerHTML = '<p class="history-empty">Chưa có lịch sử</p>';
    return;
  }
  
  container.innerHTML = history.map(h => {
    const income = parseInt(h.income, 10).toLocaleString('vi-VN');
    const type = h.type === 'net' ? 'Net' : 'Gross';
    const dep = h.dependents > 0 ? `, ${h.dependents} NPT` : '';
    const bonus = h.bonus > 0 ? `, +${h.bonus}th` : '';
    return `
      <button class="history-item" onclick="loadFromHistory('${h.id}')">
        <span class="history-value">${income}đ</span>
        <span class="history-meta">${type}${dep}${bonus}</span>
      </button>
    `;
  }).join('');
}

function calculateProgressiveTax(taxableIncome, brackets) {
  if (taxableIncome <= 0) return 0;
  let tax = 0, prev = 0;
  for (const [threshold, rate] of brackets) {
    const taxable = Math.min(taxableIncome, threshold) - prev;
    if (taxable <= 0) break;
    tax += taxable * rate;
    prev = threshold;
  }
  return tax;
}

// Calculate tax breakdown by bracket
function calculateTaxBreakdown(taxableIncome, brackets) {
  const breakdown = [];
  let prev = 0;
  for (const [threshold, rate] of brackets) {
    const taxable = Math.min(taxableIncome, threshold) - prev;
    const tax = taxable > 0 ? taxable * rate : 0;
    breakdown.push({
      from: prev,
      to: threshold === Infinity ? null : threshold,
      rate,
      taxable: Math.max(0, taxable),
      tax
    });
    prev = threshold;
    if (taxableIncome <= threshold) break;
  }
  return breakdown;
}

function calcInsurance(income, rate, cap) {
  return Math.min(income, cap) * rate;
}

function getRegion() {
  const el = document.getElementById('region');
  return el ? parseInt(el.value, 10) : 1;
}

function getBhtnCap() {
  return TAX_CONFIG.bhtnCaps[getRegion()];
}

function calculatePIT(grossIncome, dependents) {
  const cfg = TAX_CONFIG;
  const bhtnCap = getBhtnCap();

  // Employee insurance (detailed)
  const bhxh = calcInsurance(grossIncome, cfg.bhxh.rate, cfg.bhxh.cap);
  const bhyt = calcInsurance(grossIncome, cfg.bhyt.rate, cfg.bhyt.cap);
  const bhtn = calcInsurance(grossIncome, cfg.bhtn.rate, bhtnCap);
  const insurance = bhxh + bhyt + bhtn;

  const incomeAfterInsurance = grossIncome - insurance;

  const deductionOld = cfg.personalDeduction.old + cfg.dependentDeduction.old * dependents;
  const deductionNew = cfg.personalDeduction.new + cfg.dependentDeduction.new * dependents;

  const taxableOld = Math.max(0, incomeAfterInsurance - deductionOld);
  const taxableNew = Math.max(0, incomeAfterInsurance - deductionNew);

  const taxOld = calculateProgressiveTax(taxableOld, cfg.bracketsOld);
  const taxNew = calculateProgressiveTax(taxableNew, cfg.bracketsNew);

  // Tax breakdown by bracket
  const breakdownOld = calculateTaxBreakdown(taxableOld, cfg.bracketsOld);
  const breakdownNew = calculateTaxBreakdown(taxableNew, cfg.bracketsNew);

  // Tax with only personal deduction (no dependent deduction) - monthly withholding
  // Company MUST deduct personal deduction, only dependent deduction can be claimed at year-end
  const taxableSelfOnlyOld = Math.max(0, incomeAfterInsurance - cfg.personalDeduction.old);
  const taxableSelfOnlyNew = Math.max(0, incomeAfterInsurance - cfg.personalDeduction.new);
  const taxSelfOnlyOld = calculateProgressiveTax(taxableSelfOnlyOld, cfg.bracketsOld);
  const taxSelfOnlyNew = calculateProgressiveTax(taxableSelfOnlyNew, cfg.bracketsNew);

  return {
    grossIncome,
    dependents,
    bhxh,
    bhyt,
    bhtn,
    insurance,
    incomeAfterInsurance,
    deductionOld,
    deductionNew,
    taxableOld,
    taxableNew,
    taxOld,
    taxNew,
    breakdownOld,
    breakdownNew,
    taxSelfOnlyOld,
    taxSelfOnlyNew,
    taxSaved: taxOld - taxNew,
    netOld: grossIncome - insurance - taxOld,
    netNew: grossIncome - insurance - taxNew,
  };
}

// Calculate yearly PIT with bonus (bonus taxed progressively with yearly income)
function calculateYearlyPIT(monthlyGross, dependents, bonusMonths) {
  const cfg = TAX_CONFIG;
  const bhtnCap = getBhtnCap();

  // Monthly insurance
  const monthlyBhxh = calcInsurance(monthlyGross, cfg.bhxh.rate, cfg.bhxh.cap);
  const monthlyBhyt = calcInsurance(monthlyGross, cfg.bhyt.rate, cfg.bhyt.cap);
  const monthlyBhtn = calcInsurance(monthlyGross, cfg.bhtn.rate, bhtnCap);
  const monthlyInsurance = monthlyBhxh + monthlyBhyt + monthlyBhtn;

  // Bonus doesn't have insurance deduction (already paid on monthly salary)
  const bonusGross = monthlyGross * bonusMonths;
  
  // Yearly totals
  const yearlyGross = monthlyGross * 12 + bonusGross;
  const yearlyInsurance = monthlyInsurance * 12;
  const yearlyIncomeAfterInsurance = yearlyGross - yearlyInsurance;
  
  // Yearly deductions
  const yearlyDeductionOld = (cfg.personalDeduction.old + cfg.dependentDeduction.old * dependents) * 12;
  const yearlyDeductionNew = (cfg.personalDeduction.new + cfg.dependentDeduction.new * dependents) * 12;
  
  const yearlyTaxableOld = Math.max(0, yearlyIncomeAfterInsurance - yearlyDeductionOld);
  const yearlyTaxableNew = Math.max(0, yearlyIncomeAfterInsurance - yearlyDeductionNew);
  
  const yearlyTaxOld = calculateProgressiveTax(yearlyTaxableOld, cfg.bracketsOld);
  const yearlyTaxNew = calculateProgressiveTax(yearlyTaxableNew, cfg.bracketsNew);
  
  return {
    yearlyGross,
    bonusGross,
    yearlyInsurance,
    yearlyIncomeAfterInsurance,
    yearlyDeductionOld,
    yearlyDeductionNew,
    yearlyTaxableOld,
    yearlyTaxableNew,
    yearlyTaxOld,
    yearlyTaxNew,
    yearlyNetOld: yearlyGross - yearlyInsurance - yearlyTaxOld,
    yearlyNetNew: yearlyGross - yearlyInsurance - yearlyTaxNew,
    yearlySaved: yearlyTaxOld - yearlyTaxNew,
  };
}

// Binary search: find Gross from Net
function netToGross(targetNet, dependents, useNewTax = false) {
  let low = targetNet;
  let high = targetNet * 2;
  const tolerance = 1; // Precise to 1 VND

  for (let i = 0; i < 100; i++) {
    const mid = Math.floor((low + high) / 2);
    const result = calculatePIT(mid, dependents);
    const net = useNewTax ? result.netNew : result.netOld;

    if (Math.abs(net - targetNet) < tolerance) {
      return mid;
    }

    if (net < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor((low + high) / 2);
}

function formatMoney(n) {
  return Math.round(n).toLocaleString('vi-VN') + ' ₫';
}

// Calculate company insurance (detailed)
function calcCompanyInsuranceDetail(income) {
  const cfg = TAX_CONFIG;
  const bhtnCap = getBhtnCap();
  const bhxh = calcInsurance(income, cfg.bhxhCompany.rate, cfg.bhxhCompany.cap);
  const bhnn = calcInsurance(income, cfg.bhnnCompany.rate, cfg.bhnnCompany.cap);
  const bhyt = calcInsurance(income, cfg.bhytCompany.rate, cfg.bhytCompany.cap);
  const bhtn = calcInsurance(income, cfg.bhtnCompany.rate, bhtnCap);
  return {
    bhxh,
    bhnn,
    bhyt,
    bhtn,
    total: bhxh + bhnn + bhyt + bhtn
  };
}

// N→G mode: Net thực nhận = input, thuế tính trên input (thay vì Gross thực)
function renderNetAsGross(netAmount, dependents) {
  // Cách tính sai: lấy Net làm Gross
  const wrong = calculatePIT(netAmount, dependents);

  // Cách tính đúng: tìm Gross thực từ Net
  const realGross = netToGross(netAmount, dependents);
  const correct = calculatePIT(realGross, dependents);

  // Chi phí công ty (Gross + BH công ty)
  const wrongCompanyBH = calcCompanyInsuranceDetail(netAmount).total;
  const wrongCompanyCost = netAmount + wrongCompanyBH + wrong.taxOld;

  const correctCompanyBH = calcCompanyInsuranceDetail(realGross).total;
  const correctCompanyCost = realGross + correctCompanyBH;

  const companySaved = correctCompanyCost - wrongCompanyCost;

  const rows = [
    { label: 'Net thực nhận', wrong: formatMoney(netAmount), correct: formatMoney(netAmount) },
    { label: 'Gross để tính thuế', wrong: formatMoney(netAmount), correct: formatMoney(realGross), highlight: true },
    { label: 'Thuế TNCN (CT trả)', wrong: formatMoney(wrong.taxOld), correct: formatMoney(correct.taxOld), highlight: true },
    { label: 'BH công ty đóng (21.5%)', wrong: formatMoney(wrongCompanyBH), correct: formatMoney(correctCompanyBH), info: true },
    { label: 'Tổng CT chi/tháng', wrong: formatMoney(wrongCompanyCost), correct: formatMoney(correctCompanyCost) },
  ];

  let html = rows.map(row => `
    <tr class="${row.info ? 'info-row' : ''} ${row.highlight ? 'diff-row' : ''}">
      <td class="col-label">${row.label}</td>
      <td class="col-old">${row.wrong}</td>
      <td class="col-new">${row.correct}</td>
    </tr>
  `).join('');

  html += `
    <tr class="highlight-row">
      <td class="col-label">💸 CT TIẾT KIỆM (sai cách)/THÁNG</td>
      <td colspan="2" class="saved-value" style="text-align: center;">
        ${formatMoney(companySaved)}
      </td>
    </tr>
    <tr class="highlight-row">
      <td class="col-label">📅 CT TIẾT KIỆM (sai cách)/NĂM</td>
      <td colspan="2" class="saved-value" style="text-align: center;">
        ${formatMoney(companySaved * 12)}
      </td>
    </tr>
  `;

  document.getElementById('resultBody').innerHTML = html;

  // Update header for this mode
  document.querySelector('#resultSection .result-header h2').textContent = '📊 So sánh: N→G vs Tính đúng';
  document.querySelector('#resultSection thead').innerHTML = `
    <tr>
      <th>Mục</th>
      <th>N→G (sai cách)</th>
      <th>Tính đúng (Net)</th>
    </tr>
  `;

  document.getElementById('resultSection').classList.add('show');
  document.getElementById('refundSection').classList.remove('show');
}

function parseMoneyInput(str) {
  return parseInt(str.replace(/[^\d]/g, ''), 10) || 0;
}

function calculate() {
  const inputValue = parseMoneyInput(document.getElementById('incomeInput').value);
  const dependents = parseInt(document.getElementById('dependents').value, 10) || 0;
  const region = getRegion();
  const bonusMonths = parseInt(document.getElementById('bonusMonths').value, 10) || 0;

  if (inputValue <= 0) {
    alert('Vui lòng nhập thu nhập hợp lệ');
    return;
  }

  // Update URL params for sharing
  setUrlParams(inputValue, incomeType, dependents, region, bonusMonths);
  
  // Save to history
  saveToHistory({ income: inputValue, type: incomeType, dependents, region, bonus: bonusMonths });

  // Handle N→G mode separately
  if (incomeType === 'net-as-gross') {
    renderNetAsGross(inputValue, dependents);
    return;
  }

  // Convert based on income type and scenario
  let grossOld, grossNew, r, rNew;
  const noteEl = document.getElementById('resultNote');
  
  if (incomeType === 'net') {
    if (netScenario === 'keep-gross') {
      // Scenario A: DN giữ nguyên Gross, NLĐ hưởng lợi từ thuế giảm
      grossOld = netToGross(inputValue, dependents, false);
      grossNew = grossOld; // Same Gross for both years
      r = calculatePIT(grossOld, dependents);
      rNew = r; // Same calculation
      
      // Show note
      noteEl.innerHTML = `
        <div class="note-info">
          <strong>📈 Kịch bản: DN giữ nguyên Gross</strong><br>
          Nếu DN không điều chỉnh lương, NLĐ sẽ được hưởng lợi từ thuế giảm.<br>
          Net 2026 cao hơn <strong>${formatMoney(r.netNew - r.netOld)}</strong>/tháng so với 2025.
        </div>
      `;
      noteEl.style.display = 'block';
    } else {
      // Scenario B: DN giữ nguyên Net, DN tiết kiệm chi phí
      grossOld = netToGross(inputValue, dependents, false);
      grossNew = netToGross(inputValue, dependents, true);
      r = calculatePIT(grossOld, dependents);
      rNew = calculatePIT(grossNew, dependents);
      
      const grossSaved = grossOld - grossNew;
      const employerOld = calcCompanyInsuranceDetail(grossOld);
      const employerNew = calcCompanyInsuranceDetail(grossNew);
      const totalSaved = (grossOld + employerOld.total) - (grossNew + employerNew.total);
      
      // Show note
      noteEl.innerHTML = `
        <div class="note-warning">
          <strong>💼 Kịch bản: DN giữ nguyên Net</strong><br>
          DN có thể giảm Gross xuống để giữ Net như cũ, tiết kiệm <strong>${formatMoney(totalSaved)}</strong>/tháng chi phí.<br>
          <small>Gross giảm: ${formatMoney(grossSaved)} · BH DN giảm: ${formatMoney(employerOld.total - employerNew.total)}</small>
        </div>
      `;
      noteEl.style.display = 'block';
    }
  } else {
    grossOld = inputValue;
    grossNew = inputValue;
    r = calculatePIT(grossOld, dependents);
    rNew = r;
    noteEl.style.display = 'none';
  }

  // Reset header for normal modes
  document.querySelector('#resultSection .result-header h2').textContent = '📊 Kết quả tính thuế';
  document.querySelector('#resultSection thead').innerHTML = `
    <tr>
      <th>Mục</th>
      <th>2025</th>
      <th>2026</th>
    </tr>
  `;

  // Use different values for keep-net scenario
  const grossDisplay = netScenario === 'keep-net' && incomeType === 'net' 
    ? { old: grossOld, new: grossNew } 
    : { old: r.grossIncome, new: r.grossIncome };
  
  const netDisplay = netScenario === 'keep-net' && incomeType === 'net'
    ? { old: r.netOld, new: rNew.netNew }
    : { old: r.netOld, new: r.netNew };
  
  const taxDisplay = netScenario === 'keep-net' && incomeType === 'net'
    ? { old: r.taxOld, new: rNew.taxNew }
    : { old: r.taxOld, new: r.taxNew };

  const rows = [
    { label: 'Thu nhập Gross', old: formatMoney(grossDisplay.old), new: formatMoney(grossDisplay.new), highlight: grossDisplay.old !== grossDisplay.new },
    { label: '└ BHXH (8%)', old: formatMoney(r.bhxh), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.bhxh : r.bhxh), info: true },
    { label: '└ BHYT (1.5%)', old: formatMoney(r.bhyt), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.bhyt : r.bhyt), info: true },
    { label: '└ BHTN (1%)', old: formatMoney(r.bhtn), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.bhtn : r.bhtn), info: true },
    { label: 'Tổng BH bắt buộc (10.5%)', old: formatMoney(r.insurance), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.insurance : r.insurance) },
    { label: 'Thu nhập chịu thuế', old: formatMoney(r.incomeAfterInsurance), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.incomeAfterInsurance : r.incomeAfterInsurance) },
    { label: '└ Giảm trừ bản thân', old: formatMoney(TAX_CONFIG.personalDeduction.old), new: formatMoney(TAX_CONFIG.personalDeduction.new), info: true },
    { label: `└ Giảm trừ NPT (×${dependents})`, old: formatMoney(TAX_CONFIG.dependentDeduction.old * dependents), new: formatMoney(TAX_CONFIG.dependentDeduction.new * dependents), info: true },
    { label: 'Tổng giảm trừ', old: formatMoney(r.deductionOld), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.deductionNew : r.deductionNew) },
    { label: 'Thu nhập tính thuế', old: formatMoney(r.taxableOld), new: formatMoney(netScenario === 'keep-net' && incomeType === 'net' ? rNew.taxableNew : r.taxableNew) },
    { label: 'Thuế TNCN phải nộp', old: formatMoney(taxDisplay.old), new: formatMoney(taxDisplay.new) },
    { label: 'Thu nhập NET', old: formatMoney(netDisplay.old), new: formatMoney(netDisplay.new), highlight: netScenario === 'keep-net' && incomeType === 'net' },
  ];

  const taxSaved = taxDisplay.old - taxDisplay.new;

  let html = rows.map(row => `
    <tr class="${row.info ? 'info-row' : ''} ${row.highlight ? 'diff-row' : ''}">
      <td class="col-label">${row.label}</td>
      <td class="col-old">${row.old}</td>
      <td class="col-new">${row.new}</td>
    </tr>
  `).join('');

  html += `
    <tr class="highlight-row">
      <td class="col-label">💰 TIỀN THUẾ GIẢM/THÁNG</td>
      <td colspan="2" class="saved-value" style="text-align: center;">
        ${taxSaved >= 0 ? '+' : ''}${formatMoney(taxSaved)}
      </td>
    </tr>
    <tr class="highlight-row">
      <td class="col-label">📅 TIỀN THUẾ GIẢM/NĂM</td>
      <td colspan="2" class="saved-value" style="text-align: center;">
        ${taxSaved >= 0 ? '+' : ''}${formatMoney(taxSaved * 12)}
      </td>
    </tr>
  `;

  document.getElementById('resultBody').innerHTML = html;

  // Refund section - only dependent deduction can be claimed at year-end
  // Company already deducts personal deduction monthly
  const refundOld = (r.taxSelfOnlyOld - r.taxOld) * 12;
  const refundNew = (r.taxSelfOnlyNew - r.taxNew) * 12;

  document.getElementById('refundBody').innerHTML = `
    <tr>
      <td class="col-label">Thuế khấu trừ/tháng (chỉ trừ bản thân)</td>
      <td class="col-old">${formatMoney(r.taxSelfOnlyOld)}</td>
      <td class="col-new">${formatMoney(r.taxSelfOnlyNew)}</td>
    </tr>
    <tr>
      <td class="col-label">Thuế khấu trừ cả năm</td>
      <td class="col-old">${formatMoney(r.taxSelfOnlyOld * 12)}</td>
      <td class="col-new">${formatMoney(r.taxSelfOnlyNew * 12)}</td>
    </tr>
    <tr>
      <td class="col-label">Thuế thực tế (có NPT ×${r.dependents})</td>
      <td class="col-old">${formatMoney(r.taxOld * 12)}</td>
      <td class="col-new">${formatMoney(r.taxNew * 12)}</td>
    </tr>
    <tr class="highlight-row refund-row">
      <td class="col-label">🔄 HOÀN THUẾ (nhờ NPT)</td>
      <td class="saved-value">${formatMoney(refundOld)}</td>
      <td class="saved-value">${formatMoney(refundNew)}</td>
    </tr>
  `;

  // Render tax breakdown
  const renderBreakdown = (breakdown, isNew) => {
    const brackets = isNew ? TAX_CONFIG.bracketsNew : TAX_CONFIG.bracketsOld;
    return brackets.map((b, i) => {
      const item = breakdown[i] || { tax: 0, taxable: 0 };
      const fromLabel = i === 0 ? 'Đến' : `Trên ${formatMoney(brackets[i-1][0]).replace(' ₫', '')} đến`;
      const toLabel = b[0] === Infinity ? '' : ` ${formatMoney(b[0]).replace(' ₫', '')}`;
      const label = b[0] === Infinity ? `Trên ${formatMoney(brackets[i-1][0]).replace(' ₫', '')}` : `${fromLabel}${toLabel}`;
      const hasTax = item.tax > 0;
      return `
        <tr class="${hasTax ? 'has-tax' : 'no-tax'}">
          <td>${label}</td>
          <td>${formatMoney(item.taxable)}</td>
          <td>${Math.round(b[1] * 100)}%</td>
          <td>${formatMoney(item.tax)}</td>
        </tr>
      `;
    }).join('');
  };

  document.getElementById('breakdownOldBody').innerHTML = renderBreakdown(r.breakdownOld, false);
  document.getElementById('breakdownNewBody').innerHTML = renderBreakdown(r.breakdownNew, true);

  // Employer cost section
  const employer = calcCompanyInsuranceDetail(r.grossIncome);
  const totalEmployerCost = r.grossIncome + employer.total;
  
  document.getElementById('employerBody').innerHTML = `
    <tr>
      <td class="col-label">Lương GROSS</td>
      <td class="col-new">${formatMoney(r.grossIncome)}</td>
    </tr>
    <tr class="info-row">
      <td class="col-label">└ BHXH (17%)</td>
      <td>${formatMoney(employer.bhxh)}</td>
    </tr>
    <tr class="info-row">
      <td class="col-label">└ BH tai nạn LĐ - Bệnh nghề nghiệp (0.5%)</td>
      <td>${formatMoney(employer.bhnn)}</td>
    </tr>
    <tr class="info-row">
      <td class="col-label">└ BHYT (3%)</td>
      <td>${formatMoney(employer.bhyt)}</td>
    </tr>
    <tr class="info-row">
      <td class="col-label">└ BHTN (1%)</td>
      <td>${formatMoney(employer.bhtn)}</td>
    </tr>
    <tr>
      <td class="col-label">Tổng BH doanh nghiệp (21.5%)</td>
      <td class="col-new">${formatMoney(employer.total)}</td>
    </tr>
    <tr class="highlight-row">
      <td class="col-label">💼 TỔNG CHI PHÍ DN/THÁNG</td>
      <td class="saved-value">${formatMoney(totalEmployerCost)}</td>
    </tr>
    <tr class="highlight-row">
      <td class="col-label">📅 TỔNG CHI PHÍ DN/NĂM</td>
      <td class="saved-value">${formatMoney(totalEmployerCost * 12)}</td>
    </tr>
  `;

  // Yearly calculation with bonus
  if (bonusMonths > 0) {
    const yearly = calculateYearlyPIT(grossIncome, dependents, bonusMonths);
    
    document.getElementById('yearlyBody').innerHTML = `
      <tr>
        <td class="col-label">Lương 12 tháng</td>
        <td class="col-old">${formatMoney(grossIncome * 12)}</td>
        <td class="col-new">${formatMoney(grossIncome * 12)}</td>
      </tr>
      <tr>
        <td class="col-label">Bonus (${bonusMonths} tháng lương)</td>
        <td class="col-old">${formatMoney(yearly.bonusGross)}</td>
        <td class="col-new">${formatMoney(yearly.bonusGross)}</td>
      </tr>
      <tr>
        <td class="col-label">Tổng thu nhập Gross/năm</td>
        <td class="col-old">${formatMoney(yearly.yearlyGross)}</td>
        <td class="col-new">${formatMoney(yearly.yearlyGross)}</td>
      </tr>
      <tr class="info-row">
        <td class="col-label">└ Tổng BH bắt buộc/năm</td>
        <td>${formatMoney(yearly.yearlyInsurance)}</td>
        <td>${formatMoney(yearly.yearlyInsurance)}</td>
      </tr>
      <tr class="info-row">
        <td class="col-label">└ Tổng giảm trừ/năm</td>
        <td>${formatMoney(yearly.yearlyDeductionOld)}</td>
        <td>${formatMoney(yearly.yearlyDeductionNew)}</td>
      </tr>
      <tr>
        <td class="col-label">Thu nhập tính thuế/năm</td>
        <td class="col-old">${formatMoney(yearly.yearlyTaxableOld)}</td>
        <td class="col-new">${formatMoney(yearly.yearlyTaxableNew)}</td>
      </tr>
      <tr>
        <td class="col-label">Thuế TNCN cả năm</td>
        <td class="col-old">${formatMoney(yearly.yearlyTaxOld)}</td>
        <td class="col-new">${formatMoney(yearly.yearlyTaxNew)}</td>
      </tr>
      <tr>
        <td class="col-label">Thu nhập NET cả năm</td>
        <td class="col-old">${formatMoney(yearly.yearlyNetOld)}</td>
        <td class="col-new">${formatMoney(yearly.yearlyNetNew)}</td>
      </tr>
      <tr class="highlight-row">
        <td class="col-label">💰 TIỀN THUẾ GIẢM/NĂM</td>
        <td colspan="2" class="saved-value" style="text-align: center;">
          ${yearly.yearlySaved >= 0 ? '+' : ''}${formatMoney(yearly.yearlySaved)}
        </td>
      </tr>
    `;
    document.getElementById('yearlySection').classList.add('show');
  } else {
    document.getElementById('yearlySection').classList.remove('show');
  }

  document.getElementById('employerSection').classList.add('show');
  document.getElementById('breakdownSection').classList.add('show');
  document.getElementById('refundSection').classList.add('show');
  document.getElementById('resultSection').classList.add('show');
}

// Toggle Gross/Net/Net-as-Gross
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    incomeType = this.dataset.type;

    const label = document.getElementById('incomeLabel');
    const labels = {
      'gross': 'Thu nhập Gross (VNĐ/tháng)',
      'net': 'Thu nhập Net (VNĐ/tháng)',
      'net-as-gross': 'Net làm Gross (VNĐ/tháng)',
    };
    label.textContent = labels[incomeType];
    
    // Show/hide scenario toggle for Net mode
    const scenarioToggle = document.getElementById('scenarioToggle');
    if (scenarioToggle) {
      scenarioToggle.style.display = incomeType === 'net' ? 'flex' : 'none';
    }
  });
});

// Scenario toggle (keep-gross vs keep-net)
document.querySelectorAll('.scenario-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    netScenario = this.dataset.scenario;
    
    // Re-calculate if result is showing
    if (document.getElementById('resultSection').classList.contains('show')) {
      calculate();
    }
  });
});

// Format input on type
document.getElementById('incomeInput').addEventListener('input', function() {
  const raw = this.value.replace(/[^\d]/g, '');
  if (raw) {
    this.value = parseInt(raw, 10).toLocaleString('vi-VN');
  }
});

// Format compare input on change (live formatting)
document.getElementById('compareInput').addEventListener('input', function() {
  const val = this.value;
  
  // Don't format if empty or user is typing separator
  if (!val || val.endsWith(';') || val.endsWith(',') || val.endsWith(' ')) return;
  
  // Split by ; or , and format each part
  const parts = val.split(/\s*[;,]\s*/);
  const lastPart = parts[parts.length - 1];
  
  // Only format completed parts, leave last part as-is for typing
  const formatted = parts.slice(0, -1).map(p => {
    const num = parseInt(p.replace(/[^\d]/g, ''), 10);
    return isNaN(num) ? '' : num.toLocaleString('vi-VN');
  }).filter(p => p);
  
  // Format last part only if it has digits
  const lastRaw = lastPart.replace(/[^\d]/g, '');
  if (lastRaw) {
    formatted.push(parseInt(lastRaw, 10).toLocaleString('vi-VN'));
  }
  
  if (formatted.length > 0) {
    this.value = formatted.join(' ; ');
  }
});

// Enter to calculate
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') calculate();
  });
});

// Update BHTN cap display when region changes
function updateBhtnCapDisplay() {
  const region = getRegion();
  const cap = TAX_CONFIG.bhtnCaps[region];
  const capStr = (cap / 1_000_000).toFixed(1) + 'M';
  document.getElementById('bhtnCapDisplay').textContent = capStr;
}

document.getElementById('region').addEventListener('change', updateBhtnCapDisplay);
updateBhtnCapDisplay(); // init

// Toggle region note modal
function toggleRegionNote() {
  const modal = document.getElementById('regionModal');
  modal.classList.toggle('show');
}

// Close modal on backdrop click
document.getElementById('regionModal').addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('show');
  }
});

// URL params handling
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    income: params.get('income'),
    type: params.get('type') || 'gross',
    dependents: params.get('dep'),
    region: params.get('region'),
    bonus: params.get('bonus'),
  };
}

function setUrlParams(income, type, dependents, region, bonus) {
  const params = new URLSearchParams();
  params.set('income', income);
  params.set('type', type);
  params.set('dep', dependents);
  params.set('region', region);
  if (bonus > 0) params.set('bonus', bonus);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
}

function copyShareUrl() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = document.getElementById('shareBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Đã copy!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  });
}

async function exportAsImage() {
  const resultSection = document.getElementById('resultSection');
  if (!resultSection.classList.contains('show')) {
    alert('Vui lòng tính thuế trước khi xuất ảnh');
    return;
  }
  
  try {
    // Capture result + breakdown sections
    const container = document.createElement('div');
    container.style.cssText = 'background: #0f172a; padding: 20px; width: fit-content;';
    
    const sections = ['resultSection', 'breakdownSection', 'yearlySection'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.classList.contains('show')) {
        container.appendChild(el.cloneNode(true));
      }
    });
    
    document.body.appendChild(container);
    
    const canvas = await html2canvas(container, {
      backgroundColor: '#0f172a',
      scale: 2,
    });
    
    document.body.removeChild(container);
    
    // Download
    const link = document.createElement('a');
    link.download = `thue-tncn-${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Export failed:', err);
    alert('Xuất ảnh thất bại. Vui lòng thử lại.');
  }
}

function initFromUrl() {
  const params = getUrlParams();
  if (params.income) {
    document.getElementById('incomeInput').value = parseInt(params.income, 10).toLocaleString('vi-VN');
    
    // Set income type
    if (params.type && ['gross', 'net'].includes(params.type)) {
      incomeType = params.type;
      document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === params.type);
      });
      const labels = {
        'gross': 'Thu nhập Gross (VNĐ/tháng)',
        'net': 'Thu nhập Net (VNĐ/tháng)',
      };
      document.getElementById('incomeLabel').textContent = labels[params.type];
    }
    
    if (params.dependents) {
      document.getElementById('dependents').value = params.dependents;
    }
    if (params.region) {
      document.getElementById('region').value = params.region;
      updateBhtnCapDisplay();
    }
    if (params.bonus) {
      document.getElementById('bonusMonths').value = params.bonus;
    }
    
    // Auto calculate
    setTimeout(calculate, 100);
  }
}

// Tab switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
}

// Compare multiple salaries
function compareMultiple() {
  const input = document.getElementById('compareInput').value;
  const dependents = parseInt(document.getElementById('compareDependents').value, 10) || 0;
  
  // Parse input: support both ";" and "," as separators
  const salaries = input
    .split(/[;,]/)
    .map(s => parseInt(s.replace(/[^\d]/g, ''), 10))
    .filter(n => n > 0)
    .slice(0, 5); // Max 5 salaries
  
  if (salaries.length < 2) {
    alert('Vui lòng nhập ít nhất 2 mức lương để so sánh');
    return;
  }
  
  // Calculate for each salary
  const results = salaries.map(gross => {
    const r = calculatePIT(gross, dependents);
    return { gross, ...r };
  });
  
  // Render comparison table
  renderCompareTable(results, dependents);
}

function renderCompareTable(results, dependents) {
  const headRow = `
    <tr>
      <th>Mục</th>
      ${results.map(r => `<th>${formatMoney(r.gross).replace(' ₫', '')}</th>`).join('')}
    </tr>
  `;
  document.getElementById('compareHead').innerHTML = headRow;
  
  const rows = [
    { label: 'Thu nhập Gross', key: 'grossIncome' },
    { label: 'Tổng BH (10.5%)', key: 'insurance' },
    { label: 'Giảm trừ bản thân', getValue: () => TAX_CONFIG.personalDeduction.new },
    { label: `Giảm trừ NPT (×${dependents})`, getValue: () => TAX_CONFIG.dependentDeduction.new * dependents },
    { label: 'Thu nhập tính thuế', key: 'taxableNew' },
    { label: 'Thuế TNCN (2026)', key: 'taxNew', highlight: true },
    { label: 'Thu nhập NET', key: 'netNew', highlight: true },
  ];
  
  let html = rows.map(row => {
    const cells = results.map(r => {
      const value = row.key ? r[row.key] : row.getValue(r);
      return `<td class="${row.highlight ? 'col-new' : ''}">${formatMoney(value)}</td>`;
    }).join('');
    return `
      <tr class="${row.highlight ? 'highlight-row' : ''}">
        <td class="col-label">${row.label}</td>
        ${cells}
      </tr>
    `;
  }).join('');
  
  // Add difference row (compared to first salary)
  const firstNet = results[0].netNew;
  const diffCells = results.map((r, i) => {
    if (i === 0) return '<td>—</td>';
    const diff = r.netNew - firstNet;
    const sign = diff >= 0 ? '+' : '';
    return `<td class="saved-value">${sign}${formatMoney(diff)}</td>`;
  }).join('');
  
  html += `
    <tr class="highlight-row">
      <td class="col-label">💰 Chênh lệch NET</td>
      ${diffCells}
    </tr>
  `;
  
  document.getElementById('compareBody2').innerHTML = html;
  document.getElementById('compareSection').classList.add('show');
  
  // Scroll to results
  document.getElementById('compareSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Init from URL on page load
initFromUrl();

// Expose to global for onclick handlers
window.calculate = calculate;
window.toggleRegionNote = toggleRegionNote;
window.copyShareUrl = copyShareUrl;
window.switchTab = switchTab;
window.compareMultiple = compareMultiple;
window.loadFromHistory = loadFromHistory;
window.setHistoryEnabled = setHistoryEnabled;
window.clearHistory = clearHistory;
window.confirmClearHistory = confirmClearHistory;
window.exportAsImage = exportAsImage;

// Init history on load
document.addEventListener('DOMContentLoaded', renderHistory);

