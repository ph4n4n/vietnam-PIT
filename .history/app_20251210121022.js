// Province/City to default region mapping (based on 01/07/2024 regulations)
const PROVINCES = {
  // Vùng I - Major cities
  'TP. Hồ Chí Minh': 1,
  'Hà Nội': 1,
  'Hải Phòng': 1,
  'Quảng Ninh': 1,
  'Đồng Nai': 1,
  'Bình Dương': 1,
  'Long An': 1,
  'Tây Ninh': 1,

  // Vùng II
  'Đà Nẵng': 2,
  'Cần Thơ': 2,
  'Bắc Ninh': 2,
  'Hưng Yên': 2,
  'Vĩnh Phúc': 2,
  'Thái Nguyên': 2,
  'Khánh Hòa': 2,
  'Lâm Đồng': 2,
  'Ninh Bình': 2,
  'Thanh Hóa': 2,
  'Nghệ An': 2,
  'Bà Rịa - Vũng Tàu': 2,
  'Bến Tre': 2,
  'Tiền Giang': 2,
  'Vĩnh Long': 2,
  'Đồng Tháp': 2,
  'An Giang': 2,
  'Kiên Giang': 2,
  'Cà Mau': 2,
  'Bạc Liêu': 2,
  'Sóc Trăng': 2,
  'Trà Vinh': 2,
  'Phú Thọ': 2,

  // Vùng III
  'Lào Cai': 3,
  'Lạng Sơn': 3,
  'Tuyên Quang': 3,
  'Thái Bình': 3,
  'Nam Định': 3,
  'Hà Nam': 3,
  'Hà Tĩnh': 3,
  'Quảng Bình': 3,
  'Quảng Trị': 3,
  'Thừa Thiên Huế': 3,
  'Quảng Nam': 3,
  'Quảng Ngãi': 3,
  'Bình Định': 3,
  'Phú Yên': 3,
  'Ninh Thuận': 3,
  'Bình Thuận': 3,
  'Kon Tum': 3,
  'Gia Lai': 3,
  'Đắk Lắk': 3,
  'Đắk Nông': 3,
  'Bình Phước': 3,
  'Tây Ninh (vùng xa)': 3,
  'Hậu Giang': 3,

  // Vùng IV
  'Cao Bằng': 4,
  'Bắc Kạn': 4,
  'Hà Giang': 4,
  'Yên Bái': 4,
  'Lai Châu': 4,
  'Điện Biên': 4,
  'Sơn La': 4,
  'Hòa Bình': 4,
  'Lạng Sơn (vùng xa)': 4,
};

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
  bhxhCompany: { rate: 0.175, cap: 46_800_000 },
  bhytCompany: { rate: 0.03, cap: 46_800_000 },
  bhtnCompany: { rate: 0.01 },  // cap depends on region

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

  // Tax when paying full (no family deduction, only insurance)
  const taxNoDeductOld = calculateProgressiveTax(incomeAfterInsurance, cfg.bracketsOld);
  const taxNoDeductNew = calculateProgressiveTax(incomeAfterInsurance, cfg.bracketsNew);

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
    taxNoDeductOld,
    taxNoDeductNew,
    taxSaved: taxOld - taxNew,
    netOld: grossIncome - insurance - taxOld,
    netNew: grossIncome - insurance - taxNew,
  };
}

