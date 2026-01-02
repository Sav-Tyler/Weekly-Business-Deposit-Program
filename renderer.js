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

// Debounce helper - wait 300ms after user stops typing
let calculateTimeout;
function debouncedCalculateDailyCashOut() {
    clearTimeout(calculateTimeout);
    calculateTimeout = setTimeout(() => {
        calculateDailyCashOut();
    }, 300);
}

let datePickerContext = { field: null };

// ============================================================
// SETTINGS FUNCTIONS
// ============================================================

function saveSettings() {
    // Save the default daily cash float
    const defaultFloat = document.getElementById('defaultDailyCashFloat')?.value || '0.00';
    localStorage.setItem('defaultDailyCashFloat', defaultFloat);
    
    // Load it into the Daily Cash Out field
    if (document.getElementById('floatAmount')) {
        document.getElementById('floatAmount').value = defaultFloat;
    }
    
    alert('Settings Saved! (Database integration coming in Phase 3)');
}

// ============================================================
// CASHIER MANAGEMENT FUNCTIONS
// ============================================================

let cashiersList = [];

function loadCashiers() {
    cashiersList = JSON.parse(localStorage.getItem('cashiers') || '[]');
    populateCashierDropdown();
    refreshCashierList();
}

function populateCashierDropdown() {
    const select = document.getElementById('cashierName');
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">-- Select Cashier --</option>';
    cashiersList.forEach(cashier => {
        const option = document.createElement('option');
        option.value = cashier;
        option.textContent = cashier;
        select.appendChild(option);
    });
    
    select.value = currentValue;
}

function refreshCashierList() {
    const container = document.getElementById('cashierList');
    container.innerHTML = '';
    
    if (cashiersList.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">No cashiers added yet</div>';
        return;
    }
    
    cashiersList.forEach((cashier, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #eee; background:#f9f9f9; margin-bottom:5px; border-radius:4px;';
        item.innerHTML = `
            <span style="font-size:13px; font-weight:500;">${cashier}</span>
            <button onclick="deleteCashier(${index})" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:11px;">Delete</button>
        `;
        container.appendChild(item);
    });
}

function addCashier() {
    const input = document.getElementById('newCashierInput');
    const name = input.value.trim();
    
    if (!name) {
        alert('Please enter a cashier name');
        return;
    }
    
    if (cashiersList.includes(name)) {
        alert('This cashier already exists');
        return;
    }
    
    cashiersList.push(name);
    input.value = '';
    refreshCashierList();
}

function deleteCashier(index) {
    if (confirm('Delete this cashier?')) {
        cashiersList.splice(index, 1);
        refreshCashierList();
    }
}

function saveCashiers() {
    localStorage.setItem('cashiers', JSON.stringify(cashiersList));
    populateCashierDropdown();
    alert('Cashiers saved successfully!');
    closeCashierManager();
}

function openCashierManager() {
    loadCashiers();
    document.getElementById('cashierModal').style.display = 'block';
}

function closeCashierManager() {
    document.getElementById('cashierModal').style.display = 'none';
}

// Load cashiers when page loads
window.addEventListener('DOMContentLoaded', () => {
    loadCashiers();
});

// ============================================================
// NAVIGATION & UI
// ============================================================
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event.target.classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard',
        deposit: 'Weekly Deposit Entry',
        dailycashout: 'Daily Cash Out Reconciliation',
        pettycash: 'Weekly Petty Cash Count',
        archive: 'Fiscal Archive',
        settings: 'Settings'
    };
    
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';
    
    // LAZY LOAD: Populate float balance only when dailycashout section is shown
    if (sectionId === 'dailycashout') {
        populateFloatBalanceRequired();
    }
}

// ← Make sure formatCurrency is COMPLETE and INTACT here
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}


