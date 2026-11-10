const PERCENT = 100;

function paintSliderFill(slider) {
  const min = Number(slider.min) || 0;
  const max = Number(slider.max) || PERCENT;
  const ratio = max > min ? (Number(slider.value) - min) / (max - min) : 0;
  slider.style.setProperty('--fill', `${Math.round(ratio * PERCENT)}%`);
}

function bindSliders() {
  for (const slider of document.querySelectorAll('.ui-slider')) {
    paintSliderFill(slider);
    slider.addEventListener('input', () => paintSliderFill(slider));
  }
}

function bindChips() {
  for (const chip of document.querySelectorAll('.ui-chip')) {
    chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    });
  }
}

function bindSegmented() {
  for (const group of document.querySelectorAll('.ui-segmented[data-exclusive]')) {
    const items = [...group.querySelectorAll('.ui-segmented__item')];
    for (const item of items) {
      item.addEventListener('click', () => {
        for (const other of items) {
          other.setAttribute('aria-pressed', String(other === item));
        }
      });
    }
  }
}

function selectTab(tabs, selected) {
  for (const tab of tabs) {
    const isSelected = tab === selected;
    tab.setAttribute('aria-selected', String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
  }
  const panel = document.getElementById(selected.getAttribute('aria-controls'));
  if (panel) {
    panel.textContent = `${selected.textContent}のパネル`;
  }
  selected.focus();
}

function bindTabs() {
  for (const list of document.querySelectorAll('.ui-tabs[role="tablist"]')) {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    list.addEventListener('click', (event) => {
      const tab = event.target.closest('[role="tab"]');
      if (tab) {
        selectTab(tabs, tab);
      }
    });
    list.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) {
        return;
      }
      const index = tabs.indexOf(document.activeElement);
      selectTab(tabs, tabs[(index + step + tabs.length) % tabs.length]);
      event.preventDefault();
    });
  }
}

bindSliders();
bindChips();
bindSegmented();
bindTabs();
