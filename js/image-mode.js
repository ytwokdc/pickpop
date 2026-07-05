/* ========================================
   PickPop - Image Mode Logic
   ======================================== */

class ImageDrawApp {
    constructor() {
        // State
        this.images = [];
        this.isDrawing = false;
        this.duration = 3000;
        this.prizeCount = 1;
        this.autoShuffleInterval = null;
        this.isAutoShuffling = false;

        // Built-in sound effects (spin sound + winner fanfare)
        // Separate from user-uploaded background music in Settings
        this.laserSound = new Audio('assets/sfx-laser.mp3');
        this.prizeSound = new Audio('assets/sfx-prize.mp3');

        // DOM Elements
        this.gridContainer = document.getElementById('gridContainer');
        this.emptyState = document.getElementById('emptyState');
        this.highlightBox = document.getElementById('highlightBox');
        this.winnerGallery = document.getElementById('winnerGallery');
        this.counterDisplay = document.getElementById('counterDisplay');
        this.freeTierWarning = document.getElementById('freeTierWarning');

        this.fileInput = document.getElementById('fileInput');
        this.addMoreInput = document.getElementById('addMoreInput');
        this.importInput = document.getElementById('importInput');

        this.resetBtn = document.getElementById('resetBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.drawBtn = document.getElementById('drawBtn');

        this.winnerModal = document.getElementById('winnerModal');
        this.winnerContent = document.getElementById('winnerContent');
        this.closeModal = document.getElementById('closeModal');

        this.init();
    }

    init() {
        // Hidden file inputs (backward compat)
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.addMoreInput.addEventListener('change', (e) => this.handleAddMoreFiles(e));
        this.importInput.addEventListener('change', (e) => this.importState(e));

        // Control buttons
        this.resetBtn.addEventListener('click', () => this.reset());
        this.shuffleBtn.addEventListener('click', () => this.toggleAutoShuffle());
        this.drawBtn.addEventListener('click', () => this.startDraw());

        // Modal
        this.closeModal.addEventListener('click', () => this.hideWinnerModal());
        this.winnerModal.addEventListener('click', (e) => {
            if (e.target === this.winnerModal) this.hideWinnerModal();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isDrawing && this.images.length > 0
                && !this.winnerModal.classList.contains('show')) {
                e.preventDefault();
                this.startDraw();
            }
            if (e.code === 'Escape') this.hideWinnerModal();
        });

        // Initialize settings panel and sync settings
        window.settingsPanel = new SettingsPanel(this, { mode: 'image' });
        // Sync settings from panel
        this.duration = window.settingsPanel.settings.duration || 3000;
        this.prizeCount = window.settingsPanel.settings.prizeCount || 1;
    }

    // ============================================
    // FILE HANDLING
    // ============================================

    async handleFileSelect(event) {
        let files = Array.from(event.target.files);
        if (files.length === 0) return;

        // Hard limit check (technical ceiling, separate from free tier)
        if (files.length > PickPop.IMAGE_HARD_LIMIT) {
            const proceed = await PickPop.showConfirm(
                `คุณเลือกรูปภาพ ${PickPop.formatNumber(files.length)} รูป\n\n` +
                `โหมดรูปภาพรองรับสูงสุด ${PickPop.formatNumber(PickPop.IMAGE_HARD_LIMIT)} รูป เพื่อการทำงานที่ลื่นไหลในทุกอุปกรณ์\n\n` +
                `ระบบจะใช้แค่ ${PickPop.formatNumber(PickPop.IMAGE_HARD_LIMIT)} รูปแรกเท่านั้น\n\n` +
                `💡 หากมีผู้เข้าร่วมมากกว่านี้ แนะนำให้ใช้ "โหมดสุ่มจากรายชื่อ" แทน ซึ่งไม่มีข้อจำกัดด้านจำนวน\n\n` +
                `ต้องการดำเนินการต่อหรือไม่?`,
                '⚠️ เกินขีดจำกัดทางเทคนิค'
            );
            if (!proceed) {
                event.target.value = '';
                return;
            }
            files = files.slice(0, PickPop.IMAGE_HARD_LIMIT);
        } else if (files.length > PickPop.IMAGE_SOFT_WARNING_LIMIT) {
            PickPop.showToast(
                `รูปภาพจำนวนมาก (${PickPop.formatNumber(files.length)} รูป) อาจทำให้บางอุปกรณ์ทำงานช้าลง`,
                'warning',
                4000
            );
        }

        if (PickPop.isOverFreeLimit(files.length)) {
            PickPop.showToast(
                `รุ่นฟรีจำกัด ${PickPop.FREE_TIER_LIMIT} คน คุณเลือก ${files.length} คน`,
                'warning',
                4000
            );
            this.showFreeTierWarning();
        }

        this.images = [];
        this.completenessConfirmed = false;
        this.gridContainer.innerHTML = '';
        this.gridContainer.appendChild(this.highlightBox);
        this.winnerGallery.innerHTML = '';
        this.hideEmptyState();

        if (files.length > 50) {
            PickPop.showToast(`กำลังประมวลผลรูปภาพ ${files.length} รูป...`, 'info', 3000);
        }

        // Compress all images (resize + re-encode) before storing
        const results = await Promise.all(files.map(async (file, index) => {
            try {
                const compressedSrc = await PickPop.compressImage(file);
                const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                return { src: compressedSrc, id: index, fileName };
            } catch (err) {
                console.error('Compress failed, falling back to original:', err);
                const fallbackSrc = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                return { src: fallbackSrc, id: index, fileName };
            }
        }));

        results.forEach(r => this.addImage(r.src, r.id, r.fileName));

        this.createImageElements();
        this.updateGrid();
        this.drawBtn.disabled = false;
        this.resetBtn.disabled = false;
        this.shuffleBtn.disabled = false;
        this.updateCounter();

        if (window.settingsPanel) window.settingsPanel.closePanel();

        event.target.value = '';
    }