// ============================================================
// WEEKLY DEPOSIT FUNCTIONS
// ============================================================
function populateMonthSelectors() {
  const depositSelect = document.getElementById('depositMonth');
  const pettycashSelect = document.getElementById('pettycashMonth');
  
  // Exit if these elements don't exist (they're optional)
  if (!depositSelect || !pettycashSelect) {
    return;
  }
  
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
      <div class="day-entry" style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px;">
        <h4>${dayName}</h4>
        
        <div style="margin-bottom: 10px;">
          <label>POS Total Sales</label>
          <input type="number" id="day${day}_posSales" placeholder="0.00" step="0.01">
        </div>

        <div style="margin-bottom: 10px;">
          <h5>Cash</h5>
          <table style="width:100%; border-collapse: collapse;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 5px;">Denomination</th>
              <th style="border: 1px solid #ddd; padding: 5px;">Qty</th>
              <th style="border: 1px solid #ddd; padding: 5px;">Amount</th>
            </tr>`;
    
    denominations.coins.forEach(denom => {
      const denomStr = denom.toFixed(2).replace('$', '').replace(/\./g, '_');
      html += `
            <tr>
              <td style="border: 1px solid #ddd; padding: 5px;">$${denom.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 5px;">
                <input type="number" id="day${day}_coin_${denomStr}" placeholder="0" style="width: 80px;">
              </td>
              <td style="border: 1px solid #ddd; padding: 5px;">$0.00</td>
            </tr>`;
    });

    html += `
          </table>
        </div>

        <div style="margin-bottom: 10px;">
          <h5>Cards & Other</h5>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label>Debit</label>
              <input type="number" id="day${day}_cardsDebit" placeholder="0.00" step="0.01" style="width: 100%;">
            </div>
            <div>
              <label>Visa</label>
              <input type="number" id="day${day}_cardsVisa" placeholder="0.00" step="0.01" style="width: 100%;">
            </div>
            <div>
              <label>Mastercard</label>
              <input type="number" id="day${day}_cardsMastercard" placeholder="0.00" step="0.01" style="width: 100%;">
            </div>
            <div>
              <label>EFT</label>
              <input type="number" id="day${day}_cardsEFT" placeholder="0.00" step="0.01" style="width: 100%;">
            </div>
          </div>
        </div>

        <div>
          <label>Cheques</label>
          <input type="number" id="day${day}_cheques" placeholder="0.00" step="0.01" style="width: 100%;">
        </div>
      </div>`;
  }

  document.getElementById('depositDaysContainer').innerHTML = html;
}

function saveDailyDeposit() {
  const month = document.getElementById('depositMonth').value;
  if (!month) {
    alert('Please select a month');
    return;
  }

  const today = new Date();
  const dateRecorded = today.toISOString().split('T')[0];

  currentDepositData.month = month;

  for (let day = 0; day < 7; day++) {
    const posSales = parseFloat(document.getElementById(`day${day}_posSales`)?.value || 0);
    currentDepositData.days[day].dayName = dayNames[day];
    currentDepositData.days[day].posSalesTotal = posSales;
    currentDepositData.days[day].cardsDebit = parseFloat(document.getElementById(`day${day}_cardsDebit`)?.value || 0);
    currentDepositData.days[day].cardsVisa = parseFloat(document.getElementById(`day${day}_cardsVisa`)?.value || 0);
    currentDepositData.days[day].cardsMastercard = parseFloat(document.getElementById(`day${day}_cardsMastercard`)?.value || 0);
    currentDepositData.days[day].cardsEFT = parseFloat(document.getElementById(`day${day}_cardsEFT`)?.value || 0);
    currentDepositData.days[day].cheques = [parseFloat(document.getElementById(`day${day}_cheques`)?.value || 0)];
  }

  const key = `deposit_${month}_${today.getFullYear()}`;
  localStorage.setItem(key, JSON.stringify(currentDepositData));

  alert('Deposit data saved for ' + months[parseInt(month)]);
}

// ============================================================
// FLOAT COMPOSITION FUNCTIONS
// ============================================================

let floatComposition = {
    coins: { '200': 0, '100': 0, '25': 0, '10': 0, '5': 0, '1': 0 },
    bills: { '5': 0, '10': 0, '20': 0, '50': 0, '100': 0 }
};

function loadFloatComposition() {
    const saved = localStorage.getItem('floatComposition');
    if (saved) {
        floatComposition = JSON.parse(saved);
    }
}

function updateFloatTotal() {
    let total = 0;
    
    // Coins
    total += parseFloat(document.getElementById('floatCoin200').value || 0) * 2.00;
    total += parseFloat(document.getElementById('floatCoin100').value || 0) * 1.00;
    total += parseFloat(document.getElementById('floatCoin25').value || 0) * 0.25;
    total += parseFloat(document.getElementById('floatCoin10').value || 0) * 0.10;
    total += parseFloat(document.getElementById('floatCoin5').value || 0) * 0.05;
    total += parseFloat(document.getElementById('floatCoin1').value || 0) * 0.01;
    
    // Bills
    total += parseFloat(document.getElementById('floatBill5').value || 0) * 5;
    total += parseFloat(document.getElementById('floatBill10').value || 0) * 10;
    total += parseFloat(document.getElementById('floatBill20').value || 0) * 20;
    total += parseFloat(document.getElementById('floatBill50').value || 0) * 50;
    total += parseFloat(document.getElementById('floatBill100').value || 0) * 100;
    
    document.getElementById('floatTotalDisplay').textContent = formatCurrency(total);
}

function openFloatModal() {
    loadFloatComposition();
    
    // Load saved values
    document.getElementById('floatCoin200').value = floatComposition.coins['200'] || 0;
    document.getElementById('floatCoin100').value = floatComposition.coins['100'] || 0;
    document.getElementById('floatCoin25').value = floatComposition.coins['25'] || 0;
    document.getElementById('floatCoin10').value = floatComposition.coins['10'] || 0;
    document.getElementById('floatCoin5').value = floatComposition.coins['5'] || 0;
    document.getElementById('floatCoin1').value = floatComposition.coins['1'] || 0;
    
    document.getElementById('floatBill5').value = floatComposition.bills['5'] || 0;
    document.getElementById('floatBill10').value = floatComposition.bills['10'] || 0;
    document.getElementById('floatBill20').value = floatComposition.bills['20'] || 0;
    document.getElementById('floatBill50').value = floatComposition.bills['50'] || 0;
    document.getElementById('floatBill100').value = floatComposition.bills['100'] || 0;
    
    updateFloatTotal();
    document.getElementById('floatModal').style.display = 'block';
}

function closeFloatModal() {
    document.getElementById('floatModal').style.display = 'none';
}

function saveFloatComposition() {
    // DEBUG: Log the actual input field values BEFORE reading them
    //console.log('=== DEBUG saveFloatComposition ===');
    console.log('floatBill5 input element:', document.getElementById('floatBill5'));
    console.log('floatBill5 value:', document.getElementById('floatBill5').value);
    console.log('floatBill10 value:', document.getElementById('floatBill10').value);
    console.log('floatBill20 value:', document.getElementById('floatBill20').value);
    console.log('floatBill50 value:', document.getElementById('floatBill50').value);
    console.log('floatBill100 value:', document.getElementById('floatBill100').value);
    
    floatComposition.coins = {
        '200': parseInt(document.getElementById('floatCoin200').value || 0),
        '100': parseInt(document.getElementById('floatCoin100').value || 0),
        '25': parseInt(document.getElementById('floatCoin25').value || 0),
        '10': parseInt(document.getElementById('floatCoin10').value || 0),
        '5': parseInt(document.getElementById('floatCoin5').value || 0),
        '1': parseInt(document.getElementById('floatCoin1').value || 0)
    };
    
    floatComposition.bills = {
        '5': parseInt(document.getElementById('floatBill5').value || 0),
        '10': parseInt(document.getElementById('floatBill10').value || 0),
        '20': parseInt(document.getElementById('floatBill20').value || 0),
        '50': parseInt(document.getElementById('floatBill50').value || 0),
        '100': parseInt(document.getElementById('floatBill100').value || 0)
    };
    
    // Debug: Log what we're saving
    //console.log('Saving floatComposition:', floatComposition);
    
    localStorage.setItem('floatComposition', JSON.stringify(floatComposition));
    alert('Float composition saved!');
    
    // Verify it was saved
    //const verify = JSON.parse(localStorage.getItem('floatComposition'));
    //console.log('Verified saved:', verify);
    //console.log('=== END DEBUG ===');
    
    populateFloatBalanceRequired();
    closeFloatModal();
}
// For Float Balanced Required
function populateFloatBalanceRequired() {
    if (!document.getElementById('dailycashout')) {
        return;
    }

    loadFloatComposition();
    console.log('populateFloatBalanceRequired - loaded:', floatComposition);

    // Populate Coins
    const coinDenoms = ['200', '100', '25', '10', '5', '1'];
    coinDenoms.forEach(denom => {
        const el = document.getElementById(`floatAdj_coin${denom}`);
        if (el) {
            const qty = floatComposition.coins[denom] || 0;
            console.log(`Setting floatAdj_coin${denom} = ${qty}`);
            el.value = qty;
        }
    });

    // Populate Bills
    const billDenoms = ['5', '10', '20', '50', '100'];
    billDenoms.forEach(denom => {
        const el = document.getElementById(`floatAdj_bill${denom}`);
        if (el) {
            const qty = floatComposition.bills[denom] || 0;
            console.log(`Setting floatAdj_bill${denom} = ${qty}`);
            el.value = qty;
        }
    });
}

function calculateFloatBalance() {
    if (!document.getElementById('dailycashout')) return;
    
    loadFloatComposition();
    
    // Calculate current coins and bills
    const getNum = (id) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const v = parseFloat(el.value);
        return isNaN(v) ? 0 : v;
    };
    
    let currentCoins = 0;
    currentCoins += getNum('coin200qty') * 2.00;
    currentCoins += getNum('coin100qty') * 1.00;
    currentCoins += getNum('coin25qty') * 0.25;
    currentCoins += getNum('coin10qty') * 0.10;
    currentCoins += getNum('coin5qty') * 0.05;
    currentCoins += getNum('coin1qty') * 0.01;
    
    let currentBills = 0;
    currentBills += getNum('bill5_qty') * 5;
    currentBills += getNum('bill10_qty') * 10;
    currentBills += getNum('bill20_qty') * 20;
    currentBills += getNum('bill50_qty') * 50;
    currentBills += getNum('bill100_qty') * 100;
    
    // Calculate expected float
    let expectedCoins = 0;
    expectedCoins += (floatComposition.coins['200'] || 0) * 2.00;
    expectedCoins += (floatComposition.coins['100'] || 0) * 1.00;
    expectedCoins += (floatComposition.coins['25'] || 0) * 0.25;
    expectedCoins += (floatComposition.coins['10'] || 0) * 0.10;
    expectedCoins += (floatComposition.coins['5'] || 0) * 0.05;
    expectedCoins += (floatComposition.coins['1'] || 0) * 0.01;
    
    let expectedBills = 0;
    expectedBills += (floatComposition.bills['5'] || 0) * 5;
    expectedBills += (floatComposition.bills['10'] || 0) * 10;
    expectedBills += (floatComposition.bills['20'] || 0) * 20;
    expectedBills += (floatComposition.bills['50'] || 0) * 50;
    expectedBills += (floatComposition.bills['100'] || 0) * 100;
    
    // Calculate differences
    const coinDiff = expectedCoins - currentCoins;
    const billDiff = expectedBills - currentBills;
    
    // Update displays
    const coinDiffEl = document.getElementById('floatCoinDiff');
    const billDiffEl = document.getElementById('floatBillDiff');
    
    if (coinDiffEl) {
        if (coinDiff > 0.01) {
            coinDiffEl.value = 'Add ' + formatCurrency(coinDiff);
            coinDiffEl.style.color = '#ef4444';
        } else if (coinDiff < -0.01) {
            coinDiffEl.value = 'Remove ' + formatCurrency(Math.abs(coinDiff));
            coinDiffEl.style.color = '#f59e0b';
        } else {
            coinDiffEl.value = 'Balanced ✓';
            coinDiffEl.style.color = '#10b981';
        }
    }
    
    if (billDiffEl) {
        if (billDiff > 0.01) {
            billDiffEl.value = 'Add ' + formatCurrency(billDiff);
            billDiffEl.style.color = '#ef4444';
        } else if (billDiff < -0.01) {
            billDiffEl.value = 'Remove ' + formatCurrency(Math.abs(billDiff));
            billDiffEl.style.color = '#f59e0b';
        } else {
            billDiffEl.value = 'Balanced ✓';
            billDiffEl.style.color = '#10b981';
        }
    }
}

// ============================================================
// DAILY CASH OUT FUNCTIONS
// ============================================================
loadDailyCashSettings();
// Load default float from settings on page load
function loadDailyCashSettings() {
    const defaultFloat = localStorage.getItem('defaultDailyCashFloat') || '0.00';
    document.getElementById('floatAmount').value = defaultFloat;
}

// Save default float setting when changed
function saveDefaultCashFloat() {
    const defaultFloat = document.getElementById('defaultDailyCashFloat').value;
    localStorage.setItem('defaultDailyCashFloat', defaultFloat);
    document.getElementById('floatAmount').value = defaultFloat;
    alert('Default Daily Cash Float updated to $' + parseFloat(defaultFloat).toFixed(2));
}

function initializeDailyCashOut() {
  const dateInput = document.getElementById('dailyDate');
  if (!dateInput) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;

  dateInput.value = formattedDate;
  calculateDailyCashOut();
}

function calculateDailyCashOut() {
  if (!document.getElementById('dailycashout')) return;

  const getNum = (id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  };

  // 1) Coins
  const coinDefs = {
    'coin200': 2.00,
    'coin100': 1.00,
    'coin25': 0.25,
    'coin10': 0.10,
    'coin5': 0.05,
    'coin1': 0.01
  };

  let totalCoins = 0;
  for (const [baseId, value] of Object.entries(coinDefs)) {
    const qty = getNum(baseId + '_qty');
    const amount = qty * value;
    const amtSpan = document.getElementById(baseId + '_amt');
    if (amtSpan) amtSpan.textContent = formatCurrency(amount);
    totalCoins += amount;
  }
  const totalCoinsSpan = document.getElementById('totalCoins');
  if (totalCoinsSpan) totalCoinsSpan.textContent = formatCurrency(totalCoins);

  // 2) Bills
  const billDefs = {
    'bill5': 5,
    'bill10': 10,
    'bill20': 20,
    'bill50': 50,
    'bill100': 100
  };

  let totalBills = 0;
  for (const [baseId, value] of Object.entries(billDefs)) {
    const qty = getNum(baseId + '_qty');
    const amount = qty * value;
    const amtSpan = document.getElementById(baseId + '_amt');
    if (amtSpan) amtSpan.textContent = formatCurrency(amount);
    totalBills += amount;
  }
  const totalBillsSpan = document.getElementById('totalBills');
  if (totalBillsSpan) totalBillsSpan.textContent = formatCurrency(totalBills);

  // 3) Total cash counted (coins + bills, includes float)
  const totalCashCounted = totalCoins + totalBills;
  const totalCashInput = document.getElementById('totalCashCounted');
  if (totalCashInput) totalCashInput.value = formatCurrency(totalCashCounted);

  // 4) POS / payment inputs
  const cashSales       = getNum('cashSales');       // POS cash sales
  const debitSales      = getNum('debitSales');
  const visaSales       = getNum('visaSales');
  const mastercardSales = getNum('mastercardSales');
  const eftSales        = getNum('eftSales');
  const chequeSales     = getNum('chequeSales');
  const otherSales      = getNum('otherSales');
  const posSales        = getNum('posSales');        // total POS if you use it

  const cardTotal   = debitSales + visaSales + mastercardSales + eftSales;
  const expectedCash  = cashSales;
  const expectedTotal = cashSales + cardTotal + chequeSales + otherSales;

// 5 Float from configured composition
loadFloatComposition();
let expectedFloatAmount = 0;
expectedFloatAmount += (floatComposition.coins['200'] ?? 0) * 2.00;
expectedFloatAmount += (floatComposition.coins['100'] ?? 0) * 1.00;
expectedFloatAmount += (floatComposition.coins['25'] ?? 0) * 0.25;
expectedFloatAmount += (floatComposition.coins['10'] ?? 0) * 0.10;
expectedFloatAmount += (floatComposition.coins['5'] ?? 0) * 0.05;
expectedFloatAmount += (floatComposition.coins['1'] ?? 0) * 0.01;
expectedFloatAmount += (floatComposition.bills['5'] ?? 0) * 5;
expectedFloatAmount += (floatComposition.bills['10'] ?? 0) * 10;
expectedFloatAmount += (floatComposition.bills['20'] ?? 0) * 20;
expectedFloatAmount += (floatComposition.bills['50'] ?? 0) * 50;
expectedFloatAmount += (floatComposition.bills['100'] ?? 0) * 100;

  // 6) Variance: what’s actually in the drawer vs what should be there
  const variance = totalCashCounted - expectedCash - expectedFloatAmount;

  // 7) Update summary cards
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatCurrency(value);
  };

  setText('sumCashCounted', totalCashCounted);
  setText('sumExpectedCash', expectedCash);
  setText('sumCardTotal', cardTotal);
  setText('sumChequeTotal', chequeSales);
  setText('sumExpectedTotal', expectedTotal);
  setText('sumPOSTotal', posSales);

  const varianceEl = document.getElementById('sumVariance');
  if (varianceEl) {
    varianceEl.textContent = formatCurrency(variance);
    if (variance < -0.01) {
      varianceEl.style.color = '#ef4444'; // short
    } else if (variance > 0.01) {
      varianceEl.style.color = '#10b981'; // over
    } else {
      varianceEl.style.color = '#059669'; // balanced
    }
  }

  // 8) Rebuild float breakdown + enforce confirmations
  calculateFloatBalance();
}

// ============================================================
// FLOAT BALANCE + CONFIRMATION
// ============================================================

function calculateFloatBalance() {
  if (!document.getElementById('dailycashout')) return;
  
  loadFloatComposition();
  
  const getNum = (id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  };
  
  // Current cash counts
  let currentCoins = 0;
  currentCoins += getNum('coin200_qty') * 2.00;
  currentCoins += getNum('coin100_qty') * 1.00;
  currentCoins += getNum('coin25_qty') * 0.25;
  currentCoins += getNum('coin10_qty') * 0.10;
  currentCoins += getNum('coin5_qty') * 0.05;
  currentCoins += getNum('coin1_qty') * 0.01;
  
  let currentBills = 0;
  currentBills += getNum('bill5_qty') * 5;
  currentBills += getNum('bill10_qty') * 10;
  currentBills += getNum('bill20_qty') * 20;
  currentBills += getNum('bill50_qty') * 50;
  currentBills += getNum('bill100_qty') * 100;
  
  // Expected float
  let expectedCoins = 0;
  expectedCoins += (floatComposition.coins['200'] || 0) * 2.00;
  expectedCoins += (floatComposition.coins['100'] || 0) * 1.00;
  expectedCoins += (floatComposition.coins['25'] || 0) * 0.25;
  expectedCoins += (floatComposition.coins['10'] || 0) * 0.10;
  expectedCoins += (floatComposition.coins['5'] || 0) * 0.05;
  expectedCoins += (floatComposition.coins['1'] || 0) * 0.01;
  
  let expectedBills = 0;
  expectedBills += (floatComposition.bills['5'] || 0) * 5;
  expectedBills += (floatComposition.bills['10'] || 0) * 10;
  expectedBills += (floatComposition.bills['20'] || 0) * 20;
  expectedBills += (floatComposition.bills['50'] || 0) * 50;
  expectedBills += (floatComposition.bills['100'] || 0) * 100;
  
  const coinDiff = expectedCoins - currentCoins;
  const billDiff = expectedBills - currentBills;
  
  generateFloatBreakdown(coinDiff, billDiff);
  checkFloatConfirmation();
}

function generateFloatBreakdown(coinDiff, billDiff) {
  // Pre-populate the adjustment input fields
  const coinItems = [
    { id: 'floatAdj_coin200', value: 2.00 },
    { id: 'floatAdj_coin100', value: 1.00 },
    { id: 'floatAdj_coin25', value: 0.25 },
    { id: 'floatAdj_coin10', value: 0.10 },
    { id: 'floatAdj_coin5', value: 0.05 },
    { id: 'floatAdj_coin1', value: 0.01 }
  ];

  const billItems = [
    { id: 'floatAdj_bill5', value: 5 },
    { id: 'floatAdj_bill10', value: 10 },
    { id: 'floatAdj_bill20', value: 20 },
    { id: 'floatAdj_bill50', value: 50 },
    { id: 'floatAdj_bill100', value: 100 }
  ];

  const coinsNeeded = getCoinBreakdown(coinDiff, coinItems);
  coinsNeeded.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.value = item.qty;
  });

  const billsNeeded = getBillBreakdown(billDiff, billItems);
  billsNeeded.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.value = item.qty;
  });

  checkFloatConfirmation();
}

function getCoinBreakdown(diff, items) {
  const breakdown = items.map(item => ({ ...item, qty: 0 }));
  let remaining = diff;

  if (remaining > 0.005) { // need to ADD
    for (let i = 0; i < items.length && remaining > 0.005; i++) {
      const needed = Math.floor(remaining / items[i].value);
      if (needed > 0) {
        breakdown[i].qty = needed;
        remaining -= needed * items[i].value;
      }
    }
  } else if (remaining < -0.005) { // need to REMOVE
    remaining = Math.abs(remaining);
    for (let i = 0; i < items.length && remaining > 0.005; i++) {
      const needed = Math.floor(remaining / items[i].value);
      if (needed > 0) {
        breakdown[i].qty = -needed;
        remaining -= needed * items[i].value;
      }
    }
  }

  return breakdown;
}

function getBillBreakdown(diff, items) {
  const breakdown = items.map(item => ({ ...item, qty: 0 }));
  let remaining = diff;

  if (remaining > 0.01) { // need to ADD
    for (let i = 0; i < items.length && remaining > 0.01; i++) {
      const needed = Math.floor(remaining / items[i].value);
      if (needed > 0) {
        breakdown[i].qty = needed;
        remaining -= needed * items[i].value;
      }
    }
  } else if (remaining < -0.01) { // need to REMOVE
    remaining = Math.abs(remaining);
    for (let i = 0; i < items.length && remaining > 0.01; i++) {
      const needed = Math.floor(remaining / items[i].value);
      if (needed > 0) {
        breakdown[i].qty = -needed;
        remaining -= needed * items[i].value;
      }
    }
  }

  return breakdown;
}

function checkFloatConfirmation() {
  const saveButton = document.querySelector('button[onclick="saveDailyCashOut()"]');
  if (!saveButton) return;

  // Find all adjustment input fields and their corresponding checkboxes
  const adjustmentIds = [
    'floatAdj_coin200', 'floatAdj_coin100', 'floatAdj_coin25', 'floatAdj_coin10', 'floatAdj_coin5', 'floatAdj_coin1',
    'floatAdj_bill5', 'floatAdj_bill10', 'floatAdj_bill20', 'floatAdj_bill50', 'floatAdj_bill100'
  ];

  // Count how many adjustments are needed (non-zero values)
  const requiredAdjustments = adjustmentIds.filter(id => {
    const inputField = document.getElementById(id);
    return inputField && parseInt(inputField.value) !== 0;
  });

  // Count how many required adjustments are confirmed
  const confirmedAdjustments = requiredAdjustments.filter(id => {
    const checkbox = document.getElementById('confirm_' + id);
    return checkbox && checkbox.checked;
  });

  // Disable Save button if there are adjustments that are not yet confirmed
  if (requiredAdjustments.length > 0 && confirmedAdjustments.length < requiredAdjustments.length) {
    saveButton.disabled = true;
    saveButton.style.opacity = '0.5';
    saveButton.title = 'Please confirm all float adjustments before saving';
  } else {
    saveButton.disabled = false;
    saveButton.style.opacity = '1';
    saveButton.title = '';
  }
}

// ============================================================
// CHEQUE MANAGEMENT FOR DAILY CASH OUT
// ============================================================

let dailyCheques = [];

function addCheque() {
  const chequeName = document.getElementById('chequeName').value.trim();
  const chequeNo = document.getElementById('chequeNo').value.trim();
  const chequeAmount = parseFloat(document.getElementById('chequeAmount').value) || 0;

  if (!chequeName || !chequeNo || chequeAmount <= 0) {
    alert('Please enter name, cheque number, and amount');
    return;
  }

  const cheque = { name: chequeName, no: chequeNo, amount: chequeAmount };
  dailyCheques.push(cheque);

  document.getElementById('chequeName').value = '';
  document.getElementById('chequeNo').value = '';
  document.getElementById('chequeAmount').value = '';

  renderChequeList();
  updateChequeTally();
  calculateDailyCashOut();
}


function renderChequeList() {
  const container = document.getElementById('chequeList');
  container.innerHTML = '';

  if (dailyCheques.length === 0) {
    container.innerHTML = '<div style="color:#999; text-align:center; padding:10px; font-size:11px;">No cheques added</div>';
    return;
  }

  dailyCheques.forEach((cheque, index) => {
    const row = document.createElement('div');
    row.style.cssText =
      'display:flex; justify-content:space-between; align-items:center; padding:6px; border-bottom:1px solid #eee; background:#fafafa; margin-bottom:4px; border-radius:3px; gap:6px;';
    row.innerHTML = `
      <span style="flex:1; font-size:10px;"><strong>${cheque.name}</strong> | #${cheque.no}</span>
      <span style="font-size:10px; min-width:60px; text-align:right;">${formatCurrency(cheque.amount)}</span>
      <button onclick="removeCheque(${index})" style="background:#ef4444; color:white; border:none; padding:2px 6px; border-radius:3px; cursor:pointer; font-size:9px;">Del</button>
    `;
    container.appendChild(row);
  });
}

function removeCheque(index) {
  dailyCheques.splice(index, 1);
  renderChequeList();
  updateChequeTally();
  calculateDailyCashOut();
}

function updateChequeTally() {
  const total = dailyCheques.reduce((sum, cheque) => sum + cheque.amount, 0);
  document.getElementById('chequeTotalDisplay').textContent = formatCurrency(total);
  document.getElementById('chequeSales').value = total;
}

function clearDailyCashOut() {
  dailyCheques = [];
  document.getElementById('chequeNo').value = '';
  document.getElementById('chequeAmount').value = '';
  document.getElementById('chequeList').innerHTML = '';
  document.getElementById('chequeTotalDisplay').textContent = '$0.00';
  // ... clear other fields ...
}


function saveDailyCashOut() {
  const date = document.getElementById('dailyDate')?.value || '';
  const cashierName = document.getElementById('cashierName')?.value || '';

  if (!cashierName) {
    alert('Please enter cashier name');
    return;
  }

  const getNum = (id) => {
    const el = document.getElementById(id);
    if (!el) return 0;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0 : v;
  };

  const data = {
    date,
    cashierName,
    startTime: document.getElementById('startTime')?.value || '',
    endTime: document.getElementById('endTime')?.value || '',
    posSales: getNum('posSales'),
    coins: {
      '200': getNum('coin200_qty'),
      '100': getNum('coin100_qty'),
      '25': getNum('coin25_qty'),
      '10': getNum('coin10_qty'),
      '5': getNum('coin5_qty'),
      '1': getNum('coin1_qty')
    },
    bills: {
      '5': getNum('bill5_qty'),
      '10': getNum('bill10_qty'),
      '20': getNum('bill20_qty'),
      '50': getNum('bill50_qty'),
      '100': getNum('bill100_qty')
    },
    cashSales: getNum('cashSales'),
    debitSales: getNum('debitSales'),
    visaSales: getNum('visaSales'),
    mastercardSales: getNum('mastercardSales'),
    eftSales: getNum('eftSales'),
    chequeSales: getNum('chequeSales'),
    otherSales: getNum('otherSales'),
    floatRemoved: getNum('floatRemoved'),
    overShort: getNum('overShort'),
    notes: document.getElementById('notes')?.value || ''
  };

  const key = 'dailyCashOutHistory';
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.unshift(data);
  localStorage.setItem(key, JSON.stringify(existing));

  alert('Daily Cash Out saved');
  clearDailyCashOut();
}

function clearDailyCashOut() {
  const idsToClear = [
    'cashierName', 'startTime', 'endTime', 'posSales',
    'cashSales', 'debitSales', 'visaSales', 'mastercardSales',
    'eftSales', 'chequeSales', 'otherSales', 'notes'
  ];
  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const qtyIds = [
    'coin200_qty', 'coin100_qty', 'coin25_qty',
    'coin10_qty', 'coin5_qty', 'coin1_qty',
    'bill5_qty', 'bill10_qty', 'bill20_qty',
    'bill50_qty', 'bill100_qty'
  ];
  qtyIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '0';
  });

  const floatRemoved = document.getElementById('floatRemoved');
  if (floatRemoved) floatRemoved.value = '0';
  const overShort = document.getElementById('overShort');
  if (overShort) overShort.value = '0';

  calculateDailyCashOut();
  initializeDailyCashOut();
}

function printDailyCashOut() {
  // Get Business Info from Settings
  const businessName = document.getElementById('businessName')?.value || 'Business Name';
  const businessAddress = document.getElementById('businessAddress')?.value || '';
  const businessCity = document.getElementById('businessCity')?.value || '';
  const businessProvince = document.getElementById('businessProvince')?.value || '';
  const businessPhone = document.getElementById('businessPhone')?.value || '';

  // Get Daily Cash Out Info
  const date = document.getElementById('dailyDate')?.value || 'N/A';
  const cashierName = document.getElementById('cashierName')?.value || 'N/A';
  const floatAmount = document.getElementById('floatAmount')?.value || '0.00';
  const posSales = document.getElementById('posSales')?.value || '0.00';

  // Coins
  const coin200qty = document.getElementById('coin200qty')?.value || '0';
  const coin200amt = document.getElementById('coin200amt')?.textContent || '$0.00';
  const coin100qty = document.getElementById('coin100qty')?.value || '0';
  const coin100amt = document.getElementById('coin100amt')?.textContent || '$0.00';
  const coin25qty = document.getElementById('coin25qty')?.value || '0';
  const coin25amt = document.getElementById('coin25amt')?.textContent || '$0.00';
  const coin10qty = document.getElementById('coin10qty')?.value || '0';
  const coin10amt = document.getElementById('coin10amt')?.textContent || '$0.00';
  const coin5qty = document.getElementById('coin5qty')?.value || '0';
  const coin5amt = document.getElementById('coin5amt')?.textContent || '$0.00';
  const coin1qty = document.getElementById('coin1qty')?.value || '0';
  const coin1amt = document.getElementById('coin1amt')?.textContent || '$0.00';
  const totalCoins = document.getElementById('totalCoins')?.textContent || '$0.00';

  // Bills
  const bill5qty = document.getElementById('bill5qty')?.value || '0';
  const bill5amt = document.getElementById('bill5amt')?.textContent || '$0.00';
  const bill10qty = document.getElementById('bill10qty')?.value || '0';
  const bill10amt = document.getElementById('bill10amt')?.textContent || '$0.00';
  const bill20qty = document.getElementById('bill20qty')?.value || '0';
  const bill20amt = document.getElementById('bill20amt')?.textContent || '$0.00';
  const bill50qty = document.getElementById('bill50qty')?.value || '0';
  const bill50amt = document.getElementById('bill50amt')?.textContent || '$0.00';
  const bill100qty = document.getElementById('bill100qty')?.value || '0';
  const bill100amt = document.getElementById('bill100amt')?.textContent || '$0.00';
  const totalBills = document.getElementById('totalBills')?.textContent || '$0.00';

  // Payment methods
  const debitSales = document.getElementById('debitSales')?.value || '0.00';
  const visaSales = document.getElementById('visaSales')?.value || '0.00';
  const mastercardSales = document.getElementById('mastercardSales')?.value || '0.00';
  const eftSales = document.getElementById('eftSales')?.value || '0.00';
  const chequeSales = document.getElementById('chequeSales')?.value || '0.00';
  const otherSales = document.getElementById('otherSales')?.value || '0.00';

  // Summary
  const sumCashCounted = document.getElementById('sumCashCounted')?.textContent || '$0.00';
  const sumExpectedCash = document.getElementById('sumExpectedCash')?.textContent || '$0.00';
  const sumCardTotal = document.getElementById('sumCardTotal')?.textContent || '$0.00';
  const sumChequeTotal = document.getElementById('sumChequeTotal')?.textContent || '$0.00';
  const sumExpectedTotal = document.getElementById('sumExpectedTotal')?.textContent || '$0.00';
  const sumPOSTotal = document.getElementById('sumPOSTotal')?.textContent || '$0.00';
  const sumVariance = document.getElementById('sumVariance')?.textContent || '$0.00';

  // Notes
  const notes = document.getElementById('notes')?.value || '';

  // Address line
  const businessAddressLine = [businessAddress, businessCity, businessProvince].filter(Boolean).join(', ');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Cash Out - ${date}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 11px;
          line-height: 1.3;
          color: #333;
        }
        @page {
          size: letter;
          margin: 0.5in;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }
        .business-info {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 2px;
        }
        .business-address {
          font-size: 10px;
          color: #666;
        }
        .report-title {
          font-weight: bold;
          font-size: 12px;
          margin-top: 4px;
        }
        .top-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 6px 0 8px 0;
          font-size: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
        }
        .label { font-weight: bold; width: 70px; }
        h3 {
          font-size: 11px;
          font-weight: bold;
          margin-top: 6px;
          margin-bottom: 3px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
          font-size: 10px;
        }
        th {
          background-color: #f0f0f0;
          border: 0.5px solid #999;
          padding: 3px;
          text-align: left;
        }
        td {
          border: 0.5px solid #999;
          padding: 3px;
        }
        .total-row {
          background-color: #f9f9f9;
          font-weight: bold;
        }
        .text-right { text-align: right; }
        .summary-box {
          background-color: #f0f9ff;
          border-left: 2px solid #0066cc;
          padding: 5px;
          margin-top: 4px;
          font-size: 10px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .summary-row.total {
          font-weight: bold;
          border-top: 1px solid #ddd;
          padding-top: 3px;
          margin-top: 3px;
        }
        .notes-section {
          margin-top: 5px;
          border: 0.5px solid #ddd;
          padding: 4px;
          background-color: #fafafa;
          font-size: 9px;
        }
        .footer {
          text-align: center;
          font-size: 9px;
          color: #999;
          margin-top: 6px;
          border-top: 1px solid #ddd;
          padding-top: 3px;
        }
        @media print {
          body { margin: 0.25in; }
          .header, h3, table, .summary-box { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-info">${businessName}</div>
        ${businessAddressLine ? `<div class="business-address">${businessAddressLine}</div>` : ''}
        ${businessPhone ? `<div class="business-address">Phone: ${businessPhone}</div>` : ''}
        <div class="report-title">DAILY CASH OUT RECONCILIATION</div>
      </div>

      <div class="top-info">
        <div>
          <div class="info-row"><span class="label">Date:</span><span><strong>${date}</strong></span></div>
          <div class="info-row"><span class="label">Cashier:</span><span><strong>${cashierName}</strong></span></div>
        </div>
        <div>
          <div class="info-row"><span class="label">Float:</span><span><strong>$${floatAmount}</strong></span></div>
          <div class="info-row"><span class="label">POS Total:</span><span><strong>$${posSales}</strong></span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Coins</th>
            <th style="width: 10%; text-align:center;">Qty</th>
            <th style="width: 15%; text-align:right;">Amount</th>
            <th style="width: 50%;">Bills</th>
            <th style="width: 10%; text-align:center;">Qty</th>
            <th style="width: 15%; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>$2.00</td><td class="text-right">${coin200qty}</td><td class="text-right">${coin200amt}</td>
            <td>$5</td><td class="text-right">${bill5qty}</td><td class="text-right">${bill5amt}</td>
          </tr>
          <tr>
            <td>$1.00</td><td class="text-right">${coin100qty}</td><td class="text-right">${coin100amt}</td>
            <td>$10</td><td class="text-right">${bill10qty}</td><td class="text-right">${bill10amt}</td>
          </tr>
          <tr>
            <td>$0.25</td><td class="text-right">${coin25qty}</td><td class="text-right">${coin25amt}</td>
            <td>$20</td><td class="text-right">${bill20qty}</td><td class="text-right">${bill20amt}</td>
          </tr>
          <tr>
            <td>$0.10</td><td class="text-right">${coin10qty}</td><td class="text-right">${coin10amt}</td>
            <td>$50</td><td class="text-right">${bill50qty}</td><td class="text-right">${bill50amt}</td>
          </tr>
          <tr>
            <td>$0.05</td><td class="text-right">${coin5qty}</td><td class="text-right">${coin5amt}</td>
            <td>$100</td><td class="text-right">${bill100qty}</td><td class="text-right">${bill100amt}</td>
          </tr>
          <tr>
            <td>$0.01</td><td class="text-right">${coin1qty}</td><td class="text-right">${coin1amt}</td>
            <td colspan="3"></td>
          </tr>
          <tr class="total-row">
            <td>TOTAL COINS</td><td></td><td class="text-right">${totalCoins}</td>
            <td>TOTAL BILLS</td><td></td><td class="text-right">${totalBills}</td>
          </tr>
        </tbody>
      </table>

      <h3>Payment Methods</h3>
      <table>
        <tbody>
          <tr>
            <td style="width:50%;">Debit</td><td class="text-right" style="width:25%;">$${parseFloat(debitSales).toFixed(2)}</td>
            <td style="width:25%;">Visa</td><td class="text-right" style="width:25%;">$${parseFloat(visaSales).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Mastercard</td><td class="text-right">$${parseFloat(mastercardSales).toFixed(2)}</td>
            <td>EFT</td><td class="text-right">$${parseFloat(eftSales).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Cheques</td><td class="text-right">$${parseFloat(chequeSales).toFixed(2)}</td>
            <td>Other</td><td class="text-right">$${parseFloat(otherSales).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <h3>Reconciliation</h3>
      <div class="summary-box">
        <div class="summary-row"><span>Total Cash Counted:</span><strong>${sumCashCounted}</strong></div>
        <div class="summary-row"><span>Expected Cash:</span><strong>${sumExpectedCash}</strong></div>
        <div class="summary-row"><span>Card/EFT Total:</span><strong>${sumCardTotal}</strong></div>
        <div class="summary-row"><span>Cheque Total:</span><strong>${sumChequeTotal}</strong></div>
        <div class="summary-row"><span>Expected Total:</span><strong>${sumExpectedTotal}</strong></div>
        <div class="summary-row"><span>POS Total:</span><strong>${sumPOSTotal}</strong></div>
        <div class="summary-row total"><span>VARIANCE:</span><strong>${sumVariance}</strong></div>
      </div>

      ${notes ? `<div class="notes-section"><strong>Notes:</strong> ${notes}</div>` : ''}

      <div class="footer">
        Printed: ${new Date().toLocaleString()} • Keep for records
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '', 'width=850,height=1100');
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  populateMonthSelectors();
  initializeDailyCashOut();
});
