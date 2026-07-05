/* ========================================
   PickPop - Text Mode Logic
   ======================================== */

class TextDrawApp {
    constructor() {
        // State
        this.names = [];              // All names (raw list)
        this.drawnIndices = new Set(); // Indices of names already drawn
        this.isDrawing = false;
        this.duration = 3000;
        this.prizeCount = 1;

        // Built-in sound effects (spin sound + winner fanfare)
        this.laserSound = new Audio('assets/sfx-laser.mp3');
        this.prizeSound = new Audio('assets/sfx-prize.mp3');

        // DOM Elements
        this.drawArea = document.getElementById('drawArea');
        this.emptyState = document.getElementById('emptyState');
        this.counterDisplay = document.getElementById('counterDisplay');
        this.freeTierWarning = document.getElementById('freeTierWarning');

        this.resetBtn = document.getElementById('resetBtn');
        this.drawBtn = document.getElementById('drawBtn');

        this.winnerModal = document.getElementById('winnerModal');
        this.winnerContent = document.getElementById('winnerContent');
        this.closeModal = document.getElementById('closeModal');

        this.init();
    }

    init() {
        this.resetBtn.addEventListener('click', () => this.reset());
        this.drawBtn.addEventListener('click', () => this.startDraw());

        this.closeModal.addEventListener('click', () => this.hideWinnerModal());
        this.winnerModal.addEventListener('click', (e) => {
            if (e.target === this.winnerModal) this.hideWinnerModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isDrawing && this.names.length > 0
                && !this.winnerModal.classList.contains('show')) {
                e.preventDefault();
                this.startDraw();
            }
            if (e.code === 'Escape') this.hideWinnerModal();
        });