    async handleAddMoreFiles(event) {
        let files = Array.from(event.target.files);
        if (files.length === 0) return;

        const prospectiveTotal = this.images.length + files.length;

        if (prospectiveTotal > PickPop.IMAGE_HARD_LIMIT) {
            const allowedToAdd = Math.max(0, PickPop.IMAGE_HARD_LIMIT - this.images.length);
            if (allowedToAdd === 0) {
                await PickPop.showConfirm(
                    `คุณมีรูปภาพครบ ${PickPop.formatNumber(PickPop.IMAGE_HARD_LIMIT)} รูปแล้ว (ขีดจำกัดสูงสุด)\n\n` +
                    `หากมีผู้เข้าร่วมมากกว่านี้ แนะนำให้ใช้ "โหมดสุ่มจากรายชื่อ" แทน`,
                    'ถึงขีดจำกัดสูงสุดแล้ว'
                );
                event.target.value = '';
                return;
            }
            const proceed = await PickPop.showConfirm(
                `การเพิ่มรูปนี้จะทำให้เกินขีดจำกัด ${PickPop.formatNumber(PickPop.IMAGE_HARD_LIMIT)} รูป\n\n` +
                `ระบบจะเพิ่มได้อีกแค่ ${PickPop.formatNumber(allowedToAdd)} รูปเท่านั้น\n\n` +
                `หากมีผู้เข้าร่วมมากกว่านี้ แนะนำให้ใช้ "โหมดสุ่มจากรายชื่อ" แทน\n\nต้องการดำเนินการต่อหรือไม่?`,
                'เกินขีดจำกัดทางเทคนิค'
            );
            if (!proceed) {
                event.target.value = '';
                return;
            }
            files = files.slice(0, allowedToAdd);
        } else if (prospectiveTotal > PickPop.IMAGE_SOFT_WARNING_LIMIT) {
            PickPop.showToast(
                `รูปภาพจำนวนมาก (รวม ${PickPop.formatNumber(prospectiveTotal)} รูป) อาจทำให้บางอุปกรณ์ทำงานช้าลง`,
                'warning',
                4000
            );
        }

        const filesToAdd = [];
        const duplicates = [];

        if (files.length > 50) {
            PickPop.showToast(`กำลังประมวลผลรูปภาพ ${files.length} รูป...`, 'info', 3000);
        }

        const readAllFiles = files.map(async (file) => {
            try {
                const compressedSrc = await PickPop.compressImage(file);
                const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                return { src: compressedSrc, fileName };
            } catch (err) {
                console.error('Compress failed, falling back to original:', err);
                const fallbackSrc = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
                const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                return { src: fallbackSrc, fileName };
            }
        });

        Promise.all(readAllFiles).then(async (results) => {
            for (const { src, fileName } of results) {
                const duplicateBySrc = this.images.find(img => img.src === src);
                if (duplicateBySrc) {
                    duplicates.push(fileName);
                    continue;
                }

                const duplicateByName = this.images.find(img => img.fileName === fileName);
                if (duplicateByName) {
                    const shouldAdd = await PickPop.showConfirm(
                        `มีรูปชื่อ "${fileName}" อยู่แล้ว แต่เป็นคนละรูปกัน\n\nต้องการเพิ่มรูปนี้ไหม?\nระบบจะเปลี่ยนชื่อเป็น "${fileName}_${Date.now()}" อัตโนมัติ`,
                        'พบชื่อไฟล์ซ้ำ'
                    );
                    if (shouldAdd) {
                        filesToAdd.push({ src, fileName: `${fileName}_${Date.now()}` });
                    }
                } else {
                    filesToAdd.push({ src, fileName });
                }
            }

            const newTotal = this.images.length + filesToAdd.length;
            if (PickPop.isOverFreeLimit(newTotal)) {
                PickPop.showToast(
                    `เพิ่มแล้วจะเกินรุ่นฟรี (${PickPop.FREE_TIER_LIMIT} คน)`,
                    'warning',
                    3000
                );
                this.showFreeTierWarning();
            }

            filesToAdd.forEach((item) => {
                const nextId = this.images.length > 0
                    ? Math.max(...this.images.map(i => i.id)) + 1
                    : 0;
                this.addImage(item.src, nextId, item.fileName);
                const img = this.images[this.images.length - 1];
                this.buildImageElement(img);
            });

            if (filesToAdd.length > 0) {
                this.completenessConfirmed = false;
                this.updateGrid();
                this.drawBtn.disabled = false;
                this.resetBtn.disabled = false;
                this.shuffleBtn.disabled = false;
                this.updateCounter();

                PickPop.showToast(
                    `เพิ่มรูปสำเร็จ ${filesToAdd.length} รูป`,
                    'success',
                    2500
                );

                // Close settings panel
                if (window.settingsPanel) window.settingsPanel.closePanel();
            } else if (duplicates.length > 0) {
                PickPop.showToast(
                    `พบรูปซ้ำทั้งหมด ${duplicates.length} รูป — ไม่ได้เพิ่ม`,
                    'info',
                    2500
                );
            }
        });

        event.target.value = '';
    }

