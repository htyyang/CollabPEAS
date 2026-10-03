/**
 * CollabPEAS - Step 4: Block-Based Decision Logic Canvas
 * Implements 4-slot chains (SENSE -> CONDITION -> ACTION -> CONTROL) for the 6 tasks,
 * compatibility validation, and real-time execution trace highlighting.
 */

import { appState } from '../state.js';
import {
  SENSE_BLOCKS, CONDITION_BLOCKS, ACTION_BLOCKS, CONTROL_BLOCKS,
  getBlockById, isConditionCompatible, DEFAULT_RULE_TEMPLATES
} from '../data/blocks.js';
import { sound } from './audio.js';

export class BlockCanvasView {
  constructor(containerElement) {
    this.container = containerElement;
    this.selectedBlockForPlacement = null;
    this.activeTaskIndex = 0;
    this.init();
  }

  init() {
    appState.on('rulesChanged', () => this.render());
    appState.on('tick', ({ robot }) => this.updateTracePulse(robot.traceState));
  }

  render() {
    if (!this.container) return;

    const rules = appState.rules;
    const currentStep = appState.currentStep;

    let html = `
      <div class="block-canvas-container">
        <!-- Header & Instructions -->
        <div class="canvas-header">
          <div>
            <h3>🧩 Step 4: Decision Logic (Vibe Coding Canvas)</h3>
            <p class="canvas-subtitle">
              Construct decision rules using the strict 4-slot sequence:
              <strong>SENSE</strong> ➔ <strong>CONDITION</strong> ➔ <strong>ACTION</strong> ➔ <strong>CONTROL (Optional)</strong>.
              All rules run in parallel at 10 ticks per second.
            </p>
          </div>
          <div class="canvas-actions">
            <button class="btn btn-sm btn-outline load-scaffold-btn">↺ Reset to Scaffolds</button>
          </div>
        </div>

        <div class="canvas-workspace">
          <!-- Left: 6 Task Rule Chains -->
          <div class="task-zones-column">
            ${rules.map((rule, idx) => this.renderTaskZone(rule, idx)).join('')}
          </div>

          <!-- Right: 64-Block Library Palette -->
          <div class="block-palette-column">
            <div class="palette-header">
              <h4>📦 Block Library</h4>
              <span class="active-badge">Click block to place</span>
            </div>

            <!-- Tabs for 4 Kinds -->
            <div class="palette-tabs">
              <button class="tab-btn active" data-kind="Sense">SENSE (15)</button>
              <button class="tab-btn" data-kind="Condition">CONDITION (20)</button>
              <button class="tab-btn" data-kind="Action">ACTION (23)</button>
              <button class="tab-btn" data-kind="Control">CONTROL (6)</button>
            </div>

            <div class="palette-list" id="paletteList">
              ${this.renderPaletteBlocks('Sense')}
            </div>

            <!-- Active Selected Block Inspector -->
            <div class="selected-block-inspector" id="blockInspector">
              <div class="inspector-prompt">Click any slot in a task zone to insert the chosen block.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEvents();
  }

  renderTaskZone(rule, idx) {
    const { sense, condition, action, control } = rule.slots;
    const senseBlock = getBlockById(sense);
    const condBlock = getBlockById(condition);
    const actBlock = getBlockById(action);
    const ctrlBlock = getBlockById(control);

    // Compatibility check
    const isCompat = isConditionCompatible(condition, sense);
    const hasSenseInstalled = sense ? appState.installedSensors.has(sense) : true;

    return `
      <div class="task-zone-card ${appState.activeTaskFocus === rule.taskId ? 'focused' : ''}" data-task-index="${idx}">
        <div class="zone-title-bar">
          <span class="task-number">Task ${idx + 1}</span>
          <span class="task-name">${rule.taskName}</span>
          <span class="dim-tag">${idx === 0 ? 'Coverage' : idx === 1 ? 'Coverage + Hazard' : idx === 2 ? 'Hazard' : idx === 3 || idx === 4 ? 'Safety' : 'Time'}</span>
        </div>

        <div class="four-slot-chain" id="chain-${idx}">
          <!-- Slot 1: SENSE -->
          <div class="slot-container slot-sense ${sense ? 'filled' : 'empty'}" data-task-index="${idx}" data-slot="sense">
            <span class="slot-label">SLOT 1: SENSE</span>
            ${senseBlock ? `
              <div class="block-card kind-sense">
                <span class="block-id">${senseBlock.id}</span>
                <span class="block-name">${senseBlock.name}</span>
                <button class="clear-slot-btn" title="Remove block" data-task-index="${idx}" data-slot="sense">✕</button>
              </div>
            ` : `
              <div class="empty-placeholder">+ Place SENSE Block</div>
            `}
            ${!hasSenseInstalled && sense ? `<div class="slot-warning">⚠️ Sensor not mounted in Step 2!</div>` : ''}
          </div>

          <span class="slot-arrow">➔</span>

          <!-- Slot 2: CONDITION -->
          <div class="slot-container slot-condition ${condition ? 'filled' : 'empty'} ${!isCompat ? 'incompatible' : ''}" data-task-index="${idx}" data-slot="condition">
            <span class="slot-label">SLOT 2: CONDITION</span>
            ${condBlock ? `
              <div class="block-card kind-condition">
                <span class="block-id">${condBlock.id}</span>
                <span class="block-name">${condBlock.name}</span>
                <button class="clear-slot-btn" title="Remove block" data-task-index="${idx}" data-slot="condition">✕</button>
              </div>
            ` : `
              <div class="empty-placeholder">+ Place CONDITION</div>
            `}
            ${!isCompat && condition ? `<div class="slot-error">🚫 Incompatible with ${sense || 'missing SENSE'}!</div>` : ''}
          </div>

          <span class="slot-arrow">➔</span>

          <!-- Slot 3: ACTION -->
          <div class="slot-container slot-action ${action ? 'filled' : 'empty'}" data-task-index="${idx}" data-slot="action">
            <span class="slot-label">SLOT 3: ACTION</span>
            ${actBlock ? `
              <div class="block-card kind-action">
                <span class="block-id">${actBlock.id}</span>
                <span class="block-name">${actBlock.name}</span>
                <button class="clear-slot-btn" title="Remove block" data-task-index="${idx}" data-slot="action">✕</button>
              </div>
            ` : `
              <div class="empty-placeholder">+ Place ACTION</div>
            `}
          </div>

          <span class="slot-arrow">➔</span>

          <!-- Slot 4: CONTROL (Optional) -->
          <div class="slot-container slot-control ${control ? 'filled' : 'empty'}" data-task-index="${idx}" data-slot="control">
            <span class="slot-label">SLOT 4: CONTROL (Opt)</span>
            ${ctrlBlock ? `
              <div class="block-card kind-control">
                <span class="block-id">${ctrlBlock.id}</span>
                <span class="block-name">${ctrlBlock.name}</span>
                <button class="clear-slot-btn" title="Remove block" data-task-index="${idx}" data-slot="control">✕</button>
              </div>
            ` : `
              <div class="empty-placeholder optional-hint">+ Optional (1 tick default)</div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  renderPaletteBlocks(kind) {
    let list = [];
    if (kind === 'Sense') list = SENSE_BLOCKS;
    else if (kind === 'Condition') list = CONDITION_BLOCKS;
    else if (kind === 'Action') list = ACTION_BLOCKS;
    else if (kind === 'Control') list = CONTROL_BLOCKS;

    return list.map(b => `
      <div class="palette-block-card kind-${b.kind.toLowerCase()} ${this.selectedBlockForPlacement?.id === b.id ? 'selected' : ''}" data-block-id="${b.id}">
        <div class="card-top">
          <span class="block-badge">${b.id}</span>
          <span class="block-kind-tag">${b.kind}</span>
        </div>
        <div class="card-name">${b.name}</div>
        <div class="card-desc">${b.desc}</div>
        ${b.requiresSense ? `<div class="card-meta">Requires: ${b.requiresSense.join(', ')}</div>` : ''}
      </div>
    `).join('');
  }

  attachEvents() {
    // Tab switching in block library
    this.container.querySelectorAll('.palette-tabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        this.container.querySelectorAll('.palette-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const kind = btn.getAttribute('data-kind');
        const listEl = this.container.querySelector('#paletteList');
        if (listEl) {
          listEl.innerHTML = this.renderPaletteBlocks(kind);
          this.attachBlockSelectionEvents();
        }
      };
    });

    this.attachBlockSelectionEvents();

    // Slot click handlers
    this.container.querySelectorAll('.slot-container').forEach(slot => {
      slot.onclick = (e) => {
        // Ignore if clicking clear button
        if (e.target.classList.contains('clear-slot-btn')) return;

        const taskIdx = parseInt(slot.getAttribute('data-task-index'), 10);
        const slotName = slot.getAttribute('data-slot');

        if (this.selectedBlockForPlacement) {
          const block = this.selectedBlockForPlacement;
          // Validate slot match
          if (slotName.toLowerCase() !== block.kind.toLowerCase()) {
            sound.playBeep();
            alert(`Cannot place a ${block.kind} block into a ${slotName.toUpperCase()} slot!`);
            return;
          }

          // Check SENSE -> CONDITION compatibility
          if (slotName === 'condition') {
            const rule = appState.rules[taskIdx];
            const currentSense = rule.slots.sense;
            if (currentSense && !isConditionCompatible(block.id, currentSense)) {
              sound.playBeep();
              alert(`Incompatible! ${block.name} requires sensor: ${block.requiresSense.join(' or ')}, but Slot 1 has ${currentSense}.`);
            }
          }

          appState.setRuleSlot(taskIdx, slotName, block.id);
          sound.playSnap();
        }
      };
    });

    // Clear slot buttons
    this.container.querySelectorAll('.clear-slot-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const taskIdx = parseInt(btn.getAttribute('data-task-index'), 10);
        const slotName = btn.getAttribute('data-slot');
        appState.clearRuleSlot(taskIdx, slotName);
        sound.playClick();
      };
    });

    // Reset scaffolds button
    this.container.querySelector('.load-scaffold-btn')?.addEventListener('click', () => {
      appState.rules = JSON.parse(JSON.stringify(DEFAULT_RULE_TEMPLATES));
      sound.playChime();
      appState.notify('rulesChanged', { rules: appState.rules });
    });
  }

  attachBlockSelectionEvents() {
    this.container.querySelectorAll('.palette-block-card').forEach(card => {
      card.onclick = () => {
        const blockId = card.getAttribute('data-block-id');
        this.selectedBlockForPlacement = getBlockById(blockId);

        this.container.querySelectorAll('.palette-block-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const inspector = this.container.querySelector('#blockInspector');
        if (inspector && this.selectedBlockForPlacement) {
          const b = this.selectedBlockForPlacement;
          inspector.innerHTML = `
            <div class="active-selection-box">
              <span class="sel-title">Selected: <strong>${b.id} - ${b.name}</strong></span>
              <span class="sel-guide">Click any ${b.kind.toUpperCase()} slot on the left canvas to snap it in.</span>
            </div>
          `;
        }
        sound.playClick();
      };
    });
  }

  updateTracePulse(traceState) {
    if (!traceState) return;
    // Highlight active task zone if a rule is currently firing
    this.container.querySelectorAll('.task-zone-card').forEach(card => {
      card.classList.remove('pulse-active');
    });

    if (traceState.action) {
      const matchingIdx = appState.rules.findIndex(r => r.slots.action === traceState.action);
      if (matchingIdx >= 0) {
        const targetCard = this.container.querySelector(`.task-zone-card[data-task-index="${matchingIdx}"]`);
        if (targetCard) {
          targetCard.classList.add('pulse-active');
        }
      }
    }
  }
}
