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
        this.exportBtn = document.getElementById('exportBtn');

        this.durationInput = document.getElementById('durationInput');
        this.durationBtn = document.getElementById('durationBtn');
        this.prizesInput = document.getElementById('prizesInput');
        this.prizesBtn = document.getElementById('prizesBtn');

        this.winnerModal = document.getElementById('winnerModal');
        this.winnerContent = document.getElementById('winnerContent');
        this.closeModal = document.getElementById('closeModal');

        this.init();
    }

    init() {
        // File inputs
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.addMoreInput.addEventListener('change', (e) => this.handleAddMoreFiles(e));
        this.importInput.addEventListener('change', (e) => this.importState(e));

        // Control buttons
        this.resetBtn.addEventListener('click', () => this.reset());
        this.shuffleBtn.addEventListener('click', () => this.toggleAutoShuffle());
        this.drawBtn.addEventListener('click', () => this.startDraw());
        this.exportBtn.addEventListener('click', () => this.exportState());

        // Settings
        this.durationBtn.addEventListener('click', () => this.updateDuration());
        this.prizesBtn.addEventListener('click', () => this.updatePrizes());

        this.prizesInput.addEventListener('input', () => {
            const count = parseInt(this.prizesInput.value);
            if (count >= 1 && count <= 20) {
                this.prizeCount = count;
            }
        });

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
    }

    // ============================================
    // FILE HANDLING
    // ============================================

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // Check free tier limit
        if (PickPop.isOverFreeLimit(files.length)) {
            PickPop.showToast(
                `รุ่นฟรีจำกัด ${PickPop.FREE_TIER_LIMIT} คน คุณเลือก ${files.length} คน`,
                'warning',
                4000
            );
            this.showFreeTierWarning();
        }

        // Clear existing images
        this.images = [];
        this.gridContainer.innerHTML = '';
        this.gridContainer.appendChild(this.highlightBox);
        this.winnerGallery.innerHTML = '';
        this.hideEmptyState();

        files.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                this.addImage(e.target.result, index, fileName);
                if (this.images.length === files.length) {
                    this.createImageElements();
                    this.updateGrid();
                    this.drawBtn.disabled = false;
                    this.resetBtn.disabled = false;
                    this.shuffleBtn.disabled = false;
                    this.updateCounter();
                }
            };
            reader.readAsDataURL(file);
        });

        event.target.value = '';
    }

    handleAddMoreFiles(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const filesToAdd = [];
        const duplicates = [];

        const readAllFiles = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    resolve({ src: e.target.result, fileName });
                };
                reader.readAsDataURL(file);
            });
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

            // Check free tier limit after adding
            const newTotal = this.images.length + filesToAdd.length;
            if (PickPop.isOverFreeLimit(newTotal)) {
                PickPop.showToast(
                    `เพิ่มแล้วจะเกินรุ่นฟรี (${PickPop.FREE_TIER_LIMIT} คน)`,
                    'warning',
                    3000
                );
                this.showFreeTierWarning();
            }

            // Add new images
            filesToAdd.forEach((item) => {
                const nextId = this.images.length > 0
                    ? Math.max(...this.images.map(i => i.id)) + 1
                    : 0;
                this.addImage(item.src, nextId, item.fileName);
                const img = this.images[this.images.length - 1];

                const div = document.createElement('div');
                div.className = 'image-item';
                div.dataset.id = img.id;

                const imgEl = document.createElement('img');
                imgEl.src = img.src;

                div.appendChild(imgEl);
                div.addEventListener('click', () => this.toggleImage(img.id));
                img.element = div;
            });

            if (filesToAdd.length > 0) {
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
            src,
            id,
            fileName: fileName || `image_${id}`,
            disabled: false,
            element: null
        });
    }

    createImageElements() {
        this.gridContainer.innerHTML = '';
        this.gridContainer.appendChild(this.highlightBox);

        this.images.forEach((img) => {
            const div = document.createElement('div');
            div.className = 'image-item';
            div.dataset.id = img.id;

            const imgEl = document.createElement('img');
            imgEl.src = img.src;

            div.appendChild(imgEl);
            div.addEventListener('click', () => this.toggleImage(img.id));
            img.element = div;
        });
    }

    // ============================================
    // GRID LAYOUT (LOCKED HEIGHT)
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

        // LOCK maximum height with safety margin
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
    // DRAWING
    // ============================================

    async startDraw() {
        if (this.isDrawing) return;

        const eligibleImages = this.images.filter(img => !img.disabled);
        if (eligibleImages.length === 0) {
            PickPop.showToast('ไม่มีผู้เข้าร่วมที่สามารถสุ่มได้!', 'error');
            return;
        }

        // Check free tier limit
        if (PickPop.isOverFreeLimit(this.images.length)) {
            const shouldContinue = await PickPop.showConfirm(
                `รุ่นฟรีจำกัดสุ่มได้ ${PickPop.FREE_TIER_LIMIT} คน\nคุณมี ${this.images.length} คน\n\nต้องการอัปเกรดไหม?`,
                'เกินขีดจำกัดฟรี'
            );
            if (shouldContinue) {
                window.location.href = 'index.html';
            }
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

        // Animation - highlight box moves randomly
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

            setTimeout(animateHighlight, intervalTime);
        };

        animateHighlight();
    }

    finishDraw(eligibleImages, drawCount) {
        // Randomly select winners
        const shuffled = [...eligibleImages].sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, drawCount);

        // Mark as disabled
        winners.forEach(winner => {
            winner.disabled = true;
            winner.element.classList.add('winner');
        });

        // Hide highlight
        this.highlightBox.style.display = 'none';

        // Show winners in gallery
        const winnerSources = winners.map(w => w.src);
        winners.forEach(w => this.addToWinnerGallery(w));

        // Update grid and counter
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

    async toggleImage(id) {
        const img = this.images.find(i => i.id === id);
        if (!img) return;

        if (img.disabled) {
            const confirm = await PickPop.showConfirm(
                'ต้องการนำรูปนี้กลับมาสุ่มอีกครั้งใช่ไหม?',
                'ยืนยันการย้ายกลับ'
            );
            if (!confirm) return;

            img.disabled = false;
            img.element.classList.remove('disabled', 'winner');
            this.removeFromWinnerGallery(img);
        } else {
            const confirm = await PickPop.showConfirm(
                'ต้องการย้ายรูปนี้ออกจากการสุ่มใช่ไหม?',
                'ยืนยันการย้ายออก'
            );
            if (!confirm) return;

            img.disabled = true;
            img.element.classList.add('disabled');
            this.addToWinnerGallery(img);
        }

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
        if (this.isAutoShuffling) {
            this.stopAutoShuffle();
        } else {
            this.startAutoShuffle();
        }
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

        // Calculate size based on modal space
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
    // SETTINGS UPDATE
    // ============================================

    updateDuration() {
        const seconds = parseFloat(this.durationInput.value);
        if (seconds >= 1 && seconds <= 10) {
            this.duration = seconds * 1000;
            this.durationBtn.textContent = '✓';
            setTimeout(() => {
                this.durationBtn.textContent = 'OK';
            }, 500);
        }
    }

    updatePrizes() {
        const count = parseInt(this.prizesInput.value);
        if (count >= 1 && count <= 20) {
            this.prizeCount = count;
            this.prizesBtn.textContent = '✓';
            setTimeout(() => {
                this.prizesBtn.textContent = 'OK';
            }, 500);
        }
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

                // Restore settings
                if (state.settings) {
                    this.duration = state.settings.duration || 3000;
                    this.prizeCount = state.settings.prizeCount || 1;
                    this.durationInput.value = this.duration / 1000;
                    this.prizesInput.value = this.prizeCount;
                }

                // Clear current state
                this.images = [];
                this.gridContainer.innerHTML = '';
                this.gridContainer.appendChild(this.highlightBox);
                this.winnerGallery.innerHTML = '';

                // Restore images
                state.images.forEach(imgData => {
                    this.addImage(imgData.src, imgData.id, imgData.fileName);
                    const img = this.images[this.images.length - 1];
                    img.disabled = imgData.disabled;

                    const div = document.createElement('div');
                    div.className = 'image-item';
                    div.dataset.id = img.id;
                    if (img.disabled) div.classList.add('disabled');

                    const imgEl = document.createElement('img');
                    imgEl.src = img.src;

                    div.appendChild(imgEl);
                    div.addEventListener('click', () => this.toggleImage(img.id));
                    img.element = div;

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

            } catch (error) {
                console.error('Import failed:', error);
                PickPop.showToast('Import ล้มเหลว: ' + error.message, 'error');
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.imageApp = new ImageDrawApp();
});
