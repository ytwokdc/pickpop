/* ========================================
   PickPop - Settings Panel Logic
   (Shared between image-mode & text-mode)
   ======================================== */

const THAI_FONTS = [
    { name: 'Prompt', value: 'Prompt', style: 'Modern' },
    { name: 'Kanit', value: 'Kanit', style: 'Modern' },
    { name: 'Sarabun', value: 'Sarabun', style: 'Clean' },
    { name: 'Mitr', value: 'Mitr', style: 'Rounded' },
    { name: 'IBM Plex Sans Thai', value: 'IBM Plex Sans Thai', style: 'Professional' },
    { name: 'Noto Sans Thai', value: 'Noto Sans Thai', style: 'Standard' },
    { name: 'Chakra Petch', value: 'Chakra Petch', style: 'Bold' },
    { name: 'Bai Jamjuree', value: 'Bai Jamjuree', style: 'Modern' },
    { name: 'Mali', value: 'Mali', style: 'Handwritten' },
    { name: 'Sriracha', value: 'Sriracha', style: 'Casual' },
    { name: 'Charm', value: 'Charm', style: 'Elegant' },
    { name: 'Taviraj', value: 'Taviraj', style: 'Serif' }
];

const FONT_SIZES = [
    { name: 'เล็ก', value: '14px' },
    { name: 'ปกติ', value: '16px' },
    { name: 'ใหญ่', value: '18px' },
    { name: 'ใหญ่มาก', value: '22px' },
    { name: 'พิเศษ', value: '26px' }
];

class SettingsPanel {
    constructor(app, options = {}) {
        this.app = app;
        this.mode = options.mode || 'image';
        this.settings = this.loadSettings();
        this.uploadedMusic = null;
        this.uploadedBackground = null;

        this.createSettingsButton();
        this.createSettingsPanel();
        this.applySettings();
        this.loadGoogleFonts();
    }

    loadGoogleFonts() {
        const fontFamilies = THAI_FONTS.map(f => f.value.replace(/ /g, '+')).join('&family=');
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    createSettingsButton() {
        const btn = document.createElement('button');
        btn.className = 'settings-btn';
        btn.innerHTML = `
            <span class="settings-btn-icon">⚙️</span>
            <span>ตั้งค่า</span>
        `;
        btn.addEventListener('click', () => this.openPanel());

        const topBarRight = document.querySelector('.top-bar-right');
        if (topBarRight) {
            topBarRight.appendChild(btn);
        }
        this.settingsBtn = btn;
    }

    createSettingsPanel() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-overlay';
        this.overlay.addEventListener('click', () => this.closePanel());

        this.panel = document.createElement('div');
        this.panel.className = 'settings-panel';
        this.panel.innerHTML = this.getPanelHTML();

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.panel);