// Binary search: find Gross from Net (using OLD tax as reference)
function netToGross(targetNet, dependents) {
  let low = targetNet;
  let high = targetNet * 2;
  const tolerance = 1000;

  for (let i = 0; i < 50; i++) {
    const mid = Math.floor((low + high) / 2);
    const result = calculatePIT(mid, dependents);
    const netOld = result.netOld;

    if (Math.abs(netOld - targetNet) < tolerance) {
      return mid;
    }

    if (netOld < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.floor((low + high) / 2);
}

function formatMoney(n) {
  return n.toLocaleString('vi-VN') + ' ₫';
}

// Calculate company insurance
function calcCompanyInsurance(income) {
  const cfg = TAX_CONFIG;
  const bhtnCap = getBhtnCap();
  return calcInsurance(income, cfg.bhxhCompany.rate, cfg.bhxhCompany.cap)
       + calcInsurance(income, cfg.bhytCompany.rate, cfg.bhytCompany.cap)
       + calcInsurance(income, cfg.bhtnCompany.rate, bhtnCap);
}

// N→G mode: Net thực nhận = input, thuế tính trên input (thay vì Gross thực)
function renderNetAsGross(netAmount, dependents) {
  // Cách tính sai: lấy Net làm Gross
  const wrong = calculatePIT(netAmount, dependents);

  // Cách tính đúng: tìm Gross thực từ Net
  const realGross = netToGross(netAmount, dependents);
  const correct = calculatePIT(realGross, dependents);

  // Chi phí công ty (Gross + BH công ty)
  const wrongCompanyBH = calcCompanyInsurance(netAmount);
  const wrongCompanyCost = netAmount + wrongCompanyBH + wrong.taxOld;

  const correctCompanyBH = calcCompanyInsurance(realGross);
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

  if (inputValue <= 0) {
    alert('Vui lòng nhập thu nhập hợp lệ');
    return;
  }

  // Handle N→G mode separately
  if (incomeType === 'net-as-gross') {
    renderNetAsGross(inputValue, dependents);
    return;
  }

  // Convert based on income type
  let grossIncome;
  if (incomeType === 'net') {
    grossIncome = netToGross(inputValue, dependents);
  } else {
    grossIncome = inputValue;
  }

  const r = calculatePIT(grossIncome, dependents);

  // Reset header for normal modes
  document.querySelector('#resultSection .result-header h2').textContent = '📊 Kết quả tính thuế';
  document.querySelector('#resultSection thead').innerHTML = `
    <tr>
      <th>Mục</th>
      <th>2025 (Hiện hành)</th>
      <th>2026 (Dự thảo)</th>
    </tr>
  `;

  const rows = [
    { label: 'Thu nhập Gross', old: formatMoney(r.grossIncome), new: formatMoney(r.grossIncome) },
    { label: '└ BHXH (8%)', old: formatMoney(r.bhxh), new: formatMoney(r.bhxh), info: true },
    { label: '└ BHYT (1.5%)', old: formatMoney(r.bhyt), new: formatMoney(r.bhyt), info: true },
    { label: '└ BHTN (1%)', old: formatMoney(r.bhtn), new: formatMoney(r.bhtn), info: true },
    { label: 'Tổng BH bắt buộc (10.5%)', old: formatMoney(r.insurance), new: formatMoney(r.insurance) },
    { label: 'Thu nhập chịu thuế', old: formatMoney(r.incomeAfterInsurance), new: formatMoney(r.incomeAfterInsurance) },
    { label: '└ Giảm trừ bản thân', old: formatMoney(TAX_CONFIG.personalDeduction.old), new: formatMoney(TAX_CONFIG.personalDeduction.new), info: true },
    { label: `└ Giảm trừ NPT (×${dependents})`, old: formatMoney(TAX_CONFIG.dependentDeduction.old * dependents), new: formatMoney(TAX_CONFIG.dependentDeduction.new * dependents), info: true },
    { label: 'Tổng giảm trừ', old: formatMoney(r.deductionOld), new: formatMoney(r.deductionNew) },
    { label: 'Thu nhập tính thuế', old: formatMoney(r.taxableOld), new: formatMoney(r.taxableNew) },
    { label: 'Thuế TNCN phải nộp', old: formatMoney(r.taxOld), new: formatMoney(r.taxNew) },
    { label: 'Thu nhập NET', old: formatMoney(r.netOld), new: formatMoney(r.netNew) },
  ];

  let html = rows.map(row => `
    <tr class="${row.info ? 'info-row' : ''}">
      <td class="col-label">${row.label}</td>
      <td class="col-old">${row.old}</td>
      <td class="col-new">${row.new}</td>
    </tr>
  `).join('');

  html += `
    <tr class="highlight-row">
      <td class="col-label">💰 TIỀN THUẾ GIẢM/THÁNG</td>
      <td colspan="2" class="saved-value" style="text-align: center;">
        ${r.taxSaved >= 0 ? '+' : ''}${formatMoney(r.taxSaved)}
      </td>
    </tr>
    <tr class="highlight-row">
      <td class="col-label">📅 TIỀN THUẾ GIẢM/NĂM</td>
      <td colspan="2" class="saved-value" style="text-align: center;">
        ${r.taxSaved >= 0 ? '+' : ''}${formatMoney(r.taxSaved * 12)}
      </td>
    </tr>
  `;

  document.getElementById('resultBody').innerHTML = html;

  // Refund section
  const refundOld = r.taxNoDeductOld * 12 - r.taxOld * 12;
  const refundNew = r.taxNoDeductNew * 12 - r.taxNew * 12;

  document.getElementById('refundBody').innerHTML = `
    <tr>
      <td class="col-label">Thuế đóng/tháng (không giảm trừ)</td>
      <td class="col-old">${formatMoney(r.taxNoDeductOld)}</td>
      <td class="col-new">${formatMoney(r.taxNoDeductNew)}</td>
    </tr>
    <tr>
      <td class="col-label">Thuế đóng cả năm (không giảm trừ)</td>
      <td class="col-old">${formatMoney(r.taxNoDeductOld * 12)}</td>
      <td class="col-new">${formatMoney(r.taxNoDeductNew * 12)}</td>
    </tr>
    <tr>
      <td class="col-label">Thuế thực tế cả năm (có giảm trừ)</td>
      <td class="col-old">${formatMoney(r.taxOld * 12)}</td>
      <td class="col-new">${formatMoney(r.taxNew * 12)}</td>
    </tr>
    <tr class="highlight-row refund-row">
      <td class="col-label">🔄 TIỀN HOÀN THUẾ CUỐI NĂM</td>
      <td class="saved-value">${formatMoney(refundOld)}</td>
      <td class="saved-value">${formatMoney(refundNew)}</td>
    </tr>
  `;
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
  });
});

// Format input on type
document.getElementById('incomeInput').addEventListener('input', function() {
  const raw = this.value.replace(/[^\d]/g, '');
  if (raw) {
    this.value = parseInt(raw, 10).toLocaleString('vi-VN');
  }
});

// Enter to calculate
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') calculate();
  });
});

