// ============================================================
// GLOBAL STATE
// ============================================================
const months = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const denominations = {
  coins: [2.00, 1.00, 0.25, 0.10, 0.05, 0.01],
  bills: [5, 10, 20, 50, 100]
};

let currentDepositData = {
  month: null,
  days: Array(7).fill(null).map(() => ({
    dayName: '',
    posSalesTotal: 0,
    coins: {},
    bills: {},
    cardsDebit: 0,
    cardsVisa: 0,
    cardsMastercard: 0,
    cardsEFT: 0,
    cardsDD: 0,
    cheques: []
  }))
};

let datePickerContext = { field: null };

// ============================================================
// NAVIGATION & UI
// ============================================================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  event.target.classList.add('active');
  
  const titles = {
    'dashboard': 'Dashboard',
    'deposit': 'Weekly Deposit Entry',
    'pettycash': 'Weekly Petty Cash Count',
    'history': 'Records History',
    'settings': 'Settings'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}

// ============================================================
// WEEKLY DEPOSIT FUNCTIONS
// ============================================================
function populateMonthSelectors() {
  const depositSelect = document.getElementById('depositMonth');
  const pettycashSelect = document.getElementById('pettycashMonth');
  
  depositSelect.innerHTML = '<option value="">-- Select Month --</option>';
  pettycashSelect.innerHTML = '<option value="">-- Select Month --</option>';
  
  months.forEach((month, index) => {
    const monthNumber = String(index).padStart(2, '0');
    const option1 = document.createElement('option');
    option1.value = monthNumber;
    option1.textContent = month;
    depositSelect.appendChild(option1.cloneNode(true));
    
    const option2 = option1.cloneNode(true);
    pettycashSelect.appendChild(option2);
  });
  
  const today = new Date();
  const currentMonth = String(today.getMonth()).padStart(2, '0');
  depositSelect.value = currentMonth;
}

function updateDepositUI() {
  const monthNum = document.getElementById('depositMonth').value;
  if (!monthNum) {
    document.getElementById('depositDaysContainer').innerHTML = '';
    return;
  }

  let html = '';
  for (let day = 0; day < 7; day++) {
    const dayName = dayNames[day];
    html += `
      <div class="day-section">
        <div class="day-header">
          <span>${dayName}</span>
          <span id="dayTotal${day}">$0.00</span>
        </div>

        <!-- POS Sales Total for Day -->
        <div class="form-group">
          <label>POS Sales Total:</label>
          <input type="number" id="dayPOS${day}" step="0.01" min="0" value="0" 
                 onchange="calculateDeposit()">
        </div>

        <!-- COINS TABLE -->
        <h4 style="margin: 15px 0 10px 0; color: var(--text);">💵 Coins</h4>
        <table class="table">
          <thead>
            <tr>
              <th>Denomination</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody id="coinsTbody${day}">
          </tbody>
        </table>

        <!-- BILLS TABLE -->
        <h4 style="margin: 15px 0 10px 0; color: var(--text);">💵 Bills</h4>
        <table class="table">
          <thead>
            <tr>
              <th>Denomination</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody id="billsTbody${day}">
          </tbody>
        </table>

        <!-- CARDS/EFT/DD -->
        <h4 style="margin: 15px 0 10px 0; color: var(--text);">💳 Cards/EFT/DD</h4>
        <div class="denomination-row">
          <label>Debit:</label>
          <input type="number" id="cardDebit${day}" step="0.01" min="0" value="0" 
                 onchange="calculateDeposit()">
        </div>
        <div class="denomination-row">
          <label>Visa:</label>
          <input type="number" id="cardVisa${day}" step="0.01" min="0" value="0" 
                 onchange="calculateDeposit()">
        </div>
        <div class="denomination-row">
          <label>Mastercard:</label>
          <input type="number" id="cardMC${day}" step="0.01" min="0" value="0" 
                 onchange="calculateDeposit()">
        </div>
        <div class="denomination-row">
          <label>EFT:</label>
          <input type="number" id="cardEFT${day}" step="0.01" min="0" value="0" 
                 onchange="calculateDeposit()">
        </div>
        <div class="denomination-row">
          <label>Direct Deposit:</label>
          <input type="number" id="cardDD${day}" step="0.01" min="0" value="0" 
                 onchange="calculateDeposit()">
        </div>

        <!-- CHEQUES -->
        <h4 style="margin: 15px 0 10px 0; color: var(--text);">✓ Cheques</h4>
        <div id="chequesList${day}"></div>
        <div style="margin: 10px 0;">
          <div class="form-row">
            <div class="form-group">
              <label>Cheque #:</label>
              <input type="text" id="chequeNum${day}" placeholder="e.g., 001">
            </div>
            <div class="form-group">
              <label>Payee:</label>
              <input type="text" id="chequeName${day}" placeholder="Payee name">
            </div>
          </div>
          <div class="form-group">
            <label>Amount:</label>
            <input type="number" id="chequeAmt${day}" step="0.01" min="0" placeholder="0.00">
          </div>
          <button class="btn-secondary btn-sm" onclick="addCheque(${day})" style="width: 100%;">+ Add Cheque</button>
        </div>
        <div id="chequeTotalBox${day}"></div>

        <div class="day-total">Day Total: <span id="dayTotalAmt${day}">$0.00</span></div>
      </div>
    `;
  }
  
  document.getElementById('depositDaysContainer').innerHTML = html;

  // Build coin/bill tables for each day
  for (let day = 0; day < 7; day++) {
    const coinsTbody = document.getElementById(`coinsTbody${day}`);
    const billsTbody = document.getElementById(`billsTbody${day}`);
    
    // Coins
    denominations.coins.forEach(denom => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>$${denom.toFixed(2)}</td>
        <td><input type="number" id="coin${day}_${denom}" min="0" value="0" 
                   onchange="calculateDeposit()" style="width: 80px;"></td>
        <td id="coinAmt${day}_${denom}">$0.00</td>
      `;
      coinsTbody.appendChild(row);
    });
    
    // Bills
    denominations.bills.forEach(denom => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>$${denom.toFixed(2)}</td>
        <td><input type="number" id="bill${day}_${denom}" min="0" value="0" 
                   onchange="calculateDeposit()" style="width: 80px;"></td>
        <td id="billAmt${day}_${denom}">$0.00</td>
      `;
      billsTbody.appendChild(row);
    });
  }
  
  currentDepositData.month = monthNum;
  calculateDeposit();
}

