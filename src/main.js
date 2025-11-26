import './style.css'

const cube = document.querySelector('.cube');
const coin = document.querySelector('.coin');
const rollBtn = document.getElementById('rollBtn');
const resultTitle = document.getElementById('resultTitle');

// Settings Elements
const applySettingsBtn = document.getElementById('applySettingsBtn');
const titlesContainer = document.getElementById('titlesContainer');
const sidesInput = document.getElementById('sidesInput');
const clearCacheBtn = document.getElementById('clearCacheBtn');

// Preset Elements
const presetSelect = document.getElementById('presetSelect');
const loadPresetBtn = document.getElementById('loadPresetBtn');
const deletePresetBtn = document.getElementById('deletePresetBtn');
const newPresetName = document.getElementById('newPresetName');
const savePresetBtn = document.getElementById('savePresetBtn');

let lastTargetX = 0;
let lastTargetY = 0;
let currentRotX = 0;
let currentRotY = 0;
let currentCoinRotY = 0;

// State
let currentSides = 6;
let sideTitles = {}; // { sideNumber: "Title" }
let presets = JSON.parse(localStorage.getItem('dicePresets')) || [];

// Initialize
function init() {
  updatePresetDropdown();
  // Load last used settings if available, else default
  const lastConfig = JSON.parse(localStorage.getItem('lastDiceConfig'));
  if (lastConfig) {
    currentSides = lastConfig.sides || 6;
    sideTitles = lastConfig.titles || {};
    sidesInput.value = currentSides;
  }

  // Render initial state
  renderTitleInputs();
  applySettings(); // Apply initial settings to ensure correct visual state (coin/dice)
}

function saveLastConfig() {
  localStorage.setItem('lastDiceConfig', JSON.stringify({
    sides: currentSides,
    titles: sideTitles
  }));
}

function getTitle(side, maxSides) {
  try {
    if (sideTitles && sideTitles[side] && typeof sideTitles[side] === 'string' && sideTitles[side].trim() !== '') {
      return sideTitles[side];
    }
  } catch (e) {
    console.error('Error getting title:', e);
  }
  if (maxSides === 2) {
    return side === 1 ? 'Heads' : 'Tails';
  }
  return `Side ${side}`;
}

// --- Settings Logic ---

function renderTitleInputs() {
  const maxSides = parseInt(sidesInput.value) || 6;
  titlesContainer.innerHTML = '';

  for (let i = 1; i <= maxSides; i++) {
    const group = document.createElement('div');
    group.className = 'title-input-group';

    const label = document.createElement('label');
    label.textContent = `${i}:`;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = sideTitles[i] || '';
    input.placeholder = maxSides === 2 ? (i === 1 ? 'Heads' : 'Tails') : `Side ${i}`;
    input.dataset.side = i;

    // Update state on input change
    input.addEventListener('input', (e) => {
      sideTitles[i] = e.target.value;
      saveLastConfig(); // Auto-save title changes
    });

    group.appendChild(label);
    group.appendChild(input);
    titlesContainer.appendChild(group);
  }
}

function applySettings() {
  currentSides = parseInt(sidesInput.value) || 6;
  // Titles are already updated via input listeners
  const inputs = titlesContainer.querySelectorAll('input');
  inputs.forEach(input => {
    sideTitles[input.dataset.side] = input.value;
  });

  saveLastConfig();

  // Reset visual state if switching between coin/dice
  if (currentSides === 2) {
    cube.classList.add('hidden');
    coin.classList.remove('hidden');
    void coin.offsetWidth; // Reflow
  } else {
    cube.classList.remove('hidden');
    coin.classList.add('hidden');
    void cube.offsetWidth; // Reflow
  }
}

function clearCache() {
  if (confirm('Are you sure you want to clear all settings and presets? This cannot be undone.')) {
    localStorage.clear();
    location.reload();
  }
}

// Update title inputs when sides change
sidesInput.addEventListener('input', () => { // Changed to 'input' for immediate feedback
  if (sidesInput.value < 2) sidesInput.value = 2;
  if (sidesInput.value > 1000) sidesInput.value = 1000;

  // When sides change, we preserve existing titles for overlapping indices
  // But we need to re-render the list
  renderTitleInputs();
  applySettings(); // Auto-apply settings
});

// applySettingsBtn.addEventListener('click', applySettings); // Removed manual apply
clearCacheBtn.addEventListener('click', clearCache);

// --- Presets Logic ---