    addImage(src, id, fileName = null) {
        this.images.push({
            src, id,
            fileName: fileName || `image_${id}`,
            disabled: false,
            element: null
        });
    }

    createImageElements() {
        this.gridContainer.innerHTML = '';
        this.gridContainer.appendChild(this.highlightBox);

        this.images.forEach((img) => {
            this.buildImageElement(img);
        });
    }

    // Build the DOM element for one image: the thumbnail plus a clear
    // delete (✕) button — replaces the old "click the whole photo to
    // exclude it" behavior, which users found ambiguous.
    buildImageElement(img) {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.id = img.id;

        const imgEl = document.createElement('img');
        imgEl.src = img.src;
        div.appendChild(imgEl);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'image-delete-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = 'ลบรูปนี้ออกจากรายการ';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteImage(img.id);
        });
        div.appendChild(deleteBtn);

        img.element = div;
        return div;
    }

    // Permanently remove an image from the pool (not just hide it).
    // Users can always add it back via "+ เพิ่มรูป".
    async deleteImage(id) {
        const idx = this.images.findIndex(img => img.id === id);
        if (idx === -1) return;

        const confirmed = await PickPop.showConfirm(
            'ต้องการลบรูปนี้ออกจากรายการทั้งหมดหรือไม่?\n\n(หากต้องการเพิ่มกลับ ให้กด "+ เพิ่มรูป" อัปโหลดใหม่อีกครั้ง)',
            'ยืนยันการลบรูป'
        );
        if (!confirmed) return;

        this.images.splice(idx, 1);
        this.completenessConfirmed = false;

        this.updateGrid();
        this.updateCounter();

        if (this.images.length === 0) {
            this.drawBtn.disabled = true;
            this.resetBtn.disabled = true;
            this.shuffleBtn.disabled = true;
        }

        PickPop.showToast('ลบรูปเรียบร้อย', 'info', 1500);
    }

    // ============================================
    // GRID LAYOUT
    // ============================================

    updateGrid() {
        const eligibleImages = this.images.filter(img => !img.disabled);
        const count = eligibleImages.length;

        if (count === 0) {
            if (this.images.length === 0) this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        const containerWidth = this.gridContainer.offsetWidth;
        const containerHeight = this.gridContainer.offsetHeight;
        const gap = 10;
        const MAX_GRID_HEIGHT = containerHeight - 30;

        let bestCols = 1;
        let bestRows = count;
        let bestImageSize = 0;

        for (let cols = 1; cols <= count; cols++) {
            const rows = Math.ceil(count / cols);
            const availableWidth = containerWidth - (cols - 1) * gap;
            const maxWidthPerImage = Math.floor(availableWidth / cols);
            const availableHeight = MAX_GRID_HEIGHT - (rows - 1) * gap;
            const maxHeightPerImage = Math.floor(availableHeight / rows);
            const imageSize = Math.min(maxWidthPerImage, maxHeightPerImage);

            if (imageSize <= 0) continue;

            const actualGridHeight = (rows * imageSize) + ((rows - 1) * gap);
            if (actualGridHeight > MAX_GRID_HEIGHT) continue;

            if (imageSize > bestImageSize) {
                bestImageSize = imageSize;
                bestCols = cols;
                bestRows = rows;
            }
        }

        this.gridContainer.style.gridTemplateColumns = `repeat(${bestCols}, ${bestImageSize}px)`;
        this.gridContainer.style.gridTemplateRows = `repeat(${bestRows}, ${bestImageSize}px)`;
        this.gridContainer.style.gap = `${gap}px`;

        const highlight = this.highlightBox;
        this.gridContainer.innerHTML = '';
        this.gridContainer.appendChild(highlight);
        this.highlightBox = highlight;

        eligibleImages.forEach((img) => {
            this.gridContainer.appendChild(img.element);
        });
    }

    // ============================================
    // EMPTY STATE
    // ============================================

    showEmptyState() {
        this.gridContainer.innerHTML = '';
        this.gridContainer.appendChild(this.emptyState);
        this.gridContainer.appendChild(this.highlightBox);
        this.emptyState.style.display = 'flex';
    }

    hideEmptyState() {
        if (this.emptyState.parentNode) {
            this.emptyState.style.display = 'none';
        }
    }

    // ============================================
    // COUNTER
    // ============================================

    updateCounter() {
        const totalCount = this.images.length;
        const activeCount = this.images.filter(img => !img.disabled).length;
        this.counterDisplay.textContent = `${activeCount}/${totalCount}`;

        this.counterDisplay.classList.remove('limit-warning', 'limit-exceeded');
        this.gridContainer.classList.remove('limit-exceeded');
        if (activeCount > PickPop.FREE_TIER_LIMIT) {
            this.counterDisplay.classList.add('limit-exceeded');
            this.gridContainer.classList.add('limit-exceeded');
        } else if (activeCount >= PickPop.FREE_TIER_LIMIT * 0.8) {
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
    // DRAWING
    // ============================================

    async startDraw() {
        if (this.isDrawing) return;

        const eligibleImages = this.images.filter(img => !img.disabled);
        if (eligibleImages.length === 0) {
            PickPop.showToast('ไม่มีผู้เข้าร่วมที่สามารถสุ่มได้!', 'error');
            return;
        }

        // One-time reminder before the FIRST draw of this session —
        // give users a last chance to verify the list is complete.
        if (!this.completenessConfirmed) {
            const confirmed = await PickPop.showConfirm(
                `คุณมีรูปภาพทั้งหมด ${this.images.length} รูป\n\n` +
                `ตรวจสอบแล้วใช่ไหมว่ารูปภาพครบถ้วน ไม่มีใครตกหล่น?\n` +
                `(เมื่อเริ่มสุ่มไปแล้ว การเพิ่มคนภายหลังอาจทำให้เกิดความสับสน)`,
                '✅ ตรวจสอบความครบถ้วน'
            );
            if (!confirmed) return;
            this.completenessConfirmed = true;
        }

        if (PickPop.isOverFreeLimit(eligibleImages.length)) {
            const shouldContinue = await PickPop.showConfirm(
                `รุ่นฟรีจำกัดสุ่มได้ ${PickPop.FREE_TIER_LIMIT} คน\nคุณมีรูปที่พร้อมสุ่ม ${eligibleImages.length} คน\n\nต้องการอัปเกรดไหม?`,
                'เกินขีดจำกัดฟรี'
            );
            if (shouldContinue) window.location.href = 'index.html';
            return;
        }

        const drawCount = Math.min(this.prizeCount, eligibleImages.length);
        if (drawCount === 0) {
            PickPop.showToast('ไม่มีผู้เข้าร่วมที่สามารถสุ่มได้!', 'error');
            return;
        }

        this.stopAutoShuffle();
        this.isDrawing = true;
        this.drawBtn.disabled = true;
        this.resetBtn.disabled = true;
        this.shuffleBtn.disabled = true;

        // Play music
        if (window.settingsPanel) window.settingsPanel.playMusic();

        this.highlightBox.style.display = 'block';
        const startTime = Date.now();
        const duration = this.duration;
        const intervalTime = 100;

        const animateHighlight = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed >= duration) {
                this.finishDraw(eligibleImages, drawCount);
                return;
            }

            const currentEligible = this.images.filter(img => !img.disabled);
            if (currentEligible.length > 0) {
                const randomIdx = Math.floor(Math.random() * currentEligible.length);
                const targetImg = currentEligible[randomIdx];
                if (targetImg && targetImg.element) {
                    const rect = targetImg.element.getBoundingClientRect();
                    const containerRect = this.gridContainer.getBoundingClientRect();
                    this.highlightBox.style.left = (rect.left - containerRect.left) + 'px';
                    this.highlightBox.style.top = (rect.top - containerRect.top) + 'px';
                    this.highlightBox.style.width = rect.width + 'px';
                    this.highlightBox.style.height = rect.height + 'px';
                }
            }
            this.playLaserSound();

            setTimeout(animateHighlight, intervalTime);
        };

        animateHighlight();
    }

    // Play the built-in "spin" sound effect. Clones the audio node each
    // time so overlapping plays don't cut each other off.
    playLaserSound() {
        if (!this.laserSound) return;
        const sound = this.laserSound.cloneNode();
        sound.volume = 0.5;
        sound.play().catch(e => console.log('Laser sound play failed:', e));
    }

    finishDraw(eligibleImages, drawCount) {
        const shuffled = [...eligibleImages].sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, drawCount);

        winners.forEach(winner => {
            winner.disabled = true;
            winner.element.classList.add('winner');
        });

        this.highlightBox.style.display = 'none';

        const winnerSources = winners.map(w => w.src);
        winners.forEach(w => this.addToWinnerGallery(w));

        // Play the built-in winner fanfare
        if (this.prizeSound) {
            this.prizeSound.currentTime = 0;
            this.prizeSound.play().catch(e => console.log('Prize sound play failed:', e));
        }

        // Stop user-uploaded background music
        if (window.settingsPanel) window.settingsPanel.stopMusic();

        setTimeout(() => {
            winners.forEach(w => {
                w.element.classList.remove('winner');
                w.element.classList.add('disabled');
            });
            this.updateGrid();
            this.updateCounter();
            this.showWinnerModal(winnerSources);

            this.isDrawing = false;
            this.drawBtn.disabled = false;
            this.resetBtn.disabled = false;
            this.shuffleBtn.disabled = false;
        }, 1500);
    }

    // ============================================
    // WINNER GALLERY
    // ============================================

    addToWinnerGallery(img) {
        const div = document.createElement('div');
        div.className = 'winner-gallery-item';
        div.dataset.id = img.id;
        div.addEventListener('click', () => this.toggleImage(img.id));

        const imgEl = document.createElement('img');
        imgEl.src = img.src;

        div.appendChild(imgEl);
        this.winnerGallery.appendChild(div);
    }

    removeFromWinnerGallery(img) {
        const item = this.winnerGallery.querySelector(`[data-id="${img.id}"]`);
        if (item) item.remove();
    }

    // ============================================
    // TOGGLE / RESET
    // ============================================

    // Only handles restoring an image from the winner gallery back into
    // the active pool. Excluding an active image is now done via the
    // explicit delete (✕) button on each thumbnail — see deleteImage().
    async toggleImage(id) {
        const img = this.images.find(i => i.id === id);
        if (!img || !img.disabled) return;

        const confirm = await PickPop.showConfirm(
            'ต้องการนำรูปนี้กลับมาสุ่มอีกครั้งใช่ไหม?',
            'ยืนยันการนำกลับมาสุ่ม'
        );
        if (!confirm) return;

        img.disabled = false;
        img.element.classList.remove('disabled', 'winner');
        this.removeFromWinnerGallery(img);

        this.updateGrid();
        this.updateCounter();
    }

    reset() {
        this.images.forEach(img => {
            img.disabled = false;
            if (img.element) {
                img.element.classList.remove('disabled', 'winner');
            }
            this.removeFromWinnerGallery(img);
        });
        this.highlightBox.style.display = 'none';
        this.hideWinnerModal();
        this.stopAutoShuffle();
        this.updateGrid();
        this.updateCounter();
    }

    // ============================================
    // AUTO SHUFFLE
    // ============================================

    toggleAutoShuffle() {
        if (this.isAutoShuffling) this.stopAutoShuffle();
        else this.startAutoShuffle();
    }

    startAutoShuffle() {
        if (this.images.filter(i => !i.disabled).length < 2) return;
        this.isAutoShuffling = true;
        this.shuffleBtn.classList.add('active');
        this.shuffleBtn.innerHTML = '⏸ Stop';

        this.autoShuffleInterval = setInterval(() => {
            this.shuffleImages();
        }, 1000);
    }

    stopAutoShuffle() {
        if (this.autoShuffleInterval) {
            clearInterval(this.autoShuffleInterval);
            this.autoShuffleInterval = null;
        }
        this.isAutoShuffling = false;
        this.shuffleBtn.classList.remove('active');
        this.shuffleBtn.innerHTML = '🔀 Shuffle';
    }

    shuffleImages() {
        const eligibleIndices = [];
        this.images.forEach((img, index) => {
            if (!img.disabled) eligibleIndices.push(index);
        });

        for (let i = eligibleIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const idxI = eligibleIndices[i];
            const idxJ = eligibleIndices[j];
            [this.images[idxI], this.images[idxJ]] = [this.images[idxJ], this.images[idxI]];
        }

        this.updateGrid();
    }

    // ============================================
    // WINNER MODAL
    // ============================================

    showWinnerModal(imageSources) {
        this.winnerContent.innerHTML = '';

        const count = imageSources.length;
        let cols = 1;
        if (count >= 2 && count <= 4) cols = 2;
        else if (count >= 5 && count <= 9) cols = 3;
        else if (count >= 10) cols = 4;

        this.winnerContent.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        const maxSize = count <= 4 ? 200 : count <= 9 ? 150 : 120;

        imageSources.forEach((src, index) => {
            const div = document.createElement('div');
            div.className = 'winner-image-large';
            div.style.width = `${maxSize}px`;
            div.style.height = `${maxSize}px`;
            div.style.animationDelay = `${index * 0.1}s`;

            const img = document.createElement('img');
            img.src = src;

            div.appendChild(img);
            this.winnerContent.appendChild(div);
        });

        this.winnerModal.classList.add('show');
    }

    hideWinnerModal() {
        this.winnerModal.classList.remove('show');
    }

    // ============================================
    // EXPORT / IMPORT (JSON)
    // ============================================

    exportState() {
        if (this.images.length === 0) {
            PickPop.showToast('ไม่มีข้อมูลให้ Export\nกรุณาเลือกรูปภาพก่อน', 'warning');
            return;
        }

        const state = {
            version: '1.0',
            app: 'PickPop',
            mode: 'image',
            timestamp: new Date().toISOString(),
            settings: {
                duration: this.duration,
                prizeCount: this.prizeCount
            },
            images: this.images.map(img => ({
                id: img.id,
                fileName: img.fileName,
                src: img.src,
                disabled: img.disabled
            }))
        };

        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pickpop-image-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        PickPop.showToast('Export สำเร็จ', 'success', 2000);
    }

    async importState(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.images.length > 0) {
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

                if (!state.images || !Array.isArray(state.images)) {
                    throw new Error('ไฟล์ไม่ถูกต้อง');
                }

                if (state.settings) {
                    this.duration = state.settings.duration || 3000;
                    this.prizeCount = state.settings.prizeCount || 1;
                }

                this.images = [];
                this.completenessConfirmed = false;
                this.gridContainer.innerHTML = '';
                this.gridContainer.appendChild(this.highlightBox);
                this.winnerGallery.innerHTML = '';

                state.images.forEach(imgData => {
                    this.addImage(imgData.src, imgData.id, imgData.fileName);
                    const img = this.images[this.images.length - 1];
                    img.disabled = imgData.disabled;

                    this.buildImageElement(img);
                    if (img.disabled) img.element.classList.add('disabled');

                    if (img.disabled) this.addToWinnerGallery(img);
                });

                this.updateGrid();
                this.updateCounter();

                if (this.images.length > 0) {
                    this.drawBtn.disabled = false;
                    this.resetBtn.disabled = false;
                    this.shuffleBtn.disabled = false;
                }

                PickPop.showToast(`Import สำเร็จ ${state.images.length} รูป`, 'success');

                if (window.settingsPanel) window.settingsPanel.closePanel();

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
    window.imageApp = new ImageDrawApp();
});