function addCheque(dayIndex) {
  const chequeNum = document.getElementById(`chequeNum${dayIndex}`).value;
  const chequeName = document.getElementById(`chequeName${dayIndex}`).value;
  const chequeAmt = parseFloat(document.getElementById(`chequeAmt${dayIndex}`).value) || 0;

  if (!chequeNum || !chequeName || chequeAmt <= 0) {
    alert('Please fill in all cheque fields');
    return;
  }

  if (!currentDepositData.days[dayIndex].cheques) {
    currentDepositData.days[dayIndex].cheques = [];
  }
  
  currentDepositData.days[dayIndex].cheques.push({
    number: chequeNum,
    payee: chequeName,
    amount: chequeAmt
  });

  displayCheques(dayIndex);
  document.getElementById(`chequeNum${dayIndex}`).value = '';
  document.getElementById(`chequeName${dayIndex}`).value = '';
  document.getElementById(`chequeAmt${dayIndex}`).value = '';
  calculateDeposit();
}

function displayCheques(dayIndex) {
  const list = document.getElementById(`chequesList${dayIndex}`);
  const totalBox = document.getElementById(`chequeTotalBox${dayIndex}`);
  list.innerHTML = '';
  
  if (!currentDepositData.days[dayIndex].cheques || currentDepositData.days[dayIndex].cheques.length === 0) {
    totalBox.innerHTML = '';
    return;
  }

  let total = 0;
  currentDepositData.days[dayIndex].cheques.forEach((cheque, idx) => {
    total += cheque.amount;
    list.innerHTML += `
      <div class="cheque-entry">
        <div>
          <strong>Cheque #${cheque.number}</strong> - ${cheque.payee}<br>
          <span class="text-muted">${formatCurrency(cheque.amount)}</span>
        </div>
        <button class="btn-danger btn-sm" onclick="removeCheque(${dayIndex}, ${idx})">Remove</button>
      </div>
    `;
  });

  totalBox.innerHTML = `
    <div class="summary-box" style="margin: 10px 0; padding: 10px;">
      <strong>Cheques Total: ${formatCurrency(total)}</strong>
    </div>
  `;
}

function removeCheque(dayIndex, chequeIdx) {
  currentDepositData.days[dayIndex].cheques.splice(chequeIdx, 1);
  displayCheques(dayIndex);
  calculateDeposit();
}