function updatePresetDropdown() {
  presetSelect.innerHTML = '<option value="">-- Select Preset --</option>';
  presets.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${preset.name} (${preset.sides} sides)`;
    presetSelect.appendChild(option);
  });
}

function savePreset() {
  const name = newPresetName.value.trim();
  if (!name) {
    alert('Please enter a preset name.');
    return;
  }

  const sides = parseInt(sidesInput.value) || 6;
  // Capture current titles from inputs
  const currentTitles = {};
  const inputs = titlesContainer.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.value) currentTitles[input.dataset.side] = input.value;
  });

  const newPreset = {
    name: name,
    sides: sides,
    titles: currentTitles
  };

  presets.push(newPreset);
  localStorage.setItem('dicePresets', JSON.stringify(presets));

  newPresetName.value = '';
  updatePresetDropdown();
  presetSelect.value = presets.length - 1; // Select the new preset
}

function loadPreset() {
  const index = presetSelect.value;
  if (index === '') return;

  const preset = presets[index];
  sidesInput.value = preset.sides;
  sideTitles = { ...preset.titles }; // Clone

  renderTitleInputs();
}

function deletePreset() {
  const index = presetSelect.value;
  if (index === '') return;

  if (confirm(`Delete preset "${presets[index].name}"?`)) {
    presets.splice(index, 1);
    localStorage.setItem('dicePresets', JSON.stringify(presets));
    updatePresetDropdown();
  }
}

savePresetBtn.addEventListener('click', savePreset);
loadPresetBtn.addEventListener('click', loadPreset);
deletePresetBtn.addEventListener('click', deletePreset);

// Initialize app
init();

function rollDiceOptimized() {
  try {
    let maxSides = currentSides;
    if (maxSides < 2) maxSides = 2;
    const randNum = Math.floor(Math.random() * maxSides) + 1;

    // Clear previous title
    resultTitle.textContent = 'Rolling...';

    if (maxSides === 2) {
      // Coin Flip Logic
      cube.classList.add('hidden');
      coin.classList.remove('hidden');

      // Force reflow
      void coin.offsetWidth;

      const isHeads = randNum === 1;
      const targetY = isHeads ? 0 : 180;

      // Add spins
      const minSpins = 5;
      const extraSpins = Math.floor(Math.random() * 3);
      const totalSpins = minSpins + extraSpins;

      let currentMod = currentCoinRotY % 360;
      let diff = targetY - currentMod;

      if (diff < 0) diff += 360;

      currentCoinRotY += (totalSpins * 360) + diff;

      coin.style.transform = `rotateY(${currentCoinRotY}deg)`;
      console.log(`Flipped: ${isHeads ? 'Heads' : 'Tails'}`);

      setTimeout(() => {
        console.log('Coin timeout fired');
        try {
          resultTitle.textContent = getTitle(randNum, maxSides);
        } catch (e) {
          console.error('Error setting result title:', e);
          resultTitle.textContent = `Side ${randNum}`;
        }
      }, 1000); // Sync with animation duration

    } else {
      // Dice Logic
      cube.classList.remove('hidden');
      coin.classList.add('hidden');

      // Force reflow to ensure transition plays if we just unhid
      void cube.offsetWidth;

      // Select a random face (1-6) to be the "landing" face
      const landingFaceIndex = Math.floor(Math.random() * 6) + 1;

      // Update the content of the landing face to show the result
      const landingFace = document.querySelector(`.cube__face--${landingFaceIndex}`);
      if (landingFace) landingFace.textContent = randNum;

      // Update other faces with random decoy numbers
      const faces = document.querySelectorAll('.cube__face');
      faces.forEach((face, index) => {
        if (index + 1 !== landingFaceIndex) {
          let decoy;
          let attempts = 0;
          do {
            decoy = Math.floor(Math.random() * maxSides) + 1;
            attempts++;
          } while (decoy === randNum && attempts < 10);

          // Fallback if we couldn't find a unique decoy
          if (decoy === randNum) {
            decoy = (randNum % maxSides) + 1;
          }

          face.textContent = decoy;
        }
      });

      let xTarget = 0;
      let yTarget = 0;

      switch (landingFaceIndex) {
        case 1: xTarget = 0; yTarget = 0; break;
        case 2: xTarget = 0; yTarget = -90; break;
        case 3: xTarget = 0; yTarget = -180; break;
        case 4: xTarget = 0; yTarget = 90; break;
        case 5: xTarget = -90; yTarget = 0; break;
        case 6: xTarget = 90; yTarget = 0; break;
      }

      const minSpins = 5;
      const extraSpins = Math.floor(Math.random() * 3); // 0-2 extra
      const totalSpins = minSpins + extraSpins;

      const xDelta = xTarget - lastTargetX;
      const yDelta = yTarget - lastTargetY;

      currentRotX += (totalSpins * 360) + xDelta;
      currentRotY += (totalSpins * 360) + yDelta;

      lastTargetX = xTarget;
      lastTargetY = yTarget;

      console.log(`Applying transform: rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`);
      if (isNaN(currentRotX) || isNaN(currentRotY)) {
        console.error('Transform values are NaN!', { currentRotX, currentRotY, xDelta, yDelta, xTarget, yTarget, lastTargetX, lastTargetY });
        // Reset to recover
        currentRotX = 0;
        currentRotY = 0;
        lastTargetX = 0;
        lastTargetY = 0;
      }

      cube.style.transform = `translateZ(-100px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
      console.log(`Rolled: ${randNum} (Sides: ${maxSides})`);

      setTimeout(() => {
        console.log('Dice timeout fired');
        try {
          resultTitle.textContent = getTitle(randNum, maxSides);
        } catch (e) {
          console.error('Error setting result title:', e);
          resultTitle.textContent = `Side ${randNum}`;
        }
      }, 1000);
    }
  } catch (err) {
    console.error('Critical error in rollDiceOptimized:', err);
    resultTitle.textContent = 'Error';
  }
}

rollBtn.addEventListener('click', rollDiceOptimized);