        this.attachPanelEvents();
    }

    getPanelHTML() {
        const isImageMode = this.mode === 'image';

        return `
            <div class="settings-header">
                <h2>⚙️ ตั้งค่า</h2>
                <button class="settings-close" id="settingsClose">✕</button>
            </div>

            <div class="settings-content">
                <!-- File Management -->
                <div class="settings-section">
                    <h3 class="settings-section-title">
                        ${isImageMode ? '📁 จัดการรูป' : '📝 จัดการรายชื่อ'}
                    </h3>

                    ${isImageMode ? `
                    <div class="setting-item">
                        <label class="setting-label">เลือกรูปภาพใหม่</label>
                        <label for="setting-file-input" class="setting-btn setting-btn-primary">
                            📁 เลือกรูปภาพ (แทนที่ทั้งหมด)
                        </label>
                        <input type="file" id="setting-file-input" class="setting-file-input" 
                               accept="image/jpeg,image/png,image/webp" multiple>
                        <p class="setting-hint">รองรับ JPG, PNG, WebP</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">เพิ่มรูปเพิ่มเติม</label>
                        <label for="setting-add-input" class="setting-btn setting-btn-accent">
                            + เพิ่มรูป (ไม่ลบของเดิม)
                        </label>
                        <input type="file" id="setting-add-input" class="setting-file-input" 
                               accept="image/jpeg,image/png,image/webp" multiple>
                    </div>
                    ` : `
                    <div class="settings-note">
                        💡 <strong>วิธีนำเข้ารายชื่อ:</strong> พิมพ์หรือวางรายชื่อลงในกล่องด้านล่าง <strong>บรรทัดละ 1 ชื่อ</strong> 
                        หรือ Import จากไฟล์ .txt ก็ได้
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">พิมพ์/วางรายชื่อ (บรรทัดละ 1 ชื่อ)</label>
                        <textarea id="setting-names-input" class="setting-input" rows="8" 
                                  placeholder="ตัวอย่าง:&#10;สมชาย ใจดี&#10;สมหญิง จริงใจ&#10;สมศักดิ์ รักงาน"
                                  style="resize: vertical; min-height: 120px; font-family: inherit;"></textarea>
                        <button class="setting-btn setting-btn-primary" id="setting-names-apply" style="margin-top: 8px;">
                            ✓ อัปเดตรายชื่อ
                        </button>
                        <p class="setting-hint">
                            การกดปุ่มจะแทนที่รายชื่อเดิมทั้งหมด
                        </p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">หรือ Import จากไฟล์ .txt</label>
                        <label for="setting-txt-input" class="setting-btn setting-btn-accent">
                            📄 เลือกไฟล์ .txt
                        </label>
                        <input type="file" id="setting-txt-input" class="setting-file-input" accept=".txt">
                        <p class="setting-hint">ระบบจะอ่านทีละบรรทัดเป็น 1 ชื่อ</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">รายการทั้งหมด (<span id="setting-names-count">0</span> รายชื่อ)</label>
                        <div id="setting-names-list" class="setting-names-list"></div>
                        <p class="setting-hint">💡 คลิก ✕ เพื่อลบ หรือแก้ไขในกล่องด้านบน</p>
                    </div>
                    `}
                </div>

                <!-- Draw Settings -->
                <div class="settings-section">
                    <h3 class="settings-section-title">🎲 การสุ่ม</h3>

                    <div class="setting-item">
                        <label class="setting-label">จำนวนรางวัลต่อครั้ง</label>
                        <div class="setting-number-group">
                            <input type="number" id="setting-prizes" class="setting-input" 
                                   min="1" max="20" value="${this.settings.prizeCount || 1}">
                        </div>
                        <p class="setting-hint">สุ่มพร้อมกัน 1-20 รางวัลต่อครั้ง</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">เวลาสุ่ม (วินาที)</label>
                        <div class="setting-range-group">
                            <input type="range" id="setting-duration" class="setting-range" 
                                   min="1" max="10" step="0.5" value="${(this.settings.duration || 3000) / 1000}">
                            <span class="setting-range-value" id="setting-duration-value">
                                ${(this.settings.duration || 3000) / 1000}s
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Appearance -->
                <div class="settings-section">
                    <h3 class="settings-section-title">🎨 รูปลักษณ์</h3>

                    <div class="setting-item">
                        <label class="setting-label">ฟอนต์</label>
                        <select id="setting-font" class="setting-select">
                            ${THAI_FONTS.map(f => `
                                <option value="${f.value}" ${this.settings.font === f.value ? 'selected' : ''}>
                                    ${f.name} (${f.style})
                                </option>
                            `).join('')}
                        </select>
                        <div class="font-preview" id="font-preview" style="font-family: '${this.settings.font || 'Prompt'}';">
                            ผู้โชคดี ABC 123
                        </div>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">ขนาดฟอนต์</label>
                        <select id="setting-font-size" class="setting-select">
                            ${FONT_SIZES.map(s => `
                                <option value="${s.value}" ${this.settings.fontSize === s.value ? 'selected' : ''}>
                                    ${s.name} (${s.value})
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    ${!isImageMode ? `
                    <div class="setting-item">
                        <label class="setting-label">สีตัวอักษร (ตอนสุ่ม)</label>
                        <div class="setting-color-group">
                            <input type="color" id="setting-text-color" class="setting-color-picker" 
                                   value="${this.settings.textColor || '#ffffff'}">
                            <input type="text" id="setting-text-color-text" class="setting-color-text" 
                                   value="${this.settings.textColor || '#FFFFFF'}" maxlength="7">
                        </div>
                    </div>
                    ` : ''}

                    <div class="setting-item">
                        <label class="setting-label">สีพื้นหลัง</label>
                        <div class="setting-color-group">
                            <input type="color" id="setting-bg-color" class="setting-color-picker" 
                                   value="${this.settings.bgColor || '#667eea'}">
                            <input type="text" id="setting-bg-color-text" class="setting-color-text" 
                                   value="${this.settings.bgColor || '#667eea'}" maxlength="7">
                        </div>
                        <p class="setting-hint">หรือเลือกรูปพื้นหลังด้านล่าง</p>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">รูปพื้นหลัง (ไม่บังคับ)</label>
                        <label for="setting-bg-image" class="setting-btn setting-btn-primary">
                            🖼️ เลือกรูปพื้นหลัง
                        </label>
                        <input type="file" id="setting-bg-image" class="setting-file-input" accept="image/*">
                        <p class="setting-hint">
                            แนะนำ: <strong>1920x1080</strong> (16:9)<br>
                            รองรับ JPG, PNG, WebP
                        </p>
                        <div id="bg-image-info"></div>
                    </div>
                </div>

                <!-- Audio -->
                <div class="settings-section">
                    <h3 class="settings-section-title">🎵 เสียง</h3>

                    <div class="setting-item">
                        <label class="setting-toggle">
                            <span class="setting-toggle-label">เปิดเสียงเพลงคลอ</span>
                            <input type="checkbox" id="setting-audio-enabled" class="toggle-checkbox"
                                   ${this.settings.audioEnabled ? 'checked' : ''}>
                            <span class="toggle-switch"></span>
                        </label>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">อัปโหลดเพลงคลอ</label>
                        <label for="setting-music" class="setting-btn setting-btn-purple">
                            🎵 เลือกไฟล์เพลง
                        </label>
                        <input type="file" id="setting-music" class="setting-file-input" accept="audio/*">
                        <p class="setting-hint">
                            เพลงจะเล่นวนซ้ำระหว่างการสุ่ม<br>
                            รองรับ MP3, WAV, OGG
                        </p>
                        <div id="music-info"></div>
                    </div>

                    <div class="setting-item">
                        <label class="setting-label">ระดับเสียง</label>
                        <div class="setting-range-group">
                            <input type="range" id="setting-volume" class="setting-range" 
                                   min="0" max="100" value="${this.settings.volume || 50}">
                            <span class="setting-range-value" id="setting-volume-value">
                                ${this.settings.volume || 50}%
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Import/Export -->
                <div class="settings-section">
                    <h3 class="settings-section-title">💾 บันทึก / กู้คืน</h3>

                    <div class="settings-note">
                        <strong>หมายเหตุ:</strong> Export/Import ไม่ใช่การนำเข้ารายการ 
                        แต่เป็นการ<strong>บันทึกข้อมูลทั้งหมด</strong>
                        (${isImageMode ? 'รูปภาพ' : 'รายชื่อ'} + การตั้งค่า) 
                        เพื่อกลับมาใช้ต่อภายหลัง
                    </div>

                    <div class="setting-btn-group">
                        <button class="setting-btn setting-btn-success" id="setting-export">
                            💾 Export JSON
                        </button>
                        <label for="setting-import" class="setting-btn setting-btn-purple">
                            📂 Import JSON
                        </label>
                    </div>
                    <input type="file" id="setting-import" class="setting-file-input" accept=".json">
                    <p class="setting-hint">
                        💡 แนะนำให้ Export ไฟล์ JSON ไว้ก่อนปิดหน้าเว็บ
                        เพราะข้อมูลจะหายเมื่อรีเฟรช
                    </p>
                </div>
            </div>
        `;
    }

    attachPanelEvents() {
        this.panel.querySelector('#settingsClose').addEventListener('click', () => this.closePanel());

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.panel.classList.contains('show')) {
                this.closePanel();
            }
        });

        // ============ IMAGE MODE ============
        if (this.mode === 'image') {
            const fileInput = this.panel.querySelector('#setting-file-input');
            const addInput = this.panel.querySelector('#setting-add-input');

            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    if (this.app.handleFileSelect) {
                        this.app.handleFileSelect({ target: { files: e.target.files, value: '' } });
                        e.target.value = '';
                    }
                });
            }

            if (addInput) {
                addInput.addEventListener('change', (e) => {
                    if (this.app.handleAddMoreFiles) {
                        this.app.handleAddMoreFiles({ target: { files: e.target.files, value: '' } });
                        e.target.value = '';
                    }
                });
            }
        }

        // ============ TEXT MODE ============
        if (this.mode === 'text') {
            const namesInput = this.panel.querySelector('#setting-names-input');
            const applyBtn = this.panel.querySelector('#setting-names-apply');
            const txtInput = this.panel.querySelector('#setting-txt-input');

            // Load current names into textarea
            if (namesInput && this.app.names) {
                namesInput.value = this.app.names.join('\n');
            }

            // Apply names button
            if (applyBtn) {
                applyBtn.addEventListener('click', () => {
                    const text = namesInput.value;
                    if (this.app.setNamesFromText) {
                        this.app.setNamesFromText(text);
                        this.refreshNamesList();
                    }
                });
            }

            // Import .txt file
            if (txtInput) {
                txtInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const text = event.target.result;
                        namesInput.value = text;
                        if (this.app.setNamesFromText) {
                            this.app.setNamesFromText(text);
                            this.refreshNamesList();
                        }
                    };
                    reader.readAsText(file, 'UTF-8');
                    e.target.value = '';
                });
            }

            this.refreshNamesList();

            // Text color
            const textColorInput = this.panel.querySelector('#setting-text-color');
            const textColorText = this.panel.querySelector('#setting-text-color-text');
            if (textColorInput) {
                textColorInput.addEventListener('input', (e) => {
                    const color = e.target.value;
                    textColorText.value = color.toUpperCase();
                    this.settings.textColor = color;
                    this.saveSettings();
                });
                textColorText.addEventListener('input', (e) => {
                    const color = e.target.value;
                    if (/^#[0-9A-F]{6}$/i.test(color)) {
                        textColorInput.value = color;
                        this.settings.textColor = color;
                        this.saveSettings();
                    }
                });
            }
        }

        // ============ COMMON ============
        const prizesInput = this.panel.querySelector('#setting-prizes');
        prizesInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (val >= 1 && val <= 20) {
                this.settings.prizeCount = val;
                if (this.app.prizeCount !== undefined) this.app.prizeCount = val;
                this.saveSettings();
            }
        });

        const durationInput = this.panel.querySelector('#setting-duration');
        const durationValue = this.panel.querySelector('#setting-duration-value');
        durationInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            durationValue.textContent = val + 's';
            this.settings.duration = val * 1000;
            if (this.app.duration !== undefined) this.app.duration = val * 1000;
            this.saveSettings();
        });

        const fontSelect = this.panel.querySelector('#setting-font');
        const fontPreview = this.panel.querySelector('#font-preview');
        fontSelect.addEventListener('change', (e) => {
            this.settings.font = e.target.value;
            fontPreview.style.fontFamily = `'${e.target.value}', sans-serif`;
            this.applyFont();
            this.saveSettings();
        });

        const fontSizeSelect = this.panel.querySelector('#setting-font-size');
        fontSizeSelect.addEventListener('change', (e) => {
            this.settings.fontSize = e.target.value;
            this.applyFontSize();
            this.saveSettings();
        });

        const bgColorInput = this.panel.querySelector('#setting-bg-color');
        const bgColorText = this.panel.querySelector('#setting-bg-color-text');
        bgColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            bgColorText.value = color.toUpperCase();
            this.settings.bgColor = color;
            this.settings.bgImage = null;
            this.applyBackground();
            this.saveSettings();
        });
        bgColorText.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                bgColorInput.value = color;
                this.settings.bgColor = color;
                this.settings.bgImage = null;
                this.applyBackground();
                this.saveSettings();
            }
        });

        const bgImageInput = this.panel.querySelector('#setting-bg-image');
        bgImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                this.settings.bgImage = event.target.result;
                this.uploadedBackground = file.name;
                this.applyBackground();
                this.showBackgroundInfo(file.name);
                this.saveSettings();
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        const audioToggle = this.panel.querySelector('#setting-audio-enabled');
        audioToggle.addEventListener('change', (e) => {
            this.settings.audioEnabled = e.target.checked;
            this.saveSettings();
        });

        const musicInput = this.panel.querySelector('#setting-music');
        musicInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                this.settings.musicData = event.target.result;
                this.uploadedMusic = file.name;
                this.showMusicInfo(file.name);
                this.saveSettings();
                PickPop.showToast(`อัปโหลดเพลง "${file.name}" สำเร็จ`, 'success');
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });

        const volumeInput = this.panel.querySelector('#setting-volume');
        const volumeValue = this.panel.querySelector('#setting-volume-value');
        volumeInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            volumeValue.textContent = val + '%';
            this.settings.volume = val;
            this.saveSettings();
        });

        const exportBtn = this.panel.querySelector('#setting-export');
        exportBtn.addEventListener('click', () => {
            if (this.app.exportState) this.app.exportState();
        });

        const importInput = this.panel.querySelector('#setting-import');
        importInput.addEventListener('change', (e) => {
            if (this.app.importState) this.app.importState(e);
        });
    }

    // Refresh names list display (text mode)
    refreshNamesList() {
        if (this.mode !== 'text') return;

        const listEl = this.panel.querySelector('#setting-names-list');
        const countEl = this.panel.querySelector('#setting-names-count');
        if (!listEl || !this.app.names) return;

        countEl.textContent = this.app.names.length;

        if (this.app.names.length === 0) {
            listEl.innerHTML = '<div class="empty-names-msg">ยังไม่มีรายชื่อ</div>';
            return;
        }

        listEl.innerHTML = this.app.names.map((name, index) => `
            <div class="name-list-item ${this.app.drawnIndices && this.app.drawnIndices.has(index) ? 'drawn' : ''}">
                <span class="name-list-number">${index + 1}.</span>
                <span class="name-list-text">${this.escapeHtml(name)}</span>
                ${this.app.drawnIndices && this.app.drawnIndices.has(index) 
                    ? '<span class="name-list-status">✓ สุ่มแล้ว</span>' 
                    : `<button class="name-list-remove" data-index="${index}">✕</button>`}
            </div>
        `).join('');

        // Attach delete handlers
        listEl.querySelectorAll('.name-list-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                if (this.app.removeName) {
                    this.app.removeName(idx);
                    // Update textarea too
                    const namesInput = this.panel.querySelector('#setting-names-input');
                    if (namesInput) namesInput.value = this.app.names.join('\n');
                    this.refreshNamesList();
                }
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openPanel() {
        this.overlay.classList.add('show');
        this.panel.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Refresh names list every time panel opens
        if (this.mode === 'text') {
            const namesInput = this.panel.querySelector('#setting-names-input');
            if (namesInput && this.app.names) {
                namesInput.value = this.app.names.join('\n');
            }
            this.refreshNamesList();
        }
    }

    closePanel() {
        this.overlay.classList.remove('show');
        this.panel.classList.remove('show');
        document.body.style.overflow = '';
    }

    applySettings() {
        this.applyFont();
        this.applyFontSize();
        this.applyBackground();
    }

    applyFont() {
        if (this.settings.font) {
            document.body.style.fontFamily = `'${this.settings.font}', 'Prompt', 'Anuphan', sans-serif`;
        }
    }

    applyFontSize() {
        if (this.settings.fontSize) {
            document.documentElement.style.setProperty('--custom-font-size', this.settings.fontSize);
        }
    }

    applyBackground() {
        if (this.settings.bgImage) {
            document.body.style.background = `url(${this.settings.bgImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        } else if (this.settings.bgColor) {
            document.body.style.background = this.settings.bgColor;
            document.body.style.backgroundAttachment = 'fixed';
        }
    }

    showMusicInfo(fileName) {
        const info = this.panel.querySelector('#music-info');
        info.innerHTML = `
            <div class="setting-file-info">
                <span class="setting-file-info-icon">🎵</span>
                <span class="setting-file-info-name">${fileName}</span>
                <button class="setting-file-remove" onclick="window.settingsPanel.removeMusic()">✕</button>
            </div>
        `;
    }

    showBackgroundInfo(fileName) {
        const info = this.panel.querySelector('#bg-image-info');
        info.innerHTML = `
            <div class="setting-file-info">
                <span class="setting-file-info-icon">🖼️</span>
                <span class="setting-file-info-name">${fileName}</span>
                <button class="setting-file-remove" onclick="window.settingsPanel.removeBackground()">✕</button>
            </div>
        `;
    }

    removeMusic() {
        this.settings.musicData = null;
        this.uploadedMusic = null;
        this.panel.querySelector('#music-info').innerHTML = '';
        this.saveSettings();
        PickPop.showToast('ลบเพลงเรียบร้อย', 'info');
    }

    removeBackground() {
        this.settings.bgImage = null;
        this.uploadedBackground = null;
        this.panel.querySelector('#bg-image-info').innerHTML = '';
        this.applyBackground();
        this.saveSettings();
    }

    loadSettings() {
        const key = this.mode === 'image' ? 'pickpop_image_settings' : 'pickpop_text_settings';
        const saved = PickPop.loadFromStorage(key, {});
        return {
            font: saved.font || 'Prompt',
            fontSize: saved.fontSize || '16px',
            textColor: saved.textColor || '#FFFFFF',
            bgColor: saved.bgColor || null,
            bgImage: saved.bgImage || null,
            audioEnabled: saved.audioEnabled !== undefined ? saved.audioEnabled : true,
            musicData: saved.musicData || null,
            volume: saved.volume !== undefined ? saved.volume : 50,
            duration: saved.duration || 3000,
            prizeCount: saved.prizeCount || 1
        };
    }

    saveSettings() {
        const key = this.mode === 'image' ? 'pickpop_image_settings' : 'pickpop_text_settings';
        const toSave = { ...this.settings };
        delete toSave.bgImage;
        delete toSave.musicData;
        PickPop.saveToStorage(key, toSave);
    }

    playMusic() {
        if (!this.settings.audioEnabled || !this.settings.musicData) return;

        if (!this.audioElement) {
            this.audioElement = new Audio();
            this.audioElement.loop = true;
        }

        this.audioElement.src = this.settings.musicData;
        this.audioElement.volume = (this.settings.volume || 50) / 100;
        this.audioElement.play().catch(err => console.log('Audio play failed:', err));
    }

    stopMusic() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
        }
    }
}

window.SettingsPanel = SettingsPanel;