function calculateDeposit() {
  let weeklyPOSTotal = 0;
  let weeklyCashTotal = 0;
  let weeklyCardsTotal = 0;
  let weeklyChequeTotal = 0;

  for (let day = 0; day < 7; day++) {
    let dayPOS = parseFloat(document.getElementById(`dayPOS${day}`).value) || 0;
    currentDepositData.days[day].posSalesTotal = dayPOS;
    weeklyPOSTotal += dayPOS;

    // Coins
    let dayCoinsTotal = 0;
    denominations.coins.forEach(denom => {
      const qty = parseFloat(document.getElementById(`coin${day}_${denom}`).value) || 0;
      const amt = qty * denom;
      dayCoinsTotal += amt;
      document.getElementById(`coinAmt${day}_${denom}`).textContent = formatCurrency(amt);
    });

    // Bills
    let dayBillsTotal = 0;
    denominations.bills.forEach(denom => {
      const qty = parseFloat(document.getElementById(`bill${day}_${denom}`).value) || 0;
      const amt = qty * denom;
      dayBillsTotal += amt;
      document.getElementById(`billAmt${day}_${denom}`).textContent = formatCurrency(amt);
    });

    let dayCashTotal = dayCoinsTotal + dayBillsTotal;
    currentDepositData.days[day].cashTotal = dayCashTotal;
    weeklyCashTotal += dayCashTotal;

    // Cards/EFT/DD
    const debit = parseFloat(document.getElementById(`cardDebit${day}`).value) || 0;
    const visa = parseFloat(document.getElementById(`cardVisa${day}`).value) || 0;
    const mc = parseFloat(document.getElementById(`cardMC${day}`).value) || 0;
    const eft = parseFloat(document.getElementById(`cardEFT${day}`).value) || 0;
    const dd = parseFloat(document.getElementById(`cardDD${day}`).value) || 0;
    let dayCardsTotal = debit + visa + mc + eft + dd;
    currentDepositData.days[day].cardsTotal = dayCardsTotal;
    weeklyCardsTotal += dayCardsTotal;

    // Cheques
    let dayChequeTotal = 0;
    if (currentDepositData.days[day].cheques && currentDepositData.days[day].cheques.length > 0) {
      dayChequeTotal = currentDepositData.days[day].cheques.reduce((sum, c) => sum + c.amount, 0);
    }
    weeklyChequeTotal += dayChequeTotal;

    // Day total
    const dayTotal = dayPOS + dayCashTotal + dayCardsTotal + dayChequeTotal;
    document.getElementById(`dayTotal${day}`).textContent = formatCurrency(dayTotal);
    document.getElementById(`dayTotalAmt${day}`).textContent = formatCurrency(dayTotal);
  }

  // Weekly totals
  document.getElementById('weeklyPOSTotal').textContent = formatCurrency(weeklyPOSTotal);
  document.getElementById('weeklyCashTotal').textContent = formatCurrency(weeklyCashTotal);
  document.getElementById('weeklyCardsTotal').textContent = formatCurrency(weeklyCardsTotal);
  document.getElementById('weeklyChequeTotal').textContent = formatCurrency(weeklyChequeTotal);
  
  const totalDeposit = weeklyPOSTotal + weeklyCashTotal + weeklyCardsTotal + weeklyChequeTotal;
  document.getElementById('totalDeposit').textContent = formatCurrency(totalDeposit);
}

function clearDeposit() {
  document.getElementById('depositMonth').value = '';
  document.getElementById('depositDaysContainer').innerHTML = '';
  currentDepositData = {
    month: null,
    days: Array(7).fill(null).map(() => ({
      dayName: '',
      posSalesTotal: 0,
      coins: {},
      bills: {},
      cardsDebit: 0,
      cardsVisa: 0,
      cardsMastercard: 0,
      cardsEFT: 0,
      cardsDD: 0,
      cheques: []
    }))
  };
}

function saveDeposit() {
  if (!currentDepositData.month) {
    alert('Please select a month');
    return;
  }
  alert('Deposit saved! (Integration with main.js IPC pending)');
}

function printDeposit() {
  alert('Print functionality coming soon');
}

// ============================================================
// DATE PICKER
// ============================================================
function openDepositDatePicker() {
  datePickerContext.field = 'deposit';
  const today = new Date();
  document.getElementById('dpMonth').value = today.getMonth();
  document.getElementById('dpDay').value = today.getDate();
  document.getElementById('dpYear').value = today.getFullYear();
  document.getElementById('datePickerModal').classList.add('active');
}