        // Initialize settings panel
        window.settingsPanel = new SettingsPanel(this, { mode: 'text' });
        this.duration = window.settingsPanel.settings.duration || 3000;
        this.prizeCount = window.settingsPanel.settings.prizeCount || 1;
    }

    // ============================================
    // NAME MANAGEMENT
    // ============================================

    setNamesFromText(text) {
        // Parse text - split by newlines, trim, filter empty
        const rawLines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Check for duplicates
        const seen = new Set();
        const duplicates = [];
        const uniqueNames = [];

        rawLines.forEach((line) => {
            if (seen.has(line)) {
                if (!duplicates.includes(line)) duplicates.push(line);
            } else {
                seen.add(line);
                uniqueNames.push(line);
            }
        });

        // Warn about duplicates
        if (duplicates.length > 0) {
            PickPop.showToast(
                `⚠️ พบชื่อซ้ำ ${duplicates.length} ชื่อ (ระบบตัดออกให้)\nชื่อซ้ำ: ${duplicates.slice(0, 3).join(', ')}${duplicates.length > 3 ? '...' : ''}`,
                'warning',
                5000
            );
        }

        // Check free tier
        if (PickPop.isOverFreeLimit(uniqueNames.length)) {
            PickPop.showToast(
                `รุ่นฟรีจำกัด ${PickPop.FREE_TIER_LIMIT} คน คุณใส่ ${uniqueNames.length} คน`,
                'warning',
                4000
            );
            this.showFreeTierWarning();
        }

        this.names = uniqueNames;
        this.drawnIndices.clear();
        this.completenessConfirmed = false;

        this.updateUI();

        if (uniqueNames.length > 0) {
            PickPop.showToast(
                `บันทึกรายชื่อสำเร็จ ${uniqueNames.length} ชื่อ`,
                'success',
                2500
            );
            // Close settings panel
            if (window.settingsPanel) window.settingsPanel.closePanel();
        }
    }

    removeName(index) {
        if (index < 0 || index >= this.names.length) return;

        // Remove from names array
        this.names.splice(index, 1);

        // Adjust drawnIndices - shift indices that were after removed
        const newDrawn = new Set();
        this.drawnIndices.forEach(idx => {
            if (idx < index) newDrawn.add(idx);
            else if (idx > index) newDrawn.add(idx - 1);
            // idx === index is removed
        });
        this.drawnIndices = newDrawn;

        this.updateUI();
    }

    updateUI() {
        this.updateCounter();
        this.updateDrawArea();

        if (this.names.length > 0) {
            this.drawBtn.disabled = false;
            this.resetBtn.disabled = false;
        } else {
            this.drawBtn.disabled = true;
            this.resetBtn.disabled = true;
        }
    }

    updateCounter() {
        const totalCount = this.names.length;
        const remainingCount = totalCount - this.drawnIndices.size;
        this.counterDisplay.textContent = `${remainingCount}/${totalCount}`;

        this.counterDisplay.classList.remove('limit-warning', 'limit-exceeded');
        if (totalCount > PickPop.FREE_TIER_LIMIT) {
            this.counterDisplay.classList.add('limit-exceeded');
        } else if (totalCount >= PickPop.FREE_TIER_LIMIT * 0.8) {
            this.counterDisplay.classList.add('limit-warning');
        }
    }

    showFreeTierWarning() {
        this.freeTierWarning.classList.add('show');
        setTimeout(() => {
            this.freeTierWarning.classList.remove('show');
        }, 5000);
    }

    // ============================================
    // DRAW AREA UI
    // ============================================

    updateDrawArea() {
        if (this.names.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        // Draw area will be updated when startDraw is called
    }

    showEmptyState() {
        this.drawArea.innerHTML = '';
        this.drawArea.removeAttribute('data-count');
        this.drawArea.appendChild(this.emptyState);
        this.emptyState.style.display = 'flex';
    }

    hideEmptyState() {
        this.emptyState.style.display = 'none';
    }

    createDrawSlots(count) {
        this.drawArea.innerHTML = '';
        this.drawArea.setAttribute('data-count', count);

        // Determine grid layout
        let cols;
        if (count === 1) cols = 1;
        else if (count === 2) cols = 2;
        else if (count <= 4) cols = 2;
        else if (count <= 9) cols = 3;
        else if (count <= 16) cols = 4;
        else cols = 5;

        const rows = Math.ceil(count / cols);
        this.drawArea.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        this.drawArea.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        const slots = [];
        for (let i = 0; i < count; i++) {
            const slot = document.createElement('div');
            slot.className = 'name-slot';
            slot.dataset.index = i;

            const label = document.createElement('div');
            label.className = 'name-slot-label';
            label.textContent = `ผู้โชคดีคนที่ ${i + 1}`;

            const text = document.createElement('div');
            text.className = 'name-slot-text';
            text.textContent = '...';

            slot.appendChild(label);
            slot.appendChild(text);
            this.drawArea.appendChild(slot);
            slots.push(slot);
        }

        return slots;
    }

    // ============================================
    // DRAWING
    // ============================================

    async startDraw() {
        if (this.isDrawing) return;
        if (this.names.length === 0) {
            PickPop.showToast('กรุณาใส่รายชื่อก่อน!', 'error');
            return;
        }

        // One-time reminder before the FIRST draw of this session —
        // give users a last chance to verify the list is complete.
        if (!this.completenessConfirmed) {
            const confirmed = await PickPop.showConfirm(
                `คุณมีรายชื่อทั้งหมด ${this.names.length} ชื่อ\n\n` +
                `ตรวจสอบแล้วใช่ไหมว่ารายชื่อครบถ้วน ไม่มีใครตกหล่น?\n` +
                `(เมื่อเริ่มสุ่มไปแล้ว การเพิ่มคนภายหลังอาจทำให้เกิดความสับสน)`,
                '✅ ตรวจสอบความครบถ้วน'
            );
            if (!confirmed) return;
            this.completenessConfirmed = true;
        }

        // Check free tier
        if (PickPop.isOverFreeLimit(this.names.length)) {
            const shouldContinue = await PickPop.showConfirm(
                `รุ่นฟรีจำกัดสุ่มได้ ${PickPop.FREE_TIER_LIMIT} คน\nคุณมี ${this.names.length} คน\n\nต้องการอัปเกรดไหม?`,
                'เกินขีดจำกัดฟรี'
            );
            if (shouldContinue) window.location.href = 'index.html';
            return;
        }

        // Get available indices (not drawn yet)
        const availableIndices = [];
        for (let i = 0; i < this.names.length; i++) {
            if (!this.drawnIndices.has(i)) availableIndices.push(i);
        }

        if (availableIndices.length === 0) {
            PickPop.showToast('ทุกคนถูกสุ่มไปหมดแล้ว!\nกด Reset เพื่อเริ่มใหม่', 'info');
            return;
        }

        const drawCount = Math.min(this.prizeCount, availableIndices.length);

        // Setup
        this.isDrawing = true;
        this.drawBtn.disabled = true;
        this.resetBtn.disabled = true;

        // Create slots
        const slots = this.createDrawSlots(drawCount);
        slots.forEach(s => s.classList.add('spinning'));

        // Play music
        if (window.settingsPanel) window.settingsPanel.playMusic();

        // Randomly pick winners (final result)
        const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
        const winnerIndices = shuffled.slice(0, drawCount);

        // Animation: cycle through names in each slot
        const startTime = Date.now();
        const spinInterval = 80; // ms between name changes

        const spin = () => {
            const elapsed = Date.now() - startTime;

            if (elapsed >= this.duration) {
                // Finish - show winners
                this.finishDraw(slots, winnerIndices);
                return;
            }

            // Update each slot with random name from available pool
            slots.forEach(slot => {
                const randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                slot.querySelector('.name-slot-text').textContent = this.names[randomIdx];
            });
            this.playLaserSound();

            setTimeout(spin, spinInterval);
        };

        spin();
    }

    // Play the built-in "spin" sound effect. Clones the audio node each
    // time so overlapping plays don't cut each other off.
    playLaserSound() {
        if (!this.laserSound) return;
        const sound = this.laserSound.cloneNode();
        sound.volume = 0.5;
        sound.play().catch(e => console.log('Laser sound play failed:', e));
    }

    finishDraw(slots, winnerIndices) {
        // Show winner names in slots
        slots.forEach((slot, i) => {
            const winnerIdx = winnerIndices[i];
            slot.classList.remove('spinning');
            slot.classList.add('winner');
            slot.querySelector('.name-slot-text').textContent = this.names[winnerIdx];

            // Mark as drawn
            this.drawnIndices.add(winnerIdx);
        });

        // Play the built-in winner fanfare
        if (this.prizeSound) {
            this.prizeSound.currentTime = 0;
            this.prizeSound.play().catch(e => console.log('Prize sound play failed:', e));
        }

        // Stop user-uploaded background music
        if (window.settingsPanel) window.settingsPanel.stopMusic();

        // Show modal after animation
        setTimeout(() => {
            const winnerNames = winnerIndices.map(idx => this.names[idx]);
            this.showWinnerModal(winnerNames);

            this.isDrawing = false;
            this.drawBtn.disabled = false;
            this.resetBtn.disabled = false;
            this.updateCounter();

            // Refresh settings panel names list
            if (window.settingsPanel && window.settingsPanel.refreshNamesList) {
                window.settingsPanel.refreshNamesList();
            }
        }, 1500);
    }

    // ============================================
    // WINNER MODAL
    // ============================================

    showWinnerModal(names) {
        this.winnerContent.innerHTML = '';

        names.forEach((name, index) => {
            const item = document.createElement('div');
            item.className = 'winner-name-item';
            item.style.animationDelay = `${index * 0.15}s`;
            item.innerHTML = `
                <span class="winner-name-number">ผู้โชคดีคนที่ ${index + 1}</span>
                <span>${this.escapeHtml(name)}</span>
            `;
            this.winnerContent.appendChild(item);
        });

        this.winnerModal.classList.add('show');
    }

    hideWinnerModal() {
        this.winnerModal.classList.remove('show');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ============================================
    // RESET
    // ============================================

    async reset() {
        if (this.drawnIndices.size === 0) {
            // Nothing to reset
            return;
        }

        const confirm = await PickPop.showConfirm(
            `จะรีเซ็ตให้ทุกคนสามารถถูกสุ่มได้อีกครั้ง\n(รายชื่อไม่ถูกลบ)\n\nยืนยันหรือไม่?`,
            'ยืนยันการ Reset'
        );
        if (!confirm) return;

        this.drawnIndices.clear();
        this.hideWinnerModal();
        this.updateUI();
        this.showEmptyState();
        this.hideEmptyState();

        // Restore draw area to empty (before first draw)
        this.drawArea.innerHTML = '';
        this.drawArea.removeAttribute('data-count');

        // Show a "ready" state
        const readyMsg = document.createElement('div');
        readyMsg.className = 'empty-state';
        readyMsg.innerHTML = `
            <div class="empty-state-icon">🎲</div>
            <h2 class="empty-state-title">พร้อมสุ่ม!</h2>
            <p class="empty-state-text">
                มีรายชื่อ <strong>${this.names.length}</strong> ชื่อ พร้อมสุ่ม<br>
                กดปุ่ม "🎲 สุ่ม" ด้านล่าง เพื่อเริ่มการสุ่ม
            </p>
        `;
        this.drawArea.appendChild(readyMsg);

        if (window.settingsPanel && window.settingsPanel.refreshNamesList) {
            window.settingsPanel.refreshNamesList();
        }
    }

    // ============================================
    // EXPORT / IMPORT
    // ============================================

    exportState() {
        if (this.names.length === 0) {
            PickPop.showToast('ไม่มีข้อมูลให้ Export\nกรุณาใส่รายชื่อก่อน', 'warning');
            return;
        }

        const state = {
            version: '1.0',
            app: 'PickPop',
            mode: 'text',
            timestamp: new Date().toISOString(),
            settings: {
                duration: this.duration,
                prizeCount: this.prizeCount
            },
            names: this.names,
            drawnIndices: Array.from(this.drawnIndices)
        };

        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pickpop-text-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        PickPop.showToast('Export สำเร็จ', 'success', 2000);
    }

    async importState(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.names.length > 0) {
            const confirmImport = await PickPop.showConfirm(
                '⚠️ การ Import จะแทนที่ข้อมูลปัจจุบันทั้งหมด\n\nต้องการดำเนินการต่อหรือไม่?',
                'ยืนยันการ Import'
            );
            if (!confirmImport) {
                event.target.value = '';
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const state = JSON.parse(e.target.result);

                if (!state.names || !Array.isArray(state.names)) {
                    throw new Error('ไฟล์ไม่ถูกต้อง');
                }

                if (state.settings) {
                    this.duration = state.settings.duration || 3000;
                    this.prizeCount = state.settings.prizeCount || 1;
                }

                this.names = state.names;
                this.drawnIndices = new Set(state.drawnIndices || []);
                this.completenessConfirmed = false;

                this.updateUI();

                PickPop.showToast(`Import สำเร็จ ${state.names.length} ชื่อ`, 'success');

                if (window.settingsPanel) {
                    window.settingsPanel.closePanel();
                }

            } catch (error) {
                console.error('Import failed:', error);
                PickPop.showToast('Import ล้มเหลว: ' + error.message, 'error');
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.textApp = new TextDrawApp();
});