function openPettyCashDatePicker() {
  datePickerContext.field = 'pettycash';
  const today = new Date();
  document.getElementById('dpMonth').value = today.getMonth();
  document.getElementById('dpDay').value = today.getDate();
  document.getElementById('dpYear').value = today.getFullYear();
  document.getElementById('datePickerModal').classList.add('active');
}

function closeDatePickerModal() {
  document.getElementById('datePickerModal').classList.remove('active');
}

function confirmDateSelection() {
  const month = String(parseInt(document.getElementById('dpMonth').value)).padStart(2, '0');
  
  if (datePickerContext.field === 'deposit') {
    document.getElementById('depositMonth').value = month;
    updateDepositUI();
  } else if (datePickerContext.field === 'pettycash') {
    document.getElementById('pettycashMonth').value = month;
    updatePettyCashUI();
  }
  
  closeDatePickerModal();
}

// ============================================================
// PETTY CASH FUNCTIONS (SINGLE WEEKLY COUNT)
// ============================================================
function updatePettyCashUI() {
  const monthNum = document.getElementById('pettycashMonth').value;
  if (!monthNum) {
    return;
  }
  
  const pcFloat = parseFloat(document.getElementById('pettyCashFloat').value) || 200;
  document.getElementById('pcFloatAmount').textContent = formatCurrency(pcFloat);

  // Build coin table
  const coinsTbody = document.getElementById('pcCoinsTable');
  coinsTbody.innerHTML = '';
  denominations.coins.forEach(denom => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>$${denom.toFixed(2)}</td>
      <td><input type="number" id="pcCoin_${denom}" min="0" value="0" 
                 onchange="calculatePettyCash()" style="width: 80px;"></td>
      <td id="pcCoinAmt_${denom}">$0.00</td>
    `;
    coinsTbody.appendChild(row);
  });

  // Build bill table
  const billsTbody = document.getElementById('pcBillsTable');
  billsTbody.innerHTML = '';
  denominations.bills.forEach(denom => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>$${denom.toFixed(2)}</td>
      <td><input type="number" id="pcBill_${denom}" min="0" value="0" 
                 onchange="calculatePettyCash()" style="width: 80px;"></td>
      <td id="pcBillAmt_${denom}">$0.00</td>
    `;
    billsTbody.appendChild(row);
  });

  calculatePettyCash();
}

function calculatePettyCash() {
  const pcFloat = parseFloat(document.getElementById('pettyCashFloat').value) || 200;

  let totalCoins = 0;
  denominations.coins.forEach(denom => {
    const qty = parseFloat(document.getElementById(`pcCoin_${denom}`).value) || 0;
    const amt = qty * denom;
    totalCoins += amt;
    document.getElementById(`pcCoinAmt_${denom}`).textContent = formatCurrency(amt);
  });

  let totalBills = 0;
  denominations.bills.forEach(denom => {
    const qty = parseFloat(document.getElementById(`pcBill_${denom}`).value) || 0;
    const amt = qty * denom;
    totalBills += amt;
    document.getElementById(`pcBillAmt_${denom}`).textContent = formatCurrency(amt);
  });

  const totalCash = totalCoins + totalBills;
  const variance = totalCash - pcFloat;

  document.getElementById('pcTotalCoins').textContent = formatCurrency(totalCoins);
  document.getElementById('pcTotalBills').textContent = formatCurrency(totalBills);
  document.getElementById('pcTotalCash').textContent = formatCurrency(totalCash);
  document.getElementById('pcVariance').textContent = formatCurrency(variance);
}

function savePettyCash() {
  alert('Petty cash saved! (Integration with main.js IPC pending)');
}

function printPettyCash() {
  alert('Print functionality coming soon');
}

function clearPettyCash() {
  document.getElementById('pettycashMonth').value = '';
  denominations.coins.forEach(denom => {
    const el = document.getElementById(`pcCoin_${denom}`);
    if (el) el.value = '0';
  });
  denominations.bills.forEach(denom => {
    const el = document.getElementById(`pcBill_${denom}`);
    if (el) el.value = '0';
  });
  calculatePettyCash();
}

// ============================================================
// HISTORY & SETTINGS (PLACEHOLDERS)
// ============================================================
function loadHistory() {
  alert('History loading (DB integration pending)');
}

function archiveYear() {
  alert('Archive functionality (DB integration pending)');
}

function saveSettings() {
  alert('Settings saved (IPC to main.js pending)');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  populateMonthSelectors();
  
  // Pre-populate petty cash float from settings
  const pcFloat = localStorage.getItem('pettyCashFloat') || '200.00';
  document.getElementById('pettyCashFloat').value = pcFloat;
});
